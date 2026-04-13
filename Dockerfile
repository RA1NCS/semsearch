FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# run
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p /app/data
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data/documents ./data/documents

# non-root user for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://localhost:3000/api/status || exit 1
CMD ["node", "server.js"]
