# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root manifest
COPY package.json ./

# Copy package manifests for both workspace packages
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDeps needed for esbuild)
RUN npm install --workspaces --include-workspace-root

# Copy source files
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/shared/src ./packages/shared/src

# Build — esbuild bundles everything into a single dist/index.js
RUN npm run build -w packages/server

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# esbuild --bundle produces a self-contained file; no node_modules needed at runtime
COPY --from=builder /app/packages/server/dist/index.js ./dist/index.js

EXPOSE 3001

CMD ["node", "dist/index.js"]
