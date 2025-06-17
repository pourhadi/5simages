import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

// Maximum time to wait for migration command (in milliseconds)
const MIGRATION_TIMEOUT = 30000; // 30 seconds

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing database connection...');
    // Try a simple query to check connection
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function runWithTimeout(promise, timeoutMs) {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function deployMigrations() {
  try {
    // Check if this is a production deployment
    const isProduction = process.env.NODE_ENV === 'production' 
                       || process.env.VERCEL_ENV === 'production';
    
    console.log(`Running database migrations in ${isProduction ? 'production' : 'preview'} mode`);
    
    // Check connection string format
    const dbUrl = process.env.DATABASE_URL || '';
    const isPostgres = dbUrl.startsWith('postgresql');
    console.log('Database provider:', isPostgres ? 'PostgreSQL' : 'SQLite');
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined');
    }
    
    // First check if we can connect to the database
    const connectionSuccess = await testDatabaseConnection();
    if (!connectionSuccess) {
      throw new Error('Cannot proceed with migrations due to database connection failure');
    }
    
    // Run migrations with timeout
    console.log('Running prisma migrate deploy (with 30s timeout)...');
    try {
      const { stdout, stderr } = await runWithTimeout(
        execAsync('npx prisma migrate deploy'), 
        MIGRATION_TIMEOUT
      );
      
      console.log('Migration output:', stdout);
      if (stderr) {
        console.error('Migration stderr:', stderr);
      }
      console.log('✅ Database migrations completed successfully');
    } catch (migrationError) {
      if (migrationError.message.includes('timed out')) {
        console.error('⚠️ Migration command timed out. This may happen in serverless environments.');
        console.log('Since the database connection was successful, deployment will continue.');
        console.log('You may need to run migrations manually if needed.');
      } else {
        throw migrationError;
      }
    }
  } catch (error) {
    console.error('❌ Error during database migrations:', error.message);
    // Don't exit with error code as this might prevent the app from deploying
    console.log('Continuing deployment despite migration error');
  }
}

deployMigrations(); 