# Backend architecture

Two services. Eventually-consistent state, no shared runtime.

## services/api

Node 20 + TypeScript. The main REST API that the frontends talk to.

- Booking, accounts, payments, ground-ops endpoints.
- MongoDB for persistence.
- JWT auth issuer.
- Calls Amadeus + Stripe + email providers.

## services/ai-concierge

Python 3.11 + FastAPI + LangGraph. Conversational AI assistant.

- LangGraph supervisor routes to one of three agent ecosystems: Umoja in-house, Amadeus travel, generic conversation.
- LLM: Groq-hosted `openai/gpt-oss-120b` (configurable).
- MongoDB for conversation persistence (separate DB from api).
- pgvector for embeddings, Redis for response cache.
- Called directly from `booking` and `mobile` for the chat UI.

## Why two services?

- Different runtimes (Node vs Python) means independent scaling and deploy cadence.
- AI traffic spikes shouldn't degrade booking.
- The AI service is more experimental; isolating limits blast radius.

## Coming work

- Container registry images for both, deploy via review apps (one URL per MR).
- Shared OpenAPI spec generated from `api`, consumed as a TypeScript client by all frontends.
- Migrate secrets from `.env` to Infisical.
