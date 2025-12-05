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

**V1 Implementation Complete - Ready for V2**

All V1 stages (1-10) are now complete. The platform includes:

- Full authentication and workspace management
- Shopify connector with data sync
- AI-powered Analytics Agent with NLQ
- Dashboard with real-time metrics and charts
- Weekly report generation
- Anomaly detection system
- Marketing and Commerce Ops agent scaffolds
- Vertical packs for ecommerce and SaaS
- Notification system infrastructure (scaffolds)
- Agent Playground for testing
- Complete database schema with RLS

### Manual Setup Required (Before Production)

The following items require manual configuration:

| Item | Status | Action Required |
|------|--------|-----------------|
| Supabase Project | Pending | Create project at supabase.com, copy credentials |
| Environment Variables | Pending | Set all required env vars in `.env.local` |
| OpenAI API Key | Optional | Required for production NLQ (demo mode works without) |
| Shopify App | Pending | Create Shopify Partner app, configure OAuth credentials |
| Email Provider | Pending | Set up Resend/SendGrid/SES for production emails |
| Slack App | Pending | Create Slack app for workspace notifications |
| Domain/Hosting | Pending | Deploy to Vercel/Railway/etc. |
| Stripe (Billing) | Pending | Set up Stripe for subscription billing |

### Next Steps: Begin V2

Recommended starting point for V2 development:
1. **Stage 11.1 - Stripe Connector**: Critical for SaaS vertical customers
2. **Stage 16.1 - Email Provider Integration**: Enable production notifications
3. **Stage 12.1 - Webhook Gateway**: Foundation for real-time updates

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

---

# V2+ Roadmap - Scaling AI Business OS

The following stages outline the evolution from a functional V1 to a market-leading AI business intelligence platform. Each stage builds upon the previous, creating compounding value.

---

## Strategic Vision: What Makes AI Business OS Best-in-Class

### Core Differentiators

**1. AI-Native Architecture**
Unlike legacy BI tools that bolt-on AI features, AI Business OS is designed AI-first. The natural language interface is not an afterthought; it is the primary way users interact with their data. This means:
- Conversations, not dashboards, are the default
- Insights are pushed proactively, not pulled on demand
- The system learns from every interaction to improve relevance

**2. Unified Multi-Agent System**
Competitors offer point solutions (analytics OR marketing OR operations). AI Business OS provides three specialized agents that share context and coordinate actions:
- Analytics Agent understands what happened and why
- Marketing Agent knows how to acquire and retain customers
- Commerce Ops Agent manages inventory and operations
- When combined, they function as a unified AI operating system for the business

**3. Vertical Intelligence with Horizontal Scale**
Generic tools require heavy customization. Vertical-specific tools are too narrow. AI Business OS uses vertical packs to provide industry-specific intelligence out of the box while maintaining a unified platform:
- Ecommerce: Revenue, AOV, product performance, inventory
- SaaS: MRR, churn, cohorts, expansion revenue
- Hospitality: Occupancy, RevPAR, booking patterns
- Restaurants: Covers, delivery mix, menu optimization

**4. LatAm-First, Global-Ready**
Most business intelligence tools are designed for US/EU markets. AI Business OS prioritizes LatAm connectors (Tiendanube, MercadoLibre, Rappi) and understands regional nuances (currency volatility, marketplace dominance, delivery platform importance) while remaining globally applicable.

**5. Proactive Intelligence**
Traditional BI is reactive: users ask questions and get answers. AI Business OS is proactive:
- Daily insights delivered without asking
- Anomaly detection with explanations
- Opportunity identification before users know to look
- Risk alerts before problems become crises

### Key User Experience Principles

**Instant Value**
- Users see their first insight within 5 minutes of connecting data
- No dashboard configuration required; smart defaults work immediately
- Suggested questions guide users to valuable discoveries

**Progressive Depth**
- Simple overview for executives (the "so what")
- Drill-down capability for analysts (the "why")
- Raw data access for power users (the "how")
- All accessible through natural language

**Action-Oriented**
- Every insight includes a recommended action
- One-click implementation where possible (adjust budget, reorder stock)
- Clear escalation paths when human judgment is needed

### Competitive Positioning

| Capability | Legacy BI (Tableau, Looker) | Point Solutions | AI Business OS |
|------------|----------------------------|-----------------|----------------|
| AI-Native Interface | Bolt-on | Varies | Core architecture |
| Multi-Agent Coordination | N/A | N/A | Native |
| Vertical Intelligence | Manual setup | Narrow focus | Packs + horizontal |
| LatAm Data Sources | Limited | Limited | Priority |
| Proactive Insights | Basic alerts | Basic | Core feature |
| Time to Value | Weeks | Days | Minutes |
| Technical Expertise Required | High | Medium | Low |

---

## Stage 11: Core Connector Expansion
**Status**: Pending
**Priority**: Critical
**Rationale**: Connectors are the lifeblood of the platform. More data sources = more value = better retention.

#### 11.1 Stripe Connector (SaaS Priority)
**Docs**: [Stripe API Docs](https://stripe.com/docs/api), [Webhooks](https://stripe.com/docs/webhooks)
**Status**: Completed
- [x] Implement Stripe API key authentication (Stripe uses API keys, not OAuth for basic integrations)
- [x] Create subscription ingestion (active, trialing, past_due, canceled, etc.)
- [x] Create invoice ingestion with line items
- [x] Create customer ingestion with metadata
- [x] Create plans/prices ingestion from Stripe products
- [x] Implement webhook handlers for real-time updates (customer, subscription, invoice, price events)
- [x] Add MRR/ARR calculation from live Stripe data
- [x] Create API routes for connector setup, sync, and webhooks
- [ ] Support for metered billing and usage-based pricing (future enhancement)

#### 11.2 Google Analytics 4 Connector
**Docs**: [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
**Status**: Completed
- [x] Implement Google OAuth flow (`packages/connectors/src/ga4/client.ts`)
- [x] Create session and pageview ingestion (`packages/connectors/src/ga4/sessions.ts`, `pageviews.ts`)
- [x] Create event tracking ingestion (`packages/connectors/src/ga4/events.ts`)
- [x] Create traffic source attribution data (`packages/connectors/src/ga4/traffic-sources.ts`)
- [x] Create conversion funnel data extraction (`packages/connectors/src/ga4/conversions.ts`)
- [x] Implement scheduled daily sync (via connector sync API)
- [x] Map GA4 dimensions to internal semantic model (`packages/connectors/src/ga4/types.ts`)
- [x] Create database schema for GA4 data (`packages/data-model/src/schema/ga4.ts`)
- [x] Create API routes for connector setup and sync (`apps/web/src/app/api/connectors/ga4/`)

#### 11.3 Tiendanube Connector (LatAm Focus)
**Docs**: [Tiendanube API](https://tiendanube.github.io/api-documentation/)
- [ ] Implement Tiendanube OAuth flow
- [ ] Create order ingestion with payment status
- [ ] Create product catalog sync
- [ ] Create customer ingestion
- [ ] Handle LatAm currency variations (ARS, BRL, MXN, CLP)
- [ ] Implement webhook handlers for real-time order updates

#### 11.4 MercadoLibre Connector (LatAm Marketplace)
**Docs**: [MercadoLibre API](https://developers.mercadolibre.com/)
- [ ] Implement MercadoLibre OAuth flow
- [ ] Create order ingestion from marketplace sales
- [ ] Create product listing sync
- [ ] Create questions and messages ingestion
- [ ] Track marketplace fees and net revenue
- [ ] Implement shipping status tracking
- [ ] Handle multi-country accounts (MLA, MLB, MLM, MLC)

---

## Stage 12: Real-Time Infrastructure
**Status**: Completed
**Priority**: High
**Rationale**: Polling is inefficient and delayed. Real-time webhooks enable instant insights and faster anomaly detection.

#### 12.1 Webhook Gateway
- [x] Create `/api/webhooks/[provider]` unified endpoint
- [x] Implement webhook signature verification per provider (Stripe, Shopify)
- [x] Create webhook event queue for reliable processing (webhook_events table)
- [x] Implement idempotency handling for duplicate events
- [x] Add webhook retry mechanism with exponential backoff (max 3 attempts)
- [x] Create webhook event logging for debugging
- [x] Create webhook management UI in connectors page

#### 12.2 Real-Time Data Pipeline
- [x] Implement event streaming from webhooks to database
- [x] Create real-time metric recalculation triggers (`packages/connectors/src/realtime/metric-service.ts`)
- [x] Implement WebSocket/SSE for dashboard live updates (`/api/realtime/stream` endpoint)
- [x] Add real-time anomaly detection on incoming events (`packages/connectors/src/realtime/anomaly-detector.ts`)
- [x] Create event batching for high-volume sources (`packages/connectors/src/realtime/event-batch-processor.ts`)
- [x] Create useRealtime React hook for dashboard components
- [x] Update MetricCards component with live updates indicator

#### 12.3 Supabase Realtime Integration
- [x] Enable Supabase Realtime on key tables (`apps/web/src/hooks/use-supabase-realtime.ts`)
- [x] Implement client-side subscriptions for dashboard (`useSupabaseRealtime` hook with table subscriptions)
- [x] Create notification triggers for metric changes (`packages/connectors/src/realtime/notification-triggers.ts`)
- [x] Add presence tracking for collaborative features (`usePresence` hook in use-supabase-realtime.ts)

---

## Stage 13: Advanced Analytics Agent
**Status**: Completed
**Priority**: High
**Rationale**: Transform from a query tool to a proactive business advisor.

#### 13.1 Conversational Memory
- [x] Implement conversation history storage (`packages/analytics-agent/src/memory/conversation-service.ts`)
- [x] Create context window management for long conversations (`packages/analytics-agent/src/memory/context-manager.ts`)
- [x] Add entity memory (remember discussed products, campaigns, etc.) (`packages/analytics-agent/src/memory/entity-extractor.ts`)
- [x] Implement follow-up question understanding (via context manager)
- [x] Create conversation summarization for context compression (via context manager)

#### 13.2 Proactive Insights Engine
- [x] Create daily insight generation job (`packages/analytics-agent/src/insights/insight-generator.ts`)
- [x] Implement opportunity detection (growth patterns, untapped segments) (`packages/analytics-agent/src/insights/opportunity-detector.ts`)
- [x] Create risk detection (churn signals, declining metrics) (`packages/analytics-agent/src/insights/risk-detector.ts`)
- [x] Build insight prioritization algorithm (`packages/analytics-agent/src/insights/insight-prioritizer.ts`)
- [x] Implement insight storage and lifecycle management (`packages/analytics-agent/src/insights/insight-service.ts`)
- [ ] Create insight delivery via email digest (future enhancement)

#### 13.3 Cohort Analysis
- [x] Implement customer cohort builder by acquisition date (`packages/analytics-agent/src/cohorts/cohort-builder.ts`)
- [x] Create cohort retention curves (`packages/analytics-agent/src/cohorts/retention-calculator.ts`)
- [x] Add cohort comparison views (via cohort service)
- [x] Implement cohort-based LTV calculation (`packages/analytics-agent/src/cohorts/ltv-calculator.ts`)
- [x] Create cohort service for analysis orchestration (`packages/analytics-agent/src/cohorts/cohort-service.ts`)

#### 13.4 Customer Segmentation
- [x] Implement RFM (Recency, Frequency, Monetary) segmentation (`packages/analytics-agent/src/segmentation/rfm-calculator.ts`)
- [x] Create behavioral clustering via segment builder (`packages/analytics-agent/src/segmentation/segment-builder.ts`)
- [x] Add segment comparison in service (`packages/analytics-agent/src/segmentation/segmentation-service.ts`)
- [x] Implement segment-based templates (predefined segments)
- [x] Create dynamic segment definitions via rules

#### 13.5 Attribution Modeling
- [x] Implement first-touch attribution (`packages/analytics-agent/src/attribution/attribution-calculator.ts`)
- [x] Implement last-touch attribution (in attribution calculator)
- [x] Implement linear attribution (in attribution calculator)
- [x] Implement time-decay attribution (in attribution calculator)
- [x] Implement position-based attribution (in attribution calculator)
- [x] Create channel contribution reports (`packages/analytics-agent/src/attribution/attribution-service.ts`)
- [x] Add model comparison functionality

#### 13.6 Predictive Analytics
- [x] Implement churn prediction model (`packages/analytics-agent/src/predictive/churn-predictor.ts`)
- [x] Create LTV prediction for customers (in forecast service)
- [x] Add demand forecasting for products (`packages/analytics-agent/src/predictive/forecast-service.ts`)
- [x] Implement revenue forecasting (in forecast service)
- [ ] Create "what-if" scenario modeling (future enhancement)

---

## Stage 14: Digital Marketing Agent (Full Implementation)
**Status**: Completed
**Priority**: High
**Rationale**: Complete the second product in the suite. Marketing is where businesses spend money, making this high-value.

#### 14.1 Meta Ads Connector
**Docs**: [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/)
- [x] Implement Meta OAuth flow with required permissions (`packages/connectors/src/meta-ads/client.ts`)
- [x] Create ad account ingestion (`packages/connectors/src/meta-ads/sync.ts`)
- [x] Create campaign, ad set, and ad performance ingestion (`packages/connectors/src/meta-ads/sync.ts`)
- [x] Track spend, impressions, clicks, conversions (via sync functions)
- [x] Implement creative asset metadata extraction (via sync functions)
- [x] Handle attribution window differences (attribution_setting support)

#### 14.2 Google Ads Connector
**Docs**: [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [x] Implement Google Ads OAuth flow (`packages/connectors/src/google-ads/client.ts`)
- [x] Create campaign and ad group ingestion (`packages/connectors/src/google-ads/sync.ts`)
- [x] Create keyword performance tracking (`syncGoogleAdsKeywords` function)
- [x] Track Quality Score and ad relevance (via keyword sync)
- [x] Implement conversion tracking sync (via performance metrics)
- [x] Handle Smart campaigns and Performance Max (channel type mapping)

#### 14.3 Marketing Performance Dashboard
- [x] Create unified ad spend overview (`apps/web/src/app/(dashboard)/dashboard/marketing/page.tsx`)
- [x] Implement cross-channel ROAS calculation (`packages/marketing-agent/src/metrics/index.ts`)
- [x] Build CAC tracking by channel and campaign (CPA metrics in dashboard)
- [x] Create creative performance comparison (via channel breakdown)
- [ ] Add landing page performance tracking (future enhancement)
- [x] Implement budget pacing alerts (via recommendations)

#### 14.4 Marketing Agent NLQ
- [x] Extend NLQ for marketing-specific questions (`packages/marketing-agent/src/nlq/handler.ts`)
- [x] Add campaign performance queries (via intent detection)
- [x] Implement spend analysis queries (spend_analysis intent)
- [x] Create creative comparison queries (channel_performance intent)
- [x] Add audience performance queries (via campaign queries)

#### 14.5 Marketing Recommendations Engine
- [x] Implement budget reallocation suggestions (`packages/marketing-agent/src/recommendations/index.ts`)
- [x] Create underperforming campaign alerts (via suggestions)
- [ ] Add audience expansion recommendations (future enhancement)
- [x] Implement creative fatigue detection (`detectCreativeFatigue` function)
- [ ] Create A/B test recommendations (future enhancement)
- [ ] Build seasonal opportunity alerts (future enhancement)

#### 14.6 Creative Generation
- [x] Implement ad copy generation (headlines, descriptions) (`packages/marketing-agent/src/generation/index.ts`)
- [ ] Create image prompt generation for creative briefs (future enhancement)
- [ ] Add landing page copy suggestions (future enhancement)
- [x] Implement email subject line generation (via creative generator)
- [x] Create variation generator for A/B testing (`generateAdVariations` function)

---

## Stage 15: Commerce Operations Agent (Full Implementation)
**Status**: Completed
**Priority**: Medium-High
**Rationale**: Completes the product suite. Essential for serious ecommerce merchants.

#### 15.1 Inventory Management Schema
- [x] Create inventory_locations table (`packages/data-model/src/schema/inventory.ts`)
- [x] Create inventory_levels table with history
- [x] Create stock_movements table (in/out tracking)
- [x] Create purchase_orders table and purchase_order_items
- [x] Create suppliers table
- [x] Create price_history and stock_alerts tables
- [ ] Add inventory sync from Shopify/Tiendanube (future enhancement)

#### 15.2 Stock Forecasting
- [x] Implement demand forecasting per SKU (`packages/commerce-ops-agent/src/inventory/forecaster.ts`)
- [x] Create days-of-stock calculation
- [x] Add stockout risk alerting (`getStockoutRiskProducts`)
- [x] Implement overstock detection
- [x] Create reorder point recommendations (`getReorderRecommendations`)
- [x] Calculate Economic Order Quantity (EOQ) and safety stock
- [ ] Factor in marketing campaigns for demand spikes (future enhancement)

#### 15.3 Pricing Intelligence
- [x] Create pricing history tracking (`packages/commerce-ops-agent/src/pricing/analyzer.ts`)
- [x] Add margin analysis per product (`getMarginAnalysis`, `getProductMargins`)
- [x] Implement pricing suggestions (`getPricingSuggestions`)
- [x] Create price analysis reports
- [ ] Implement competitor price monitoring (future enhancement)
- [ ] Create price elasticity indicators (future enhancement)

#### 15.4 Multi-Channel Coordination
- [x] Create unified product catalog across channels (`packages/commerce-ops-agent/src/channels/coordinator.ts`)
- [x] Implement inventory allocation recommendations (`getAllocationRecommendations`)
- [x] Add channel performance comparison (`getChannelPerformance`)
- [x] Get multi-channel inventory view (`getMultiChannelInventory`)
- [ ] Create channel-specific pricing strategies (future enhancement)
- [ ] Implement listing optimization suggestions (future enhancement)

#### 15.5 Commerce Ops Dashboard
- [x] Create inventory health overview (`apps/web/src/app/(dashboard)/dashboard/operations/page.tsx`)
- [x] Implement stockout/overstock alerts panel
- [x] Build margin analysis views
- [x] Add inventory health score display
- [x] Create reorder recommendations panel
- [ ] Add supplier performance tracking UI (future enhancement)
- [ ] Create purchase order management UI (future enhancement)

#### 15.6 Commerce Ops NLQ
- [x] Add inventory-specific question handling (`packages/commerce-ops-agent/src/nlq/handler.ts`)
- [x] Implement stock level queries
- [x] Create margin and pricing queries
- [x] Add supplier performance queries
- [x] Implement reorder recommendation queries
- [x] Add intent detection for commerce operations (`packages/commerce-ops-agent/src/nlq/intent.ts`)

---

## Stage 16: Notification System (Production Ready)
**Status**: Completed
**Priority**: High
**Rationale**: Notifications drive engagement and retention. Users need to receive value even when not in the app.

#### 16.1 Email Provider Integration
**Options**: Resend, SendGrid, AWS SES
- [x] Integrate email provider SDK (Resend integration in `packages/notifications/src/email/index.ts`)
- [x] Create templated email system (HTML templates for weekly reports, anomaly alerts)
- [x] Implement weekly digest emails (via email notification provider)
- [x] Create anomaly alert emails (with severity-colored templates)
- [x] Build report delivery emails (with metric highlights)
- [x] Add unsubscribe and preference management (`/api/notifications/preferences`)
- [ ] Implement email analytics (opens, clicks) - future enhancement

#### 16.2 Slack Integration
- [x] Create Slack app with Bot Token support (`packages/notifications/src/slack/index.ts`)
- [x] Implement webhook-based notifications (Incoming Webhooks)
- [x] Create insight delivery to channels (Block Kit formatted messages)
- [x] Implement alert notifications (with severity badges)
- [x] Add interactive message actions (view report, view dashboard buttons)
- [ ] Create slash command for quick queries - future enhancement

#### 16.3 In-App Notifications
- [x] Create notification center UI (`apps/web/src/components/notifications/notification-center.tsx`)
- [x] Implement notification preferences (`/api/notifications/preferences`, settings page)
- [x] Add notification grouping and prioritization (group key, priority levels)
- [x] Create read/unread state management (mark as read, mark all read)
- [x] Implement browser push notifications (`packages/notifications/src/push/index.ts`)
- [x] Create in-app notification schema (`packages/data-model/src/schema/notifications.ts`)
- [x] Build notification settings page with preferences UI (`apps/web/src/app/(dashboard)/dashboard/settings/page.tsx`)
- [x] Add notification center to dashboard header

#### 16.4 WhatsApp Business Integration (LatAm Priority)
- [ ] Integrate WhatsApp Business API
- [ ] Create daily/weekly summary messages
- [ ] Implement alert delivery
- [ ] Add interactive quick replies

---

## Stage 17: Team Collaboration
**Status**: Completed
**Priority**: Medium
**Rationale**: B2B products need team features. Essential for larger accounts and stickiness.

#### 17.1 Enhanced Role System
- [x] Implement role-based access control (RBAC) (`packages/data-model/src/schema/team.ts`)
- [x] Create admin, editor, viewer roles with permission templates
- [x] Add custom role creation (`/api/team/roles` API)
- [x] Implement permission granularity (per agent, per feature)
- [x] Create role assignment UI in settings page

#### 17.2 Team Invitations
- [x] Create team invite flow with email (`/api/team/invites` API)
- [x] Implement invite token management (secure token generation)
- [x] Create pending invites management UI
- [x] Implement invite expiration (configurable days)
- [x] Create invite acceptance page (`/invite/[token]`)

#### 17.3 Activity and Audit Logs
- [x] Create activity log schema (`activityLogs` table)
- [x] Implement action logging throughout app (team, connector, analytics events)
- [x] Build activity feed UI (`ActivityLogComponent`)
- [x] Add filtering and search for logs
- [x] Create audit export for compliance (CSV export)

#### 17.4 Shared Resources
- [x] Implement saved question sharing (`savedQuestions` table, `/api/team/saved-questions`)
- [x] Create shared dashboard views (`savedViews` table, `/api/team/saved-views`)
- [x] Implement dashboard templates (`dashboardTemplates` table)
- [x] Implement comment/annotation system on insights (`comments` table)

---

## Stage 18: Custom Dashboards and Saved Views
**Status**: Completed
**Priority**: Medium
**Rationale**: Power users want customization. This increases engagement and value perception.

#### 18.1 Dashboard Builder
- [x] Create drag-and-drop dashboard editor (`apps/web/src/app/(dashboard)/dashboard/builder/page.tsx`)
- [x] Implement widget library (metrics, charts, tables, text) (`components/dashboard/builder/widget-library.tsx`)
- [x] Add widget configuration panels (`components/dashboard/builder/widget-config-panel.tsx`)
- [x] Create dashboard templates per vertical (`/api/dashboards/templates`)
- [x] Implement dashboard sharing (`/api/dashboards/[dashboardId]/share`)

#### 18.2 Custom Metrics
- [x] Create metric builder UI (`apps/web/src/app/(dashboard)/dashboard/metrics/page.tsx`)
- [x] Implement formula-based custom metrics (simple, calculated, SQL types)
- [x] Add metric validation and preview (`/api/metrics/custom`)
- [x] Create metric library for workspace (categories, search, filtering)
- [x] Enable custom metrics in NLQ (nlqKeywords, nlqExamples fields)

#### 18.3 Saved Views and Filters
- [x] Implement filter presets (`apps/web/src/app/(dashboard)/dashboard/views/page.tsx`)
- [x] Create date range presets (custom periods) (`/api/views/filters`)
- [x] Add segment-based views (via filter preset types)
- [x] Implement view sharing within team (isShared flag)
- [x] Create default view preferences (`/api/views/preferences`)

#### 18.4 Export and Reporting
- [x] Implement PDF export for dashboards (`/api/exports`)
- [x] Create CSV/Excel export for data tables (`/api/exports/download/[jobId]`)
- [x] Add scheduled report delivery (`scheduledExports` table, frequency options)
- [x] Implement white-label PDF reports (whiteLabelConfig in schema)
- [x] Create presentation mode (viewMode in dashboard builder)

---

## Stage 19: Developer Platform
**Status**: Completed
**Priority**: Medium
**Rationale**: API access enables integrations, automations, and enterprise use cases.

#### 19.1 REST API
- [x] Design public API endpoints (`/api/v1/metrics`, `/api/v1/reports`, `/api/v1/insights`, `/api/v1/anomalies`, `/api/v1/workspace`, `/api/v1/connectors`, `/api/v1/nlq`, `/api/v1/webhooks`)
- [x] Implement API key authentication (`apps/web/src/lib/api/auth.ts`)
- [x] Create rate limiting per plan (`apps/web/src/lib/api/rate-limit.ts` - free: 60/min, starter: 300/min, pro: 1000/min, enterprise: 5000/min)
- [x] Build comprehensive API documentation (`/api/docs` page with endpoints, authentication, webhooks, errors)
- [x] Add API versioning strategy (v1 prefix, X-API-Version header)
- [x] Create API usage analytics (`api_usage`, `api_usage_daily` tables for tracking)

#### 19.2 Webhooks for External Systems
- [x] Create outbound webhook system (`webhook_endpoints`, `webhook_deliveries` tables)
- [x] Implement event types (anomaly.detected, report.generated, sync.completed, sync.failed, insight.created, metric.threshold_exceeded, connector.connected, connector.disconnected)
- [x] Add webhook management UI (`/dashboard/developer` with webhooks tab)
- [x] Create webhook retry and failure handling (max_retries, retry_delay_seconds, exponential backoff)
- [x] Implement webhook testing tools (`/api/v1/webhooks/[id]/test` endpoint)

#### 19.3 Custom Connector SDK
- [x] Design connector interface specification (`packages/connector-sdk/src/types.ts`)
- [x] Create connector development kit (`packages/connector-sdk` - BaseConnector class, auth helpers, transforms)
- [x] Build connector testing framework (`packages/connector-sdk/src/testing.ts` - ConnectorTestSuite, mock utilities)
- [x] Create connector submission process (`custom_connectors` table with status workflow: draft, testing, pending_review, approved, rejected, published)
- [ ] Implement connector marketplace concept (future enhancement)

#### 19.4 Embeddable Analytics
- [x] Create embeddable chart components (`/embed` page with dashboard, metric, chart types)
- [x] Implement iframe embedding with auth tokens (`embed_tokens` table, `/api/embed/validate`)
- [x] Add white-label customization options (hideHeader, hideBranding, theme, primaryColor, fontFamily)
- [ ] Create JavaScript SDK for custom integrations (future enhancement)

---

## Stage 20: New Vertical Packs
**Status**: Pending
**Priority**: Medium
**Rationale**: Expand TAM by serving more industries with tailored experiences.

#### 20.1 Hotel and Hospitality Pack
- [ ] Define hospitality metrics (Occupancy, ADR, RevPAR, etc.)
- [ ] Create hospitality NLQ vocabulary
- [ ] Build hospitality dashboard templates
- [ ] Add booking source tracking
- [ ] Implement seasonal analysis

#### 20.2 Restaurant Pack
- [ ] Define restaurant metrics (covers, avg check, table turnover)
- [ ] Create restaurant NLQ vocabulary
- [ ] Build restaurant dashboard templates
- [ ] Add delivery platform integration concepts
- [ ] Implement menu performance analysis

#### 20.3 Agency Pack (Multi-Client)
- [ ] Create agency workspace structure
- [ ] Implement client sub-workspaces
- [ ] Build cross-client reporting
- [ ] Add white-label capabilities
- [ ] Create client access management

#### 20.4 Services/Consulting Pack
- [ ] Define services metrics (utilization, revenue per hour, project margin)
- [ ] Create services NLQ vocabulary
- [ ] Build services dashboard templates
- [ ] Add project-based tracking concepts

---

## Stage 21: Enterprise Features
**Status**: Pending
**Priority**: Low (until enterprise customers emerge)
**Rationale**: Required for enterprise sales. Build when there's demand.

#### 21.1 Single Sign-On (SSO)
- [ ] Implement SAML 2.0 support
- [ ] Implement OIDC support
- [ ] Create SSO configuration UI
- [ ] Add just-in-time provisioning
- [ ] Implement SSO enforcement per workspace

#### 21.2 Advanced Security
- [ ] Implement IP allowlisting
- [ ] Create session management UI
- [ ] Add two-factor authentication
- [ ] Implement data encryption at rest
- [ ] Create security audit reports

#### 21.3 Compliance and Data Management
- [ ] Implement data retention policies
- [ ] Create data export for GDPR requests
- [ ] Add data deletion workflows
- [ ] Create compliance documentation
- [ ] Implement audit log retention

#### 21.4 Enterprise Support
- [ ] Create SLA tracking
- [ ] Implement priority support queues
- [ ] Add dedicated success manager tooling
- [ ] Create enterprise onboarding workflows

---

## Stage 22: Mobile Experience
**Status**: Pending
**Priority**: Low-Medium
**Rationale**: Mobile access increases engagement. Start with PWA, consider native later.

#### 22.1 Progressive Web App
- [ ] Implement PWA manifest
- [ ] Add service worker for offline capability
- [ ] Create mobile-optimized layouts
- [ ] Implement push notifications
- [ ] Add home screen installation prompts

#### 22.2 Mobile-First Features
- [ ] Create mobile dashboard views
- [ ] Implement quick actions from notifications
- [ ] Add voice input for NLQ
- [ ] Create mobile-optimized charts
- [ ] Implement gesture navigation

---

## Stage 23: AI Model Expansion
**Status**: Pending
**Priority**: Medium
**Rationale**: Reduce costs, improve performance, add redundancy.

#### 23.1 Multi-Provider Support
- [ ] Add Anthropic Claude provider
- [ ] Add Google Gemini provider
- [ ] Implement provider selection per workspace
- [ ] Create fallback provider logic
- [ ] Add cost tracking per provider

#### 23.2 Fine-Tuned Models
- [ ] Evaluate fine-tuning opportunities
- [ ] Create training data from successful queries
- [ ] Implement fine-tuned model deployment
- [ ] Add A/B testing for model versions

#### 23.3 Local/Edge Models
- [ ] Evaluate local model options for simple queries
- [ ] Implement query classification for routing
- [ ] Add on-device processing for sensitive data
- [ ] Create hybrid cloud/edge architecture

---

## Implementation Priority Matrix

| Stage | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| 11 - Connectors | Critical | High | High | None |
| 12 - Real-Time | High | Medium | High | Stage 11 |
| 13 - Advanced Analytics | High | High | High | Stage 11 |
| 14 - Marketing Agent | High | High | High | Stage 11, 13 |
| 15 - Commerce Ops | Medium-High | High | Medium | Stage 11, 13 |
| 16 - Notifications | High | Medium | High | None |
| 17 - Team Collab | Medium | Medium | Medium | None |
| 18 - Custom Dashboards | Medium | Medium | Medium | Stage 13 |
| 19 - Developer Platform | Medium | High | Medium | Stage 11-15 |
| 20 - Vertical Packs | Medium | Medium | Medium | Stage 13-15 |
| 21 - Enterprise | Low | High | Low | Stage 17, 19 |
| 22 - Mobile | Low-Medium | Medium | Medium | Stage 18 |
| 23 - AI Models | Medium | Medium | Medium | Stage 13-15 |

---

## Recommended V2 Focus (Next 3-6 Months)

**Phase 2A: Data Foundation**
1. Stage 11.1 - Stripe Connector (critical for SaaS vertical)
2. Stage 11.2 - GA4 Connector (universal value)
3. Stage 12.1-12.2 - Webhook Gateway and Real-Time Pipeline
4. Stage 16.1-16.2 - Email and Slack Integration (production ready)

**Phase 2B: Intelligence Layer**
1. Stage 13.1 - Conversational Memory
2. Stage 13.2 - Proactive Insights Engine
3. Stage 13.3-13.4 - Cohort Analysis and Segmentation
4. Stage 14.1-14.3 - Meta Ads and Marketing Dashboard

**Phase 2C: Expansion**
1. Stage 11.3-11.4 - Tiendanube and MercadoLibre (LatAm expansion)
2. Stage 14.4-14.6 - Marketing Agent NLQ and Recommendations
3. Stage 15.1-15.3 - Commerce Ops Core Features
4. Stage 17 - Team Collaboration

---

## Success Metrics for V2

| Metric | Target | Measurement |
|--------|--------|-------------|
| Connected Data Sources per Workspace | 3+ | Avg connectors per active workspace |
| Daily Active Users | 40% of MAU | DAU/MAU ratio |
| NLQ Queries per User per Week | 10+ | Avg queries per active user |
| Time to First Insight | < 5 minutes | Time from signup to first meaningful insight |
| Report Open Rate | > 60% | Email open rate for weekly digests |
| Anomaly Detection Accuracy | > 80% | User feedback on anomaly relevance |
| Feature Adoption (Marketing Agent) | 30% of eligible | Workspaces using Marketing Agent |
| Net Revenue Retention | > 110% | Account expansion vs churn |

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

