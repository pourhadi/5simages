import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Define migrations as an array of SQL statements
const migrations = [
  // Migration 1: Create User table with credits column
  `
  CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    emailVerified TIMESTAMP,
    image TEXT,
    password TEXT,
    credits INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  
  // Migration 2: Create Account table
  `
  CREATE TABLE IF NOT EXISTS "Account" (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES "User" (id) ON DELETE CASCADE,
    UNIQUE (provider, providerAccountId)
  );
  `,
  
  // Migration 3: Create Session table
  `
  CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY NOT NULL,
    sessionToken TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES "User" (id) ON DELETE CASCADE
  );
  `,
  
  // Migration 4: Create VerificationToken table
  `
  CREATE TABLE IF NOT EXISTS "VerificationToken" (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    UNIQUE (identifier, token)
  );
  `,
  
  // Migration 5: Create Video table
  `
  CREATE TABLE IF NOT EXISTS "Video" (
    id TEXT PRIMARY KEY NOT NULL,
    prompt TEXT NOT NULL,
    imageUrl TEXT,
    videoUrl TEXT,
    userId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES "User" (id) ON DELETE CASCADE
  );
  `,
  
  // Migration 6: Set default credits for new users
  `
  ALTER TABLE "User" ALTER COLUMN credits SET DEFAULT 5;
  `
];

// Function to execute migrations with proper connection handling
const directMigrations = async () => {
  console.log('Running direct SQL migrations...');
  let successCount = 0;
  let errorCount = 0;
  
  // Create a fresh Prisma client for each migration to avoid prepared statement conflicts
  for (let i = 0; i < migrations.length; i++) {
    // Create a new client instance for each migration
    const singleClient = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    
    try {
      // Execute the migration with this dedicated client
      await singleClient.$executeRawUnsafe(migrations[i]);
      console.log(`✅ Migration ${i + 1} successful`);
      successCount++;
    } catch (error) {
      console.error(`❌ Migration ${i + 1} failed: ${error.message}`);
      
      // Only report as error if it's not a "table already exists" error
      if (!error.message.includes('already exists')) {
        errorCount++;
      } else {
        console.log(`   (Skipping - table already exists)`);
      }
    } finally {
      // Disconnect this client before moving to the next migration
      await singleClient.$disconnect();
    }
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`------------------`);
  console.log(`Summary:`);
  console.log(`✅ ${successCount} migrations successful`);
  console.log(`❌ ${errorCount} migrations failed`);
};

// Execute migrations
directMigrations()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  }); 