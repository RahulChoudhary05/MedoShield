"""Medo AI assistant with server-side conversation memory."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai import assistant as medo
from app.ai import llm
from app.core.audit import audit, security_event
from app.core.deps import Principal, require_patient
from app.core.rate_limit import limiter
from app.core.security import utcnow
from app.core.utils import age_from_dob, parse_oid, to_json
from app.db.database import get_db
from app.schemas import AssistantMessage
from app.services.insights import latest_risk

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


async def _context(p: Principal) -> dict:
    doc = p.doc or {}
    risk = await latest_risk(p.patient_id)
    reminder = await get_db()["medication_reminders"].find_one({"patient_id": p.patient_id, "is_active": True})
    meds = [m.get("name") for m in (reminder or {}).get("medications", [])] + list(doc.get("current_medications") or [])
    return {
        "first_name": doc.get("first_name", ""),
        "age": age_from_dob(doc.get("date_of_birth")),
        "gender": {"M": "male", "F": "female"}.get(doc.get("gender") or "", None),
        "conditions": ", ".join(doc.get("conditions") or []),
        "allergies": ", ".join(doc.get("allergies") or []),
        "medications": ", ".join(sorted({m for m in meds if m}))[:300],
        "latest_risk": f"{risk['level']} (motor index {((risk.get('motor_index') or {}).get('overall'))})" if risk else None,
    }


@router.post("/message")
@limiter.limit("20/minute;300/day")
async def message(request: Request, body: AssistantMessage, p: Principal = Depends(require_patient)):
    db = get_db()
    convo = None
    if body.conversation_id:
        convo = await db["assistant_conversations"].find_one({"_id": parse_oid(body.conversation_id, "conversation"), "patient_id": p.patient_id})
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")

    result = await medo.respond(body.message, medo.history_from_doc(convo), await _context(p))
    if result.source == "guardrail" or result.flags.get("injection_score"):
        await security_event("ai.prompt_injection", request, {"patient_id": p.patient_id, **result.flags})

    now = utcnow()
    turns = [
        {"role": "user", "content": body.message[:2000], "created_at": now},
        {"role": "assistant", "content": result.reply, "created_at": now, "urgency": result.urgency,
         "suggested_specialty": result.suggested_specialty, "chips": result.chips, "source": result.source, "intent": result.intent},
    ]
    if convo:
        await db["assistant_conversations"].update_one({"_id": convo["_id"]}, {"$push": {"messages": {"$each": turns, "$slice": -80}},
                                                                              "$set": {"updated_at": now}})
        cid = str(convo["_id"])
    else:
        res = await db["assistant_conversations"].insert_one({"patient_id": p.patient_id, "title": medo.title_from(body.message),
                                                              "messages": turns, "created_at": now, "updated_at": now})
        cid = str(res.inserted_id)
    await audit("assistant.message", actor_id=p.user_id, role="patient", request=request, meta={"intent": result.intent, "source": result.source})
    return to_json({
        "conversation_id": cid,
        "reply": result.reply,
        "urgency": result.urgency,
        "suggested_specialty": result.suggested_specialty,
        "chips": result.chips,
        "intent": result.intent,
        "source": result.source,
        "model": llm.model_name() if result.source == "model" else "MedoShield safety layer",
        "created_at": now,
        "disclaimer": "Medo offers general health information, not a diagnosis. In an emergency call your local emergency number.",
    })


@router.get("/conversations")
async def conversations(p: Principal = Depends(require_patient)):
    rows = await get_db()["assistant_conversations"].find({"patient_id": p.patient_id}, {"messages": {"$slice": -1}, "title": 1, "updated_at": 1}).sort("updated_at", -1).to_list(50)
    return to_json({"conversations": [{"id": str(r["_id"]), "title": r.get("title"), "updated_at": r.get("updated_at"),
                                       "preview": ((r.get("messages") or [{}])[-1].get("content") or "")[:90]} for r in rows]})


@router.get("/conversations/{conversation_id}")
async def conversation(conversation_id: str, p: Principal = Depends(require_patient)):
    c = await get_db()["assistant_conversations"].find_one({"_id": parse_oid(conversation_id, "conversation"), "patient_id": p.patient_id})
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return to_json(c)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str, p: Principal = Depends(require_patient)):
    await get_db()["assistant_conversations"].delete_one({"_id": parse_oid(conversation_id, "conversation"), "patient_id": p.patient_id})
