FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
# --ignore-scripts skips our postinstall (copy-pdf-worker.mjs) because the
# scripts/ folder isn't in this layer yet — only package.json + yarn.lock are,
# which is what keeps this cache hit across source changes. The builder stage
# runs the worker copy explicitly below after the full source is in place.
RUN yarn install --frozen-lockfile --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_AUTH_TYPE
RUN node scripts/copy-pdf-worker.mjs
RUN yarn build
RUN rm -rf node_modules
RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME 0.0.0.0
CMD ["node", "server.js"]
