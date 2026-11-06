# AI safety & prompt-injection defence

No single filter stops prompt injection, so every model call goes through layered, independent controls (`backend/app/ai/`).

```
message ─▶ 1 normalise ─▶ 2 emergency triage ─▶ 3 injection scan ─▶ 4 intent triage
                                    │                    │                 │
                              fixed safe reply      refuse / caution   short/vague/off-topic
                                                                       → focused follow-up
         ─▶ 5 spotlighted prompt (random boundary + canary, server-side history)
         ─▶ 6 Grok via xAI Responses API (instructions field, strict JSON schema, store:false) — Gemini fallback
         ─▶ 7 output validation (schema, enum clamp, canary/boundary leak, link/image/HTML strip)
         ─▶ deterministic fallback on any failure
```

| Layer | What it stops |
|---|---|
| **Normalise** (`guardrails.normalize_untrusted`) | NFKC folding, zero-width / bidi-override / Unicode-tag smuggling, control chars, length cap. |
| **Emergency triage** | Chest pain, stroke signs, breathing difficulty, self-harm, overdose, seizure, bleeding, falls → fixed, clinically safe escalation (helplines, SOS) without the model. |
| **Injection scanner** | ~40 weighted rules: instruction override, persona hijack (DAN/dev-mode), system-prompt extraction, chat-template delimiters (`<|im_start|>`, `[INST]`), fake boundaries, tool spoofing, exfiltration links, other-patient data requests; leetspeak canonicalisation; embedded base64 decoded and rescanned. High score → refuse; medium → caution note to the model. Attempts are logged to `security_events`. |
| **Intent triage** (`triage.py`) | One-word or vague prompts ("pain", "tremor", "hi") get a focused clinical follow-up question with tap-able chips instead of a generic essay; off-topic requests are politely declined. |
| **Spotlighting** | Untrusted text (messages, prior turns, PDF text) is wrapped in a per-request random tag; the system prompt declares its contents data-only. Attempts to close the tag are neutralised. |
| **Server-side memory** | Conversation history is stored server-side; clients cannot inject fake assistant turns (the old API accepted `conversation_history` from the browser). |
| **Canary** | A random token in the system prompt; if it (or the boundary tag) ever appears in output, the answer is discarded. |
| **Output validation** | Responses must match a JSON schema; urgency and specialty are enum-clamped; markdown images, raw HTML and non-allow-listed links are stripped (exfiltration channels). |
| **Medication safety** | The OTC engine is rule-based with age gates, allergy, contraindication and interaction screens; the LLM only adds an educational paragraph and never gives personal doses. |

Tests: `backend/tests/test_ai_guardrails.py` (10 injection variants incl. leetspeak, base64 and zero-width; benign medical prompts must pass; canary leak; boundary escape; triage; end-to-end endpoint).

### Provider privacy
Grok requests are sent with `store: false`, so xAI does not retain patient messages for later retrieval. API keys travel only in request headers. The client falls back to Gemini (if configured) and then to deterministic rules, so a provider outage never breaks the app.
