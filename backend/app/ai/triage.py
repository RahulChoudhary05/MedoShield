"""Lightweight intent triage for assistant messages.

Handles the messages LLMs answer worst: one-word, vague, greeting-only or
off-topic prompts. Each gets a deterministic, useful reply (usually a focused
follow-up question + quick-reply chips) instead of a generic essay, and the
classification is also fed to the model as a hint for borderline cases.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

_GREETING = re.compile(r"^(hi+|hey+|hello+|hii+|yo|namaste|good (morning|afternoon|evening)|hola|sup|howdy)[\s!.,?]*$", re.I)
_THANKS = re.compile(r"^(thanks?|thank you|thx|ty|ok(ay)?|cool|great|got it|fine|alright|sure)[\s!.,?]*$", re.I)
_BYE = re.compile(r"^(bye|goodbye|see you|cya|good night)[\s!.,?]*$", re.I)

_OFF_TOPIC = re.compile(
    r"\b(write (me )?(a |some )?(code|program|essay|poem|story|song)|python|javascript|java\b|sql|stock|crypto|bitcoin|"
    r"cricket score|football|movie|netflix|recipe for cake|homework|translate this|weather|election|politics|joke)\b",
    re.I,
)
_HEALTH_HINT = re.compile(
    r"\b(pain|ache|hurt|fever|cough|cold|tired|fatigue|sleep|tremor|shak|walk|gait|balance|fall|dizz|headache|nause|"
    r"vomit|bp|blood|sugar|diabet|heart|breath|anx|stress|depress|mood|medic|tablet|pill|dose|exercise|diet|weight|"
    r"bmi|rash|itch|swell|stiff|parkinson|memory|numb|weak|bleed|injur|symptom|doctor|health|cramp|joint|back|neck|knee)",
    re.I,
)

# Single-word symptoms -> the most useful first follow-up.
_FOCUSED_FOLLOW_UPS = {
    "pain": ("Where exactly is the pain, and how strong is it from 1 to 10?", ["Head", "Back", "Chest", "Joints", "Stomach"]),
    "headache": ("How long have you had the headache, and is it one-sided, all over, or behind the eyes?", ["Started today", "A few days", "Comes and goes", "Worst ever"]),
    "fever": ("What's your temperature, and how many days has the fever lasted?", ["Under 38°C", "38–39°C", "Over 39°C", "3+ days"]),
    "tremor": ("Does the shaking happen mostly at rest or when you move/hold something? Which side?", ["At rest", "When moving", "Right hand", "Left hand"]),
    "dizzy": ("Does the room spin, or do you feel light-headed when you stand up?", ["Room spins", "When I stand", "All the time", "With headache"]),
    "tired": ("How many hours are you sleeping, and has the tiredness lasted more than two weeks?", ["< 6 hours", "6–8 hours", "2+ weeks", "With low mood"]),
    "cough": ("Is the cough dry or with phlegm, and how long has it been going on?", ["Dry", "With phlegm", "Over 3 weeks", "With fever"]),
    "stress": ("What's been weighing on you most, and is it affecting your sleep or appetite?", ["Work", "Health worries", "Sleep is affected", "Feeling low"]),
    "fall": ("Did you hit your head or are you hurt now? How did the fall happen?", ["Hit my head", "Tripped", "Felt dizzy first", "I'm okay"]),
    "walking": ("What changed about your walking — shorter steps, freezing, imbalance, or pain?", ["Shorter steps", "Freezing", "Losing balance", "Pain"]),
}

DEFAULT_CHIPS = ["I have a symptom", "Explain my latest analysis", "Help with my medications", "Improve sleep & stress"]


@dataclass
class Triage:
    intent: str  # greeting | thanks | bye | off_topic | too_short | health | general
    reply: Optional[str] = None  # set when we can answer without the model
    chips: List[str] = field(default_factory=list)
    hint: str = ""


def triage(message: str, first_name: str = "") -> Triage:
    text = (message or "").strip()
    words = re.findall(r"[\w'°]+", text.lower())
    hello = f"Hi {first_name}! " if first_name else "Hi! "

    if _GREETING.match(text):
        return Triage("greeting", f"{hello}I'm Medo, your MedoShield health companion. How are you feeling today — is there a symptom, a result or a medication you'd like to go through together?", DEFAULT_CHIPS)
    if _THANKS.match(text):
        return Triage("thanks", "You're welcome! Is there anything else about your health you'd like to check — symptoms, results, or your routine?", ["Yes, another question", "Book a doctor", "No, that's all"])
    if _BYE.match(text):
        return Triage("bye", "Take care! Remember you can record a quick movement check any time, and press SOS if you ever need urgent help.", [])

    if _OFF_TOPIC.search(text) and not _HEALTH_HINT.search(text):
        return Triage("off_topic", "I'm focused on health and wellbeing, so I can't help with that one. Is there anything about your symptoms, medications, sleep, movement or daily routine I can help with?", DEFAULT_CHIPS)

    if len(words) <= 2:
        for key, (question, chips) in _FOCUSED_FOLLOW_UPS.items():
            if any(w.startswith(key[:5]) for w in words):
                return Triage("too_short", f"Thanks for telling me. {question}", chips)
        if not _HEALTH_HINT.search(text):
            return Triage("too_short", "Could you tell me a little more? For example: what you're feeling, where, since when, and how strong it is.", DEFAULT_CHIPS)
        return Triage("health", hint="The user wrote a very short message. Ask ONE focused clarifying question before giving advice.")

    if len(words) <= 5:
        return Triage("health" if _HEALTH_HINT.search(text) else "general",
                      hint="The message is brief. If key details (location, duration, severity, triggers) are missing, ask one or two focused questions first.")

    return Triage("health" if _HEALTH_HINT.search(text) else "general")
