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
**Status**: In Progress

#### 3.1 Connector Framework
- [x] Create `/packages/connectors` base structure
- [x] Define connector interface
- [x] Implement connection storage and OAuth handling (API routes created)

#### 3.2 Shopify Connector (Ecommerce V1)
- [x] Implement Shopify OAuth flow (API routes: /api/connectors/shopify)
- [x] Create order ingestion (sync logic scaffolded)
- [x] Create product ingestion (sync logic scaffolded)
- [x] Create customer ingestion (sync logic scaffolded)

#### 3.3 Normalized Data Schema
- [ ] Ecommerce schema: orders, order_items, products, customers
- [ ] SaaS schema: subscriptions, invoices, customers, plans
- [ ] Create data transformers from raw to normalized

#### 3.4 Worker Ingestion Jobs
- [ ] Set up job queue structure in worker
- [ ] Implement full sync job
- [ ] Implement incremental sync job
- [ ] Configure scheduling (Supabase cron or node-cron)

---

### Stage 4: Analytics Agent Core
**Status**: Pending

#### 4.1 AI Runtime Setup
- [ ] Create `/packages/ai-runtime` with LLM abstraction
- [ ] Implement OpenAI provider
- [ ] Create tool/function calling helpers
- [ ] Build prompt template system

#### 4.2 Analytics Agent Package
- [ ] Create `/packages/analytics-agent`
- [ ] Define metric calculations per vertical
- [ ] Implement named query patterns
- [ ] Build NLQ handler (question to query mapping)

#### 4.3 Natural Language Questions
- [ ] Define query vocabulary for ecommerce metrics
- [ ] Define query vocabulary for SaaS metrics
- [ ] Implement intent detection
- [ ] Build query executor
- [ ] Format friendly responses

---

### Stage 5: Dashboard and UI
**Status**: Pending

#### 5.1 Overview Dashboard
- [ ] Create dashboard layout
- [ ] Build metric cards component
- [ ] Implement time series chart
- [ ] Add date range selector

#### 5.2 Ecommerce Dashboard Metrics
- [ ] Revenue (total, by period)
- [ ] Orders count
- [ ] AOV (Average Order Value)
- [ ] New vs returning customers
- [ ] Top products

#### 5.3 SaaS Dashboard Metrics
- [ ] MRR (Monthly Recurring Revenue)
- [ ] New subscriptions
- [ ] Churn count
- [ ] Net MRR change
- [ ] Active customers

#### 5.4 NLQ Interface
- [ ] Question input box
- [ ] Response display area
- [ ] Suggested questions
- [ ] Query history

---

### Stage 6: Reports and Anomaly Detection
**Status**: Pending

#### 6.1 Weekly Report System
- [ ] Define report data structure
- [ ] Implement metric aggregation for reports
- [ ] Create report generation job
- [ ] Store reports in database

#### 6.2 Basic Anomaly Detection
- [ ] Define anomaly detection rules (period-over-period delta)
- [ ] Implement detection logic for core metrics
- [ ] Create anomaly storage schema
- [ ] Build anomaly explanation generator

#### 6.3 Notification Hooks
- [ ] Design notification schema
- [ ] Scaffold email notification
- [ ] Scaffold Slack notification (later)

---

### Stage 7: Agent Scaffolds and Vertical Packs
**Status**: Pending

#### 7.1 Marketing Agent Scaffold
- [ ] Create `/packages/marketing-agent` package
- [ ] Define interfaces and types
- [ ] Add placeholder implementations

#### 7.2 Commerce Ops Agent Scaffold
- [ ] Create `/packages/commerce-ops-agent` package
- [ ] Define interfaces and types
- [ ] Add placeholder implementations

#### 7.3 Vertical Packs
- [ ] Create `/packages/vertical-packs`
- [ ] Implement ecommerce pack configuration
- [ ] Implement SaaS pack configuration
- [ ] Wire packs to dashboard and agent logic

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

**Stage 3 - Connectors and Ingestion (Completing)**

The connector framework and Shopify OAuth flow are implemented. UI for connector management is ready.

Next steps:
1. Set up Supabase project and add credentials to `.env.local`
2. Run `pnpm db:push` to create database tables
3. Test the full auth and connector flow
4. Implement actual database writes in sync functions
5. Set up worker jobs for scheduled syncing

Subtasks:
1. Create `.env.local` with Supabase, database, and Shopify credentials
2. Run `pnpm db:push` to sync schema with database
3. Complete the database write logic in sync functions (orders, products, customers)
4. Create sync trigger API route
5. Wire up the worker scheduler

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

