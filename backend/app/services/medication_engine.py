"""Safety-first OTC guidance engine.

The previous build recommended drugs by frequency in a synthetic Kaggle CSV
(where medications are randomly assigned - e.g. Paracetamol for cancer), which is
unsafe. This engine instead uses a small curated knowledge base of common OTC
options and runs explicit safety screens:

  * age gates (e.g. no aspirin under 16)        * allergy matches
  * condition contraindications (ulcer, CKD...)  * drug-drug interactions with current meds
  * red-flag symptoms that require a clinician  * duplicate-ingredient warnings

The CSV is used only for population context (prevalence and age profile).
Output is educational guidance to discuss with a pharmacist/doctor - never a prescription.
"""
from __future__ import annotations

import csv
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import settings


@dataclass(frozen=True)
class Drug:
    name: str
    klass: str
    treats: tuple
    label_dose: Dict[str, str]  # age group -> label guidance
    min_age: int = 0
    avoid_conditions: tuple = ()
    caution_conditions: tuple = ()
    interacts: Dict[str, str] = field(default_factory=dict)
    allergy_keys: tuple = ()
    notes: str = ""


KB: List[Drug] = [
    Drug("Paracetamol (Acetaminophen)", "Analgesic / antipyretic", ("fever", "pain", "headache", "body ache", "cold", "flu", "toothache"),
         {"child": "Weight-based per label (10-15 mg/kg/dose)", "teen": "500 mg every 4-6 h, max 3 g/day", "adult": "500-1000 mg every 4-6 h, max 4 g/day", "senior": "500 mg every 6 h, max 3 g/day"},
         avoid_conditions=("liver disease", "cirrhosis", "hepatitis"), caution_conditions=("alcohol",),
         interacts={"warfarin": "Regular use can raise INR - monitor."}, allergy_keys=("paracetamol", "acetaminophen"),
         notes="Many cold remedies already contain paracetamol - avoid doubling up."),
    Drug("Ibuprofen", "NSAID", ("pain", "fever", "inflammation", "menstrual cramps", "muscle pain", "joint pain", "back pain", "toothache", "headache"),
         {"child": "Weight-based per label (5-10 mg/kg/dose)", "teen": "200-400 mg every 6-8 h with food, max 1.2 g/day", "adult": "200-400 mg every 6-8 h with food, max 1.2 g/day OTC", "senior": "Use lowest dose for shortest time - ask a pharmacist first"},
         min_age=1, avoid_conditions=("peptic ulcer", "stomach ulcer", "kidney disease", "ckd", "heart failure", "pregnan"),
         caution_conditions=("asthma", "hypertension", "high blood pressure"),
         interacts={"warfarin": "Bleeding risk.", "aspirin": "Reduces aspirin's heart protection; stomach bleeding risk.", "lisinopril": "Can reduce BP control and harm kidneys.",
                    "losartan": "Can reduce BP control and harm kidneys.", "prednisolone": "Stomach-bleeding risk.", "sertraline": "Bleeding risk.", "lithium": "Raises lithium levels."},
         allergy_keys=("ibuprofen", "nsaid"), notes="Take with food. Stop if you notice black stools or stomach pain."),
    Drug("Cetirizine", "Non-drowsy antihistamine", ("allergy", "runny nose", "sneezing", "itchy eyes", "hives", "itch", "rash", "hay fever"),
         {"child": "Per label for age 2+", "teen": "10 mg once daily", "adult": "10 mg once daily", "senior": "5 mg once daily may be enough"},
         min_age=2, caution_conditions=("kidney disease",), allergy_keys=("cetirizine", "antihistamine"), notes="Can still cause mild drowsiness in some people."),
    Drug("Oral rehydration salts (ORS)", "Rehydration", ("diarrhea", "diarrhoea", "loose motion", "vomiting", "dehydration"),
         {"child": "Small frequent sips per pack instructions", "teen": "Per pack after each loose stool", "adult": "200-400 ml after each loose stool", "senior": "Per pack; watch for confusion or dizziness"},
         notes="Seek care for blood in stool, high fever, or signs of dehydration."),
    Drug("Antacid (calcium carbonate)", "Antacid", ("acidity", "heartburn", "indigestion", "acid reflux", "gas"),
         {"child": "Ask a pharmacist", "teen": "Per label after meals", "adult": "Per label after meals and at bedtime", "senior": "Per label - separate from other medicines by 2 h"},
         min_age=12, caution_conditions=("kidney disease",), interacts={"levodopa": "Separate doses by 2 hours.", "levothyroxine": "Separate by 4 hours.", "iron": "Separate by 2 hours."},
         notes="Persistent heartburn over 2 weeks needs a doctor's review."),
    Drug("Saline nasal spray / steam", "Non-drug", ("blocked nose", "congestion", "cold", "sinus"),
         {"child": "Saline drops per label", "teen": "As needed", "adult": "As needed", "senior": "As needed"}, notes="Safe first step for congestion."),
    Drug("Honey & warm fluids", "Non-drug", ("cough", "sore throat"),
         {"child": "Honey only above 1 year", "teen": "As needed", "adult": "As needed", "senior": "As needed"}, notes="Avoid honey in infants under 12 months."),
    Drug("Aspirin", "NSAID / antiplatelet", ("pain", "fever", "headache"),
         {"child": "Not recommended (Reye's syndrome)", "teen": "Not recommended under 16", "adult": "300-600 mg every 4-6 h, max 4 g/day", "senior": "Ask a doctor first"},
         min_age=16, avoid_conditions=("peptic ulcer", "stomach ulcer", "bleeding disorder", "asthma", "pregnan", "kidney disease"),
         interacts={"warfarin": "Major bleeding risk.", "ibuprofen": "Stomach bleeding risk.", "methotrexate": "Toxicity risk."},
         allergy_keys=("aspirin", "nsaid", "salicylate"), notes="Do not use for routine pain if you already take low-dose aspirin."),
]

RED_FLAGS = [
    (r"chest pain|pressure in (my )?chest", "Chest pain needs urgent medical assessment."),
    (r"short(ness)? of breath|can'?t breathe|breathless", "Breathing difficulty needs urgent assessment."),
    (r"worst headache|sudden severe headache|stiff neck", "A sudden severe headache or stiff neck needs urgent care."),
    (r"blood in (stool|urine|vomit)|black stool|coughing blood", "Bleeding symptoms need prompt medical review."),
    (r"(fever|temperature).{0,30}(3|4|5|more than 3) days|fever for a week", "Fever lasting over 3 days should be checked by a doctor."),
    (r"weakness on one side|face droop|slurred speech", "Possible stroke signs - call emergency services."),
    (r"pregnan", "During pregnancy, ask a doctor or pharmacist before taking any medicine."),
    (r"\b(infant|newborn|baby)\b", "Babies need a doctor's or pharmacist's advice before any medicine."),
]

DB_CONDITIONS = {"diabetes": "Diabetes", "hypertension": "Hypertension", "blood pressure": "Hypertension",
                 "asthma": "Asthma", "arthritis": "Arthritis", "obesity": "Obesity", "cancer": "Cancer"}


def age_group(age: Optional[int]) -> str:
    if age is None:
        return "adult"
    return "child" if age < 12 else "teen" if age < 18 else "adult" if age < 65 else "senior"


@lru_cache(maxsize=1)
def _population() -> Dict[str, Dict[str, float]]:
    path = Path(settings.HEALTHCARE_DATASET_CSV)
    if not path.exists():
        return {}
    ages: Dict[str, List[int]] = defaultdict(list)
    results: Dict[str, Counter] = defaultdict(Counter)
    with path.open(newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            cond = (row.get("Medical Condition") or "").strip()
            try:
                ages[cond].append(int(row.get("Age") or 0))
            except ValueError:
                continue
            results[cond][(row.get("Test Results") or "").strip()] += 1
    total = sum(len(v) for v in ages.values()) or 1
    return {c: {"records": len(a), "share_pct": round(100 * len(a) / total, 1), "mean_age": round(sum(a) / len(a), 1),
                "abnormal_pct": round(100 * results[c]["Abnormal"] / max(len(a), 1), 1)} for c, a in ages.items() if a}


def _tokens(items: Optional[List[str]]) -> str:
    return " ".join((i or "").lower() for i in (items or []))


def recommend(symptoms: str, age: Optional[int], conditions: Optional[List[str]] = None,
              allergies: Optional[List[str]] = None, current_meds: Optional[List[str]] = None) -> Dict:
    text = (symptoms or "").lower()
    cond_text = _tokens(conditions) + " " + text
    allergy_text = _tokens(allergies)
    meds_text = _tokens(current_meds)
    group = age_group(age)

    red_flags = [msg for rx, msg in RED_FLAGS if re.search(rx, text)]
    options, excluded = [], []
    for drug in KB:
        matched = [t for t in drug.treats if t in text]
        if not matched:
            continue
        reasons, cautions = [], []
        if age is not None and age < drug.min_age:
            reasons.append(f"Not suitable under age {drug.min_age}")
        if any(k in allergy_text for k in drug.allergy_keys):
            reasons.append("Matches a recorded allergy")
        for c in drug.avoid_conditions:
            if c in cond_text:
                reasons.append(f"Avoid with {c}")
        for c in drug.caution_conditions:
            if c in cond_text:
                cautions.append(f"Use with caution: {c}")
        interactions = [f"{m.title()}: {why}" for m, why in drug.interacts.items() if m in meds_text]
        if reasons:
            excluded.append({"name": drug.name, "reasons": reasons})
            continue
        score = len(matched) * 30 + (10 if drug.klass == "Non-drug" else 0) - 15 * len(interactions) - 5 * len(cautions)
        options.append({
            "name": drug.name, "class": drug.klass, "matched_symptoms": matched,
            "label_guidance": drug.label_dose.get(group, "Follow the label"),
            "age_group": group.capitalize(), "cautions": cautions, "interactions": interactions,
            "notes": drug.notes, "suitability": max(5, min(100, 50 + score)),
            "risk_level": "review" if interactions or cautions else "low",
        })
    options.sort(key=lambda o: -o["suitability"])

    matched_condition = next((v for k, v in DB_CONDITIONS.items() if k in cond_text), None)
    population = _population().get(matched_condition or "", None)
    return {
        "age_group": group.capitalize(),
        "options": options[:4],
        "excluded": excluded,
        "red_flags": red_flags,
        "see_doctor": bool(red_flags) or not options,
        "matched_condition": matched_condition,
        "population_context": population,
        "disclaimer": "Educational guidance only - not a prescription. Confirm with a pharmacist or doctor, especially if you take other medicines.",
    }
