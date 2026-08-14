// Geo-fetches street-level imagery for a reported issue location.
// Fallback chain: Ola Street View (India-native, best coverage) →
// Mapillary (Image Radius Search) → KartaView (no auth) → null.
// Each provider degrades gracefully when unconfigured/unreachable, so the
// verification pipeline never hard-fails on a missing imagery source.

export interface StreetImage {
  source: 'ola' | 'mapillary' | 'kartaview'
  imageUrl: string
  thumbUrl?: string
  capturedAt?: string // ISO 8601
  distanceM?: number
  bearing?: number
}

const TIMEOUT_MS = 8_000

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CivicResolve/1.0 (civic issue verification)' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url.split('?')[0]}`)
  return res.json()
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// --- Ola Street View (primary) ---------------------------------------------

async function tryOla(lat: number, lng: number, radiusM: number): Promise<StreetImage | null> {
  const key = process.env.OLA_MAPS_API_KEY
  if (!key) return null

  const base = 'https://api.olamaps.io'
  const idRes = await fetchJson(
    `${base}/sli/v1/streetview/imageId?lat=${lat}&lon=${lng}&radius=${radiusM}&api_key=${key}`
  )
  const idPayload = Array.isArray(idRes) ? idRes[0] : idRes
  if (!idPayload || idPayload.status !== 'SUCCESS') return null
  const payload = idPayload.payload || {}
  const imageId = payload.imageId ?? payload.image_id ?? payload.id
  if (!imageId) return null

  const metaRes = await fetchJson(
    `${base}/sli/v1/streetview/metadata?imageId=${imageId}&api_key=${key}`
  )
  const metaPayload = Array.isArray(metaRes) ? metaRes[0] : metaRes
  if (!metaPayload || metaPayload.status !== 'SUCCESS') return null
  const meta = metaPayload.payload || {}
  const imageUrl = meta.imageUrl ?? meta.image_url ?? meta.url
  if (!imageUrl) return null

  return {
    source: 'ola',
    imageUrl: String(imageUrl),
    capturedAt: meta.capturedAt ? new Date(meta.capturedAt).toISOString() : undefined,
    bearing: typeof meta.bearing === 'number' ? meta.bearing : undefined,
  }
}

// --- Mapillary (fallback 1) -------------------------------------------------

async function tryMapillary(lat: number, lng: number, radiusM: number): Promise<StreetImage | null> {
  const token = process.env.MAPILLARY_CLIENT_TOKEN
  if (!token) return null

  const radius = Math.min(Math.max(radiusM, 1), 50) // API caps at 50 m
  const url =
    `https://graph.mapillary.com/images?access_token=${token}` +
    `&fields=id,geometry,captured_at,compass_angle,thumb_1024_url,thumb_original_url` +
    `&lat=${lat}&lng=${lng}&radius=${radius}&limit=1`
  const res = await fetchJson(url)
  const img = res?.data?.[0]
  if (!img) return null

  const imageUrl = img.thumb_original_url || img.thumb_1024_url
  if (!imageUrl) return null

  const coords = img.geometry?.coordinates
  const distanceM =
    Array.isArray(coords) && coords.length >= 2
      ? haversineM(lat, lng, coords[1], coords[0])
      : undefined

  return {
    source: 'mapillary',
    imageUrl: String(imageUrl),
    thumbUrl: img.thumb_1024_url ? String(img.thumb_1024_url) : undefined,
    capturedAt: img.captured_at ? new Date(img.captured_at).toISOString() : undefined,
    distanceM,
    bearing: typeof img.compass_angle === 'number' ? img.compass_angle : undefined,
  }
}

// --- KartaView / OpenStreetCam (fallback 2, no auth) -------------------------

async function tryKartaview(lat: number, lng: number): Promise<StreetImage | null> {
  const res = await fetchJson(
    `https://api.openstreetcam.org/2.0/photo/?lat=${lat}&lng=${lng}&zoomLevel=15`
  )
  if (res?.status?.apiCode !== 600) return null
  const photos = Array.isArray(res?.result?.data) ? res.result.data : []
  if (!photos.length) return null
  // Prefer the NEWEST photo (freshness matters — old imagery misleads);
  // fall back to the closest when no dates are available.
  const photo = photos.sort((a: any, b: any) => {
    const da = a.dateAdded ? new Date(a.dateAdded).getTime() : 0
    const db = b.dateAdded ? new Date(b.dateAdded).getTime() : 0
    return db - da
  })[0]

  // Original files are archived after a while ('full' 404s on old photos);
  // probe size variants and use the first one that actually serves.
  const template = photo.fileurl ? String(photo.fileurl) : null
  const variants = ['full', 'proc', '1080p', '480p']
  let imageUrl: string | null = null
  if (template) {
    for (const size of variants) {
      const candidate = template.replace('{{sizeprefix}}', size)
      try {
        const probe = await fetch(candidate, {
          headers: { Range: 'bytes=0-1023' },
          signal: AbortSignal.timeout(6_000),
        })
        if (probe.ok) {
          imageUrl = candidate
          break
        }
      } catch {
        /* try next variant */
      }
    }
  }
  if (!imageUrl) return null

  return {
    source: 'kartaview',
    imageUrl,
    thumbUrl: photo.filepathTh ? String(photo.filepathTh) : undefined,
    capturedAt: photo.dateAdded ? new Date(photo.dateAdded).toISOString() : undefined,
    distanceM: photo.distance != null ? Number(photo.distance) : undefined,
  }
}

/**
 * Returns the best available street image near a location, or null when no
 * provider is configured / has imagery. Never throws for provider failures —
 * it just falls through to the next source.
 */
export async function getStreetImageNear(
  lat: number,
  lng: number,
  radiusM = 50
): Promise<StreetImage | null> {
  const sources: Array<() => Promise<StreetImage | null>> = [
    () => tryOla(lat, lng, radiusM),
    () => tryMapillary(lat, lng, radiusM),
    () => tryKartaview(lat, lng),
  ]
  for (const source of sources) {
    try {
      const image = await source()
      if (image) return image
    } catch (err) {
      console.warn(`[IMAGERY] provider failed: ${(err as Error).message}`)
    }
  }
  return null
}

/** Downloads an image and returns its base64 (JPEG assumed). */
export async function fetchImageAsBase64(url: string, maxBytes = 10 * 1024 * 1024): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CivicResolve/1.0 (civic issue verification)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > maxBytes) throw new Error(`Image too large: ${Math.round(buf.length / 1e6)} MB`)
  return buf.toString('base64')
}
