# AI Business OS Platform - Project Context

## Overview

This project builds a multi agent AI platform sold as three separate products that can also operate as a unified suite on a single platform.

The platform provides:

- One shared workspace per business
- One shared data and semantic layer
- Three specialized AI agents (products):
  - Analytics Agent
  - Digital Marketing Agent
  - Commerce Operations Agent

Each agent can be subscribed independently. When combined, they behave like a single AI operating system for the business, with particular strength for ecommerce and LatAm commerce, while remaining global and multi industry by design.

Working name: AI Business OS (final branding to be defined later).

---

## Product Vision

Enable any business to understand what is happening, why it is happening, and what to do next, without drowning in dashboards, manual analysis, or siloed tools.

The platform aims to:

- Ingest data from the main systems that run a business
- Build a semantic understanding of performance
- Explain performance in clear language
- Propose and increasingly execute actions through specialized agents

Analytics and Marketing agents are horizontal and multi industry from day one. The Commerce Operations agent starts focused on ecommerce and LatAm marketplaces, then expands globally and into other commerce surfaces such as delivery platforms.

---

## Product Suite

The platform exposes three SaaS products:

1. Analytics Agent (horizontal)
2. Digital Marketing Agent (horizontal)
3. Commerce Operations Agent (commerce focused)

All three live on the same platform, share the same workspace concept, and are configured per business.

Users can:

- Use a single agent as a standalone product
- Combine two agents
- Use the full bundle, which is especially powerful for ecommerce and omni channel commerce

### Platform behavior

- Single sign up and login
- Each workspace belongs to one business, with team members and roles
- Each workspace has:
  - Vertical type and vertical pack (ecommerce, SaaS, hotel, restaurant, etc.)
  - A set of connected data sources and integrations
  - A set of active agents (Analytics, Marketing, Commerce Ops)
- Billing and plans are per workspace, based on which agents are active and usage tiers

---

## Analytics Agent (Horizontal Product)

### Purpose

Provide AI first analytics and business insights for any type of business, without requiring the user to learn complex dashboards or BI tools.

### Scope

This agent supports multiple industries:

- Ecommerce and retail
- SaaS and subscriptions
- Hospitality and travel (hotels, rentals, tours)
- Gastronomy (restaurants, cafes, delivery first brands)
- General services and other digital businesses

### Core responsibilities

- Ingest and normalize data from multiple sources:
  - Web and app analytics (GA4, server side events, product analytics)
  - Revenue and billing (Shopify, WooCommerce, Tiendanube, Stripe, MercadoLibre orders, etc.)
  - CRMs or basic lead sources (later)
- Build a semantic business model:
  - Entities: customers, sessions, orders, bookings, subscriptions, leads
  - Metrics: revenue, MRR, AOV, occupancy, churn, etc., depending on vertical pack
- Provide a natural language interface for questions such as:
  - Why did revenue or MRR change vs last period
  - Which channels, campaigns, or products are driving growth
  - How are new vs returning customers behaving
  - How does performance compare to last month or last season
- Generate scheduled reports:
  - Weekly and monthly email or Slack summaries
  - Clear written explanations plus a small set of charts
- Detect anomalies:
  - Sudden changes in key metrics (revenue, MRR, conversion, occupancy, CAC, etc.)
  - Provide candidate explanations using available data
- Serve as the data foundation for the Marketing and Commerce Operations agents:
  - All other agents call into Analytics for ground truth and context

Analytics Agent is always conceptually present. Other agents depend on its data model, even if the customer only sees a subset of its UI.

---

## Digital Marketing Agent (Horizontal Product)

### Purpose

Help any business understand, improve, and partially automate its marketing across channels using the Analytics Agent as the single source of truth.

### Scope

This agent also supports multiple industries:

- Ecommerce and retail
- SaaS and subscriptions
- Hotels, travel, tourism
- Restaurants and local businesses
- Other digital and service businesses

### Core responsibilities

- Connect to acquisition and engagement channels:
  - Meta Ads, Google Ads, later TikTok, email providers, push, maybe search console
- Aggregate performance across channels:
  - Spend, impressions, clicks, CPC, CPM, conversions
  - Link to business metrics from Analytics Agent: revenue, bookings, MRR, leads, etc.
- Produce clear summaries:
  - Per channel, campaign, ad set, creative, and landing page
  - Focus on a few key insights instead of many raw tables
- Suggest actions:
  - Increase or decrease budgets on specific campaigns
  - Pause or fix underperforming ad sets
  - Propose new tests, angles, and segments
- Generate marketing assets:
  - Ad copy and variants
  - Creative briefs (images, video angles)
  - Landing page improvements
  - SEO and content suggestions
- Adapt recommendations to vertical and region:
  - Ecommerce vs SaaS vs hotel vs restaurant
  - LatAm contexts where channels or user behavior differ

The Marketing Agent can operate alone with a minimal Analytics base, but is significantly stronger when the Analytics Agent is fully configured.

---

## Commerce Operations Agent (Commerce Focused Product)

### Purpose

Provide deep operational intelligence for businesses that sell products or services with inventory, focusing on stock, pricing, promotions, and operational readiness.

### Scope

This agent is vertical and commerce centric. It will be especially relevant for:

- Ecommerce brands and online retailers
- Marketplace sellers (especially LatAm)
- Omni channel merchants that sell across store, marketplace, and delivery platforms

It starts with a strong LatAm focus and is designed to scale globally.

### Core responsibilities

- Integrate with commerce surfaces such as:
  - Storefronts: Shopify, WooCommerce, Tiendanube, and similar platforms
  - Marketplaces: MercadoLibre initially, later others (Amazon, etc.)
  - Delivery and on demand platforms: Rappi, PedidosYa, and similar services
- Ingest and unify:
  - Product catalogs and SKUs
  - Stock levels and inventory movements
  - Orders and sales history
  - Pricing, discounts, campaigns
- Forecast and alert:
  - Days of stock left per SKU, factoring marketing plans and seasonality
  - Stock out risks and overstock risks
- Recommend operational actions:
  - Reorder suggestions
  - Price changes
  - Bundles or discount campaigns
  - Channel specific strategies (promote in MercadoLibre vs own store vs Rappi, etc.)
- Coordinate with the Marketing Agent:
  - Avoid pushing products with low stock
  - Promote slow moving or high margin inventory
  - Plan campaigns around inventory and margin constraints

This agent is not needed for all businesses on the platform. SaaS, hotels, or service businesses can use Analytics and Marketing without Commerce Ops.

---

## Vertical Packs

To avoid fracturing the codebase while serving multiple industries, the platform uses vertical packs.

A vertical pack defines:

- Business type, for example:
  - ecommerce
  - saas
  - hotel
  - restaurant
  - services / generic
- Default metrics and KPIs for that vertical
- Default dashboards and insight templates for the Analytics Agent
- Default playbooks and suggestion templates for the Marketing Agent
- Optional configuration hints for Commerce Operations where relevant

Examples:

### Ecommerce pack

- Metrics:
  - Revenue, AOV, conversion rate, items per order
  - CAC, ROAS, LTV, repeat purchase rate
- Typical Analytics questions:
  - Best performing products or categories
  - Channel mix and contribution to revenue
  - Abandoned cart trends
- Typical Marketing suggestions:
  - New promos and bundles
  - Catalog driven remarketing
  - Seasonal campaigns

### SaaS pack

- Metrics:
  - MRR, ARPU, active users, churn, expansion, contraction
  - Trial to paid, activation, cohorts
- Typical Analytics questions:
  - Why did MRR change this month
  - Which segments churn the most
  - Which acquisition channels produce the best LTV
- Typical Marketing suggestions:
  - Trial activation flows
  - Retention and winback campaigns
  - Payback period oriented ad decisions

### Hotel and hospitality pack

- Metrics:
  - Occupancy, ADR, RevPAR, booking window, channel mix
- Typical Analytics questions:
  - How did occupancy evolve across channels
  - Impact of campaigns on bookings
- Typical Marketing suggestions:
  - Low and high season strategies
  - Packages and upsells

Vertical packs are configuration, prompts, and templates. The core code and data model is shared.

---

## Target Users and Go To Market

The platform is multi vertical, but the rollout is staged.

### Short term focus

- For Analytics and Marketing agents:
  - Industry: multi industry from day one
  - ICP: founders, operators, and small teams running:
    - Ecommerce brands
    - SaaS products
    - Hotels or hospitality businesses
    - Restaurants or local businesses with digital acquisition
- For Commerce Operations agent:
  - Strong initial focus on LatAm ecommerce and marketplaces:
    - Shopify and WooCommerce merchants in LatAm
    - Tiendanube merchants
    - MercadoLibre sellers
    - Over time, add connectors to Rappi, PedidosYa, and similar platforms
  - Long term: expand to global commerce platforms

### Bundle positioning

- Individual products:
  - Analytics Agent as the entry point and easiest sell
  - Digital Marketing Agent for growth focused teams
  - Commerce Operations Agent for serious merchants with inventory
- Bundles:
  - Ecommerce bundle: Analytics + Marketing + Commerce Ops
  - SaaS bundle: Analytics + Marketing
  - Hospitality bundle: Analytics + Marketing with hospitality pack
  - Custom bundles per region or vertical

---

## Unified Platform Principles

- Single platform where all three products live
- Single workspace and identity per business
- Shared data and semantic layer across agents
- AI first UX:
  - Natural language interfaces
  - Guided questions and AI narratives
  - Opinionated dashboards that highlight what matters
- Clear separation between:
  - Insights and explanations
  - Suggestions and auto actions
  - Per agent capabilities

---

## V1 Product Scope

V1 must be lovable but narrow, especially for a solo builder. The initial focus is on the Analytics Agent, with early hooks for the Marketing Agent, while keeping the core data model flexible enough to support later vertical packs and Commerce Operations.

### V1 goals

- Deliver a strong first version of the Analytics Agent
- Make it usable for at least:
  - Ecommerce businesses
  - SaaS or generic digital businesses
- Prepare the ground for:
  - The Digital Marketing Agent (connections and data model)
  - The Commerce Operations Agent (commerce entities and inventory concepts)

### V1 capabilities

- Workspace and vertical setup:
  - Create a workspace for a business
  - Select vertical type and vertical pack (ecommerce, saas, or generic for now)
- Data ingestion:
  - For ecommerce:
    - Connect to Shopify or Tiendanube as a first integration
    - Ingest orders, products, customers
  - For SaaS or generic:
    - Connect to Stripe (or similar billing) and GA4 or basic event tracking
- Analytics:
  - Store normalized metrics and events
  - Show a simple overview dashboard with a small set of high signal metrics per vertical pack
  - Support a first version of natural language questions and answers about:
    - Revenue and trends
    - Key metrics per vertical (AOV, MRR, etc.)
- Reporting:
  - Send a weekly email or Slack summary with key changes and explanations
- Alerts:
  - Basic anomaly detection on a small set of core metrics

### Out of scope for V1

- Deep multichannel attribution
- Fully featured Marketing Agent UI and workflows
- Deep Commerce Operations logic
- Connectors to all planned platforms (start small and expand)

---

## Technical and Architectural Direction

### High level stack

- Frontend: Next.js, React, TypeScript
- Backend and data:
  - Postgres (Supabase recommended for speed: auth, SQL, storage)
  - Optional ORM or query builder (Prisma or direct SQL)
- AI and agents:
  - LLM provider abstraction with OpenAI as initial default
  - Central AI runtime and agent orchestration layer
- Jobs and scheduling:
  - Background jobs for ingestion, summaries, and alerts

### Monorepo layout (example)

```txt
/apps
  web                 # Next.js web app (UI, API routes)
  worker              # Background jobs (ingestion, summaries, alerts)
/packages
  core                # shared types, utils, config
  data-model          # database schemas, domain models, migrations
  connectors          # Shopify, Tiendanube, MercadoLibre, GA4, Stripe, Meta Ads, etc
  ai-runtime          # LLM orchestration, tools, prompts, memory
  analytics-agent     # logic, prompts, and workflows for Analytics Agent
  marketing-agent     # logic, prompts, and workflows for Marketing Agent
  commerce-ops-agent  # logic, prompts, and workflows for Commerce Operations Agent
  vertical-packs      # metric definitions, insight templates, playbooks per vertical