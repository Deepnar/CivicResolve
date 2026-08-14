// AI Observation Engine — YOLO ONNX inference for auto-discovery.
// Runs the trained detector (yolo11n-v2, 5 classes) on a street photo and
// returns calibrated detections. Class confidence is multiplied by a
// per-class calibration factor derived from the unseen real-world eval
// (streetlight/manhole are scene-level classes → heavily discounted).

import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import { fetchImageAsBase64 } from './imagery.ts'

export const YOLO_CLASSES = ['pothole', 'longitudinal_crack', 'alligator_crack', 'broken_streetlight', 'open_manhole'] as const
export type YoloClass = (typeof YOLO_CLASSES)[number]

export const YOLO_CATEGORY: Record<YoloClass, string> = {
  pothole: 'ROADS',
  longitudinal_crack: 'ROADS',
  alligator_crack: 'ROADS',
  broken_streetlight: 'LIGHTING',
  open_manhole: 'UTILITIES',
}

// Calibration multipliers (from unseen real-world eval — scene classes fire on
// generic urban scenes, so discount them hard).
const CALIBRATION: Record<YoloClass, number> = {
  pothole: 1.0,
  longitudinal_crack: 1.0,
  alligator_crack: 1.0,
  broken_streetlight: 0.5,
  open_manhole: 0.5,
}

const IMGSZ = 736
const CONF_THRESHOLD = 0.25 // applied AFTER calibration (sharp kernels soften confs vs cv2-bilinear)
const NMS_IOU = 0.5

let session: ort.InferenceSession | null = null
let sessionPath = process.env.YOLO_ONNX_PATH || '/home/deepnar/Programs/civic_resolve/datasets/runs/yolo11n-v2/weights/best.onnx'

export interface YoloDetection {
  className: YoloClass
  category: string
  confidence: number // calibrated confidence
  box: [number, number, number, number] // xyxy (pixels at IMGSZ)
}

export async function getYoloSession(): Promise<ort.InferenceSession> {
  if (!session) {
    session = await ort.InferenceSession.create(sessionPath, {
      executionProviders: ['cuda', 'cpu'],
    })
  }
  return session
}

/** Detect defects in a street photo (base64). Returns calibrated detections. */
export async function detectDefects(imageBase64: string): Promise<YoloDetection[]> {
  const s = await getYoloSession()

  // Letterbox preprocess (YOLO convention, not fill — critical for accuracy).
  // NOTE: extend() (native padding) is used — composite() with a raw buffer
  // silently corrupts the input (undimensioned buffer is misread).
  const inputBuf = Buffer.from(imageBase64, 'base64')
  const meta = await sharp(inputBuf).metadata()
  const srcW = meta.width ?? IMGSZ
  const srcH = meta.height ?? IMGSZ
  const scale = Math.min(IMGSZ / srcW, IMGSZ / srcH)
  let resizedW = Math.max(1, Math.round(srcW * scale))
  let resizedH = Math.max(1, Math.round(srcH * scale))
  // Round to a multiple of 32 (model stride) like ultralytics letterbox.
  resizedW = Math.round(resizedW / 32) * 32
  resizedH = Math.round(resizedH / 32) * 32
  const padX = Math.round((IMGSZ - resizedW) / 2)
  const padY = Math.round((IMGSZ - resizedH) / 2)

  const canvas = await sharp(inputBuf)
    .resize(resizedW, resizedH)
    .extend({
      top: padY,
      bottom: IMGSZ - resizedH - padY,
      left: padX,
      right: IMGSZ - resizedW - padX,
      background: { r: 114, g: 114, b: 114 },
    })
    .raw()
    .toBuffer()

  // NCHW float32, normalized to [0,1].
  const input = new Float32Array(3 * IMGSZ * IMGSZ)
  for (let i = 0; i < IMGSZ * IMGSZ; i++) {
    input[i] = canvas[i * 3] / 255
    input[IMGSZ * IMGSZ + i] = canvas[i * 3 + 1] / 255
    input[2 * IMGSZ * IMGSZ + i] = canvas[i * 3 + 2] / 255
  }

  const feeds: Record<string, ort.Tensor> = {}
  feeds[s.inputNames[0]] = new ort.Tensor('float32', input, [1, 3, IMGSZ, IMGSZ])
  const results = await s.run(feeds)
  const output = results[s.outputNames[0]]

  // [1, 4+nc, 8400] → transpose to [8400, 4+nc]
  const data = output.data as Float32Array
  const [n, channels, anchors] = output.dims as [number, number, number]
  const nc = YOLO_CLASSES.length
  if (channels !== 4 + nc) {
    // Some exports put conf first (4+nc vs nc+4); handle gracefully.
    console.warn(`[YOLO] unexpected channel count ${channels} (expected ${4 + nc})`)
  }

  const detections: { cls: number; conf: number; box: [number, number, number, number] }[] = []
  const stride = channels * anchors

  for (let a = 0; a < anchors; a++) {
    const cx = data[a]
    const cy = data[anchors + a]
    const w = data[2 * anchors + a]
    const h = data[3 * anchors + a]
    let bestCls = -1
    let bestScore = -1
    for (let c = 0; c < nc; c++) {
      const score = data[(4 + c) * anchors + a]
      if (score > bestScore) {
        bestScore = score
        bestCls = c
      }
    }
    if (bestCls < 0) continue

    const rawConf = bestScore
    const className = YOLO_CLASSES[bestCls]
    const effective = rawConf * CALIBRATION[className]
    if (effective < CONF_THRESHOLD) continue

    // Denormalize box to IMGSZ pixel coords, then un-letterbox.
    const x1 = (cx - w / 2) * IMGSZ
    const y1 = (cy - h / 2) * IMGSZ
    const x2 = (cx + w / 2) * IMGSZ
    const y2 = (cy + h / 2) * IMGSZ
    detections.push({ cls: bestCls, conf: effective, box: [x1, y1, x2, y2] })
  }

  // NMS
  detections.sort((p, q) => q.conf - p.conf)
  const keep: typeof detections = []
  for (const d of detections) {
    let overlap = false
    for (const k of keep) {
      if (iou(d.box, k.box) > NMS_IOU) {
        overlap = true
        break
      }
    }
    if (!overlap) keep.push(d)
  }

  return keep.map((d) => ({
    className: YOLO_CLASSES[d.cls],
    category: YOLO_CATEGORY[YOLO_CLASSES[d.cls]],
    confidence: d.conf,
    box: d.box,
  }))
}

function iou(a: [number, number, number, number], b: [number, number, number, number]): number {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[2], b[2])
  const y2 = Math.min(a[3], b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1])
  const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1])
  return inter / (areaA + areaB - inter + 1e-6)
}

/** Convenience: street photo URL → detections. */
export async function detectDefectsFromUrl(url: string): Promise<YoloDetection[]> {
  const base64 = await fetchImageAsBase64(url)
  return detectDefects(base64)
}
