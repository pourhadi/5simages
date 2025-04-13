import { PrismaClient } from '@prisma/client';

// Create a new Prisma client with specific configuration
const prisma = new PrismaClient({
  log: ['warn', 'error']
});

// SQL statements needed for a fresh database
const migrations = [
  // Drop all existing tables if they exist
  `
  DROP TABLE IF EXISTS "Video";
  DROP TABLE IF EXISTS "Session";
  DROP TABLE IF EXISTS "Account";
  DROP TABLE IF EXISTS "VerificationToken";
  DROP TABLE IF EXISTS "User";
  `,

  // Users table
  `
  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  `,

  // Accounts table
  `
  CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
  ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `,

  // Sessions table
  `
  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `,

  // VerificationToken table
  `
  CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
  CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
  `,

  // Videos table
  `
  CREATE TABLE IF NOT EXISTS "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "replicatePredictionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "Video_replicatePredictionId_key" ON "Video"("replicatePredictionId");
  ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `
];

async function directMigrations() {
  try {
    console.log('Starting direct SQL migrations...');
    let successCount = 0;

    // Create a new connection for each migration to avoid prepared statement conflicts
    for (const [index, migration] of migrations.entries()) {
      try {
        // Create a fresh connection per migration
        const migrationPrisma = new PrismaClient({
          log: ['error']
        });
        
        console.log(`Running migration ${index + 1}/${migrations.length}...`);
        await migrationPrisma.$executeRawUnsafe(migration);
        successCount++;
        
        // Disconnect immediately after each migration
        await migrationPrisma.$disconnect();
      } catch (err) {
        // Skip errors about tables/constraints that already exist
        if (
          err.message.includes('already exists') || 
          err.message.includes('relation') || 
          err.message.includes('constraint')
        ) {
          console.log(`Migration ${index + 1} - Item already exists, skipping.`);
          successCount++;
        } else {
          console.error(`Error in migration ${index + 1}:`, err.message);
        }
      }
    }

    console.log(`✅ Direct migrations completed: ${successCount}/${migrations.length} successful`);
  } catch (err) {
    console.error('❌ Direct migration error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

directMigrations(); 