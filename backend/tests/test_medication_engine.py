from app.services.medication_engine import recommend


def names(r):
    return [o["name"] for o in r["options"]]


def test_aspirin_never_offered_to_children():
    r = recommend("fever and headache", age=10)
    assert "Aspirin" not in names(r)
    assert any(e["name"] == "Aspirin" for e in r["excluded"])


def test_nsaids_excluded_with_ulcer_and_allergy():
    r = recommend("joint pain", age=50, conditions=["peptic ulcer"])
    assert "Ibuprofen" not in names(r)
    r = recommend("headache", age=40, allergies=["Ibuprofen"])
    assert "Ibuprofen" not in names(r)


def test_interactions_flagged():
    r = recommend("back pain", age=60, current_meds=["Warfarin 5mg"])
    ibu = next(o for o in r["options"] if o["name"] == "Ibuprofen")
    assert ibu["interactions"] and ibu["risk_level"] == "review"


def test_red_flags_force_doctor():
    r = recommend("sudden severe headache with stiff neck", age=35)
    assert r["see_doctor"] and r["red_flags"]


def test_age_appropriate_label_guidance():
    adult = recommend("fever", age=30)
    senior = recommend("fever", age=80)
    pa = next(o for o in adult["options"] if o["name"].startswith("Paracetamol"))
    ps = next(o for o in senior["options"] if o["name"].startswith("Paracetamol"))
    assert "4 g" in pa["label_guidance"] and "3 g" in ps["label_guidance"]
