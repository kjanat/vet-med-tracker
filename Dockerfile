# Multi-stage production Dockerfile for VetMed Tracker
# Optimized for security, performance, and HIPAA compliance

# Stage 1: Base - Security-hardened Node.js runtime
FROM node:22-alpine AS base

# Install security updates and required packages
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    && apk upgrade --no-cache \
    && addgroup -g 1001 -S nodejs \
    && adduser -S vetmed -u 1001

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create app directory with proper permissions
WORKDIR /app
RUN chown vetmed:nodejs /app

# Stage 2: Dependencies - Install and cache dependencies
FROM base AS deps

# Copy package files
COPY package.json bun.lock* ./
COPY bunfig.toml* ./

# Install Bun for optimal package management
RUN npm install -g bun@1.2.22 \
    && bun install --frozen-lockfile --production=false \
    && bun install --frozen-lockfile --production \
    && rm -rf /tmp/* /var/cache/apk/*

# Stage 3: Builder - Build the application
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Install Bun and build application
RUN npm install -g bun@1.2.22 \
    && bun run build \
    && rm -rf node_modules \
    && bun install --frozen-lockfile --production \
    && rm -rf .next/cache

# Stage 4: Production - Final optimized image
FROM base AS production

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

# Copy production configuration
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./

# Security hardening
RUN chown -R vetmed:nodejs /app \
    && chmod -R 755 /app \
    && chmod -R 644 /app/.next/static

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node --enable-source-maps server.js &amp;&amp; \
        curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER vetmed

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "--enable-source-maps", "server.js"]

# Metadata labels for security scanning
LABEL maintainer="VetMed Tracker DevOps <devops@vetmed.com>"
LABEL version="1.0.0"
LABEL description="VetMed Tracker - HIPAA-compliant veterinary medication tracking"
LABEL security.scan="enabled"
LABEL compliance.hipaa="true"