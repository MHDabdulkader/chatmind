# ChatMind

Chat with your documents and the web. Upload files or URLs, group them into projects, and ask questions. The assistant searches your documents first, falls back to web search when allowed, and remembers the conversation.

Single repo, two apps:

```
chatmind/
├── backend/    FastAPI + LangChain/LangGraph API
├── frontend/   Web UI (planned)
└── README.md
```

## Features

- Streaming chat over Server-Sent Events, with tool steps and token usage
- Conversation memory per `thread_id`
- RAG over uploaded `.txt`, `.md`, `.pdf` files and web URLs
- Projects: documents are scoped per project, so search never leaks across projects
- Web search and page reading, with a per-request on/off switch
- Project stats and "key findings" synthesis with real citations
- Prompt Library: pin, search, and run saved prompt templates
- Free-tier friendly: runs on a free OpenRouter model and local embeddings

## Status

| Area                                    | Status      |
| --------------------------------------- | ----------- |
| Chat stream, memory, tools              | Done        |
| Documents (upload, URL, status, delete) | Done        |
| Projects, stats, synthesis              | Done        |
| Web search + page reading               | Done        |
| Prompt Library                          | In progress |
| Conversation history (threads)          | Planned     |
| Model selector endpoint                 | Planned     |
| PDF export                              | Planned     |
| Frontend                                | Planned     |

## Tech stack

| Layer        | Tools                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| API          | FastAPI, Uvicorn, SQLAlchemy, SQLite                                              |
| Agent        | LangChain `create_agent`, LangGraph checkpointer, middleware (retry, call limits) |
| Model        | OpenRouter (`nvidia/nemotron-3.5-super-vl:free` by default)                       |
| Embeddings   | `BAAI/bge-small-en-v1.5` via HuggingFace, runs locally                            |
| Vector store | Chroma (persistent)                                                               |
| Web search   | Tavily (optional) with DuckDuckGo fallbacks                                       |

## Getting started

### Prerequisites

- Python 3.12 or 3.13 recommended (3.14 works but prints a harmless Pydantic V1 warning)
- An OpenRouter API key
- About 2 GB of disk for the PyTorch and embedding model download

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then fill in OPENROUTER_API_KEY
uvicorn app.main:app --reload --reload-dir app --port 8000
```

Check it: `http://localhost:8000/health` returns `{"status": "ok"}`. Interactive docs are at `http://localhost:8000/docs`.

The first start downloads the embedding model, which takes a while. Later starts take about 10 seconds.

### Frontend

Not built yet. It will live in `frontend/` and talk to the API at `http://localhost:8000`.

## Environment variables (`backend/.env`)

| Variable             | Default                             | Purpose                            |
| -------------------- | ----------------------------------- | ---------------------------------- |
| `OPENROUTER_API_KEY` | required                            | Model access                       |
| `DEFAULT_MODEL`      | `nvidia/nemotron-3.5-super-vl:free` | Model slug                         |
| `EMBEDDING_MODEL`    | `BAAI/bge-small-en-v1.5`            | Local embedding model              |
| `DATABASE_URL`       | `sqlite:///./data/app.db`           | App database                       |
| `CHROMA_DIR`         | `./data/chroma_db`                  | Vector store                       |
| `UPLOAD_DIR`         | `./data/uploads`                    | Uploaded files                     |
| `CORS_ORIGINS`       | `http://localhost:3000`             | Comma-separated allowed origins    |
| `TAVILY_API_KEY`     | empty                               | Optional, more reliable web search |

## Backend layout

```
backend/app/
├── main.py            App setup, CORS, startup (tables, default project, seeds)
├── config.py          Settings from .env
├── db.py              SQLAlchemy engine and session
├── models.py          Tables: documents, projects, prompts
├── schemas.py         Request/response types
├── api/               HTTP routes only
│   ├── chat.py        POST /chat (SSE)
│   ├── documents.py   upload, URL, list, delete
│   ├── projects.py    CRUD, stats, synthesis
│   └── prompts.py     library CRUD, pin, run
├── core/              AI logic
│   ├── llm.py         Model factory
│   ├── agent.py       Agent, middleware, memory
│   ├── tools.py       search_docs, web_search, read_webpage
│   ├── rag.py         Chunking, embeddings, Chroma
│   ├── synthesis.py   Key findings with citations
│   └── context.py     Per-request context (project, web on/off)
└── services/          Helpers (ingest, events)
```

`api/` calls `core/` and `services/`. `core/` never imports from `api/`.

## API

### Chat

`POST /chat`

```json
{
  "message": "How much is the Pro plan?",
  "thread_id": "optional, reuse it to keep memory",
  "project_id": "optional, scopes document search",
  "model": "optional model slug",
  "allow_web": true
}
```

The response is a Server-Sent Events stream:

| Event    | Data                             | Meaning                      |
| -------- | -------------------------------- | ---------------------------- |
| `thread` | `{"thread_id": "..."}`           | Thread for this conversation |
| `step`   | `{"tool": "...", "args": {...}}` | The agent called a tool      |
| `token`  | `"text"`                         | A piece of the answer        |
| `done`   | `{"seconds", "steps", "usage"}`  | Finished                     |
| `error`  | `"message"`                      | Failed                       |

Browsers can't use `EventSource` for POST. Read the stream with `fetch` and a reader.

### Documents

| Method | Path                     | Purpose                                           |
| ------ | ------------------------ | ------------------------------------------------- |
| POST   | `/documents`             | Upload a file (`multipart`: `file`, `project_id`) |
| POST   | `/documents/url`         | Add a web page `{"url", "project_id"}`            |
| GET    | `/documents?project_id=` | List with status                                  |
| GET    | `/documents/{id}`        | One document                                      |
| DELETE | `/documents/{id}`        | Delete file and its vectors                       |

Status goes `indexing` then `indexed`, or `failed` with a reason in `error`.

### Projects

| Method     | Path                       | Purpose                                    |
| ---------- | -------------------------- | ------------------------------------------ |
| POST / GET | `/projects`                | Create / list                              |
| GET        | `/projects/{id}`           | One project                                |
| GET        | `/projects/{id}/stats`     | Counts of sources, indexed, failed, chunks |
| POST       | `/projects/{id}/synthesis` | Key findings with citations                |
| DELETE     | `/projects/{id}`           | Delete project and its documents           |

### Prompts

| Method               | Path                            | Purpose                                   |
| -------------------- | ------------------------------- | ----------------------------------------- |
| GET                  | `/prompts?q=&category=&pinned=` | List and search                           |
| POST                 | `/prompts`                      | Create                                    |
| GET / PATCH / DELETE | `/prompts/{id}`                 | Read / edit / delete                      |
| POST                 | `/prompts/{id}/pin`             | Toggle pin                                |
| POST                 | `/prompts/{id}/run`             | Fill `{input}` and run `{"input": "..."}` |

## Quick test

```powershell
curl.exe -F "file=@notes.txt" -F "project_id=default" http://localhost:8000/documents
curl.exe http://localhost:8000/documents

'{"message":"Summarize my notes","thread_id":"t1"}' | Set-Content body.json
curl.exe -N -X POST http://localhost:8000/chat -H "Content-Type: application/json" --data "@body.json"
```

## Known limits

- **Free model:** rate limits apply, and tool calling and structured output can be unreliable. Failures are caught and logged.
- **Memory:** conversation memory lives in process (`InMemorySaver`) and resets when the server restarts. Documents and projects persist.
- **Privacy:** free model endpoints may log prompts. Don't upload sensitive documents.
- **Security (before deploying):** there is no auth, and `/documents/url` fetches any URL it is given, so block private IP ranges. Web pages are untrusted text that can try to steer the model, so don't add tools that act on the outside world.
- **Search:** free scraping backends are unreliable from some networks. Set `TAVILY_API_KEY` for dependable results.
- **PDFs:** text PDFs only. Scans need OCR.
- **Schema changes:** `create_all` never alters existing tables. In development, delete `backend/data/app.db` after changing columns.

## Roadmap

1. Prompt Library finished and tested
2. Conversation history (threads) for the sidebar
3. Model selector endpoint
4. PDF export of project findings
5. Frontend
6. Persistent memory (SQLite or Postgres checkpointer)
7. Auth and deployment

## Development notes

- Call each tool directly once outside the agent when debugging. Retry middleware can hide a broken tool.
- Watch only app code to avoid reload storms: `uvicorn app.main:app --reload --reload-dir app`.
- Keep scratch scripts in `backend/tests/`, not `backend/`.
