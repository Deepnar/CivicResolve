"use client"

import { useState } from "react"
import { format } from "date-fns"
import { BadgeCheck, AlertTriangle, EyeOff, ShieldQuestion, Loader2, Camera, ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Issue } from "@/lib/types"

// AI Observation Engine — external street-imagery verification evidence card.
// Shows the stored AI verdict for an issue (citizen photo vs street photo) or,
// when none exists yet, lets org admins / the reporter run the verification.

const VERDICT_META: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  same_issue: {
    label: "AI Verified",
    className: "bg-green-100 text-green-800 border-green-300",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
  },
  different_issue: {
    label: "Conflicting Evidence",
    className: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  unclear: {
    label: "Unclear",
    className: "bg-gray-100 text-gray-700 border-gray-300",
    icon: <EyeOff className="h-3.5 w-3.5" />,
  },
  no_issue: {
    label: "Suspected Fake",
    className: "bg-red-100 text-red-800 border-red-300",
    icon: <ShieldQuestion className="h-3.5 w-3.5" />,
  },
}

export function VerificationCard({
  issue,
  canVerify,
  onVerified,
}: {
  issue: Issue
  canVerify: boolean
  onVerified?: (issue: Issue) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noImagery, setNoImagery] = useState(false)

  const meta = issue.verificationVerdict ? VERDICT_META[issue.verificationVerdict] : null
  const capturedAt = issue.verificationCapturedAt
    ? new Date(issue.verificationCapturedAt)
    : null
  const staleDays =
    capturedAt && !isNaN(capturedAt.getTime())
      ? Math.max(0, Math.round((Date.now() - capturedAt.getTime()) / 86_400_000))
      : null
  const isStale = staleDays !== null && staleDays > 365

  const runVerification = async () => {
    setLoading(true)
    setError(null)
    setNoImagery(false)
    try {
      const res = await fetch("/api/ai/verify-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: Number(issue.id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Verification failed")
        return
      }
      if (data.success === false && data.code === "NO_EXTERNAL_IMAGERY") {
        setNoImagery(true)
        return
      }
      if (data.success === false) {
        setError(data?.message || "Verification unavailable")
        return
      }
      onVerified?.({
        ...issue,
        verificationVerdict: data.verification.verdict,
        verificationConfidence: data.verification.confidence,
        verificationReason: data.verification.reason,
        verificationImageUrl: data.verification.streetImage?.url,
        verificationSource: data.verification.streetImage?.source,
        verificationCapturedAt: data.verification.streetImage?.capturedAt,
        verificationDistanceM: data.verification.streetImage?.distanceM,
        verifiedAt: data.verification.analyzedAt,
      } as Issue)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  // No stored verdict yet → action button (only for authorized roles).
  if (!meta) {
    if (noImagery) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <ScanSearch className="h-4 w-4" /> AI Verification
          </div>
          <p className="mt-1 text-xs">
            No street-level imagery is available near this location from any provider, so the
            report could not be cross-checked against external photos.
          </p>
        </div>
      )
    }
    if (!canVerify) return null
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <ScanSearch className="h-4 w-4" /> AI Verification
            </div>
            <p className="mt-0.5 text-xs text-blue-700">
              Cross-check this report against street-level imagery of the location.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runVerification} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {loading ? "Verifying…" : "AI Verify"}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  // Stored verdict → evidence card.
  const confidence = issue.verificationConfidence ?? 0
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(confidence * 100)}% confidence
          </span>
        </div>
        {canVerify && (
          <Button size="sm" variant="ghost" onClick={runVerification} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-verify"}
          </Button>
        )}
      </div>

      {/* Side-by-side evidence photos */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <figure>
          <img
            src={issue.imageUrl}
            alt="Citizen report photo"
            className="h-32 w-full rounded-md border object-cover"
          />
          <figcaption className="mt-1 text-center text-[11px] text-gray-500">
            Citizen photo
          </figcaption>
        </figure>
        <figure>
          {issue.verificationImageUrl ? (
            <img
              src={issue.verificationImageUrl}
              alt="Street view of the location"
              className="h-32 w-full rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-md border bg-gray-50 text-xs text-gray-400">
              No street imagery
            </div>
          )}
          <figcaption className="mt-1 text-center text-[11px] text-gray-500">
            Street photo ({issue.verificationSource ?? "unknown"})
          </figcaption>
        </figure>
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${
              confidence >= 0.7
                ? "bg-green-500"
                : confidence >= 0.4
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      </div>

      {issue.verificationReason && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{issue.verificationReason}</p>
      )}

      {/* Provenance + freshness */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        {capturedAt && !isNaN(capturedAt.getTime()) && (
          <span>Street photo: {format(capturedAt, "d MMM yyyy")}</span>
        )}
        {issue.verificationDistanceM !== undefined &&
          issue.verificationDistanceM !== null &&
          issue.verificationDistanceM > 0 && (
            <span>{Math.round(issue.verificationDistanceM)}m from location</span>
          )}
        {issue.verifiedAt && (
          <span>Verified {format(new Date(issue.verifiedAt), "d MMM yyyy, HH:mm")}</span>
        )}
        {isStale && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Street photo is {staleDays} days old — may not reflect current condition
          </span>
        )}
        </div>

        {/* Post-resolution street cross-check (external imagery captured after
            the resolution timestamp — a real check on whether the fix holds) */}
        {(issue as any).resolutionStreetUrl && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Post-resolution street check</span>
              {(issue as any).resolutionStreetVerdict === "still_present" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  Still shows the issue
                </span>
              )}
              {(issue as any).resolutionStreetVerdict === "not_present" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  Area clear
                </span>
              )}
              {(issue as any).resolutionStreetVerdict === "unclear" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Unclear
                </span>
              )}
            </div>
            <img
              src={(issue as any).resolutionStreetUrl}
              alt="Street photo captured after resolution"
              className="mt-2 h-32 w-full rounded-md border object-cover"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              {issue.resolutionVerdict === "not_fixed" && (
                <span className="font-medium text-red-600">Resolution claim contradicted — </span>
              )}
              External street photo
              {(issue as any).resolutionStreetCapturedAt &&
                ` captured ${format(new Date((issue as any).resolutionStreetCapturedAt), "d MMM yyyy")}`}
              {" — after the resolution was marked."}
            </p>
          </div>
        )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
