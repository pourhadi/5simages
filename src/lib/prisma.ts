import { PrismaClient, Prisma } from '@prisma/client'

/**
 * PrismaClient is attached to the `global` object in development to prevent
 * exhausting your database connection limit.
 * 
 * In production, we create a new instance with each request but use connection pooling
 * and statement deduplication via the connection string.
 */

// Add query logging in development only
const logOptions = process.env.NODE_ENV === 'development'
  ? { log: ['error', 'warn'] as Prisma.LogLevel[] }
  : { log: ['error'] as Prisma.LogLevel[] }

// URL modification for production to avoid prepared statement conflicts
function getConnectionUrl() {
  // Get the base URL
  const url = process.env.DATABASE_URL
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Only modify in production to prevent statement conflicts
  if (process.env.NODE_ENV === 'production') {
    // Add parameters to prevent prepared statement conflicts
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}pgbouncer=true&connection_limit=1&pool_timeout=20`
  }
  
  return url
}

// Instantiate PrismaClient
const prismaClientSingleton = () => {
  return new PrismaClient({
    ...logOptions,
    datasources: {
      db: {
        url: getConnectionUrl(),
      },
    },
  })
}

// TypeScript type for global prisma instance
const globalForPrisma = global as unknown as { prisma: ReturnType<typeof prismaClientSingleton> }

// Create a client that's reused in development and unique in production
const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma 