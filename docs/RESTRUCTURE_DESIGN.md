# VetMed Tracker - Routing Restructure Design

## Overview
This document outlines the comprehensive restructuring plan to:
1. Align file structure with sidebar navigation hierarchy
2. Move dashboard from `/` to `/dashboard`
3. Create an inspiring landing page at `/`
4. Centralize layout components for better maintainability

## New Routing Structure

```
app/
├── (public)/                    # Public routes (no auth required)
│   ├── layout.tsx              # Minimal layout for public pages
│   ├── page.tsx                # NEW: Landing page at "/"
│   ├── login/
│   └── about/
│
├── (authed)/                   # All authenticated routes
│   ├── layout.tsx             # Base auth layout (auth checks, providers)
│   │
│   ├── (app)/                 # Main app with sidebar
│   │   ├── layout.tsx         # Sidebar layout (SidebarProvider, header with Logo)
│   │   │
│   │   ├── dashboard/         # Dashboard (moved from "/")
│   │   │   └── page.tsx
│   │   │
│   │   ├── animals/           # Animals section
│   │   │   ├── page.tsx       # All Animals
│   │   │   └── new/           # Add Animal (dialog trigger)
│   │   │
│   │   ├── medications/       # Medications section (NEW grouping)
│   │   │   ├── record/        # Record Dose
│   │   │   │   └── page.tsx
│   │   │   ├── history/       # History
│   │   │   │   └── page.tsx
│   │   │   └── regimens/      # Regimens
│   │   │       └── page.tsx
│   │   │
│   │   ├── inventory/         # Inventory section
│   │   │   └── page.tsx       # Current Stock (Add Item via dialog)
│   │   │
│   │   ├── insights/          # Insights
│   │   │   └── page.tsx
│   │   │
│   │   └── settings/          # Settings section
│   │       ├── page.tsx       # Main settings with tabs
│   │       ├── data/          # Data & Privacy (if separate page needed)
│   │       ├── preferences/   # Preferences
│   │       ├── notifications/ # Notifications
│   │       ├── household/     # Household
│   │       └── audit-log/     # Audit Log
│   │
│   └── (standalone)/          # Standalone pages (no sidebar)
│       ├── layout.tsx         # Minimal layout
│       ├── animals/
│       │   └── [id]/
│       │       └── emergency/ # Emergency card (print-friendly)
│       └── reports/           # Reports
│           └── animal/
│               └── [id]/
```

## Layout Architecture

### 1. Root Layout (`app/layout.tsx`)
- Global providers (theme, etc.)
- Base HTML structure
- Font loading
- Meta tags

### 2. Public Layout (`app/(public)/layout.tsx`)
```tsx
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen">
      <PublicHeader /> {/* Minimal header with login button */}
      {children}
      <PublicFooter />
    </div>
  );
}
```

### 3. Authenticated Layout (`app/(authed)/layout.tsx`)
```tsx
export default function AuthedLayout({ children }) {
  // Auth check and redirect if not authenticated
  return (
    <AuthProvider>
      <AppProvider>
        <AnimalFormProvider>
          <InventoryFormProvider>
            {children}
          </InventoryFormProvider>
        </AnimalFormProvider>
      </AppProvider>
    </AuthProvider>
  );
}
```

### 4. App Layout with Sidebar (`app/(authed)/(app)/layout.tsx`)
```tsx
export default function AppLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader /> {/* Includes Logo, SidebarTrigger, AnimalBreadcrumb */}
        <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 5. Standalone Layout (`app/(authed)/(standalone)/layout.tsx`)
```tsx
export default function StandaloneLayout({ children }) {
  return <>{children}</>;
}
```

## Landing Page Design

### Concept: "Peace of Mind for Pet Parents"
The landing page should inspire confidence and showcase the app's value proposition.

### Structure:
```tsx
// app/(public)/page.tsx
<div className="min-h-screen">
  {/* Hero Section */}
  <section className="hero">
    - Animated pet silhouettes with medication icons
    - Tagline: "Never Miss a Dose Again"
    - Subtitle: "Professional medication tracking for your beloved pets"
    - CTA: "Start Free" → /login
    - "See Demo" → Interactive demo
  </section>

  {/* Key Features */}
  <section className="features">
    - 3-Tap Recording
    - Multi-Pet Management
    - Smart Reminders
    - Inventory Tracking
  </section>

  {/* Trust Indicators */}
  <section className="trust">
    - "Used by 10,000+ pet parents"
    - "Recommended by veterinarians"
    - Security badges
  </section>

  {/* How It Works */}
  <section className="how-it-works">
    - 3-step visual guide
    - Interactive demo
  </section>

  {/* Testimonials */}
  <section className="testimonials">
    - Pet parent stories
    - Before/after scenarios
  </section>

  {/* CTA */}
  <section className="final-cta">
    - "Start caring smarter today"
    - Pricing (if applicable)
    - Sign up form
  </section>
</div>
```

## Navigation Updates

### Sidebar Navigation (`app-sidebar.tsx`)
```tsx
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard", // Updated from "/"
      icon: Home,
    },
    {
      title: "Animals",
      url: "/animals",
      icon: Stethoscope,
      items: [
        { title: "All Animals", url: "/animals" },
        { title: "Add Animal", onClick: openForm }, // Dialog
      ],
    },
    {
      title: "Medications",
      url: "/medications", // New grouping
      icon: Activity,
      items: [
        { title: "Record Dose", url: "/medications/record" },
        { title: "History", url: "/medications/history" },
        { title: "Regimens", url: "/medications/regimens" },
      ],
    },
    // ... rest of navigation
  ],
  dashboard: [
    {
      name: "Today's Doses",
      url: "/dashboard", // Updated
      icon: Activity,
    },
    // ... rest of dashboard items
  ],
};
```

## Migration Steps

### Phase 1: Create New Structure
1. Create route groups: `(public)`, `(authed)`, `(app)`, `(standalone)`
2. Create centralized layouts
3. Create landing page

### Phase 2: Move Existing Pages
1. Move dashboard from `/` to `/dashboard`
2. Create `/medications` grouping and move related pages
3. Update all internal links and navigation

### Phase 3: Update References
1. Update sidebar navigation URLs
2. Update all Link components and router.push calls
3. Update breadcrumb logic
4. Update tests

### Phase 4: Cleanup
1. Remove duplicate layout code from individual pages
2. Remove PageHeader component (now in layout)
3. Update imports

## Benefits

1. **Improved Organization**: File structure mirrors navigation structure
2. **Better UX**: Dedicated landing page for marketing/onboarding
3. **Maintainability**: Single source of truth for layouts
4. **Flexibility**: Easy to add new sections or reorganize
5. **Performance**: Layouts don't re-render on navigation
6. **SEO**: Public landing page can be optimized for search

## Considerations

1. **URL Changes**: Some URLs will change (e.g., `/history` → `/medications/history`)
   - Set up redirects for existing users
   - Update any bookmarks/external links

2. **State Management**: Ensure providers are at correct levels
   - Auth providers in `(authed)/layout.tsx`
   - Sidebar state in `(app)/layout.tsx`

3. **Loading States**: Each layout level can have its own loading.tsx

4. **Error Boundaries**: Each layout level can have error.tsx

5. **Metadata**: Each route can export metadata for SEO

## Implementation Priority

1. **High Priority**:
   - Create route group structure
   - Move dashboard to `/dashboard`
   - Create landing page
   - Centralize sidebar layout

2. **Medium Priority**:
   - Group medications pages
   - Update navigation
   - Add redirects

3. **Low Priority**:
   - Enhance landing page animations
   - Add interactive demo
   - Optimize for SEO