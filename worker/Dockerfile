FROM node:18-slim

# Create app directory
WORKDIR /app

# Install dependencies and generate Prisma client
COPY package.json ./package.json
COPY ../prisma ./prisma
RUN npm install
RUN npx prisma generate

# Copy worker code
COPY index.js ./index.js

# Start the worker
CMD ["node", "index.js"]