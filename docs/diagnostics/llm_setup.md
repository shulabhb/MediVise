# Local LLM Setup (Ollama)

1) Install and start Ollama

- macOS: https://ollama.com/download
- Start the server:

```bash
ollama serve
```

2) Pull the model

```bash
ollama pull phi4-mini
```

3) Configure the backend

Create a file `backend/.env` with:

```bash
LLM_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=phi4-mini
```

4) Start the backend

```bash
cd backend
chmod +x run.sh
./run.sh
```

5) Verify health

- Backend: `http://127.0.0.1:8000/ai/health`
- Ollama: `curl http://127.0.0.1:11434/api/tags`

If the backend still shows "Unable to reach AI", confirm the model is listed by `/api/tags` and that `.env` is loaded (run.sh echoes the values on startup).
