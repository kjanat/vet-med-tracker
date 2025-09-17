# VetMed Tracker - Style Conventions & Patterns

## Code Formatting & Linting

### Biome Configuration

- **Formatter**: 2-space indentation, double quotes for JavaScript
- **Linter**: Recommended rules + complexity analysis
- **Import Organization**: Automatic import sorting enabled
- **CSS**: Tailwind-specific rule allowances

### Key Rules

- **Complexity**: `noExcessiveCognitiveComplexity` enabled
- **Class Sorting**: `useSortedClasses` for clsx, cva, cn functions
- **Test Overrides**: Relaxed `noExplicitAny` and `noNonNullAssertion` for tests
- **Database Files**: Formatting/linting disabled for db/ and drizzle/

## Component Patterns

### UI Components (shadcn/ui based)

- **Button Variants**: Uses CVA (Class Variance Authority) for consistent styling
- **Variant System**: default, destructive, outline, secondary, ghost, link
- **Size System**: default, sm, lg, icon
- **Pattern**: All components follow Radix UI + Tailwind CSS architecture

### Component Organization

```text
components/
├── auth/          # Authentication-specific components
├── ui/            # Reusable UI primitives (shadcn/ui)
├── layout/        # Navigation and layout components
├── dashboard/     # Dashboard widgets and layouts
├── [feature]/     # Feature-specific components
└── providers/     # React context providers
```

### Naming Conventions

- **Components**: PascalCase (e.g., `LoginButton`, `UserMenu`)
- **Files**: kebab-case matching component name (e.g., `login-button.tsx`)
- **Directories**: kebab-case for features (e.g., `user-menu-desktop.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAnimalForm`)

## TypeScript Patterns

### Strict Configuration

- **Strict Mode**: Enabled with comprehensive type checking
- **No Implicit Any**: Enforced except in test files (warning only)
- **Null Checks**: Strict null checking enabled
- **Path Mapping**: Uses `@/` for absolute imports

### Type Organization

- **Schemas**: Zod schemas in `lib/schemas/`
- **Types**: Extracted types in `types/` directory
- **API Types**: Auto-generated from tRPC routers
- **Component Props**: Inline interfaces or extracted types

## File Structure Patterns

### Feature-Based Organization

```text
feature/
├── components/       # Feature-specific components
├── hooks/           # Feature-specific hooks
├── services/        # Business logic and transformers
├── schemas/         # Validation schemas
└── types.ts         # Type definitions
```

### Import Patterns

```typescript
// External dependencies first
import React from "react"
import { z } from "zod"

// Internal imports with @ alias
import { Button } from "@/components/ui/button"
import { useAnimalForm } from "@/hooks/forms/useAnimalForm"

// Relative imports last
import "./styles.css"
```

## Styling Patterns

### Tailwind CSS v4

- **Design System**: Custom CSS properties for consistent theming
- **Class Organization**: Sorted by CVA configuration
- **Responsive Design**: Mobile-first approach
- **Component Styling**: Co-located with component files

### CSS Organization

- **Global Styles**: `app/globals.css` for base styles
- **Component Styles**: CSS modules or Tailwind classes
- **Theme Variables**: CSS custom properties in global styles

## Testing Patterns

### Test Organization

- **Unit Tests**: `tests/` directory at project root
- **Component Tests**: Alongside components in `tests/auth/`
- **Hook Tests**: Separate test files for custom hooks
- **Test Utilities**: Shared mocks and helpers

### Test File Conventions

- **Naming**: `*.test.ts` or `*.test.tsx`
- **Structure**: Describe blocks for feature grouping
- **Mocking**: Happy DOM + React Testing Library
- **Coverage**: 70% target threshold

## API & Data Patterns

### tRPC Configuration

- **Type Safety**: End-to-end type safety from server to client
- **Router Organization**: Feature-based router structure
- **Error Handling**: Standardized error responses
- **Middleware**: Logging, authentication, and validation

### Database Patterns

- **ORM**: Drizzle ORM with TypeScript schemas
- **Migrations**: Version-controlled schema changes
- **Seeding**: Development data population scripts
- **Connection**: Connection pooling for performance

## Development Workflow

### Git Conventions

- **Branching**: Feature branches from master
- **Commits**: Conventional commit messages
- **PRs**: Feature → master with review requirements

### Quality Gates

- **Pre-commit**: Husky hooks for linting and formatting
- **CI/CD**: GitHub Actions for testing and deployment
- **Type Checking**: Required before merge
- **Coverage**: Monitored but not enforced
