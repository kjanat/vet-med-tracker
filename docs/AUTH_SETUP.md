# VetMed Tracker Authentication Setup

This document explains how to set up and use authentication in the VetMed Tracker app.

## Overview

VetMed Tracker uses OpenAuth.js for authentication, which provides a centralized OAuth 2.0 server for authentication across all your applications. The app supports multiple authentication providers configured through your OpenAuth server.

## Architecture

### Components

1. **OpenAuth Server** ([https://auth.kajkowalski.nl](https://auth.kajkowalski.nl))
   - Centralized authentication server
   - Handles OAuth flows and token management
   - Configured separately from this application

2. **OpenAuth Provider** (`server/auth/openauth-provider.ts`)
   - Implements the `AuthProvider` interface
   - Handles token verification and cookie management
   - Creates/updates users on first login

3. **Auth API Routes** (`app/api/auth/*`)
   - `/api/auth/login` - Initiates OAuth flow
   - `/api/auth/callback` - Handles OAuth callback
   - `/api/auth/logout` - Clears session
   - `/api/auth/me` - Returns current user info

4. **Middleware** (`middleware.ts`)
   - Protects authenticated routes
   - Redirects to login when needed

5. **Auth Hooks** (`hooks/useAuth.ts`)
   - Client-side auth state management
   - Login/logout functionality
   - User session management

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the project root:

```env
# OpenAuth Configuration
OPENAUTH_ISSUER=https://auth.kajkowalski.nl
OPENAUTH_CLIENT_ID=vetmed-tracker
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production

# Database Configuration (Neon)
DATABASE_URL=postgresql://...
```

### 2. OpenAuth Server Configuration

Your OpenAuth server at `https://auth.kajkowalski.nl` should be configured to:

1. **Redirect URI**: Accept `{NEXT_PUBLIC_APP_URL}/api/auth/callback`
2. **Access Token Claims**: Include the following:
   - `userId` - Unique user identifier
   - `email` - User's email address
   - `name` - User's display name (optional)
   - `householdMemberships` - Array of household access (optional)

### 3. Database Setup

Run the database migrations to create the necessary tables:

```bash
pnpm db:push  # or pnpm db:migrate
```

## Usage

### Protected Routes

All routes under `app/(authed)/*` are automatically protected by the middleware. Users will be redirected to login if not authenticated.

### In Components

Use the `useAuth` hook to access authentication state:

```tsx
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### In Server Components

Access the session through tRPC context:

```tsx
// In a tRPC procedure
export const myProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    // ctx.user is the authenticated user
    // ctx.session contains the full session
    return {
      userId: ctx.user.id,
      email: ctx.user.email,
    };
  });
```

## Authentication Flow

1. User clicks "Sign In"
2. Redirected to OpenAuth server
3. User authenticates with chosen provider
4. Redirected back to `/api/auth/callback`
5. Tokens are verified and stored in httpOnly cookies
6. User is created/updated in database
7. Redirected to app with active session

## Security

- Tokens stored in httpOnly cookies (inaccessible via JavaScript)
- CSRF protection using state parameter
- Automatic token refresh when expired
- Secure cookie settings in production

## Development

### Using Mock Auth

When `OPENAUTH_ISSUER` is not set, the app uses a mock auth provider for development:

```env
# Uncomment to use mock auth
# MOCK_USER_ID=dev-user-1
```

### Testing Auth Flows

1. Start the app: `pnpm dev`
2. Navigate to a protected route (e.g., `/settings`)
3. You'll be redirected to login
4. Complete authentication on OpenAuth server
5. You'll be redirected back to the app

## Troubleshooting

### Common Issues

1. **"OpenAuth not configured" error**
   - Ensure `OPENAUTH_ISSUER` is set in `.env.local`
   - Restart the dev server after changing env vars

2. **Redirect URI mismatch**
   - Ensure `NEXT_PUBLIC_APP_URL` matches your actual app URL
   - Add the callback URL to your OpenAuth server configuration

3. **User not created**
   - Check database connection
   - Ensure migrations have been run
   - Check server logs for errors

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will log auth-related events to the console.

## Migration from Mock Auth

The app is designed to seamlessly migrate from mock auth to OpenAuth:

1. Set the `OPENAUTH_ISSUER` environment variable
2. Deploy the changes
3. Users will be prompted to authenticate on next visit
4. Existing data can be linked using email addresses

## API Reference

### Auth Hooks

- `useAuth()` - Main auth hook
  - `user` - Current user object
  - `households` - User's household memberships
  - `isAuthenticated` - Boolean auth state
  - `isLoading` - Loading state
  - `error` - Error message if any
  - `login()` - Initiate login
  - `logout()` - Clear session
  - `refreshAuth()` - Refresh user data

- `useRequireAuth()` - Require auth or redirect
  - Automatically redirects to login if not authenticated
  - Returns user and loading state

### Auth Context

The tRPC context includes:
- `session` - Full session object
- `user` - Current user
- `currentHouseholdId` - Selected household
- `currentMembership` - User's role in household

## Future Enhancements

- [ ] Social login providers (Google, GitHub, etc.)
- [ ] Two-factor authentication
- [ ] Session management UI
- [ ] Remember me functionality
- [ ] Account linking
