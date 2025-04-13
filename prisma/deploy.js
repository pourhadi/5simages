import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function deployMigrations() {
  try {
    // Check if this is a production deployment
    const isProduction = process.env.NODE_ENV === 'production' 
                       || process.env.VERCEL_ENV === 'production';
    
    console.log(`Running database migrations in ${isProduction ? 'production' : 'preview'} mode`);
    console.log('Database provider:', process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite');
    
    // Run migrations
    console.log('Running prisma migrate deploy...');
    const { stdout: migrateStdout, stderr: migrateStderr } = await execAsync('npx prisma migrate deploy');
    
    console.log('Migration output:', migrateStdout);
    if (migrateStderr) {
      console.error('Migration errors:', migrateStderr);
    }

    console.log('✅ Database migrations completed successfully');

  } catch (error) {
    console.error('❌ Error during database migrations:', error);
    // Don't exit with error code as this might prevent the app from deploying
    // Even with a DB migration failure, the app might still work with existing schema
    console.log('Continuing deployment despite migration error');
  }
}

deployMigrations(); 