## Multi-stage Dockerfile for Next.js application (i2v) for Google Cloud Run

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build the application
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and public files from builder stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/next.config.js ./
COPY --from=builder /usr/src/app/next.config.ts ./

# Expose the port
EXPOSE 8080

# Start the application
CMD ["sh", "-c", "npm run start"]