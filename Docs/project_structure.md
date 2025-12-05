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
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── subscriptions.ts
│   │   └── invoices.ts
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



