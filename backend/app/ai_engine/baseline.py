"""Personal baseline learning + risk fusion.

* Baseline = robust statistics (median + MAD) of the first N good-quality sessions,
  so one bad recording can't poison it.
* Deviation = robust z-scores of the latest session against the baseline, signed so
  only *worsening* counts toward risk.
* Final risk fuses the population motor index (always available) with personal
  deviation (once calibrated), weighted by recording quality.
"""
from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np

# feature -> direction in which a change is *worse* (+1 higher is worse, -1 lower is worse)
TRACKED = {
    "tremor_index": +1,
    "bradykinesia_score": +1,
    "gait_symmetry": -1,
    "postural_sway": +1,
    "step_time_cv": +1,
    "arm_swing_asymmetry": +1,
}
MIN_MAD = {
    "tremor_index": 0.04, "bradykinesia_score": 0.03, "gait_symmetry": 0.02,
    "postural_sway": 0.006, "step_time_cv": 0.02, "arm_swing_asymmetry": 0.05,
}


def build_baseline(sessions: List[Dict]) -> Dict:
    stats: Dict[str, Dict[str, float]] = {}
    for key in TRACKED:
        vals = np.array([s[key] for s in sessions if isinstance(s.get(key), (int, float))], dtype=float)
        if len(vals) >= 3:
            med = float(np.median(vals))
            mad = float(np.median(np.abs(vals - med)) * 1.4826)
            stats[key] = {"median": round(med, 5), "mad": round(max(mad, MIN_MAD[key]), 5), "n": int(len(vals))}
    return {"features": stats, "session_count": len(sessions)}


def deviation(features: Dict, baseline: Optional[Dict]) -> Dict:
    if not baseline or not baseline.get("features"):
        return {"score": None, "components": {}}
    comps = {}
    for key, direction in TRACKED.items():
        b = baseline["features"].get(key)
        v = features.get(key)
        if b and isinstance(v, (int, float)):
            z = direction * (float(v) - b["median"]) / b["mad"]
            comps[key] = round(float(z), 2)
    worsening = [max(0.0, z) for z in comps.values()]
    score = float(np.sqrt(np.mean(np.square(worsening)))) if worsening else 0.0
    return {"score": round(score, 3), "components": comps}


def classify(motor: Dict[str, float] | float, dev_score: Optional[float], quality: float) -> Dict:
    """Return {classification, score (0-100 risk), confidence, should_flag, basis}.

    A weighted average can hide one strong sign (e.g. clear tremor in an otherwise
    normal walker), so the weakest sub-score also sets a floor on the risk.
    """
    if isinstance(motor, dict):
        motor_overall = float(motor.get("overall", 0.0))
        subs = [v for k, v in motor.items() if k != "overall" and isinstance(v, (int, float))]
        worst = min(subs) if subs else 100.0
    else:
        motor_overall, worst = float(motor), 100.0
    pop_risk = max(100.0 - motor_overall, 0.75 * (100.0 - worst))
    if dev_score is None:
        risk = pop_risk
        basis = "population reference ranges (personal baseline still calibrating)"
    else:
        personal = float(np.clip(dev_score / 4.0, 0, 1) * 100)
        risk = 0.45 * pop_risk + 0.55 * personal
        basis = "your personal baseline and population reference ranges"
    risk = float(np.clip(risk, 0, 100))
    level = "LOW" if risk < 35 else "MEDIUM" if risk < 60 else "HIGH"
    confidence = float(np.clip(quality * (0.75 if dev_score is None else 0.95), 0.05, 0.98))
    return {
        "classification": level,
        "score": round(risk, 1),
        "confidence": round(confidence, 2),
        "should_flag": level != "LOW" and confidence >= 0.4,
        "basis": basis,
    }
