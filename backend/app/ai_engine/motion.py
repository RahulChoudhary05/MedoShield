"""Neuro-motor signal analytics from on-device pose keypoints.

Input  : frames of 33 MediaPipe landmarks ([x, y, z, visibility], normalised image coords)
         with real timestamps. Raw video never reaches the server.
Output : interpretable motor biomarkers + a data-quality report.

Key ideas
* Everything is scale-normalised by torso length so distance to camera doesn't matter.
* The time base comes from frame timestamps (browsers drop frames); signals are
  resampled onto a uniform grid before spectral analysis.
* Tremor = share of wrist-motion power in the 4-12 Hz band (Welch PSD), computed
  relative to the shoulder so whole-body movement isn't mistaken for tremor.
* Gait   = steps from the anterior-posterior ankle separation signal; cadence,
  step-time variability (CV), left/right step-time symmetry and arm-swing asymmetry.
* Bradykinesia proxy = slowness of distal limb movement (body-lengths / second).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional, Sequence

import numpy as np
from scipy.signal import butter, detrend, filtfilt, find_peaks, welch

# MediaPipe landmark indices
L_SHOULDER, R_SHOULDER = 11, 12
L_ELBOW, R_ELBOW = 13, 14
L_WRIST, R_WRIST = 15, 16
L_HIP, R_HIP = 23, 24
L_KNEE, R_KNEE = 25, 26
L_ANKLE, R_ANKLE = 27, 28
KEY_JOINTS = [L_SHOULDER, R_SHOULDER, L_WRIST, R_WRIST, L_HIP, R_HIP, L_ANKLE, R_ANKLE]

TREMOR_BAND = (4.0, 12.0)


@dataclass
class Quality:
    frames: int
    duration_s: float
    fps: float
    visibility: float
    usable: bool
    tremor_reliable: bool
    gait_detected: bool
    notes: List[str] = field(default_factory=list)

    @property
    def score(self) -> float:
        fps_q = min(1.0, self.fps / 24.0)
        dur_q = min(1.0, self.duration_s / 8.0)
        return round(float(0.45 * self.visibility + 0.3 * fps_q + 0.25 * dur_q), 3)


@dataclass
class MotorFeatures:
    # Legacy-compatible names (kept so historic sessions & charts keep working)
    stride_length: Optional[float] = None       # body-lengths
    cadence: Optional[float] = None             # steps / minute
    gait_symmetry: float = 0.0                  # 0..1, 1 = perfectly symmetric
    tremor_frequency: Optional[float] = None    # Hz
    tremor_amplitude: Optional[float] = None    # body-lengths RMS in tremor band
    bradykinesia_score: Optional[float] = None  # 0..1, 1 = very slow (only scored while walking)
    # Extended biomarkers
    tremor_index: float = 0.0                   # 0..1 noise-corrected 4-12 Hz tremor strength
    tremor_side: Optional[str] = None
    step_time_cv: Optional[float] = None
    arm_swing_asymmetry: Optional[float] = None
    postural_sway: float = 0.0
    movement_speed: float = 0.0                 # body-lengths / second
    mode: str = "stationary"                    # walking | stationary


def _arr(frames: Sequence[dict]) -> tuple[np.ndarray, np.ndarray]:
    t = np.asarray([float(f["t"]) for f in frames], dtype=float)
    k = np.asarray([[p[:4] if len(p) >= 4 else [*p[:3], 1.0] for p in f["k"]] for f in frames], dtype=float)
    order = np.argsort(t)
    t, k = t[order], k[order]
    keep = np.concatenate([[True], np.diff(t) > 1e-4])  # drop duplicate timestamps
    return t[keep] - t[keep][0], k[keep]


def _resample(t: np.ndarray, y: np.ndarray, fs: float) -> tuple[np.ndarray, np.ndarray]:
    grid = np.arange(0.0, t[-1], 1.0 / fs)
    return grid, np.interp(grid, t, y)


def _tremor_band(sig: np.ndarray, fs: float, band: tuple[float, float]) -> tuple[float, Optional[float], float]:
    """Spectral tremor detector robust to landmark jitter and voluntary movement.

    Returns (index 0..1, dominant frequency, excess RMS amplitude in body-lengths).
    * Noise floor = median PSD above 3 Hz (landmark jitter is ~white), so jitter
      alone yields ~0 excess power.
    * Voluntary motion (arm swing, walking) lives below 3 Hz and is ignored rather
      than diluting the score.
    * A narrow-band peak must stand >= 4x above the floor (SNR gate).
    """
    if len(sig) < 32:
        return 0.0, None, 0.0
    sig = detrend(sig)
    nper = int(min(len(sig), max(64, fs * 4)))
    f, p = welch(sig, fs=fs, nperseg=nper)
    hi = min(band[1], fs / 2 - 0.25)
    in_band = (f >= band[0]) & (f <= hi)
    floor_mask = f >= 3.0
    if not np.any(in_band) or not np.any(floor_mask):
        return 0.0, None, 0.0
    floor = float(np.median(p[floor_mask]))
    peak_i = int(np.argmax(p[in_band]))
    peak = float(p[in_band][peak_i])
    if floor <= 0 or peak / floor < 4.0:
        return 0.0, None, 0.0
    band_pow = float(np.trapezoid(p[in_band], f[in_band]))
    excess = max(band_pow - floor * (f[in_band][-1] - f[in_band][0]), 0.0)
    amp = float(np.sqrt(excess))
    # ~0.03 body-lengths RMS (~1.5 cm on an adult torso) is a clearly visible tremor.
    index = float(np.clip(amp / 0.03, 0, 1))
    return index, float(f[in_band][peak_i]), amp


def analyze(frames: Sequence[dict]) -> tuple[MotorFeatures, Quality]:
    t, k = _arr(frames)
    n = len(t)
    duration = float(t[-1]) if n > 1 else 0.0
    dt = np.diff(t)
    fps = float(1.0 / np.median(dt)) if len(dt) else 0.0
    vis = float(np.clip(np.nanmean(k[:, KEY_JOINTS, 3]), 0, 1)) if n else 0.0
    notes: List[str] = []

    q = Quality(frames=n, duration_s=round(duration, 2), fps=round(fps, 1), visibility=round(vis, 3),
                usable=n >= 30 and duration >= 3 and vis >= 0.35, tremor_reliable=fps >= 18, gait_detected=False, notes=notes)
    if n < 30 or duration < 3:
        notes.append("Recording too short - aim for at least 8 seconds.")
    if vis < 0.5:
        notes.append("Body partly out of frame - keep head to feet visible.")
    if fps < 18:
        notes.append("Low frame rate - tremor estimates are less reliable on this device.")
    if not q.usable:
        return MotorFeatures(), q

    xy = k[:, :, :2]
    shoulder_mid = (xy[:, L_SHOULDER] + xy[:, R_SHOULDER]) / 2
    hip_mid = (xy[:, L_HIP] + xy[:, R_HIP]) / 2
    torso = float(np.median(np.linalg.norm(shoulder_mid - hip_mid, axis=1)))
    scale = torso if torso > 1e-3 else 0.25
    fs = float(np.clip(round(fps), 10, 60))

    feats = MotorFeatures()

    # ── Tremor (wrist relative to ipsilateral shoulder, both axes) ─────────
    best = (0.0, None, 0.0, None)
    for side, wrist, shoulder in (("left", L_WRIST, L_SHOULDER), ("right", R_WRIST, R_SHOULDER)):
        rel = (xy[:, wrist] - xy[:, shoulder]) / scale
        ratios = []
        for axis in (0, 1):
            _, y = _resample(t, rel[:, axis], fs)
            ratios.append(_tremor_band(y, fs, TREMOR_BAND))
        r = max(ratios, key=lambda x: x[0])
        if r[0] > best[0]:
            best = (r[0], r[1], r[2], side)
    feats.tremor_index = round(best[0], 4)
    feats.tremor_frequency = round(best[1], 2) if best[1] else None
    feats.tremor_amplitude = round(best[2], 5)
    feats.tremor_side = best[3] if best[0] > 0.25 else None

    # ── Movement speed / bradykinesia proxy ───────────────────────────────
    distal = [L_WRIST, R_WRIST, L_ANKLE, R_ANKLE]
    disp = np.linalg.norm(np.diff(xy[:, distal], axis=0), axis=2) / scale
    speeds = disp / dt[:, None]
    speed = float(np.median(np.mean(speeds, axis=1)))
    feats.movement_speed = round(speed, 4)
    brady = round(float(1.0 / (1.0 + speed / 0.9)), 4)

    # ── Gait from ankle anterior-posterior separation ─────────────────────
    sep = (xy[:, L_ANKLE, 0] - xy[:, R_ANKLE, 0]) / scale
    grid, sep_u = _resample(t, sep, fs)
    if len(sep_u) > 3 * fs:
        b, a = butter(2, min(3.0 / (fs / 2), 0.95), btype="low")
        sep_f = filtfilt(b, a, detrend(sep_u))
        amp = float(np.std(sep_f))
        if amp > 0.08:  # meaningful leg alternation => walking
            feats.mode = "walking"
            q.gait_detected = True
            prom = max(0.05, 0.5 * amp)
            pk_l, _ = find_peaks(sep_f, prominence=prom, distance=int(0.25 * fs))
            pk_r, _ = find_peaks(-sep_f, prominence=prom, distance=int(0.25 * fs))
            steps = np.sort(np.concatenate([pk_l, pk_r]))
            if len(steps) >= 3:
                step_t = np.diff(grid[steps])
                feats.cadence = round(float(60.0 / np.mean(step_t)), 1)
                feats.step_time_cv = round(float(np.std(step_t) / np.mean(step_t)), 4)
                # Step-time symmetry: compare steps ending on left vs right peak
                is_left = np.isin(steps[1:], pk_l)
                lt, rt = step_t[is_left], step_t[~is_left]
                if len(lt) and len(rt):
                    feats.gait_symmetry = round(float(1 - abs(lt.mean() - rt.mean()) / max(lt.mean(), rt.mean())), 4)
                stride_amp = np.concatenate([sep_f[pk_l], -sep_f[pk_r]])
                feats.stride_length = round(float(2 * np.mean(stride_amp)), 4)
            else:
                notes.append("Walking detected but too few steps - walk for longer across the frame.")
            # Slowness is only meaningful while the person is actually moving.
            feats.bradykinesia_score = brady
    if not q.gait_detected:
        notes.append("No walking detected - movement speed and rhythm were not scored. Walk across the frame for a full gait check.")

    # Static symmetry fallback: hip-to-ankle leg extension
    if feats.gait_symmetry == 0.0:
        ll = np.linalg.norm(xy[:, L_HIP] - xy[:, L_ANKLE], axis=1).mean()
        rl = np.linalg.norm(xy[:, R_HIP] - xy[:, R_ANKLE], axis=1).mean()
        feats.gait_symmetry = round(float(1 - abs(ll - rl) / max(ll, rl, 1e-6)), 4)

    # ── Arm swing asymmetry ───────────────────────────────────────────────
    lw = np.ptp((xy[:, L_WRIST, 0] - hip_mid[:, 0]) / scale)
    rw = np.ptp((xy[:, R_WRIST, 0] - hip_mid[:, 0]) / scale)
    if max(lw, rw) > 0.05:
        feats.arm_swing_asymmetry = round(float(abs(lw - rw) / max(lw, rw)), 4)

    # ── Postural sway (trunk lateral wobble, trend removed) ───────────────
    _, trunk = _resample(t, (shoulder_mid[:, 0] - hip_mid[:, 0]) / scale, fs)
    feats.postural_sway = round(float(np.std(detrend(trunk))), 5)

    return feats, q


# ── Population-referenced motor index (no baseline needed) ────────────────
def motor_index(f: MotorFeatures) -> Dict[str, float]:
    """0-100 sub-scores (higher = healthier) using conservative reference ranges."""
    def lin(v: Optional[float], good: float, bad: float) -> Optional[float]:
        if v is None:
            return None
        s = (v - bad) / (good - bad)
        return float(np.clip(s, 0, 1) * 100)

    parts = {
        "tremor": lin(f.tremor_index, 0.05, 0.60),
        "speed": lin(f.bradykinesia_score, 0.40, 0.80),
        "symmetry": lin(f.gait_symmetry, 0.95, 0.70),
        "balance": lin(f.postural_sway, 0.015, 0.09),
        "rhythm": lin(f.step_time_cv, 0.04, 0.25) if f.step_time_cv is not None else None,
        "arm_swing": lin(f.arm_swing_asymmetry, 0.10, 0.60) if f.arm_swing_asymmetry is not None else None,
        "cadence": lin(f.cadence, 100.0, 60.0) if f.cadence is not None else None,
    }
    weights = {"tremor": 0.24, "speed": 0.18, "symmetry": 0.14, "balance": 0.12, "rhythm": 0.11, "arm_swing": 0.09, "cadence": 0.12}
    total = sum(weights[k] for k, v in parts.items() if v is not None)
    overall = sum(weights[k] * v for k, v in parts.items() if v is not None) / total if total else 0.0
    out = {k: round(v, 1) for k, v in parts.items() if v is not None}
    out["overall"] = round(overall, 1)
    return out


def features_dict(f: MotorFeatures) -> Dict[str, object]:
    return asdict(f)
