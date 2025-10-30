### Try/Except Fix Report for backend/app/main.py

**File:** `backend/app/main.py`

**Issue observed:**
- SyntaxError at around line 399: `except HTTPException as he:` -> expected 'except' or 'finally' block.

**Root cause:**
- The `except` blocks were dedented relative to the corresponding `try:` inside the `else:` branch of `chat_message_compat`, causing Python to treat them as orphaned handlers without a matching `try:`.

---

#### BEFORE (problematic region)

```startLine:endLine:backend/app/main.py
354:            try:
355:                async with MedicalLLMService() as service:
...
397:                reply_text = _strip_emojis(reply_text or "").strip()
398:                add_message(db, conv, uid, sender="assistant", text=reply_text)
399:        except HTTPException as he:
400:            # Graceful degradation: persist a friendly fallback response instead of failing 502
401:            logger.error(f"AI reply failed (HTTPException): {he.detail}")
...
411:        except Exception as e:
412:            # Graceful degradation for unexpected errors
413:            logger.error(f"AI reply failed: {e}")
```

The `except` handlers (lines ~399 and ~411) were less-indented than the corresponding `try:` (line ~354).

---

#### AFTER (fixed region)

```startLine:endLine:backend/app/main.py
354:            try:
355:                async with MedicalLLMService() as service:
...
397:                reply_text = _strip_emojis(reply_text or "").strip()
398:                add_message(db, conv, uid, sender="assistant", text=reply_text)
399:            except HTTPException as he:
400:                # Graceful degradation: persist a friendly fallback response instead of failing 502
401:                logger.warning(f"AI reply failed (HTTPException): {he.detail}")
...
411:            except Exception as e:
412:                # Graceful degradation for unexpected errors
413:                logger.exception("AI reply failed")
```

Changes:
- Re-indented the `except` blocks to match the `try:` level.
- Switched `logger.error` to `logger.warning` for `HTTPException` and `logger.exception` for generic exceptions for better diagnostics.

---

#### Validation steps
- `python -m py_compile backend/app/main.py` → no syntax errors.
- Started server: `uvicorn app.main:app --reload --port 8001 --log-level debug` → boots successfully.
- Smoke tests:
  - `GET /health` → 200, JSON OK
  - `GET /docs` → 200

---

#### Other orphaned handlers
- Searched the surrounding file and no additional orphaned `except`/`finally` blocks were found.


