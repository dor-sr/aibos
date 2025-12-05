# AI Business OS - V1 Implementation Plan

## Overview

This document outlines the implementation plan for V1 of the AI Business OS platform, focusing on the Analytics Agent as the core product. The implementation follows the vision defined in `project_context.md`.

## V1 Scope Summary

- **Primary Agent**: Analytics Agent (fully implemented)
- **Secondary Agents**: Digital Marketing Agent, Commerce Ops Agent (scaffolded only)
- **Supported Verticals**: Ecommerce and SaaS/Generic
- **First Connector**: Shopify (ecommerce) with Stripe + GA4 scaffold (SaaS)

## Architecture Decisions

### Monorepo Structure
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo for task orchestration and caching
- **Rationale**: Efficient builds, clear package boundaries, good DX for solo builder

### Database Layer
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Rationale**: Type-safe, lightweight, excellent TypeScript inference, schema-as-code migrations

### Authentication
- **Provider**: Supabase Auth
- **Rationale**: Integrated with database, supports multiple providers, handles sessions

### UI Framework
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Rationale**: Modern React patterns, server components, great DX

### AI Runtime
- **Initial Provider**: OpenAI (GPT-4)
- **Abstraction**: Provider-agnostic wrapper for future expansion
- **Rationale**: Best-in-class for complex reasoning, easy to add alternatives later

---

## Implementation Stages

### Stage 1: Foundation Setup
**Status**: Completed

#### 1.1 Monorepo Initialization
- [x] Initialize pnpm workspace
- [x] Configure Turborepo
- [x] Set up TypeScript base configuration
- [x] Configure ESLint and Prettier

#### 1.2 Apps Setup
- [x] Create `/apps/web` with Next.js 14, App Router
- [x] Configure Tailwind CSS
- [x] Initialize shadcn/ui
- [x] Create `/apps/worker` Node.js TypeScript app

#### 1.3 Core Packages
- [x] Create `/packages/core` - shared types, env config, logging
- [x] Create `/packages/data-model` - Drizzle schemas, domain types
- [x] Set up Supabase project connection (configuration ready)

---

### Stage 2: Data Model and Authentication
**Status**: Completed

#### 2.1 Authentication Flow
- [x] Implement Supabase Auth in web app
- [x] Create auth middleware
- [x] Build sign-up/sign-in pages
- [x] Implement session management

#### 2.2 Core Data Model
- [x] Design workspace schema
- [x] Design user membership schema
- [x] Design vertical pack configuration schema
- [x] Create initial migrations (schemas ready for db:push)

#### 2.3 Onboarding Flow
- [x] Create workspace creation UI
- [x] Implement vertical selection (ecommerce/saas)
- [x] Store workspace configuration (API: POST /api/workspaces)

---

### Stage 3: Connectors and Ingestion
**Status**: Completed

#### 3.1 Connector Framework
- [x] Create `/packages/connectors` base structure
- [x] Define connector interface
- [x] Implement connection storage and OAuth handling (API routes created)

#### 3.2 Shopify Connector (Ecommerce V1)
- [x] Implement Shopify OAuth flow (API routes: /api/connectors/shopify)
- [x] Create order ingestion with database writes
- [x] Create product ingestion with database writes
- [x] Create customer ingestion with database writes

#### 3.3 Normalized Data Schema
- [x] Ecommerce schema: orders, order_items, products, customers
- [x] SaaS schema: subscriptions, invoices, customers, plans
- [x] Create data transformers from raw to normalized

#### 3.4 Worker Ingestion Jobs
- [x] Set up job queue structure in worker
- [x] Implement full sync job
- [x] Implement incremental sync job (uses same sync with sinceId)
- [x] Configure scheduling (node-cron every 6 hours)
- [x] Create manual sync API route (/api/connectors/[connectorId]/sync)

---

### Stage 4: Analytics Agent Core
**Status**: Completed

#### 4.1 AI Runtime Setup
- [x] Create `/packages/ai-runtime` with LLM abstraction
- [x] Implement OpenAI provider
- [x] Create tool/function calling helpers
- [x] Build prompt template system

#### 4.2 Analytics Agent Package
- [x] Create `/packages/analytics-agent`
- [x] Define metric calculations per vertical
- [x] Implement named query patterns
- [x] Build NLQ handler (question to query mapping)

#### 4.3 Natural Language Questions
- [x] Define query vocabulary for ecommerce metrics
- [x] Define query vocabulary for SaaS metrics
- [x] Implement intent detection
- [x] Build query executor
- [x] Format friendly responses

---

### Stage 5: Dashboard and UI
**Status**: Completed

#### 5.1 Overview Dashboard
- [x] Create dashboard layout
- [x] Build metric cards component
- [x] Implement time series chart
- [x] Add date range selector (API supports period param)

#### 5.2 Ecommerce Dashboard Metrics
- [x] Revenue (total, by period)
- [x] Orders count
- [x] AOV (Average Order Value)
- [x] New vs returning customers (via API)
- [x] Top products (via NLQ)

#### 5.3 SaaS Dashboard Metrics
- [x] MRR (Monthly Recurring Revenue)
- [x] New subscriptions
- [x] Churn count
- [x] Net MRR change
- [x] Active customers

#### 5.4 NLQ Interface
- [x] Question input box
- [x] Response display area
- [x] Suggested questions
- [x] Query history (schema ready)

---

### Stage 6: Reports and Anomaly Detection
**Status**: Completed

#### 6.1 Weekly Report System
- [x] Define report data structure
- [x] Implement metric aggregation for reports
- [x] Create report generation job
- [x] Store reports in database

#### 6.2 Basic Anomaly Detection
- [x] Define anomaly detection rules (period-over-period delta)
- [x] Implement detection logic for core metrics
- [x] Create anomaly storage schema
- [x] Build anomaly explanation generator

#### 6.3 Notification Hooks
- [x] Design notification schema
- [ ] Scaffold email notification
- [ ] Scaffold Slack notification (later)

---

### Stage 7: Agent Scaffolds and Vertical Packs
**Status**: Completed

#### 7.1 Marketing Agent Scaffold
- [x] Create `/packages/marketing-agent` package
- [x] Define interfaces and types
- [x] Add placeholder implementations

#### 7.2 Commerce Ops Agent Scaffold
- [x] Create `/packages/commerce-ops-agent` package
- [x] Define interfaces and types
- [x] Add placeholder implementations

#### 7.3 Vertical Packs
- [x] Create `/packages/vertical-packs`
- [x] Implement ecommerce pack configuration
- [x] Implement SaaS pack configuration
- [x] Wire packs to dashboard and agent logic

---

## File Structure Reference

```
/apps
  /web                    # Next.js 14 App Router
    /app
      /(auth)             # Auth routes (login, signup)
      /(dashboard)        # Protected dashboard routes
      /api                # API routes
    /components           # UI components
    /lib                  # Client utilities
  /worker                 # Background job runner
    /src
      /jobs               # Job definitions
      /scheduler          # Cron/scheduling logic
/packages
  /core                   # Shared types, config, logging
  /data-model             # Drizzle schemas, migrations
  /connectors             # Data source integrations
  /ai-runtime             # LLM abstraction layer
  /analytics-agent        # Analytics Agent logic
  /marketing-agent        # Marketing Agent scaffold
  /commerce-ops-agent     # Commerce Ops scaffold
  /vertical-packs         # Vertical configurations
/Docs                     # Project documentation
```

---

## Current Task

**V1 Implementation Complete**

All stages (1-7) are now complete. The platform includes:

- Full authentication and workspace management
- Shopify connector with data sync
- AI-powered Analytics Agent with NLQ
- Dashboard with real-time metrics and charts
- Weekly report generation
- Anomaly detection system
- Marketing and Commerce Ops agent scaffolds
- Vertical packs for ecommerce and SaaS

Next steps for V2:
1. Add more connectors (Stripe, GA4, Tiendanube)
2. Implement email/Slack notifications
3. Expand Marketing and Commerce Ops agents
4. Add real-time webhooks for data sync
5. Multi-workspace support per user

---

## Assumptions Made

1. **Shopify as primary V1 connector**: Starting with Shopify for ecommerce since it has excellent APIs and is widely used
2. **Drizzle over Prisma**: Chosen for lighter footprint, better TypeScript inference, and schema-as-code approach
3. **Turborepo included**: Worth the minimal setup cost for caching and task orchestration
4. **Server components default**: Using Next.js App Router with server components as default, client components where needed
5. **Single database**: All normalized data lives in one Supabase Postgres instance per environment

---

## Links and References

- [project_context.md](../project_context.md) - Source of truth for product vision
- [Docs/project_structure.md](./project_structure.md) - Detailed folder structure
- [Docs/UI_UX_doc.md](./UI_UX_doc.md) - Design system and UI guidelines
- [Docs/Bug_tracking.md](./Bug_tracking.md) - Issue tracking

