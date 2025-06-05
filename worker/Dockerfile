FROM node:20-alpine AS builder
# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
# Copy package.json and prisma schema first
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Install dependencies and generate Prisma client
RUN npm ci --ignore-scripts
RUN npx prisma generate
# Remove devDependencies, keep only production for smaller image
RUN npm prune --production
# Copy application code
COPY worker ./worker
COPY src/lib ./src/lib

FROM node:20-alpine
# Install OpenSSL for runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
# Copy package.json to enable ESM (type: module)
COPY --from=builder /app/package.json ./package.json
# Copy builder outputs
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/worker /app/worker
COPY --from=builder /app/src/lib /app/src/lib
# Set port for Cloud Run
ENV PORT 8080
EXPOSE 8080
CMD ["node", "worker/index.js"]
