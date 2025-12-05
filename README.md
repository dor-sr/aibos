# AI Business OS

A multi-agent AI platform that provides Analytics, Digital Marketing, and Commerce Operations intelligence for businesses.

## Overview

AI Business OS delivers three specialized AI agents that can operate independently or as a unified suite:

- **Analytics Agent** - AI-first business analytics and insights
- **Digital Marketing Agent** - Marketing performance and optimization
- **Commerce Operations Agent** - Inventory, pricing, and operational intelligence

V1 focuses on the Analytics Agent with support for ecommerce and SaaS verticals.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **ORM**: Drizzle ORM
- **AI**: OpenAI (with provider abstraction)

## Project Structure

```
aibos/
├── apps/
│   ├── web/           # Next.js web application
│   └── worker/        # Background job worker
├── packages/
│   ├── core/          # Shared types and utilities
│   ├── data-model/    # Database schemas
│   ├── connectors/    # Data source integrations
│   ├── ai-runtime/    # LLM abstraction
│   ├── analytics-agent/
│   ├── marketing-agent/
│   ├── commerce-ops-agent/
│   └── vertical-packs/
└── Docs/              # Documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/aibos.git
   cd aibos
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. Push database schema:
   ```bash
   pnpm db:push
   ```

5. Start development:
   ```bash
   pnpm dev
   ```

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:web` | Start web app only |
| `pnpm dev:worker` | Start worker only |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

### Package Naming

All packages use the `@aibos/` scope:
- `@aibos/web` - Web application
- `@aibos/worker` - Background worker
- `@aibos/core` - Shared utilities
- `@aibos/data-model` - Database layer
- etc.

## Documentation

- [Implementation Plan](./Docs/Implementation.md)
- [Project Structure](./Docs/project_structure.md)
- [UI/UX Guidelines](./Docs/UI_UX_doc.md)
- [Bug Tracking](./Docs/Bug_tracking.md)
- [Product Context](./project_context.md)

## License

Proprietary - All rights reserved.


