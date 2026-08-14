#!/usr/bin/env node
// AI Observation Engine — background worker. Two passes per run:
//
// PASS 1 — auto-verify: scans PENDING issues that have a photo + coordinates
//   but no verification evidence yet, and verifies each against external
//   street imagery (covers web + WhatsApp report paths).
// PASS 2 — vision duplicate sweep: for recent unlinked issues, compares the
//   photo against the nearest same-category neighbor's photo with the vision
//   model; if the same problem is visible, flags the pair for the admin
//   duplicates queue (possible_duplicate_of + vision confidence).
//
// Run manually:    node --env-file=.env scripts/verify-worker.mjs
// Via systemd:     systemctl --user start civicresolve-verify.service
//                  (timer: every 10 min, logs to /tmp/verify-worker.log)
//
// Safety: sequential, idempotent, bounded per run (VERIFY_WORKER_MAX /
// VERIFY_WORKER_DUP_MAX), and duplicate_vision_checked prevents re-checking.

import mysql from 'mysql2/promise'
import { runVerification, verifyResolution } from '../lib/verify-core.ts'
import { visionCheckSameIssue } from '../lib/duplicate-vision.ts'
import { getStreetImageNear, fetchImageAsBase64 } from '../lib/imagery.ts'

const MAX_PER_RUN = Number(process.env.VERIFY_WORKER_MAX ?? 3)
const DUP_MAX_PER_RUN = Number(process.env.VERIFY_WORKER_DUP_MAX ?? 2)
const RES_MAX_PER_RUN = Number(process.env.VERIFY_WORKER_RES_MAX ?? 3)
const LOOKBACK_DAYS = Number(process.env.VERIFY_WORKER_LOOKBACK_DAYS ?? 14)
const RETRY_AFTER_DAYS = Number(process.env.VERIFY_WORKER_RETRY_DAYS ?? 7)
const DUP_LOOKBACK_DAYS = Number(process.env.VERIFY_WORKER_DUP_LOOKBACK_DAYS ?? 2)
const DUP_DISTANCE_M = Number(process.env.VERIFY_WORKER_DUP_DISTANCE_M ?? 100)
const DUP_MIN_CONFIDENCE = Number(process.env.VERIFY_WORKER_DUP_MIN_CONFIDENCE ?? 0.6)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'

async function pass1AutoVerify(conn) {
  if (process.env.ENABLE_AI_VERIFICATION !== 'true') {
    console.log('[VERIFY-WORKER] ENABLE_AI_VERIFICATION is not true — skipping verification pass.')
    return
  }

  const [rows] = await conn.query(
    `SELECT id, latitude, longitude, image_url
     FROM issues
     WHERE status = 'PENDING'
       AND verified_at IS NULL
       AND (verification_attempted_at IS NULL OR verification_attempted_at < NOW() - INTERVAL ? DAY)
       AND latitude <> 0 AND longitude <> 0
       AND image_url IS NOT NULL AND image_url <> ''
       AND created_at >= NOW() - INTERVAL ? DAY
     ORDER BY created_at DESC
     LIMIT ?`,
    [RETRY_AFTER_DAYS, LOOKBACK_DAYS, MAX_PER_RUN]
  )

  if (!rows.length) {
    console.log(`[VERIFY-WORKER] pass1: no unverified pending issues (${new Date().toISOString()})`)
    return
  }

  console.log(`[VERIFY-WORKER] pass1: verifying ${rows.length} issue(s)...`)
  for (const row of rows) {
    const issueId = row.id
    const lat = Number(row.latitude)
    const lng = Number(row.longitude)
    const citizenUrl = new URL(row.image_url, APP_URL).toString()
    console.log(`[VERIFY-WORKER]   → issue ${issueId} (${lat.toFixed(5)}, ${lng.toFixed(5)})`)

    try {
      const result = await runVerification({ lat, lng, citizenImageUrl: citizenUrl })
      if (!result) {
        console.log(`[VERIFY-WORKER]     no external imagery near this location — leaving for a later run`)
        // Track the attempt so no-imagery locations get backed off
        // (RETRY_AFTER_DAYS) instead of hitting all providers every run.
        await conn.query(
          `UPDATE issues SET verification_attempted_at = NOW() WHERE id = ?`,
          [issueId]
        )
        continue
      }
      await conn.query(
        `UPDATE issues SET
          verification_verdict = ?, verification_confidence = ?, verification_reason = ?,
          verification_image_url = ?, verification_source = ?, verification_captured_at = ?,
          verification_distance_m = ?, verified_at = NOW(), verification_attempted_at = NOW()
        WHERE id = ?`,
        [
          result.verdict,
          result.confidence,
          result.reason,
          result.streetImage.url,
          result.streetImage.source,
          result.streetImage.capturedAt ? new Date(result.streetImage.capturedAt) : null,
          result.streetImage.distanceM,
          issueId,
        ]
      )
      console.log(
        `[VERIFY-WORKER]     ✓ ${result.verdict} @ ${result.confidence} (stale: ${result.freshness.isStale})`
      )
    } catch (err) {
      console.error(`[VERIFY-WORKER]     ✗ issue ${issueId} failed: ${err instanceof Error ? err.message : String(err)}`)
      // Transient failures also get backed off — retry after RETRY_AFTER_DAYS.
      await conn.query(
        `UPDATE issues SET verification_attempted_at = NOW() WHERE id = ?`,
        [issueId]
      ).catch(() => {})
    }
  }
}

async function pass2DuplicateSweep(conn) {
  if (process.env.ENABLE_AI_DUPLICATE_VISION !== 'true') {
    console.log('[VERIFY-WORKER] ENABLE_AI_DUPLICATE_VISION is not true — skipping duplicate sweep.')
    return
  }

  const [candidates] = await conn.query(
    `SELECT id, category, latitude, longitude, image_url
     FROM issues
     WHERE status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED_DUPLICATE')
       AND possible_duplicate_of IS NULL
       AND duplicate_status = 'PENDING'
       AND duplicate_vision_checked = false
       AND image_url IS NOT NULL AND image_url <> ''
       AND latitude <> 0 AND longitude <> 0
       AND created_at >= NOW() - INTERVAL ? DAY
     ORDER BY created_at DESC
     LIMIT ?`,
    [DUP_LOOKBACK_DAYS, DUP_MAX_PER_RUN]
  )

  if (!candidates.length) {
    console.log(`[VERIFY-WORKER] pass2: no candidates for vision duplicate check (${new Date().toISOString()})`)
    return
  }

  console.log(`[VERIFY-WORKER] pass2: vision duplicate check on ${candidates.length} issue(s)...`)
  for (const c of candidates) {
    try {
      // Nearest same-category root neighbor with a photo within DUP_DISTANCE_M.
      const [neighbors] = await conn.query(
        `SELECT id, image_url, title,
                (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) * 1000 AS distance_m
         FROM issues
         WHERE id != ?
           AND category = ?
           AND status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED_DUPLICATE')
           AND possible_duplicate_of IS NULL
           AND image_url IS NOT NULL AND image_url <> ''
         HAVING distance_m < ?
         ORDER BY distance_m ASC
         LIMIT 1`,
        [c.latitude, c.longitude, c.latitude, c.id, c.category, DUP_DISTANCE_M]
      )

      if (!neighbors.length) {
        // Nothing nearby to compare — mark checked so we never revisit.
        await conn.query(`UPDATE issues SET duplicate_vision_checked = true WHERE id = ?`, [c.id])
        console.log(`[VERIFY-WORKER]   → issue ${c.id}: no nearby same-category photo neighbor — marked checked`)
        continue
      }

      const n = neighbors[0]
      console.log(
        `[VERIFY-WORKER]   → issue ${c.id} vs #${n.id} (${Math.round(n.distance_m)}m away) — vision check…`
      )
      const result = await visionCheckSameIssue(c.image_url, n.image_url)

      if (!result) {
        // Transient (download/VLM) failure — do NOT mark checked; a later run
        // retries this pair instead of permanently excluding it.
        console.log(`[VERIFY-WORKER]     photos failed to download — will retry on a later run`)
        continue
      }

      if (result.same && result.confidence >= DUP_MIN_CONFIDENCE) {
        // Only link if still unlinked (race guard), then flag for admin review.
        const [upd] = await conn.query(
          `UPDATE issues
           SET possible_duplicate_of = ?, duplicate_confidence = ?, duplicate_status = 'PENDING', duplicate_vision_checked = true
           WHERE id = ? AND possible_duplicate_of IS NULL`,
          [n.id, result.confidence, c.id]
        )
        console.log(
          `[VERIFY-WORKER]     🚩 SAME problem @ ${result.confidence.toFixed(2)} → flagged #${c.id} as possible duplicate of #${n.id}${upd.affectedRows ? '' : ' (already linked)'}`
        )
      } else {
        await conn.query(`UPDATE issues SET duplicate_vision_checked = true WHERE id = ?`, [c.id])
        console.log(
          `[VERIFY-WORKER]     different/unclear (${result.same ? 'same' : 'not same'} @ ${result.confidence.toFixed(2)}) — marked checked`
        )
      }
    } catch (err) {
      console.error(`[VERIFY-WORKER]   ✗ dup check for issue ${c.id} failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

async function pass3ResolutionCheck(conn) {
  if (process.env.ENABLE_AI_RESOLUTION_CHECK !== 'true') {
    console.log('[VERIFY-WORKER] ENABLE_AI_RESOLUTION_CHECK not true — skipping resolution check.')
    return
  }

  const [rows] = await conn.query(
    `SELECT id, image_url, resolution_image_url, latitude, longitude, updated_at
     FROM issues
     WHERE status = 'RESOLVED'
       AND resolution_image_url IS NOT NULL AND resolution_image_url <> ''
       AND image_url IS NOT NULL AND image_url <> ''
       AND resolution_checked_at IS NULL
       AND updated_at >= NOW() - INTERVAL ? DAY
     ORDER BY updated_at DESC
     LIMIT ?`,
    [LOOKBACK_DAYS, RES_MAX_PER_RUN]
  )

  if (!rows.length) {
    console.log(`[VERIFY-WORKER] pass3: no resolved issues awaiting resolution check (${new Date().toISOString()})`)
    return
  }

  console.log(`[VERIFY-WORKER] pass3: resolution check on ${rows.length} issue(s)...`)
  for (const row of rows) {
    const originalUrl = new URL(row.image_url, APP_URL).toString()
    const proofUrl = new URL(row.resolution_image_url, APP_URL).toString()
    console.log(`[VERIFY-WORKER]   → issue ${row.id}: original vs proof…`)
    try {
      const result = await verifyResolution(originalUrl, proofUrl)
      if (!result) {
        // Transient download failure — do NOT mark checked; retry next run.
        console.log(`[VERIFY-WORKER]     photos failed to download — will retry on a later run`)
        continue
      }

      // Live cross-check: external street photo captured AFTER the resolution.
      // DATE CHECK FIRST — only spend a vision call when the street photo is
      // newer than the resolution timestamp (historical imagery cannot
      // comment on the fix). updated_at approximates the resolution moment —
      // the issues table has no dedicated resolved_at column.
      let streetEvidence = { url: null, capturedAt: null, verdict: null }
      const lat = Number(row.latitude)
      const lng = Number(row.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        const street = await getStreetImageNear(lat, lng).catch(() => null)
        if (!street) {
          console.log(`[VERIFY-WORKER]     no street imagery near this location — street cross-check skipped`)
        } else {
          const streetDate = street.capturedAt ? new Date(street.capturedAt) : null
          const resolutionDate = new Date(row.updated_at)
          if (!streetDate) {
            console.log(`[VERIFY-WORKER]     street photo has no capture date — street cross-check skipped`)
          } else if (streetDate < resolutionDate) {
            console.log(
              `[VERIFY-WORKER]     street photo (${streetDate.toISOString().slice(0, 10)}) predates the resolution (${resolutionDate.toISOString().slice(0, 10)}) — not usable, skipped`
            )
          } else {
            console.log(
              `[VERIFY-WORKER]     street photo captured ${streetDate.toISOString().slice(0, 10)} (after report) — cross-checking…`
            )
            const streetCheck = await checkStreetResolution(originalUrl, street.imageUrl, street.capturedAt)
            if (streetCheck) {
              streetEvidence = {
                url: street.imageUrl,
                capturedAt: street.capturedAt,
                verdict: streetCheck.stillPresent === true
                  ? 'still_present'
                  : streetCheck.stillPresent === false
                    ? 'not_present'
                    : 'unclear',
              }
              console.log(
                `[VERIFY-WORKER]     street says ${streetEvidence.verdict} @ ${streetCheck.confidence.toFixed(2)} — ${streetCheck.reason.slice(0, 90)}`
              )
            } else {
              console.log(`[VERIFY-WORKER]     street photo download failed — street cross-check skipped`)
            }
          }
        }
      }

      let verdict = result.verdict
      let reason = result.reason
      // A street photo captured AFTER the report that STILL shows the problem
      // contradicts the "resolved" claim — escalate to not_fixed.
      if (streetEvidence.verdict === 'still_present') {
        verdict = 'not_fixed'
        reason = `${reason} STREET CONTRADICTION: street imagery captured ${String(streetEvidence.capturedAt).slice(0, 10)} still shows the issue.`
      } else if (streetEvidence.verdict === 'not_present') {
        reason = `${reason} Consistent with street imagery of ${String(streetEvidence.capturedAt).slice(0, 10)} showing the area without the issue.`
      }

      await conn.query(
        `UPDATE issues SET
           resolution_verdict = ?, resolution_confidence = ?, resolution_checked_at = NOW(),
           resolution_street_url = ?, resolution_street_captured_at = ?, resolution_street_verdict = ?
         WHERE id = ?`,
        [
          verdict,
          result.confidence,
          streetEvidence.url,
          streetEvidence.capturedAt ? new Date(streetEvidence.capturedAt) : null,
          streetEvidence.verdict,
          row.id,
        ]
      )
      console.log(
        `[VERIFY-WORKER]     ${verdict === 'not_fixed' ? '🚩 NOT FIXED' : verdict} @ ${result.confidence.toFixed(2)} — ${reason.slice(0, 100)}`
      )
    } catch (err) {
      console.error(`[VERIFY-WORKER]   ✗ resolution check for issue ${row.id} failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  await pass1AutoVerify(conn)
  await pass2DuplicateSweep(conn)
  await pass3ResolutionCheck(conn)

  await conn.end()
  console.log('[VERIFY-WORKER] run complete.')
}

main().catch((err) => {
  console.error('[VERIFY-WORKER] fatal:', err)
  process.exit(1)
})
