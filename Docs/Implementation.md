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
- [ ] Implement Google OAuth flow
- [ ] Create session and pageview ingestion
- [ ] Create event tracking ingestion
- [ ] Create traffic source attribution data
- [ ] Create conversion funnel data extraction
- [ ] Implement scheduled daily sync
- [ ] Map GA4 dimensions to internal semantic model

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
**Status**: Pending
**Priority**: High
**Rationale**: Polling is inefficient and delayed. Real-time webhooks enable instant insights and faster anomaly detection.

#### 12.1 Webhook Gateway
- [ ] Create `/api/webhooks/[provider]` unified endpoint
- [ ] Implement webhook signature verification per provider
- [ ] Create webhook event queue for reliable processing
- [ ] Implement idempotency handling for duplicate events
- [ ] Add webhook retry mechanism with exponential backoff
- [ ] Create webhook event logging for debugging

#### 12.2 Real-Time Data Pipeline
- [ ] Implement event streaming from webhooks to database
- [ ] Create real-time metric recalculation triggers
- [ ] Implement WebSocket/SSE for dashboard live updates
- [ ] Add real-time anomaly detection on incoming events
- [ ] Create event batching for high-volume sources

#### 12.3 Supabase Realtime Integration
- [ ] Enable Supabase Realtime on key tables
- [ ] Implement client-side subscriptions for dashboard
- [ ] Create notification triggers for metric changes
- [ ] Add presence tracking for collaborative features

---

## Stage 13: Advanced Analytics Agent
**Status**: Pending
**Priority**: High
**Rationale**: Transform from a query tool to a proactive business advisor.

#### 13.1 Conversational Memory
- [ ] Implement conversation history storage
- [ ] Create context window management for long conversations
- [ ] Add entity memory (remember discussed products, campaigns, etc.)
- [ ] Implement follow-up question understanding
- [ ] Create conversation summarization for context compression

#### 13.2 Proactive Insights Engine
- [ ] Create daily insight generation job
- [ ] Implement opportunity detection (growth patterns, untapped segments)
- [ ] Create risk detection (churn signals, declining metrics)
- [ ] Build insight prioritization algorithm
- [ ] Implement push notifications for critical insights
- [ ] Create insight delivery via email digest

#### 13.3 Cohort Analysis
- [ ] Implement customer cohort builder by acquisition date
- [ ] Create cohort retention curves
- [ ] Add cohort comparison views
- [ ] Implement cohort-based LTV calculation
- [ ] Create NLQ support for cohort questions

#### 13.4 Customer Segmentation
- [ ] Implement RFM (Recency, Frequency, Monetary) segmentation
- [ ] Create behavioral clustering
- [ ] Add segment comparison dashboards
- [ ] Implement segment-based alerts
- [ ] Create dynamic segment definitions via NLQ

#### 13.5 Attribution Modeling
- [ ] Implement first-touch attribution
- [ ] Implement last-touch attribution
- [ ] Implement linear attribution
- [ ] Implement time-decay attribution
- [ ] Create channel contribution reports
- [ ] Add NLQ support for attribution questions

#### 13.6 Predictive Analytics
- [ ] Implement churn prediction model
- [ ] Create LTV prediction for new customers
- [ ] Add demand forecasting for products
- [ ] Implement revenue forecasting
- [ ] Create "what-if" scenario modeling

---

## Stage 14: Digital Marketing Agent (Full Implementation)
**Status**: Pending
**Priority**: High
**Rationale**: Complete the second product in the suite. Marketing is where businesses spend money, making this high-value.

#### 14.1 Meta Ads Connector
**Docs**: [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/)
- [ ] Implement Meta OAuth flow with required permissions
- [ ] Create ad account ingestion
- [ ] Create campaign, ad set, and ad performance ingestion
- [ ] Track spend, impressions, clicks, conversions
- [ ] Implement creative asset metadata extraction
- [ ] Handle attribution window differences

#### 14.2 Google Ads Connector
**Docs**: [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [ ] Implement Google Ads OAuth flow
- [ ] Create campaign and ad group ingestion
- [ ] Create keyword performance tracking
- [ ] Track Quality Score and ad relevance
- [ ] Implement conversion tracking sync
- [ ] Handle Smart campaigns and Performance Max

#### 14.3 Marketing Performance Dashboard
- [ ] Create unified ad spend overview
- [ ] Implement cross-channel ROAS calculation
- [ ] Build CAC tracking by channel and campaign
- [ ] Create creative performance comparison
- [ ] Add landing page performance tracking
- [ ] Implement budget pacing alerts

#### 14.4 Marketing Agent NLQ
- [ ] Extend NLQ for marketing-specific questions
- [ ] Add campaign performance queries
- [ ] Implement spend analysis queries
- [ ] Create creative comparison queries
- [ ] Add audience performance queries

#### 14.5 Marketing Recommendations Engine
- [ ] Implement budget reallocation suggestions
- [ ] Create underperforming campaign alerts
- [ ] Add audience expansion recommendations
- [ ] Implement creative fatigue detection
- [ ] Create A/B test recommendations
- [ ] Build seasonal opportunity alerts

#### 14.6 Creative Generation
- [ ] Implement ad copy generation (headlines, descriptions)
- [ ] Create image prompt generation for creative briefs
- [ ] Add landing page copy suggestions
- [ ] Implement email subject line generation
- [ ] Create variation generator for A/B testing

---

## Stage 15: Commerce Operations Agent (Full Implementation)
**Status**: Pending
**Priority**: Medium-High
**Rationale**: Completes the product suite. Essential for serious ecommerce merchants.

#### 15.1 Inventory Management Schema
- [ ] Create inventory_locations table
- [ ] Create inventory_levels table with history
- [ ] Create stock_movements table (in/out tracking)
- [ ] Create purchase_orders table
- [ ] Create suppliers table
- [ ] Add inventory sync from Shopify/Tiendanube

#### 15.2 Stock Forecasting
- [ ] Implement demand forecasting per SKU
- [ ] Create days-of-stock calculation
- [ ] Add stockout risk alerting
- [ ] Implement overstock detection
- [ ] Create reorder point recommendations
- [ ] Factor in marketing campaigns for demand spikes

#### 15.3 Pricing Intelligence
- [ ] Create pricing history tracking
- [ ] Implement competitor price monitoring (where available)
- [ ] Add margin analysis per product
- [ ] Create price elasticity indicators
- [ ] Implement dynamic pricing suggestions

#### 15.4 Multi-Channel Coordination
- [ ] Create unified product catalog across channels
- [ ] Implement inventory allocation recommendations
- [ ] Add channel profitability comparison
- [ ] Create channel-specific pricing strategies
- [ ] Implement listing optimization suggestions

#### 15.5 Commerce Ops Dashboard
- [ ] Create inventory health overview
- [ ] Implement stockout/overstock alerts panel
- [ ] Build margin analysis views
- [ ] Add supplier performance tracking
- [ ] Create purchase order management UI

#### 15.6 Commerce Ops NLQ
- [ ] Add inventory-specific question handling
- [ ] Implement stock level queries
- [ ] Create margin and pricing queries
- [ ] Add supplier performance queries
- [ ] Implement reorder recommendation queries

---

## Stage 16: Notification System (Production Ready)
**Status**: Pending
**Priority**: High
**Rationale**: Notifications drive engagement and retention. Users need to receive value even when not in the app.

#### 16.1 Email Provider Integration
**Options**: Resend, SendGrid, AWS SES
- [ ] Integrate email provider SDK
- [ ] Create templated email system with React Email
- [ ] Implement weekly digest emails
- [ ] Create anomaly alert emails
- [ ] Build report delivery emails
- [ ] Add unsubscribe and preference management
- [ ] Implement email analytics (opens, clicks)

#### 16.2 Slack Integration
- [ ] Create Slack app with Bot Token
- [ ] Implement OAuth flow for workspace connection
- [ ] Create insight delivery to channels
- [ ] Implement alert notifications
- [ ] Add interactive message actions
- [ ] Create slash command for quick queries

#### 16.3 In-App Notifications
- [ ] Create notification center UI
- [ ] Implement notification preferences
- [ ] Add notification grouping and prioritization
- [ ] Create read/unread state management
- [ ] Implement browser push notifications

#### 16.4 WhatsApp Business Integration (LatAm Priority)
- [ ] Integrate WhatsApp Business API
- [ ] Create daily/weekly summary messages
- [ ] Implement alert delivery
- [ ] Add interactive quick replies

---

## Stage 17: Team Collaboration
**Status**: Pending
**Priority**: Medium
**Rationale**: B2B products need team features. Essential for larger accounts and stickiness.

#### 17.1 Enhanced Role System
- [ ] Implement role-based access control (RBAC)
- [ ] Create admin, editor, viewer roles
- [ ] Add custom role creation
- [ ] Implement permission granularity (per agent, per feature)
- [ ] Create role assignment UI

#### 17.2 Team Invitations
- [ ] Create team invite flow with email
- [ ] Implement invite token management
- [ ] Add bulk invite capability
- [ ] Create pending invites management
- [ ] Implement invite expiration

#### 17.3 Activity and Audit Logs
- [ ] Create activity log schema
- [ ] Implement action logging throughout app
- [ ] Build activity feed UI
- [ ] Add filtering and search for logs
- [ ] Create audit export for compliance

#### 17.4 Shared Resources
- [ ] Implement saved question sharing
- [ ] Create shared dashboard views
- [ ] Add report sharing and scheduling to team
- [ ] Implement comment/annotation system on insights

---

## Stage 18: Custom Dashboards and Saved Views
**Status**: Pending
**Priority**: Medium
**Rationale**: Power users want customization. This increases engagement and value perception.

#### 18.1 Dashboard Builder
- [ ] Create drag-and-drop dashboard editor
- [ ] Implement widget library (metrics, charts, tables, text)
- [ ] Add widget configuration panels
- [ ] Create dashboard templates per vertical
- [ ] Implement dashboard sharing

#### 18.2 Custom Metrics
- [ ] Create metric builder UI
- [ ] Implement formula-based custom metrics
- [ ] Add metric validation and preview
- [ ] Create metric library for workspace
- [ ] Enable custom metrics in NLQ

#### 18.3 Saved Views and Filters
- [ ] Implement filter presets
- [ ] Create date range presets (custom periods)
- [ ] Add segment-based views
- [ ] Implement view sharing within team
- [ ] Create default view preferences

#### 18.4 Export and Reporting
- [ ] Implement PDF export for dashboards
- [ ] Create CSV/Excel export for data tables
- [ ] Add scheduled report delivery
- [ ] Implement white-label PDF reports
- [ ] Create presentation mode

---

## Stage 19: Developer Platform
**Status**: Pending
**Priority**: Medium
**Rationale**: API access enables integrations, automations, and enterprise use cases.

#### 19.1 REST API
- [ ] Design public API endpoints
- [ ] Implement API key authentication
- [ ] Create rate limiting per plan
- [ ] Build comprehensive API documentation
- [ ] Add API versioning strategy
- [ ] Create API usage analytics

#### 19.2 Webhooks for External Systems
- [ ] Create outbound webhook system
- [ ] Implement event types (anomaly detected, report generated, etc.)
- [ ] Add webhook management UI
- [ ] Create webhook retry and failure handling
- [ ] Implement webhook testing tools

#### 19.3 Custom Connector SDK
- [ ] Design connector interface specification
- [ ] Create connector development kit
- [ ] Build connector testing framework
- [ ] Create connector submission process
- [ ] Implement connector marketplace concept

#### 19.4 Embeddable Analytics
- [ ] Create embeddable chart components
- [ ] Implement iframe embedding with auth tokens
- [ ] Add white-label customization options
- [ ] Create JavaScript SDK for custom integrations

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

