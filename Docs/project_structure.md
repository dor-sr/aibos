# AI Business OS - Project Structure

## Overview

This document defines the project structure for the AI Business OS monorepo. All file creation, folder organization, and structural changes must follow these guidelines.

## Root Structure

```
aibos/
├── apps/
│   ├── web/                      # Next.js web application
│   └── worker/                   # Background job worker
├── packages/
│   ├── core/                     # Shared types and utilities
│   ├── data-model/               # Database schemas and migrations
│   ├── connectors/               # Data source integrations
│   ├── ai-runtime/               # LLM abstraction layer
│   ├── analytics-agent/          # Analytics Agent logic
│   ├── marketing-agent/          # Marketing Agent scaffold
│   ├── commerce-ops-agent/       # Commerce Ops Agent scaffold
│   └── vertical-packs/           # Vertical configurations
├── Docs/                         # Project documentation
├── .cursor/                      # Cursor IDE configuration
├── turbo.json                    # Turborepo configuration
├── pnpm-workspace.yaml           # pnpm workspace config
├── package.json                  # Root package.json
├── tsconfig.base.json            # Base TypeScript config
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore                    # Git ignore rules
└── README.md                     # Project README
```

---

## Apps

### `/apps/web` - Next.js Web Application

```
apps/web/
├── app/
│   ├── (auth)/                   # Auth route group (public)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard route group (protected)
│   │   ├── overview/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── connectors/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── onboarding/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...supabase]/
│   │   │       └── route.ts
│   │   ├── connectors/
│   │   │   └── route.ts
│   │   ├── analytics/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   ├── charts/                   # Chart components
│   └── forms/                    # Form components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Auth middleware
│   ├── utils.ts                  # Utility functions
│   └── hooks/                    # Custom React hooks
├── public/                       # Static assets
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

#### Naming Conventions (web)
- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)
- **Components**: PascalCase (e.g., `MetricCard.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useWorkspace.ts`)

---

### `/apps/worker` - Background Job Worker

```
apps/worker/
├── src/
│   ├── index.ts                  # Entry point
│   ├── jobs/
│   │   ├── index.ts              # Job registry
│   │   ├── sync-shopify.ts       # Shopify sync job
│   │   ├── sync-stripe.ts        # Stripe sync job
│   │   ├── generate-report.ts    # Report generation job
│   │   └── detect-anomalies.ts   # Anomaly detection job
│   ├── scheduler/
│   │   └── index.ts              # Cron scheduler setup
│   └── lib/
│       └── queue.ts              # Job queue utilities
├── tsconfig.json
└── package.json
```

#### Naming Conventions (worker)
- **Jobs**: kebab-case (e.g., `sync-shopify.ts`)
- **Modules**: kebab-case (e.g., `queue.ts`)

---

## Packages

### `/packages/core` - Shared Types and Utilities

```
packages/core/
├── src/
│   ├── index.ts                  # Public exports
│   ├── types/
│   │   ├── index.ts
│   │   ├── workspace.ts          # Workspace types
│   │   ├── user.ts               # User types
│   │   └── common.ts             # Common types
│   ├── config/
│   │   ├── index.ts
│   │   └── env.ts                # Environment configuration
│   ├── logger/
│   │   └── index.ts              # Logging utilities
│   └── utils/
│       ├── index.ts
│       ├── dates.ts              # Date utilities
│       └── currency.ts           # Currency formatting
├── tsconfig.json
└── package.json
```

---

### `/packages/data-model` - Database Layer

```
packages/data-model/
├── src/
│   ├── index.ts                  # Public exports
│   ├── db.ts                     # Database client
│   ├── schema/
│   │   ├── index.ts              # Schema exports
│   │   ├── workspace.ts          # Workspace table
│   │   ├── users.ts              # Users and memberships
│   │   ├── connectors.ts         # Connector configurations
│   │   ├── ecommerce.ts          # Ecommerce entities
│   │   ├── saas.ts               # SaaS entities
│   │   ├── reports.ts            # Reports and anomalies
│   │   └── relations.ts          # Table relations
│   ├── migrations/               # Drizzle migrations
│   └── seed/
│       └── index.ts              # Seed data
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

---

### `/packages/connectors` - Data Integrations

```
packages/connectors/
├── src/
│   ├── index.ts                  # Public exports
│   ├── types.ts                  # Connector interfaces
│   ├── base.ts                   # Base connector class
│   ├── shopify/
│   │   ├── index.ts
│   │   ├── client.ts             # Shopify API client
│   │   ├── auth.ts               # OAuth handling
│   │   ├── orders.ts             # Order sync
│   │   ├── products.ts           # Product sync
│   │   └── customers.ts          # Customer sync
│   ├── stripe/
│   │   ├── index.ts              # Module exports
│   │   ├── client.ts             # Stripe API client
│   │   ├── connector.ts          # Main connector class
│   │   ├── customers.ts          # Customer sync
│   │   ├── plans.ts              # Plans/prices sync  
│   │   ├── subscriptions.ts      # Subscription sync
│   │   ├── invoices.ts           # Invoice sync
│   │   ├── webhooks.ts           # Webhook handlers
│   │   └── metrics.ts            # MRR/ARR calculations
│   ├── webhooks/                 # Unified webhook gateway
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # Webhook types
│   │   ├── gateway.ts            # Main gateway service
│   │   ├── verifiers/            # Signature verification
│   │   │   ├── index.ts
│   │   │   ├── stripe.ts
│   │   │   └── shopify.ts
│   │   └── processors/           # Event processors
│   │       ├── index.ts
│   │       ├── stripe.ts
│   │       └── shopify.ts
│   ├── ga4/
│   │   └── index.ts              # Scaffold
│   └── tiendanube/
│       └── index.ts              # Scaffold
├── tsconfig.json
└── package.json
```

---

### `/packages/ai-runtime` - LLM Abstraction

```
packages/ai-runtime/
├── src/
│   ├── index.ts                  # Public exports
│   ├── types.ts                  # Provider interfaces
│   ├── providers/
│   │   ├── index.ts
│   │   ├── openai.ts             # OpenAI implementation
│   │   └── base.ts               # Base provider
│   ├── tools/
│   │   ├── index.ts
│   │   └── tool-registry.ts      # Tool definitions
│   └── prompts/
│       ├── index.ts
│       └── templates.ts          # Prompt templates
├── tsconfig.json
└── package.json
```

---

### `/packages/analytics-agent` - Analytics Agent

```
packages/analytics-agent/
├── src/
│   ├── index.ts                  # Public exports
│   ├── agent.ts                  # Main agent class
│   ├── nlq/
│   │   ├── index.ts
│   │   ├── intent-detector.ts    # Intent classification
│   │   ├── query-mapper.ts       # Query pattern mapping
│   │   └── response-formatter.ts # Response formatting
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── ecommerce.ts          # Ecommerce metrics
│   │   └── saas.ts               # SaaS metrics
│   ├── reports/
│   │   ├── index.ts
│   │   └── weekly-report.ts      # Weekly report generator
│   └── anomalies/
│       ├── index.ts
│       └── detector.ts           # Anomaly detection
├── tsconfig.json
└── package.json
```

---

### `/packages/marketing-agent` - Marketing Agent Scaffold

```
packages/marketing-agent/
├── src/
│   ├── index.ts                  # Placeholder exports
│   └── types.ts                  # Interface definitions
├── tsconfig.json
└── package.json
```

---

### `/packages/commerce-ops-agent` - Commerce Ops Agent Scaffold

```
packages/commerce-ops-agent/
├── src/
│   ├── index.ts                  # Placeholder exports
│   └── types.ts                  # Interface definitions
├── tsconfig.json
└── package.json
```

---

### `/packages/vertical-packs` - Vertical Configurations

```
packages/vertical-packs/
├── src/
│   ├── index.ts                  # Public exports
│   ├── types.ts                  # Pack interfaces
│   ├── ecommerce/
│   │   ├── index.ts
│   │   ├── metrics.ts            # Metric definitions
│   │   ├── queries.ts            # Query patterns
│   │   └── dashboard.ts          # Dashboard config
│   ├── saas/
│   │   ├── index.ts
│   │   ├── metrics.ts
│   │   ├── queries.ts
│   │   └── dashboard.ts
│   └── generic/
│       └── index.ts              # Fallback pack
├── tsconfig.json
└── package.json
```

---

## Documentation

```
Docs/
├── Implementation.md             # Implementation plan and tasks
├── project_structure.md          # This file
├── UI_UX_doc.md                  # Design system guidelines
└── Bug_tracking.md               # Issue tracking
```

---

## V2+ Planned Expansions

### Additional Connectors (packages/connectors)

```
packages/connectors/
├── src/
│   ├── ...existing...
│   ├── stripe/
│   │   ├── index.ts
│   │   ├── client.ts             # Stripe API client
│   │   ├── auth.ts               # API key setup
│   │   ├── subscriptions.ts      # Subscription sync
│   │   ├── invoices.ts           # Invoice sync
│   │   ├── customers.ts          # Customer sync
│   │   └── webhooks.ts           # Webhook handlers
│   ├── ga4/
│   │   ├── index.ts
│   │   ├── client.ts             # GA4 Data API client
│   │   ├── auth.ts               # Google OAuth
│   │   ├── sessions.ts           # Session data
│   │   ├── events.ts             # Event tracking
│   │   └── traffic.ts            # Traffic sources
│   ├── tiendanube/
│   │   ├── index.ts
│   │   ├── client.ts             # Tiendanube API client
│   │   ├── auth.ts               # OAuth handling
│   │   ├── orders.ts             # Order sync
│   │   ├── products.ts           # Product sync
│   │   └── customers.ts          # Customer sync
│   ├── mercadolibre/
│   │   ├── index.ts
│   │   ├── client.ts             # ML API client
│   │   ├── auth.ts               # OAuth handling
│   │   ├── orders.ts             # Marketplace orders
│   │   ├── listings.ts           # Product listings
│   │   └── questions.ts          # Q&A handling
│   ├── meta-ads/
│   │   ├── index.ts
│   │   ├── client.ts             # Marketing API client
│   │   ├── auth.ts               # Facebook OAuth
│   │   ├── campaigns.ts          # Campaign data
│   │   ├── adsets.ts             # Ad set performance
│   │   └── creatives.ts          # Creative assets
│   └── google-ads/
│       ├── index.ts
│       ├── client.ts             # Google Ads API client
│       ├── auth.ts               # Google OAuth
│       ├── campaigns.ts          # Campaign data
│       └── keywords.ts           # Keyword performance
```

### Enhanced Marketing Agent

```
packages/marketing-agent/
├── src/
│   ├── index.ts                  # Public exports
│   ├── agent.ts                  # Main agent class
│   ├── types.ts                  # Type definitions
│   ├── nlq/
│   │   ├── index.ts
│   │   ├── intent.ts             # Marketing intent detection
│   │   ├── query-mapper.ts       # Marketing query patterns
│   │   └── response-formatter.ts # Marketing responses
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── spend.ts              # Spend calculations
│   │   ├── roas.ts               # ROAS analysis
│   │   └── cac.ts                # CAC calculations
│   ├── recommendations/
│   │   ├── index.ts
│   │   ├── budget.ts             # Budget recommendations
│   │   ├── campaigns.ts          # Campaign suggestions
│   │   └── creatives.ts          # Creative suggestions
│   └── generation/
│       ├── index.ts
│       ├── ad-copy.ts            # Ad copy generation
│       ├── headlines.ts          # Headline variations
│       └── briefs.ts             # Creative briefs
```

### Enhanced Commerce Ops Agent

```
packages/commerce-ops-agent/
├── src/
│   ├── index.ts                  # Public exports
│   ├── agent.ts                  # Main agent class
│   ├── types.ts                  # Type definitions
│   ├── nlq/
│   │   ├── index.ts
│   │   ├── intent.ts             # Commerce intent detection
│   │   └── query-mapper.ts       # Inventory/pricing queries
│   ├── inventory/
│   │   ├── index.ts
│   │   ├── tracker.ts            # Stock tracking
│   │   ├── forecaster.ts         # Demand forecasting
│   │   └── alerts.ts             # Stockout/overstock alerts
│   ├── pricing/
│   │   ├── index.ts
│   │   ├── analyzer.ts           # Margin analysis
│   │   └── optimizer.ts          # Price optimization
│   └── channels/
│       ├── index.ts
│       ├── coordinator.ts        # Multi-channel coordination
│       └── allocation.ts         # Inventory allocation
```

### New Packages (V2+)

```
packages/
├── ...existing packages...
├── webhooks/                     # Webhook gateway package
│   ├── src/
│   │   ├── index.ts
│   │   ├── gateway.ts            # Unified webhook handler
│   │   ├── verifiers/            # Signature verification
│   │   ├── processors/           # Event processors
│   │   └── queue.ts              # Event queue
├── insights/                     # Proactive insights engine
│   ├── src/
│   │   ├── index.ts
│   │   ├── engine.ts             # Insight generation
│   │   ├── detectors/            # Pattern detectors
│   │   ├── prioritizer.ts        # Insight ranking
│   │   └── delivery.ts           # Insight delivery
├── segmentation/                 # Customer segmentation
│   ├── src/
│   │   ├── index.ts
│   │   ├── rfm.ts                # RFM analysis
│   │   ├── cohorts.ts            # Cohort builder
│   │   └── clusters.ts           # Behavioral clustering
├── attribution/                  # Attribution modeling
│   ├── src/
│   │   ├── index.ts
│   │   ├── models/               # Attribution models
│   │   └── calculator.ts         # Attribution calculator
└── api/                          # Public API package
    ├── src/
    │   ├── index.ts
    │   ├── routes/               # API route definitions
    │   ├── auth/                 # API key authentication
    │   └── rate-limiter.ts       # Rate limiting
```

### Enhanced Web App Structure (V2)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── ...existing routes...
│   │   ├── (dashboard)/
│   │   │   ├── ...existing...
│   │   │   ├── marketing/        # Marketing Agent pages
│   │   │   │   ├── page.tsx      # Marketing overview
│   │   │   │   ├── campaigns/    # Campaign management
│   │   │   │   └── creatives/    # Creative library
│   │   │   ├── operations/       # Commerce Ops pages
│   │   │   │   ├── page.tsx      # Operations overview
│   │   │   │   ├── inventory/    # Inventory management
│   │   │   │   └── pricing/      # Pricing tools
│   │   │   ├── insights/         # Proactive insights
│   │   │   │   └── page.tsx      # Insights feed
│   │   │   └── builder/          # Dashboard builder
│   │   │       └── page.tsx      # Custom dashboard creator
│   │   ├── api/
│   │   │   ├── ...existing...
│   │   │   ├── webhooks/
│   │   │   │   └── [provider]/
│   │   │   │       └── route.ts  # Webhook endpoints
│   │   │   ├── marketing/        # Marketing API routes
│   │   │   ├── operations/       # Commerce Ops API routes
│   │   │   └── v1/               # Public API v1
│   │   │       ├── metrics/
│   │   │       ├── insights/
│   │   │       └── reports/
│   │   └── embed/                # Embeddable components
│   │       └── [type]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ...existing...
│   │   ├── marketing/            # Marketing components
│   │   ├── operations/           # Operations components
│   │   ├── insights/             # Insight components
│   │   └── builder/              # Dashboard builder components
```

---

## V2+ Database Schema Expansions

### Marketing Data Tables (Stage 14)

```sql
-- Ad platforms
ad_accounts (id, workspace_id, platform, account_id, name, currency, timezone, created_at)
ad_campaigns (id, workspace_id, ad_account_id, platform_id, name, status, objective, budget, created_at)
ad_sets (id, campaign_id, platform_id, name, status, targeting, budget, created_at)
ads (id, ad_set_id, platform_id, name, status, creative_type, created_at)
ad_performance (id, ad_id, date, impressions, clicks, spend, conversions, revenue, created_at)

-- Attribution
attribution_events (id, workspace_id, customer_id, touchpoint_type, channel, campaign_id, timestamp, revenue_attributed)
```

### Inventory/Operations Tables (Stage 15)

```sql
-- Inventory management
inventory_locations (id, workspace_id, name, type, address, created_at)
inventory_levels (id, workspace_id, product_id, location_id, quantity, reserved, available, updated_at)
stock_movements (id, workspace_id, product_id, location_id, type, quantity, reason, reference_id, created_at)
purchase_orders (id, workspace_id, supplier_id, status, expected_date, total, created_at)
purchase_order_items (id, order_id, product_id, quantity, unit_cost, created_at)
suppliers (id, workspace_id, name, email, phone, lead_time_days, created_at)

-- Pricing
price_history (id, workspace_id, product_id, price, compare_at_price, cost, effective_date, created_at)
competitor_prices (id, workspace_id, product_id, competitor, price, url, last_checked, created_at)
```

### Insights/Intelligence Tables (Stage 13)

```sql
-- Proactive insights
insights (id, workspace_id, type, category, title, description, data, priority, status, created_at, expires_at)
insight_actions (id, insight_id, user_id, action, created_at)

-- Segmentation
segments (id, workspace_id, name, type, definition, customer_count, created_at, updated_at)
segment_memberships (id, segment_id, customer_id, score, created_at)

-- Cohorts
cohorts (id, workspace_id, name, type, start_date, end_date, customer_count, created_at)
cohort_metrics (id, cohort_id, period, metric_name, value, created_at)

-- Conversations
conversations (id, workspace_id, user_id, title, created_at, updated_at)
conversation_messages (id, conversation_id, role, content, metadata, created_at)
```

### Developer Platform Tables (Stage 19)

```sql
-- API access
api_keys (id, workspace_id, name, key_hash, prefix, scopes, rate_limit, last_used, expires_at, created_at)
api_usage (id, api_key_id, endpoint, method, status_code, response_time_ms, created_at)

-- Webhooks (outbound)
webhook_endpoints (id, workspace_id, url, events, secret_hash, status, created_at)
webhook_deliveries (id, endpoint_id, event_type, payload, status, attempts, last_attempt, created_at)
```

### Team/Collaboration Tables (Stage 17)

```sql
-- Enhanced roles
roles (id, workspace_id, name, permissions, is_custom, created_at)
user_roles (id, user_id, workspace_id, role_id, created_at)

-- Activity logging
activity_logs (id, workspace_id, user_id, action, resource_type, resource_id, metadata, created_at)

-- Invitations
workspace_invites (id, workspace_id, email, role_id, invited_by, token, status, expires_at, created_at)

-- Shared resources
saved_questions (id, workspace_id, user_id, question, response, is_shared, created_at)
saved_views (id, workspace_id, user_id, name, type, config, is_shared, created_at)
dashboard_templates (id, workspace_id, name, config, is_public, created_at)
```

---

## Configuration Files

### TypeScript
- `tsconfig.base.json` at root with shared settings
- Each package/app extends base config
- Path aliases configured per package

### ESLint
- Root `.eslintrc.js` with shared rules
- Extends recommended TypeScript and React rules

### Prettier
- Root `.prettierrc` for consistent formatting
- Semi: true, singleQuote: true, tabWidth: 2

### Git
- `.gitignore` excludes node_modules, .env files, build outputs, .next

---

## Environment Variables

### Required Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (for Drizzle direct connection)
DATABASE_URL=

# OpenAI
OPENAI_API_KEY=

# Shopify (when configuring connector)
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=

# Stripe (when configuring connector)
STRIPE_SECRET_KEY=
```

### Environment Files
- `.env.local` for local development (not committed)
- `.env.example` as template (committed)

---

## Import Conventions

### Internal Package Imports
```typescript
// From apps, import packages using workspace protocol
import { logger } from '@aibos/core';
import { db } from '@aibos/data-model';
import { ShopifyConnector } from '@aibos/connectors';
```

### Relative Imports Within Package
```typescript
// Use relative paths within a package
import { formatDate } from '../utils/dates';
import { MetricCard } from './MetricCard';
```

---

## Commands Reference

### Development
```bash
pnpm dev          # Start all apps in dev mode
pnpm dev:web      # Start web app only
pnpm dev:worker   # Start worker only
```

### Build
```bash
pnpm build        # Build all packages and apps
pnpm build:web    # Build web app only
```

### Database
```bash
pnpm db:generate  # Generate Drizzle migrations
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
```

### Linting and Formatting
```bash
pnpm lint         # Run ESLint
pnpm format       # Run Prettier
pnpm typecheck    # Run TypeScript type checking
```



