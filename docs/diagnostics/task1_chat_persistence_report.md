# Task: Chat Persistence and Scoping — Implementation Report

## Files changed
- `backend/app/main.py`
  - Added DB helpers: `get_user_conversation`, `create_db_conversation`, `add_message` (around chat routes).
  - Replaced in-memory chat routes with DB-backed implementations:
    - `POST /chat/message` now persists user and assistant messages, enforces ownership.
    - `GET /chat/conversations` lists conversations for the current user ordered by `updated_at`.
    - `POST /chat/conversations` creates a DB row for the current user.
    - `GET /chat/conversations/{id}` returns conversation and messages with optional pagination params (`limit`, `before`).
    - `PATCH /chat/conversations/{id}` updates `title`/`starred` with ownership checks.
    - `DELETE /chat/conversations/{id}` deletes messages + conversation with ownership enforced.
- `backend/app/llm_service.py`
  - Added PHI masking in RAG path (`rag_answer`) for snippet text (emails, phones, SSN, MRN/Acct/Patient IDs); citations unchanged.
- `backend/app/user_memory_service.py`
  - Added `db.flush()` to ensure `memory.id` exists before logging `MemoryInteraction` when creating new memories.
- `frontend/src/services/medicalAI.ts`
  - Switched base URL to `VITE_API_BASE` (fallback `http://127.0.0.1:8000`).
- `frontend/src/pages/Chat.tsx`
  - Switched to `VITE_API_BASE`.
  - Removed client-side AI call; now relies on `POST /chat/message` to return persisted assistant reply; refreshes messages via `GET /chat/conversations/{id}`.

## New/updated routes and payloads
- `GET /chat/conversations`
  - Response: array of `{ id, title, created_at, updated_at, timestamp, messages_count }` (timestamp mirrors `updated_at`).
- `POST /chat/conversations`
  - Response: `{ id, title, created_at }`.
- `GET /chat/conversations/{id}?limit=200&before=<message_id>`
  - Response: `{ id, title, created_at, updated_at, messages: [{ id, text, sender, timestamp, document? }] }`.
- `POST /chat/message`
  - Request: `{ conversation_id|conversationId?, message: string|{ text, sender?, suppressAssistant?, document? }, suppressAssistant? }`.
  - Behavior: Creates conversation if none provided; inserts user message; if not suppressed, generates assistant reply (RAG when applicable) and persists it; returns `{ conversation_id, conversation, messages }`.
- `PATCH /chat/conversations/{id}`
  - Request: `{ title?, starred? }`; updates fields and returns `{ id, title, updated_at, timestamp }`.
- `DELETE /chat/conversations/{id}`
  - Deletes owned conversation and messages; returns `{ ok: true, deleted_id }`.

## Ownership checks (where enforced)
- `backend/app/main.py`
  - Helper `get_user_conversation` filters by `Conversation.id` AND `Conversation.user_id` (DB ownership check) before any operation.
  - `add_message` raises 404 when `conversation.user_id != uid`.
  - All chat routes use `get_user_conversation` prior to read/update/delete.

## PHI masking in RAG
- `backend/app/llm_service.py` (within `rag_answer`)
  - Masks only snippet text, not citations, using regexes for SSN, phone, email, and MRN/Acct/Patient ID patterns.

## Frontend adaptation
- Uses `VITE_API_BASE` for all API calls.
- `Chat.tsx` now:
  - Creates conversations with `POST /chat/conversations`.
  - Sends messages via `POST /chat/message` (backend persists assistant reply).
  - Refreshes messages with `GET /chat/conversations/{id}`.
  - Maintains existing UI/UX and markdown rendering.

## Deferred items
- Message-level citations storage (could persist in `document_data` or a new field).
- Exhaustive pagination (current `limit`/`before` are basic stubs).
- Unit tests for cross-user isolation on chat routes.
- Migration tooling (Alembic) and schema unification across `Base`s.
