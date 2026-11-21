FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN npm ci --prefix frontend
RUN npm install --prefix frontend --no-save @rolldown/binding-linux-x64-musl@1.2.19

# Copy source files
COPY server/ ./server/
COPY frontend/ ./frontend/
COPY static/ ./static/
COPY vitest.config.ts ./

# Generate Prisma client and build
RUN npm run prisma:generate
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Install runtime dependencies for sharp and healthcheck
RUN apk add --no-cache vips wget

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application and prisma
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/scripts ./server/scripts
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/static ./static
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create media directory and set ownership to unprivileged user
RUN mkdir -p /app/media/accused_photos /app/media/famous_places && \
    chown -R node:node /app

USER node

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/healthz || exit 1

CMD ["sh", "-c", "npm run prisma:deploy && node server/dist/index.js"]
