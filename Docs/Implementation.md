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
- [x] Scaffold email notification
- [x] Scaffold Slack notification

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

### Stage 8: Notifications Package
**Status**: Completed

#### 8.1 Notification Infrastructure
- [x] Create notifications schema (notification_settings, notification_logs)
- [x] Create `/packages/notifications` package
- [x] Implement email notification scaffold with templates
- [x] Implement Slack notification scaffold with Block Kit
- [x] Create notification service for orchestration
- [x] Add notification hooks to worker jobs

---

### Stage 9: Agent Playground
**Status**: Completed

#### 9.1 Testing Infrastructure
- [x] Create `/playground` page for agent testing
- [x] Create `/api/playground/ask` route (bypasses auth)
- [x] Implement demo responses for testing without OpenAI key
- [x] Add configuration options (vertical type, currency, timezone)
- [x] Add UI components (tabs, textarea, badge)

---

### Stage 10: Database Migration and Setup
**Status**: Completed

#### 10.1 Supabase Migrations
- [x] Create all enum types (vertical_type, plan_type, workspace_status, etc.)
- [x] Create core tables (workspaces, users, workspace_memberships)
- [x] Create connector tables (connectors, sync_logs)
- [x] Create ecommerce tables (customers, products, orders, order_items)
- [x] Create SaaS tables (plans, customers, subscriptions, invoices)
- [x] Create reports tables (reports, anomalies, question_history)
- [x] Create notification tables (notification_settings, notification_logs)
- [x] Enable Row Level Security (RLS) on all tables
- [x] Create RLS policies for workspace-based access control
- [x] Add service role bypass policies for backend operations

#### 10.2 Database Schema Summary
Total tables created: 18
- Core: workspaces, users, workspace_memberships
- Connectors: connectors, sync_logs
- Ecommerce: ecommerce_customers, ecommerce_products, ecommerce_orders, ecommerce_order_items
- SaaS: saas_plans, saas_customers, saas_subscriptions, saas_invoices
- Reports: reports, anomalies, question_history
- Notifications: notification_settings, notification_logs

---

## Quick Start Guide

### Running the Application

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create `.env.local` in `apps/web/` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://hashyjetienopwnwuxkg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=your_database_url  # PostgreSQL connection string
   OPENAI_API_KEY=your_openai_key  # Optional - demo mode works without this
   ```
   
   Note: The `.env.local` file is gitignored and will not be committed.

3. **Push database schema (if using Supabase):**
   ```bash
   pnpm db:push
   ```

4. **Start the development server:**
   ```bash
   pnpm dev:web
   ```
   Or run directly from the web app:
   ```bash
   cd apps/web && pnpm dev
   ```

5. **Access the application:**
   - Main app: http://localhost:3000
   - Agent Playground: http://localhost:3000/playground

### Testing the Analytics Agent

The **Agent Playground** (`/playground`) allows testing the Analytics Agent without authentication:

- Switch between Ecommerce and SaaS verticals
- Ask natural language questions about business data
- View intent detection and response timing
- Works in demo mode without OpenAI API key

### Available Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | User login |
| `/signup` | User registration |
| `/onboarding` | Workspace setup |
| `/dashboard` | Main dashboard (requires auth) |
| `/dashboard/connectors` | Data source management |
| `/dashboard/reports` | View generated reports |
| `/dashboard/settings` | Workspace settings |
| `/playground` | Agent testing (no auth required) |

---

Next steps for V2:
1. Add more connectors (Stripe, GA4, Tiendanube)
2. Integrate actual email provider (Resend/SendGrid/SES)
3. Integrate actual Slack API (Bot Token or Webhooks)
4. Expand Marketing and Commerce Ops agents
5. Add real-time webhooks for data sync
6. Multi-workspace support per user

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

