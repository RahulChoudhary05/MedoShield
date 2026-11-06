"""Synthetic pose sequences for testing the motion analytics."""
import numpy as np

_BASE = {11: (0.45, 0.30), 12: (0.55, 0.30), 13: (0.43, 0.42), 14: (0.57, 0.42), 15: (0.42, 0.52), 16: (0.58, 0.52),
         23: (0.46, 0.55), 24: (0.54, 0.55), 25: (0.46, 0.70), 26: (0.54, 0.70), 27: (0.46, 0.85), 28: (0.54, 0.85)}


def make_frames(tremor_hz=0.0, tremor_amp=0.0, walk=True, fps=30, duration=10, jitter=0.002, seed=0, step_hz=0.9):
    rng = np.random.default_rng(seed)
    frames, t = [], 0.0
    while t < duration:
        k = np.zeros((33, 4)); k[:, 3] = 0.95
        for i, (x, y) in _BASE.items():
            k[i, 0], k[i, 1] = x, y
        if walk:
            ph = 2 * np.pi * step_hz * t
            k[27, 0] += 0.06 * np.sin(ph); k[28, 0] -= 0.06 * np.sin(ph)
            k[25, 0] += 0.03 * np.sin(ph); k[26, 0] -= 0.03 * np.sin(ph)
            k[15, 0] -= 0.03 * np.sin(ph); k[16, 0] += 0.03 * np.sin(ph)
        k[16, 0] += tremor_amp * np.sin(2 * np.pi * tremor_hz * t)
        k[:, :2] += rng.normal(0, jitter, (33, 2))
        frames.append({"t": round(t, 4), "k": k.round(5).tolist()})
        t += (1 / fps) * (1 + rng.uniform(-0.15, 0.15))
    return frames
