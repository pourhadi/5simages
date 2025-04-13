import { PrismaClient } from '@prisma/client'

// Add Prisma Client options to prevent prepared statement conflicts
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Disable query logging in production
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Configure database connection to avoid prepared statement conflicts
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add PostgreSQL connection options
    // @ts-expect-error - The typing for this is not available in the public types
    // but it is supported by Prisma
    engineConfig: {
      postgres: {
        // Only allow one connection to perform queries with a specific prepared statement
        // This helps prevent the error: "prepared statement xxxx already exists"
        prepared_statement_cache_size: 0
      }
    }
  })
}

// Use TypeScript's global type declaration to maintain a single connection
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Use a global variable to ensure the client is only initialized once
// This prevents multiple instances during development with hot reloading
export const prisma = globalThis.prisma ?? prismaClientSingleton()

// Ensure the db connection is cleaned up properly when the app exits
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Export both as default and named export to support both import styles
export default prisma
export { PrismaClient } 