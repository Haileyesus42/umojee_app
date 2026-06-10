> **Migrated 2026-05-20** from `umojaairways/booking-ai` to `umojaairways/backend/services/ai-concierge`.
> See top-level `backend/README.md` for the overall picture.

---

# Umoja AI Backend

FastAPI + LangGraph backend for the Umoja AI Concierge. The service exposes a REST API that fronts a LangGraph supervisor orchestrating several specialist agent graphs (Umoja in-house workflow, Amadeus travel services, and a knowledge/SQL powered conversation worker). Conversations, user context, and routing metadata are persisted to MongoDB so the frontend can resume threads, display titles, and show agent routes. 

## Highlights
- FastAPI service (`server/main.py`) with session management endpoints plus `/api/ai/respond` for multi-turn chat.
- LangGraph supervisor (`agent/router.py`) that selects one of three agent ecosystems and synthesizes replies with Groq-hosted `openai/gpt-oss-120b` (or any Groq/OpenAI model you configure).
- MongoDB persistence layer (`server/mongo_repo.py`) for conversations/messages, plus optional SQL + Redis helpers.
- Seed scripts for Mongo (`server/seed_mongo_ndit.py`) and SQL (`server/seed_ndit.py`) to preload Umoja/ND IT content.
- Rich logging (`agent/logging_handlers.py`) and `AI_LOG_PROMPTS` toggle to inspect prompts, tool calls, and routing.

## Repository Layout
| Path | Purpose |
| --- | --- |
| `server/main.py` | FastAPI app, REST endpoints, LangGraph invocation, login gating, logging hooks. |
| `server/mongo_repo.py`, `server/mongo_db.py` | MongoDB client helpers, CRUD for conversations + messages, index creation. |
| `agent/router.py` | LangGraph supervisor that routes to Umoja, Amadeus, or Conversation workflows and synthesizes worker output. |
| `agent/agent.py`, `agent/amadeus/*`, `agent/company_information/*`, `agent/utils/*` | Worker graphs, specialized nodes, and shared state utilities. |
| `server/seed_mongo_ndit.py` | Inserts the Umoja AI product dossier into MongoDB (`umoja_profiles`). |
| `server/seed_ndit.py` | SQLAlchemy models + data loader for ND IT Solutions content (companies, testimonials, AI models, etc.). |
| `.env.example` | Canonical list of configuration keys; copy to `.env` before running the API. |

## Getting Started
### Prerequisites
- Python 3.10+ (LangGraph and FastAPI both support 3.10/3.11).
- MongoDB 5+ (a Mongo Atlas cluster works) for chat persistence.
- Optional: PostgreSQL/MySQL/SQLite for `seed_ndit.py` and Redis if you wire caching nodes.
- Groq or OpenAI API access depending on `LLM_PROVIDER`.

### Setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate        # Windows
   # source .venv/bin/activate     # macOS/Linux
   ```
2. Install backend and agent dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy environment defaults and customize secrets:
   ```bash
   cp .env.example .env
   ```
   The example file uses a few `export NAME=` lines for shell compatibility. When loading through `python-dotenv`, either leave them as-is (they are ignored) or remove the `export` prefix--do **not** include quotes in the actual value.
4. Start MongoDB (and any other external services) and fill in the connection URIs plus API keys.
5. (Optional) Run the seed scripts once you have valid database URLs (see **Seeding reference** below).

## Environment Variables
All variables live in `.env` and are loaded before the LangGraph graph is imported. Refer to `.env.example` for the authoritative list; the tables below summarize the most important knobs.

### LLM & LangGraph
| Variable | Required | Description |
| --- | --- | --- |
| `LLM_PROVIDER` | Yes | `groq` (default) or `openai`. Determines which LangChain chat client is instantiated. |
| `GROQ_API_KEY` | Yes when using Groq | API key for Groq hosted models (e.g., `openai/gpt-oss-120b`). |
| `OPENAI_API_KEY` | Yes when `LLM_PROVIDER=openai` | Standard OpenAI platform key if you switch providers. |
| `LLM_TEMPERATURE` / `LLM_TIMEOUT` / `LLM_MAX_RETRIES` / `LLM_MAX_TOKENS` | Optional | Fine-tuning knobs passed to the LangChain client. |

### Data Stores & Cache
| Variable | Required | Description |
| --- | --- | --- |
| `SQL_DATABASE_URL` | Required for `seed_ndit.py` | SQLAlchemy connection string (e.g., `postgresql+psycopg://user:pass@host/db`). |
| `MONGODB_URI` | Yes | MongoDB connection string used by `server/mongo_db.py`. |
| `MONGODB_DB_NAME` | Yes | Mongo database that holds `ai_conversations`, `ai_messages`, and supporting docs. |
| `REDIS_URL` | Optional | Redis endpoint for any redis-powered nodes/tools (none are mandatory by default). |

### External APIs
| Variable | Purpose |
| --- | --- |
| `AERODATABOX_API_KEY` | Real-time flight status + schedule enrichment inside the travel agents. |
| `OPENROUTE_API_KEY`, `OPENCAGE_API_KEY`, `OPENWEATHERMAP_API_KEY` | Routing/geocoding/weather intel for itinerary answers. |
| `AMADEUS_API_URL`, `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | OAuth + base URL for the Amadeus workflow. |

### Server & Application Settings
| Variable | Description |
| --- | --- |
| `PORT` | Port FastAPI/uvicorn should bind to (default `8000`). |
| `BASE_URL` | Public URL exposed to downstream tools; used in link generation. |
| `CLIENT_APP_ORIGIN` | Allowed CORS origin for the front-end (use `*` for local prototyping). |
| `LOGIN_URL` | URL returned when unauthenticated users try to chat. |
| `AI_LOG_PROMPTS` | `true/false` flag toggling verbose PrettyLogHandler output (prompts, JSON routes, tools). |

### LangSmith (Optional)
All LangSmith related keys in `.env.example` are prefixed with `export`. Provide real values to enable tracing telemetry in LangSmith:
| Variable | Description |
| --- | --- |
| `LANGSMITH_TRACING` | `true` to send traces. |
| `LANGSMITH_ENDPOINT` | API endpoint, defaults to `https://api.smith.langchain.com`. |
| `LANGSMITH_API_KEY` | LangSmith token. |
| `LANGSMITH_PROJECT` | Logical project name used to group traces. |

## Running the API
```bash
uvicorn server.main:app --reload --host 0.0.0.0 --port ${PORT:-8000}
```

The `server/main.py` entrypoint automatically:
- loads `.env` before importing any LangGraph code (so Groq/OpenAI keys are registered),
- sets up CORS using `CLIENT_APP_ORIGIN`,
- ensures Mongo indexes exist on startup and tears down the client on shutdown,
- injects `PrettyLogHandler` callbacks whenever `AI_LOG_PROMPTS=true`.

You can also run `python -m server.main` which uses the same uvicorn settings and respects `PORT`.

## REST API Surface
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/ai/hello` | Health probe describing the graph, Groq configuration status, and version info. |
| `POST` | `/api/ai/session/new` | Creates a conversation ID for a given `user_id`. Includes `login_url` hints for guests. |
| `POST` | `/api/ai/session/list` | Returns the user's conversations with timestamps, titles, and the last AI message preview. |
| `POST` | `/api/ai/session/start` | Loads the message history for a chosen conversation. |
| `POST` | `/api/ai/session/delete` | Deletes a conversation plus all of its messages. Enforces ownership. |
| `POST` | `/api/ai/respond` | Appends the user message, injects optional `user_data` context, runs the LangGraph supervisor, persists AI replies, updates titles, and returns the streamed messages + routing metadata. |

Sample request:
```bash
curl -X POST http://localhost:8000/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo-user-1",
    "conversation_id": null,
    "message": "Help me rebook my Nairobi flight and send weather info.",
    "is_logged_in": true,
    "user_data": {
      "firstName": "Amani",
      "email": "amani@example.com",
      "location": {"lat": -1.286389, "lon": 36.817223, "city": "Nairobi"}
    }
  }'
```

## Agent Orchestration
- `agent/router.py` compiles a LangGraph `StateGraph` with nodes: the top-level orchestrator, `Umoja_Workflow`, `Amadeus_Workflow`, `Conversation_Workflow`, and a `synthesizer` node that unifies worker output.
- Each worker graph (see `agent/agent.py`, `agent/amadeus/*`, `agent/company_information/*`) exposes specialized tools: booking/luggage/seating/check-in, Amadeus travel APIs, and Mongo/SQL powered company knowledge.
- `_trim_messages` enforces token limits, `_orchestrator_decide` enforces the JSON schema contract, and forwarders allow the supervisor to send raw worker messages when needed.
- User context (`user_id`, profile fields, geo coordinates, frontend origin) is injected as a `SystemMessage` before invoking the supervisor so every agent sees personalization hints.

## Seeding Reference
- `server/seed_mongo_ndit.py` populates the `umoja_profiles` collection with a detailed Umoja AI dossier (pillars, governance, integration partners, personas). Run with `python server/seed_mongo_ndit.py` after Mongo credentials are set.
- `server/seed_ndit.py` builds SQLAlchemy models for companies, services, testimonials, values, and AI models, then inserts ND IT's canonical data. Supply `SQL_DATABASE_URL` (or `DATABASE_URL` if you prefer) and run `python server/seed_ndit.py`.

## Troubleshooting & Tips
- **Groq not configured:** `/api/ai/respond` returns a friendly stub unless `GROQ_API_KEY` (or your OpenAI credentials) are present. Check `/api/ai/hello` to confirm configuration.
- **Rate limits:** Provider 429 errors are converted to HTTP 429 with a human readable message; clients should retry with backoff.
- **Logging:** Set `AI_LOG_PROMPTS=true` to print LangGraph routing, JSON decisions, and tool responses to the server console via `PrettyLogHandler`.
- **Conversation hygiene:** Use `/api/ai/session/delete` in the UI to keep Mongo collections lean. Indexes are created automatically via `ensure_indexes()` on startup.

With the README and `.env.example` aligned, you can quickly bootstrap new environments, inspect all required credentials, and expose the Umoja AI backend to any frontend or orchestration platform.
