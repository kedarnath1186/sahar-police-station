FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN npm ci --prefix frontend

# Copy source files
COPY server/ ./server/
COPY frontend/ ./frontend/
COPY static/ ./static/
COPY vitest.config.ts ./

# Generate Prisma client and build
RUN npm run prisma:generate
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Install runtime dependencies for sharp / native modules
RUN apk add --no-cache vips

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

# Create media directory for uploads
RUN mkdir -p media/accused_photos media/famous_places

EXPOSE 8000

CMD ["sh", "-c", "npm run prisma:push && node server/dist/index.js"]
