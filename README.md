# VetMed Tracker 🐾

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Progressive Web App (PWA) for managing veterinary medications for pets and animals. Track medications, schedules, and
inventory across multiple households with offline support.

## ✨ Features

- **🏠 Multi-Household Support** - Manage medications for multiple households with role-based access
- **🐕 Animal Management** - Track multiple pets with detailed medical information
- **💊 Medication Tracking** - Comprehensive medication catalog with dosage calculations
- **📅 Schedule Management** - Set up and track medication regimens with reminders
- **📦 Inventory Management** - Track medication stock levels with expiry dates
- **📱 PWA Offline Support** - Works offline with automatic sync when reconnected
- **📊 Analytics & Insights** - Track compliance rates and medication patterns
- **🔒 Secure Authentication** - Stack Auth with OAuth and social login support
- **🌐 Multi-Timezone Support** - Handle pets in different timezones seamlessly

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (or 22 for latest features)
- pnpm 10.14.0+
- PostgreSQL database (or Neon account)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vet-med-tracker.git
cd vet-med-tracker

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
pnpm db:push
pnpm db:seed

# Start development server
pnpm dev
```

Access the application at <http://localhost:3000>

### Network Access

To access from other devices on your network:

```bash
pnpm dev:host
```

Then access at http://YOUR_IP:3000

## 🛠️ Tech Stack

### Core

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Stack Auth

### Infrastructure

- **API Layer**: tRPC for type-safe APIs
- **State Management**: React Context + React Query
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: Biome for linting/formatting
- **Deployment**: Vercel with Edge Runtime support

## 📁 Project Structure

```tree
vet-med-tracker/
├── app/                    # Next.js App Router pages
│   ├── (authed)/          # Protected routes
│   ├── (public)/          # Public pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── layout/           # Layout components
├── server/                # Server-side code
│   └── api/              # tRPC routers
├── db/                    # Database schema & config
├── lib/                   # Utilities and helpers
│   ├── infrastructure/   # System-level code
│   └── schemas/          # Zod validation schemas
├── hooks/                 # Custom React hooks
├── tests/                 # Test files
└── public/               # Static assets
```

## 🧪 Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests (requires PostgreSQL)
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage

# Visual regression tests
pnpm test:visual
```

## 📦 Available Scripts

### Development

- `pnpm dev` - Start development server
- `pnpm dev:turbo` - Start with Turbopack (experimental)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm preview` - Build and preview production

### Database

- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Drizzle Studio GUI
- `pnpm db:seed` - Seed database with test data

### Code Quality

- `pnpm typecheck` - Type check with TypeScript
- `pnpm lint` - Run linting
- `pnpm check` - Run Biome checks
- `pnpm format` - Format code with Biome

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=
DATABASE_URL_UNPOOLED=

# Authentication
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=

# Optional
REDIS_URL=
SENTRY_DSN=
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## 🔒 Security

- All routes protected by authentication middleware
- Multi-tenant data isolation
- Input sanitization with Zod schemas
- Rate limiting on API endpoints
- Audit logging for all data modifications
- Security headers configured

## 📊 Performance

- Optimized for Core Web Vitals
- Bundle size optimization with code splitting
- Image optimization disabled for PWA compatibility
- Connection pooling for database
- Redis caching for frequently accessed data
- Service Worker for offline support

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React Framework
- [shadcn/ui](https://ui.shadcn.com) - Beautiful component library
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [Stack Auth](https://stack-auth.com) - Authentication service
- [Vercel](https://vercel.com) - Deployment platform

## 📧 Support

For support, please open an issue on GitHub or contact the maintainers.

---

Built with ❤️ for pet health management
