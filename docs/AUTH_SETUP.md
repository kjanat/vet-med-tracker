# VetMed Tracker Authentication Setup

This document explains how to set up and use authentication in the VetMed Tracker app.

## Overview

VetMed Tracker uses Clerk for authentication, which provides a managed authentication service with support for multiple authentication methods including email/password, OAuth providers, and magic links. Clerk handles all the complexity of authentication while providing a great developer experience.

## Architecture

### Components

1. **Clerk Dashboard** ([https://clerk.com](https://clerk.com))
   - Manage authentication settings
   - Configure OAuth providers
   - User management interface
   - Webhook configuration

2. **Clerk Middleware** (`middleware.ts`)
   - Protects routes automatically
   - Handles authentication state
   - Edge-runtime compatible

3. **Clerk Provider** (`app/layout.tsx`)
   - Wraps the entire application
   - Provides authentication context
   - Manages session state

4. **User Sync** (`server/api/clerk-sync.ts`)
   - Syncs Clerk users to database
   - Creates default household on first login
   - Handles user metadata updates

5. **Auth Context** (`components/providers/auth-provider.tsx`)
   - Provides auth state to components
   - Manages household memberships
   - Handles role-based access

## Setup Instructions

### 1. Create a Clerk Application

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Choose your authentication methods (email, OAuth providers, etc.)
4. Copy your API keys

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database Configuration (Neon)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# Optional: Application Settings
DEFAULT_TIMEZONE=America/New_York
```

### 3. Configure Clerk Dashboard

In your Clerk dashboard:

1. **Paths**: Set the following URLs
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/`
   - After sign-up URL: `/`

2. **Webhooks** (for user sync):
   - Endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`

3. **OAuth Providers** (optional):
   - Enable providers like Google, GitHub, etc.
   - Configure redirect URLs

### 4. Database Setup

Run the database migrations to create the necessary tables:

```bash
# Development
pnpm db:push

# Production
pnpm db:migrate

# Seed with demo data (optional)
pnpm db:seed
```

## Usage

### Protected Routes

All routes under `app/(authed)/*` are automatically protected by Clerk middleware. Users will be redirected to sign-in if not authenticated.

### In Client Components

Use Clerk's hooks to access authentication state:

```tsx
import { useUser, useAuth } from "@clerk/nextjs";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";

function MyComponent() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <SignInButton />;
  }

  return (
    <div>
      <p>Welcome, {user.firstName}!</p>
      <UserButton />
      <SignOutButton />
    </div>
  );
}
```

### In Server Components

Access the auth state in server components:

```tsx
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function ServerComponent() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome {user?.firstName}</div>;
}
```

### In tRPC Procedures

Access auth in tRPC context:

```tsx
import { auth } from "@clerk/nextjs/server";

// In tRPC context creation
export async function createTRPCContext(opts: CreateNextContextOptions) {
  const { userId } = await auth();
  
  // Get user from database
  const user = userId ? await db.user.findUnique({ where: { clerkId: userId } }) : null;
  
  return {
    ...opts,
    userId,
    user,
  };
}

// In a protected procedure
export const protectedProcedure = t.procedure
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { user: ctx.user } });
  });
```

## Authentication Flow

1. User clicks "Sign In"
2. Redirected to Clerk's sign-in page
3. User authenticates (email/password, OAuth, etc.)
4. Clerk creates/updates session
5. User is synced to database via webhook
6. Default household created if first login
7. User redirected back to app

## User Sync Process

When a user signs in for the first time:

1. Clerk webhook fires `user.created` event
2. API endpoint creates user in database
3. Default household is created
4. User becomes OWNER of their household
5. User metadata is stored

## Security Features

- **Session Management**: Clerk handles all session tokens
- **JWT Tokens**: Secure, signed tokens for API access
- **Multi-factor Auth**: Available through Clerk dashboard
- **Rate Limiting**: Built-in protection against abuse
- **Webhook Verification**: Ensures webhook authenticity

## Development Tips

### Testing Authentication

1. Use Clerk's test mode for development
2. Test email addresses: `test@example.com+clerk_test@example.com`
3. Test phone numbers: `+15555550100`
4. Verification code: `424242`

### Debugging

Enable debug mode by setting:

```env
CLERK_LOGGING=true
```

Check the browser console and server logs for detailed auth information.

### User Metadata

Store app-specific data in Clerk user metadata:

```tsx
import { clerkClient } from "@clerk/nextjs/server";

// Update user metadata
await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    defaultHouseholdId: "household_123",
    role: "OWNER"
  }
});
```

## Common Issues

### "Unauthorized" Errors

1. Check that `CLERK_SECRET_KEY` is set correctly
2. Ensure middleware is configured properly
3. Verify user is synced to database

### Webhook Issues

1. Verify webhook endpoint is accessible
2. Check webhook signing secret
3. Review webhook logs in Clerk dashboard

### Session Issues

1. Clear browser cookies
2. Check Clerk session settings
3. Verify environment variables

## Migration from Other Auth Systems

If migrating from another auth system:

1. Export user data from old system
2. Use Clerk's bulk import API
3. Map user IDs in database
4. Update user references
5. Test thoroughly before switching

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Integration Guide](https://clerk.com/docs/nextjs/get-started)
- [Webhook Documentation](https://clerk.com/docs/webhooks/overview)
- [User Metadata Guide](https://clerk.com/docs/users/metadata)