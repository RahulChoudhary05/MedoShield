import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * On-device pose capture with MediaPipe Pose Landmarker (WASM, runs in the browser).
 * Raw video frames never leave the device; only 33 landmarks per frame are kept.
 *
 * Phases: idle -> loading -> ready -> countdown -> recording -> done | error
 */
const WASM_BASE = '/mediapipe/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const KEY = [11, 12, 15, 16, 23, 24, 27, 28]

let landmarkerPromise = null
async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      try {
        return await PoseLandmarker.createFromOptions(fileset, opts('GPU'))
      } catch {
        return await PoseLandmarker.createFromOptions(fileset, opts('CPU'))
      }
    })().catch((e) => {
      landmarkerPromise = null
      throw e
    })
  }
  return landmarkerPromise
}

export const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [27, 29], [28, 30], [0, 11], [0, 12],
]

function drawSkeleton(ctx, lm, w, h) {
  ctx.clearRect(0, 0, w, h)
  if (!lm) return
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(3, w / 220)
  for (const [a, b] of BONES) {
    const p = lm[a], q = lm[b]
    if (!p || !q || (p.visibility ?? 1) < 0.35 || (q.visibility ?? 1) < 0.35) continue
    const g = ctx.createLinearGradient(p.x * w, p.y * h, q.x * w, q.y * h)
    g.addColorStop(0, 'rgba(59,163,144,.95)')
    g.addColorStop(1, 'rgba(249,168,116,.95)')
    ctx.strokeStyle = g
    ctx.beginPath()
    ctx.moveTo(p.x * w, p.y * h)
    ctx.lineTo(q.x * w, q.y * h)
    ctx.stroke()
  }
  for (let i = 11; i < lm.length; i++) {
    const p = lm[i]
    if ((p.visibility ?? 1) < 0.35) continue
    ctx.fillStyle = i === 15 || i === 16 ? '#F06A3B' : '#ffffff'
    ctx.strokeStyle = '#2549CC'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, Math.max(3.5, w / 170), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

export function usePoseCapture({ durationSec = 10, recordVideo = false } = {}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const framesRef = useRef([])
  const startRef = useRef(0)
  const lastTsRef = useRef(-1)
  const phaseRef = useRef('idle')
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const fpsRef = useRef({ n: 0, t: 0, fps: 0 })
  const countdownRef = useRef(0)

  const [phase, setPhaseState] = useState('idle')
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [progress, setProgress] = useState(0)
  const [live, setLive] = useState({ visible: 0, inFrame: false, fps: 0, detected: false })
  const [result, setResult] = useState(null) // { frames, videoBlob }

  const setPhase = (p) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const stopStream = useCallback(() => {
    clearInterval(countdownRef.current)
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const finish = useCallback(() => {
    setPhase('done')
    const frames = framesRef.current
    const done = (videoBlob) => {
      setResult({ frames, videoBlob })
      stopStream()
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = () => done(new Blob(chunksRef.current, { type: recorderRef.current.mimeType || 'video/webm' }))
      recorderRef.current.stop()
    } else done(null)
  }, [stopStream])

  const loop = useCallback(async () => {
    const landmarker = await getLandmarker()
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !streamRef.current) return
      if (video.readyState >= 2 && video.currentTime !== lastTsRef.current) {
        lastTsRef.current = video.currentTime
        const now = performance.now()
        const res = landmarker.detectForVideo(video, now)
        const lm = res?.landmarks?.[0]
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        drawSkeleton(canvas.getContext('2d'), lm, canvas.width, canvas.height)

        // live quality meter (updated ~4x/s)
        const f = fpsRef.current
        f.n += 1
        if (now - f.t > 250) {
          f.fps = (f.n * 1000) / (now - f.t)
          f.n = 0
          f.t = now
          const vis = lm ? KEY.reduce((a, i) => a + (lm[i]?.visibility ?? 0), 0) / KEY.length : 0
          const inFrame = !!lm && KEY.every((i) => lm[i].x > 0.02 && lm[i].x < 0.98 && lm[i].y > 0.02 && lm[i].y < 0.99)
          setLive({ visible: vis, inFrame, fps: Math.round(f.fps), detected: !!lm })
        }

        if (phaseRef.current === 'recording') {
          const t = (now - startRef.current) / 1000
          if (lm) framesRef.current.push({ t: +t.toFixed(4), k: lm.map((p) => [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5), +(p.visibility ?? 1).toFixed(3)]) })
          setProgress(Math.min(1, t / durationSec))
          if (t >= durationSec || framesRef.current.length >= 1790) {
            finish()
            return
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [durationSec, finish])

  const open = useCallback(async () => {
    setError(null)
    setResult(null)
    setPhase('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      await getLandmarker()
      setPhase('ready')
      loop()
    } catch (e) {
      stopStream()
      const msg = e?.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
        : e?.name === 'NotFoundError' ? 'No camera was found on this device.'
          : 'We could not start the pose tracker. Check your connection and try again.'
      setError(msg)
      setPhase('error')
    }
  }, [loop, stopStream])

  const start = useCallback(() => {
    if (phaseRef.current !== 'ready') return
    setPhase('countdown')
    let n = 3
    setCountdown(n)
    clearInterval(countdownRef.current)
    const id = setInterval(() => {
      n -= 1
      if (n > 0) return setCountdown(n)
      clearInterval(id)
      if (phaseRef.current !== 'countdown') return
      framesRef.current = []
      chunksRef.current = []
      if (recordVideo && streamRef.current && 'MediaRecorder' in window) {
        const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
        try {
          const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime, videoBitsPerSecond: 1_800_000 } : undefined)
          rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
          rec.start(500)
          recorderRef.current = rec
        } catch { recorderRef.current = null }
      }
      startRef.current = performance.now()
      setProgress(0)
      setPhase('recording')
    }, 1000)
    countdownRef.current = id
  }, [recordVideo])

  const reset = useCallback(() => {
    stopStream()
    framesRef.current = []
    setResult(null)
    setProgress(0)
    setPhase('idle')
  }, [stopStream])

  return { videoRef, canvasRef, phase, error, countdown, progress, live, result, open, start, reset, stop: finish }
}

/** Summarise frames into the scalar metrics we send alongside an AI video review. */
export function quickMetrics(frames) {
  if (!frames?.length) return null
  const dur = frames.at(-1).t - frames[0].t
  return { frames: frames.length, duration_s: +dur.toFixed(2), fps: +(frames.length / Math.max(dur, 0.1)).toFixed(1) }
}
