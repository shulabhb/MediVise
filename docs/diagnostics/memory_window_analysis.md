# Memory Window Analysis

## Where is chat context built?
- Chat context for LLM calls is constructed in backend/app/main.py, particularly in POST endpoints like `/chat/message` and `/ai/chat/enhanced`.
- Previously, the code could pull in global user memory using UserMemoryService and related methods—this is now removed.
- The main logic now queries the database for only the last N (=30, configurable) messages for the current conversation, in chronological order. This is assembled into the LLM context window as alternating user/assistant messages.

## New Approach
- We set `MAX_CONTEXT_MESSAGES` (default 30, from config.py or env) as the length of per-chat memory.
- Whenever an AI reply is generated, the backend pulls only the last 30 messages from the current conversation and builds context exclusively from them.
- No global/user memory is accessed or injected into the LLM prompt.
- If a document is attached to a message, snippets from that document only may be included for RAG/retrieval context for that turn.

### Benefits
- Chat memory is isolated: only what is visible in the current chat affects replies.
- Privacy and reproducibility improve, and there is no bleed or confusion from past unrelated chats or user-level summaries.
- Debug logs output the number of messages used for each reply.
