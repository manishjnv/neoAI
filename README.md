# neoAI — Free-Tier AI Chat Platform

> **Production URL:** `neoAI.trendsmap.in`
> **Monthly Cost Target:** $0.00

A production-ready AI chat platform running entirely on free-tier cloud infrastructure with Cloudflare Zero Trust authentication, multiple AI model providers, and automated deployment.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Zero Trust  │  │   WAF + DDoS │  │  DNS (trendsmap │  │
│  │  (Google SSO)│  │   Protection │  │  .in subdomain) │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────────┘  │
│         │                 │                                │
│  ┌──────▼─────────────────▼──────────────────────────┐    │
│  │           Cloudflare Pages (Static + Edge)         │    │
│  │  ┌─────────────────┐  ┌────────────────────────┐  │    │
│  │  │ React SPA (Vite)│  │ Pages Functions (Hono)  │  │    │
│  │  │ Static assets   │  │ /api/* → Edge Workers   │  │    │
│  │  └─────────────────┘  └───────────┬────────────┘  │    │
│  └───────────────────────────────────┼────────────────┘   │
│                                      │                     │
│  ┌───────────────┐  ┌───────────────┐│  ┌──────────────┐  │
│  │ D1 Database   │  │ KV Namespace  ││  │ Workers AI   │  │
│  │ (SQLite edge) │  │ (Rate flags)  ││  │ (10K neurons │  │
│  │ 5M reads/day  │  │ 100K reads/day││  │  /day free)  │  │
│  └───────────────┘  └───────────────┘│  └──────────────┘  │
└──────────────────────────────────────┼─────────────────────┘
                                       │
              ┌────────────────────────┼─────────────────┐
              │    External AI APIs    │                  │
              │  ┌──────────┐ ┌───────▼──┐ ┌──────────┐ │
              │  │  Google   │ │   Groq   │ │  Hugging │ │
              │  │  Gemini   │ │  (free)  │ │  Face    │ │
              │  │  (free)   │ │          │ │  (free)  │ │
              │  └──────────┘ └──────────┘ └──────────┘ │
              └──────────────────────────────────────────┘
```

---

## Technology Choices & Free-Tier Justification

| Component | Technology | Why Chosen | Free-Tier Limits |
|-----------|-----------|------------|-----------------|
| **Frontend** | React + Vite + Tailwind | Fast builds, tiny bundles, edge-friendly static output | N/A (static files) |
| **Backend** | Hono on Cloudflare Pages Functions | Edge-native, zero cold start, no idle cost | 100K requests/day |
| **Database** | Cloudflare D1 (SQLite at edge) | Serverless, zero idle, auto-replicated | 5M reads/day, 100K writes/day, 5GB |
| **Cache/KV** | Cloudflare KV | Global low-latency key-value | 100K reads/day, 1K writes/day |
| **AI (Primary)** | Google Gemini API | Best free tier: 15 RPM, 1M tokens/day | 1,500 requests/day |
| **AI (Secondary)** | Groq | Blazing fast inference, generous free tier | Rate-limited free access |
| **AI (Edge)** | Cloudflare Workers AI | Zero-latency edge inference, no API key needed | 10,000 neurons/day |
| **AI (Fallback)** | HuggingFace Inference | Wide model selection | Rate-limited free access |
| **Auth** | Cloudflare Zero Trust + Google SSO | Zero-cost enterprise auth, no user DB needed | 50 users free |
| **WAF** | Cloudflare (built-in) | DDoS protection, bot management included | Free on all plans |
| **Hosting** | Cloudflare Pages | Global CDN, auto SSL, custom domains | Unlimited sites, 500 builds/month |
| **CI/CD** | GitHub Actions | Auto-deploy on push | 2,000 min/month (private), unlimited (public) |
| **Logging** | Console.log (structured JSON) | Free via CF dashboard real-time logs | Free (Workers Trace Events) |
| **DNS** | Cloudflare DNS | Required for Zero Trust & Pages | Free |

### Monthly Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Pages | Hosting + Functions | $0 |
| Cloudflare D1 | Database | $0 |
| Cloudflare KV | Cache flags | $0 |
| Cloudflare Workers AI | Edge AI | $0 |
| Cloudflare Zero Trust | Auth (≤50 users) | $0 |
| Google Gemini API | Primary AI | $0 |
| Groq API | Secondary AI | $0 |
| HuggingFace Inference | Fallback AI | $0 |
| GitHub Actions | CI/CD | $0 |
| **Total** | | **$0.00/month** |

---

## Project Structure

```
neoAI/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
├── db/
│   └── schema.sql              # D1 database schema
├── functions/
│   └── api/
│       └── [[route]].ts        # Pages Functions catch-all → Hono
├── public/
│   ├── _headers                # Cloudflare Pages security headers
│   ├── _redirects              # Redirect rules
│   └── favicon.svg             # App icon
├── server/
│   ├── index.ts                # Hono app entry point
│   ├── types.ts                # Server type definitions
│   ├── lib/
│   │   ├── env.ts              # Environment validation
│   │   ├── errors.ts           # Custom error classes
│   │   ├── id.ts               # ID generation utilities
│   │   ├── logger.ts           # Structured logging
│   │   └── pii-patterns.ts     # PII detection engine
│   ├── middleware/
│   │   ├── auth.ts             # CF Access JWT verification
│   │   ├── error-handler.ts    # Global error handler
│   │   ├── pii-guard.ts        # PII blocking middleware
│   │   ├── rate-limiter.ts     # D1-backed rate limiting
│   │   └── request-logger.ts   # Request/response logging
│   ├── routes/
│   │   ├── chat.ts             # POST /api/chat (streaming)
│   │   ├── health.ts           # GET /api/health
│   │   ├── models.ts           # GET /api/models
│   │   └── sessions.ts         # CRUD /api/sessions
│   └── services/
│       ├── database.ts         # D1 database service
│       └── ai/
│           ├── types.ts        # AI provider interface
│           ├── registry.ts     # Provider registry/router
│           ├── gemini.ts       # Google Gemini provider
│           ├── groq.ts         # Groq provider
│           ├── workers-ai.ts   # Cloudflare Workers AI
│           └── huggingface.ts  # HuggingFace provider
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component
│   ├── index.css               # Tailwind + global styles
│   ├── types/
│   │   └── index.ts            # Frontend type definitions
│   ├── lib/
│   │   └── api.ts              # API client with streaming
│   ├── hooks/
│   │   ├── useAuth.ts          # Authentication state
│   │   ├── useChat.ts          # Chat state + streaming
│   │   ├── useModels.ts        # Model listing/selection
│   │   └── useSessions.ts      # Session management
│   └── components/
│       ├── ChatInput.tsx       # Message input with auto-resize
│       ├── ChatWindow.tsx      # Main chat area
│       ├── ErrorBoundary.tsx   # React error boundary
│       ├── ErrorFallback.tsx   # Error display UI
│       ├── Layout.tsx          # App layout orchestrator
│       ├── LoadingSpinner.tsx  # Loading states
│       ├── MessageBubble.tsx   # Chat message display
│       ├── ModelSelector.tsx   # AI model picker dropdown
│       └── Sidebar.tsx         # Session list sidebar
├── index.html                  # SPA entry HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── wrangler.toml               # Cloudflare configuration
├── .env.example                # Environment template
├── .dev.vars.example           # Wrangler dev secrets template
├── .gitignore
└── README.md
```

---

## Setup Guide

### Prerequisites

- Node.js 20+
- npm 10+
- A Cloudflare account (free tier)
- A GitHub account
- A Google Cloud project (for Gemini API key)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/neoai.git
cd neoai
npm install
```

### 2. Configure Cloudflare Resources

```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create neoai-db
# → Copy the database_id into wrangler.toml

# Create KV namespace
npx wrangler kv namespace create KV
# → Copy the id into wrangler.toml

# Run database migrations
npx wrangler d1 execute neoai-db --file=./db/schema.sql
```

### 3. Configure Cloudflare Zero Trust

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. **Settings → Authentication → Add Google as Identity Provider**
   - Create OAuth credentials in Google Cloud Console
   - Add Client ID and Secret to Cloudflare
3. **Access → Applications → Add an Application**
   - Type: Self-hosted
   - Application domain: `neoai.trendsmap.in`
   - Session duration: 24h
   - Add a policy: Allow → Emails ending in your domain
4. Copy the **Application Audience (AUD)** tag
5. Note your **Team domain** (e.g., `yourteam.cloudflareaccess.com`)

### 4. Get AI Provider API Keys

| Provider | Get Key |
|----------|---------|
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) |
| HuggingFace | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| Workers AI | Automatic (bound in wrangler.toml) |

### 5. Set Secrets

```bash
# Set production secrets (never stored in code)
npx wrangler pages secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler pages secret put CF_ACCESS_AUD
npx wrangler pages secret put GEMINI_API_KEY
npx wrangler pages secret put GROQ_API_KEY
npx wrangler pages secret put HF_API_KEY
```

### 6. Local Development

```bash
# Copy secrets template
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys

# Start Vite dev server (frontend)
npm run dev

# Or build & run full stack locally
npm run dev:full
```

### 7. Deploy

```bash
# Manual deploy
npm run build
npm run deploy

# Or push to GitHub → auto-deploys via Actions
git push origin main
```

### 8. Custom Domain Setup

1. In Cloudflare Pages project settings → Custom domains
2. Add `neoai.trendsmap.in`
3. Cloudflare auto-provisions SSL and DNS

---

## GitHub Actions CI/CD Setup

Add these secrets in GitHub repo **Settings → Secrets → Actions**:

| Secret | Where to get it |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | CF dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard → any domain → Overview → right sidebar |

The pipeline runs automatically on push to `main`:
1. Install dependencies
2. Type check
3. Build frontend
4. Deploy to Cloudflare Pages
5. Run D1 migrations

---

## Security Architecture

### Authentication Flow
```
User → Cloudflare Edge → Zero Trust Check
  ├─ No valid session → Redirect to Google SSO
  ├─ Google SSO success → CF Access JWT issued
  └─ JWT in CF-Access-JWT-Assertion header → Verified by server middleware
```

### Security Layers

| Layer | Protection |
|-------|-----------|
| **Cloudflare WAF** | DDoS, bot mitigation, OWASP rules (free) |
| **Zero Trust** | Only authenticated users reach the app |
| **JWT Verification** | Server validates CF Access tokens with JWKS |
| **PII Guard** | Blocks sensitive data before sending to AI |
| **Rate Limiting** | Per-user hourly/daily limits via D1 |
| **Input Validation** | Message length, required fields, type checks |
| **Security Headers** | CSP, X-Frame-Options, HSTS via `_headers` |
| **No PII in Logs** | All log strings are PII-masked automatically |

### PII Detection

The PII guard middleware detects and blocks:
- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers
- API keys and tokens (sk-*, ghp_*, AKIA*, etc.)
- Passwords (password=, pwd=, etc.)
- Street addresses
- National IDs (Aadhaar, PAN)

---

## Performance Strategy

| Strategy | Implementation |
|----------|---------------|
| **Streaming responses** | AI responses stream via ReadableStream → real-time UX |
| **Edge-first** | Hono runs on Cloudflare edge (300+ PoPs worldwide) |
| **Zero cold start** | Pages Functions execute instantly (no container spin-up) |
| **Static asset caching** | `Cache-Control: immutable` on `/assets/*` (1 year) |
| **Code splitting** | React chunk separated from app code |
| **Optimized bundles** | Vite + esbuild minification |
| **Non-blocking DB writes** | `waitUntil()` for message storage, analytics |
| **Lazy sidebar data** | Sessions loaded independently of chat |

---

## Staying Within Free Tier Limits

### Monitoring Thresholds

| Resource | Free Limit | Design Budget | Safety Margin |
|----------|-----------|---------------|--------------|
| Pages requests | 100K/day | ~80K/day | 20% |
| D1 reads | 5M/day | ~2M/day | 60% |
| D1 writes | 100K/day | ~50K/day | 50% |
| KV reads | 100K/day | ~10K/day | 90% |
| Workers AI | 10K neurons/day | ~5K/day | 50% |
| Gemini API | 1,500 req/day | ~1,000/day | 33% |

### Design Decisions for Cost Control

1. **Rate limiting** (50/hour, 500/day per user) prevents any single user from exhausting quotas
2. **D1 over Postgres** — zero idle cost, generous free tier
3. **KV for ephemeral flags** — cheaper than D1 for rate-limit cleanup markers
4. **No external logging** — structured console.log viewed via CF dashboard
5. **No external analytics** — lightweight usage_log table in D1
6. **Conversation history limit** — 50 messages loaded per session (keeps D1 reads low)
7. **Non-blocking writes** — `waitUntil()` prevents write operations from increasing response latency

---

## Upgrade-to-Paid Scaling Roadmap

This architecture is designed for incremental scaling without rewrites:

### Phase 1: More Users (Free → $5/month)
- Upgrade to Cloudflare Workers Paid ($5/mo): 10M requests/month
- D1 grows automatically with paid plan
- Add Cloudflare Durable Objects for WebSocket-based real-time chat

### Phase 2: Premium Models ($5 → $50/month)
- Add OpenAI GPT-4, Anthropic Claude as paid model options
- Implement usage-based billing per user with Stripe
- Add model-specific rate limits (free users get free models only)

### Phase 3: Multi-Region Scale ($50 → $200/month)
- D1 automatic read replicas (already edge-distributed)
- Add Cloudflare R2 for file uploads / image generation storage
- Implement conversation export/import

### Phase 4: Enterprise ($200+/month)
- Cloudflare Workers for Platforms (multi-tenant isolation)
- Custom AI model fine-tuning via Workers AI
- SSO via SAML (CF Access supports it)
- Audit logging to R2
- Dedicated origin with Cloudflare Tunnel

### Migration Path

| From (Free) | To (Paid) | Migration Effort |
|-------------|-----------|-----------------|
| Pages Functions | Workers (same code, Hono) | Config change only |
| D1 SQLite | D1 (same, just higher limits) | Zero migration |
| KV | KV (same, higher limits) | Zero migration |
| Console logging | Logpush to R2 | Add wrangler config |
| Single zone | Multi-zone | DNS routing config |

**Key principle:** The code never changes — only Cloudflare plan limits and `wrangler.toml` configuration change as you scale.

---

## Local Development in VS Code

### Recommended Extensions

- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets  
- Cloudflare Workers (official)

### VS Code Settings

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "cloudflare.cloudflare-workers-bindings-extension"
  ]
}
```

### Development Workflow

1. `npm run dev` — Start Vite dev server (hot reload, port 5173)
2. Edit frontend code in `src/` — changes reflect instantly
3. `npm run dev:full` — Build + run with Wrangler (full stack with D1/KV)
4. `.dev.vars` — Local secrets (never committed)

---

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | System health check |
| `/api/me` | GET | Yes | Current user info |
| `/api/models` | GET | Yes | List available AI models |
| `/api/chat` | POST | Yes | Send message (streaming response) |
| `/api/sessions` | GET | Yes | List user's sessions |
| `/api/sessions/:id` | GET | Yes | Get session + messages |
| `/api/sessions` | POST | Yes | Create new session |
| `/api/sessions/:id` | PATCH | Yes | Rename session |
| `/api/sessions/:id` | DELETE | Yes | Delete session |

### Chat Request

```json
POST /api/chat
{
  "message": "Hello, explain quantum computing",
  "model": "gemini-2.0-flash",
  "sessionId": "ses_xxx" // optional, creates new if omitted
}
```

Response: streaming `text/plain` with `X-Session-Id` header.

---

## License

MIT
