# UI Component Library

This directory contains pure UI components organized by functional category. These are reusable, stateless components
that focus on presentation and user interaction patterns.

## Directory Structure

```
lib/
├── forms/           # Form controls and input elements
├── feedback/        # User feedback and status components
├── navigation/      # Navigation and wayfinding components
├── data-display/    # Data presentation components
├── overlays/        # Modal, popover, and overlay components
└── index.ts         # Main barrel export
```

## Categories

### Forms (`/forms`)

Components for user input and form handling:

- `form.tsx` - Form field management and validation
- `input.tsx` - Text input component
- `textarea.tsx` - Multi-line text input
- `select.tsx` - Dropdown selection component
- `checkbox.tsx` - Checkbox input
- `radio-group.tsx` - Radio button groups
- `label.tsx` - Form labels
- `switch.tsx` - Toggle switch component

### Feedback (`/feedback`)

Components for communicating status and providing user feedback:

- `alert.tsx` - Alert messages
- `alert-dialog.tsx` - Confirmation and alert dialogs
- `toast.tsx` - Toast notifications
- `progress.tsx` - Progress indicators
- `loading-skeleton.tsx` - Loading placeholder components

### Navigation (`/navigation`)

Components for navigation and wayfinding:

- `breadcrumb.tsx` - Breadcrumb navigation
- `tabs.tsx` - Tabbed navigation interface

### Data Display (`/data-display`)

Components for displaying data and content:

- `table.tsx` - Data tables
- `card.tsx` - Content cards
- `badge.tsx` - Status badges and labels
- `avatar.tsx` - User avatars and profile pictures
- `separator.tsx` - Visual separators and dividers
- `aspect-ratio.tsx` - Aspect ratio containers

### Overlays (`/overlays`)

Components that appear above other content:

- `dialog.tsx` - Modal dialogs
- `popover.tsx` - Contextual popovers
- `tooltip.tsx` - Hover tooltips
- `sheet.tsx` - Slide-out panels
- `accordion.tsx` - Collapsible sections
- `collapsible.tsx` - Simple collapsible content

## Usage

### Importing Components

```typescript
// Import from category
import { Form, Input, Label } from "@/components/lib/forms";
import { Alert, Toast } from "@/components/lib/feedback";

// Import from main barrel export
import { Form, Input, Alert, Toast } from "@/components/lib";
```

### Migration Status

This is Phase 1 of a component reorganization. During the transition period:

1. Components exist in both `/ui` and `/lib` locations
2. Imports should gradually migrate to use `/lib` paths
3. Backward compatibility is maintained through re-exports in `/ui`

## Design Principles

1. **Separation of Concerns**: Pure UI components separated from business logic
2. **Functional Categorization**: Components grouped by their primary purpose
3. **Reusability**: Components designed for reuse across different contexts
4. **Accessibility**: All components follow WCAG guidelines
5. **Type Safety**: Full TypeScript support with proper typing

## Contributing

When adding new components:

1. Place them in the appropriate category directory
2. Export them from the category's `index.ts` file
3. Update this README if adding new categories
4. Ensure components are pure UI (no business logic)
5. Follow existing patterns for props and styling