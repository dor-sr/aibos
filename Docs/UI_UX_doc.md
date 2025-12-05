# AI Business OS - UI/UX Design System

## Overview

This document defines the design system for the AI Business OS platform. All UI implementations must follow these guidelines to ensure consistency and quality.

## Design Philosophy

### Core Principles
1. **AI-First Interface**: Lead with natural language and intelligent summaries, not raw data tables
2. **Clarity Over Density**: Show what matters, hide what doesn't
3. **Opinionated Defaults**: Make smart choices for users instead of overwhelming with options
4. **Progressive Disclosure**: Surface key insights first, allow drilling down when needed

### Target Experience
- Clean, modern, professional aesthetic
- Fast, responsive interactions
- Mobile-friendly (responsive design)
- Accessible (WCAG 2.1 AA compliance target)

---

## Color System

### Brand Colors
```css
/* Primary - Deep Indigo */
--color-primary-50: #eef2ff;
--color-primary-100: #e0e7ff;
--color-primary-200: #c7d2fe;
--color-primary-300: #a5b4fc;
--color-primary-400: #818cf8;
--color-primary-500: #6366f1;  /* Main */
--color-primary-600: #4f46e5;
--color-primary-700: #4338ca;
--color-primary-800: #3730a3;
--color-primary-900: #312e81;
--color-primary-950: #1e1b4b;
```

### Semantic Colors
```css
/* Success - Green */
--color-success: #10b981;
--color-success-light: #d1fae5;

/* Warning - Amber */
--color-warning: #f59e0b;
--color-warning-light: #fef3c7;

/* Error - Red */
--color-error: #ef4444;
--color-error-light: #fee2e2;

/* Info - Blue */
--color-info: #3b82f6;
--color-info-light: #dbeafe;
```

### Neutral Palette
```css
/* Slate for UI elements */
--color-neutral-50: #f8fafc;
--color-neutral-100: #f1f5f9;
--color-neutral-200: #e2e8f0;
--color-neutral-300: #cbd5e1;
--color-neutral-400: #94a3b8;
--color-neutral-500: #64748b;
--color-neutral-600: #475569;
--color-neutral-700: #334155;
--color-neutral-800: #1e293b;
--color-neutral-900: #0f172a;
--color-neutral-950: #020617;
```

### Theme Modes
- **Light Mode**: White backgrounds (#ffffff), dark text (#0f172a)
- **Dark Mode**: Dark backgrounds (#0f172a), light text (#f8fafc)
- Default to light mode, respect system preference

---

## Typography

### Font Stack
```css
/* Primary: Inter for UI */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Mono: JetBrains Mono for code/numbers */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
```

### Usage Guidelines
- **Headings**: Font-weight 600-700, tracking tight
- **Body**: Font-weight 400, line-height 1.5-1.75
- **Labels**: Font-weight 500, text-sm, uppercase for small labels
- **Numbers/Metrics**: Use mono font for alignment in tables

---

## Spacing System

### Base Unit
- Base: 4px (0.25rem)
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Common Patterns
```css
/* Card padding */
--space-card: 1.5rem;  /* 24px */

/* Section spacing */
--space-section: 2rem; /* 32px */

/* Component gaps */
--space-gap-sm: 0.5rem;  /* 8px */
--space-gap-md: 1rem;    /* 16px */
--space-gap-lg: 1.5rem;  /* 24px */
```

---

## Component Library

### Base Components (shadcn/ui)
Use shadcn/ui as the foundation. Key components:
- Button
- Card
- Input
- Select
- Dialog
- Dropdown Menu
- Tabs
- Table
- Badge
- Avatar
- Tooltip

### Custom Components

#### Metric Card
Display key metrics with trend indicators.

```
┌─────────────────────────────────────┐
│ Revenue                             │
│ $24,500                    ↑ 12.5%  │
│ vs. last period                     │
└─────────────────────────────────────┘
```

Props:
- `title`: string
- `value`: string | number
- `change`: number (percentage)
- `changeLabel`: string
- `icon`: optional icon component
- `loading`: boolean

#### Chart Card
Container for charts with title and controls.

```
┌─────────────────────────────────────┐
│ Revenue Over Time         [7d][30d] │
│ ┌─────────────────────────────────┐ │
│ │                           ╭─╮   │ │
│ │                    ╭──────╯ │   │ │
│ │            ╭───────╯        ╰╮  │ │
│ │ ╭──────────╯                 ╰──│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Props:
- `title`: string
- `children`: chart component
- `controls`: optional control elements
- `loading`: boolean

#### Ask Box
Natural language question input.

```
┌─────────────────────────────────────┐
│ 🔍 Ask anything about your data...  │
│                                     │
│ Suggestions:                        │
│ • Why did revenue drop last week?   │
│ • What are my best selling products?│
└─────────────────────────────────────┘
```

Props:
- `placeholder`: string
- `suggestions`: string[]
- `onSubmit`: (question: string) => void
- `loading`: boolean

---

## Layout Patterns

### Dashboard Layout
```
┌──────────────────────────────────────────────────┐
│ ┌─────────┐                        [User] [Settings]
│ │  Logo   │  Overview  Connectors  Reports       │
│ └─────────┘                                      │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Ask anything...                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────┐ │
│  │ Metric  │  │ Metric  │  │ Metric  │  │Met. │ │
│  │ Card 1  │  │ Card 2  │  │ Card 3  │  │ 4   │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │                                            │ │
│  │              Main Chart                    │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐ │
│  │   Secondary Chart  │  │   AI Insights      │ │
│  └────────────────────┘  └────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Responsive Breakpoints
```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Grid System
- Dashboard: 4 columns on desktop, 2 on tablet, 1 on mobile
- Metric cards: Equal width in row, responsive wrap
- Charts: Full width or 50% on desktop

---

## Animation and Motion

### Principles
- Subtle, purposeful animations
- No unnecessary movement
- Respect reduced motion preferences

### Durations
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

### Easing
```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Animations
- **Fade in**: opacity 0 to 1, duration-fast
- **Slide up**: translateY(8px) to 0, duration-normal
- **Scale**: scale(0.95) to 1, duration-fast
- **Skeleton pulse**: opacity oscillation for loading states

---

## Icons

### Icon Library
Use Lucide Icons (included with shadcn/ui).

### Common Icons
- Navigation: `Home`, `Settings`, `User`, `LogOut`
- Metrics: `TrendingUp`, `TrendingDown`, `DollarSign`, `ShoppingCart`
- Actions: `Plus`, `Search`, `Filter`, `Download`, `Refresh`
- Status: `CheckCircle`, `AlertCircle`, `XCircle`, `Info`

### Sizes
- Small: 16px (inline with text)
- Medium: 20px (buttons, inputs)
- Large: 24px (feature icons)

---

## Forms

### Input States
- Default: Neutral border
- Focus: Primary ring
- Error: Error border + message
- Disabled: Reduced opacity, not-allowed cursor

### Validation
- Real-time validation where helpful
- Clear error messages below inputs
- Success indicators for completed fields

### Labels
- Always visible (no placeholder-only labels)
- Required fields marked with asterisk
- Help text below input when needed

---

## Charts

### Library
Use Recharts with custom styling to match design system.

### Chart Types (V1)
1. **Line Chart**: Time series (revenue, MRR over time)
2. **Bar Chart**: Comparisons (channel performance)
3. **Area Chart**: Cumulative metrics

### Styling Guidelines
- Use primary color for main series
- Use neutral colors for grid/axes
- Rounded corners on bars
- Smooth curves on lines
- Clear tooltips with formatted values

---

## Loading States

### Skeleton Loading
- Use skeleton components for initial page load
- Match approximate shape of content
- Pulse animation

### Inline Loading
- Small spinner for button actions
- Loading dots for AI responses
- Progress bar for long operations

---

## Empty States

### Structure
```
┌─────────────────────────────────────┐
│                                     │
│           [Illustration]            │
│                                     │
│      No data yet                    │
│      Connect your first data        │
│      source to get started.         │
│                                     │
│      [Primary Action Button]        │
│                                     │
└─────────────────────────────────────┘
```

### Guidelines
- Clear explanation of what's missing
- Actionable next step
- Friendly, not alarming tone

---

## Accessibility

### Requirements
- Color contrast ratio minimum 4.5:1
- Keyboard navigation for all interactive elements
- Screen reader labels on icons and images
- Focus indicators visible
- Form error announcements

### Testing
- Test with keyboard only
- Test with screen reader
- Check color contrast
- Verify focus order

---

## Dark Mode Implementation

### CSS Variables
Use CSS custom properties for colors, switch at root level.

### Component Considerations
- Shadows: Reduce or remove in dark mode
- Borders: May need adjustment
- Images: Consider dark-mode variants for illustrations

---

## Page-Specific Guidelines

### Login / Signup
- Centered card layout
- Clean, minimal design
- Social login buttons prominent
- Clear error handling

### Onboarding
- Step indicator
- One action per step
- Skip option where appropriate
- Progress persistence

### Dashboard Overview
- Question box at top
- 4 key metrics
- Main time series chart
- AI insights panel

### Settings
- Grouped sections
- Clear labels
- Save/cancel actions
- Destructive actions in danger zone



