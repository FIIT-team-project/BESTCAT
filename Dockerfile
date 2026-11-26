# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN npm install --global pnpm@10.34.9
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=bestcat-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

FROM deps AS builder
COPY . .
RUN mkdir -p public
# Runtime secrets and the real database are supplied when the container starts.
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/app/data/payload.db \
    PDF_CHROMIUM_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium font-liberation

RUN mkdir -p data media .next && chown -R node:node /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
