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
- **SSO**: OIDC/SAML integration (with defensive fallback when not configured)
- **Groups**: central role/group management
- **Secrets**: key rotation and secrets management
- **Rate Limiting**: throttle guard with configurable TTL/limit
- **Engagement Lifecycle**: create/close/archive with audit events

### Phase 4 — Agentic RAG + Deep Analysis
- **Agentic RAG Loop**: planner → tool execution → critic evaluation subgraph
- **RLM Tool**: deep-analysis via Recursive Language Model engine
- **Multi-Model Tier Routing**: small/mid/frontier model selection per node
- **Frontier Synthesis**: polishes complex query output using frontier-tier model
- **Query Complexity Classification**: routes simple vs complex queries

### Phase 5 — Multi-Mode Platform
- **AppMode**: Prisma enum (AUDIT / LEGAL / COMPLIANCE) on Engagement model
- **Mode-Aware Chat**: mode + forceDeepAnalysis passed through LangGraph state
- **Mode-Filtered Engagements**: optional mode query parameter on GET /engagements
- **Expanded DocType**: legal (contract, brief, precedent, pleading) + compliance (regulation, obligation, guidance)
- **Mode-Aware Synthesis**: adapts synthesis prompt for audit/legal/compliance audience

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
│   └── strategies/      # jwt, local, oidc, saml strategies
├── users/               # User CRUD
├── engagements/         # Engagement & member management (mode-filtered)
├── chat/                # LangGraph.js agent invocation (mode + forceDeepAnalysis)
├── agents/              # LangGraph.js graph definitions
│   ├── audit-query.graph.ts       # Main graph (simple vs complex routing)
│   └── agentic-loop.subgraph.ts   # Planner → tools → critic loop
├── nodes/               # Agent graph nodes
│   ├── synthesize.node.ts         # 🔴 Frontier polish (mode-aware)
│   ├── planner.node.ts            # 🟡 Mid-tier planner
│   ├── critic.node.ts             # 🟡 Mid-tier critic
│   └── tools/                     # retrieve-tool, rlm-tool, entity-graph-tool
├── state/               # Agent state (incl. mode, forceDeepAnalysis, complexity)
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
├── rag-client/          # HTTP client to audit-rag-engine (passes app_mode)
├── policy/              # RBAC/ABAC engine + CASL
├── prisma/              # PrismaService & schema
├── config/
│   ├── configuration.ts         # Env validation
│   ├── redis.config.ts          # Redis config
│   └── model-tiers.config.ts    # 🟢🟡🔴 Model tier routing
├── common/
│   ├── filters/         # Exception filters
│   ├── guards/          # Throttle, roles guards
│   └── interceptors/    # Logging interceptor
├── app.module.ts        # Root module
└── main.ts              # Bootstrap, Swagger, CORS
prisma/
├── schema.prisma        # Database schema (AppMode enum, expanded DocType)
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
