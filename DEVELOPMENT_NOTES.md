# Development Notes

## Running the Development Server

### Recommended: Using pnpm (Node.js runtime)
```bash
pnpm dev
```

### Alternative: Using Bun (Experimental)
```bash
bun run --bun dev
```

**Note**: There are known issues with Bun and Next.js 15 streaming responses that can cause "Stream is already ended" errors. If you encounter these errors, use the standard pnpm command instead.

## Fixed Issues

### 1. Database Health Check Overload
- Added caching (10-second TTL) to reduce database queries
- Implemented rate limiting (30 requests/minute per client)
- Added automatic cleanup to prevent memory leaks

### 2. Circuit Breaker Memory Leak
- Fixed multiple event listener registration issue
- Added flag to prevent duplicate logging setup
- Increased max listeners to prevent warnings

### 3. Health Check Query Spam
- Disabled adaptive throttling in connection middleware
- The middleware was running health checks every 30 seconds
- This caused repeated database queries in the console

## Known Issues

### 1. Bun + Next.js 15 Stream Errors
When using `bun run --bun dev`, you may encounter:
- "Error: Stream is already ended"
- "Error: failed to pipe response"

**Workaround**: Use `pnpm dev` instead of Bun for development.

### 2. Authentication Errors on Fresh Start
The tRPC errors about authentication are expected when not logged in. These will resolve once you sign in through Clerk.