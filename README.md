# Audit Assistant API

Backend API service for the AI Audit Assistant — orchestration, authentication, and agentic workflows.

## Tech Stack

- **NestJS 10** (TypeScript)
- **LangGraph.js** — agentic orchestration with stateful graphs
- **Prisma** — PostgreSQL ORM
- **PostgreSQL** — users, engagements, audit trail, LangGraph agent memory
- **Redis** — cache & sessions
- **CASL** — attribute-based access control
- **Passport** — JWT + OIDC/SAML authentication
- **Swagger** — auto-generated API docs

## Features

### Phase 1 — Core
- **Auth**: JWT strategy, role-based guards, CASL ability factory
- **Users & Engagements**: CRUD with member management
- **Agentic Chat**: LangGraph.js graph (policyCheck → queryRouter → retrieve → generate → guardrails → logAuditTrail)
- **Agent Memory**: PostgresSaver (short-term) + PostgresStore (long-term)
- **Audit Trail**: query logs, retrieval events, CSV export
- **RAG Client**: HTTP bridge to audit-rag-engine

### Phase 2 — Workflow
- **Documents**: CRUD with search, filters, metadata
- **Requirements & Controls**: CRUD with framework/category filters
- **Mappings**: traceability matrix, coverage stats, gap identification, CSV/JSON export
- **Evidence Packs**: builder with add/remove items, export
- **Workpapers**: CRUD with RAG-powered draft generation
- **Findings**: CRUD with RAG-powered criteria auto-suggestion

### Phase 3 — Production Hardening
- **SSO**: OIDC/SAML integration
- **Groups**: central role/group management
- **Secrets**: key rotation and secrets management
- **Rate Limiting**: throttle guard with configurable TTL/limit
- **Engagement Lifecycle**: create/close/archive with audit events

## Getting Started

### Prerequisites

- Node.js 18+
- Running infrastructure (see parent `docker-compose.yml`)

### Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your database URLs and API keys

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed development data (optional)
npx prisma db seed

# Start dev server
npm run start:dev
```

### API Docs

Once running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger documentation.

## Project Structure

```
src/
├── auth/                # JWT + OIDC/SAML strategies, guards, CASL
├── users/               # User CRUD
├── engagements/         # Engagement & member management
├── chat/                # LangGraph.js agent invocation
├── agents/              # LangGraph.js graph definitions
├── nodes/               # Agent graph nodes
├── state/               # Agent state schemas (Zod + Annotation)
├── memory/              # PostgresSaver + PostgresStore
├── documents/           # Document management
├── requirements/        # Requirement CRUD
├── controls/            # Control CRUD
├── mappings/            # Requirement-control mappings & traceability
├── evidence-packs/      # Evidence pack builder
├── workpapers/          # Workpaper editor with AI drafting
├── findings/            # Finding editor with AI suggestions
├── groups/              # Group & membership management
├── secrets/             # Key rotation & secrets
├── audit-trail/         # Query logs & retrieval events
├── rag-client/          # HTTP client to audit-rag-engine
├── prisma/              # PrismaService & schema
├── config/              # Configuration & env validation
├── common/
│   ├── filters/         # Exception filters
│   ├── guards/          # Throttle, roles guards
│   └── interceptors/    # Logging interceptor
├── app.module.ts        # Root module
└── main.ts              # Bootstrap, Swagger, CORS
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Development seed data
```

## Testing

```bash
npm run test             # Unit tests
npm run test:cov         # With coverage
npm run test:e2e         # End-to-end tests
```

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

## License

[MIT](LICENSE)
