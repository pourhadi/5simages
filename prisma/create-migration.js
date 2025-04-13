import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function createMigration() {
  try {
    console.log('🔄 Creating a new database migration...');
    
    // Ask for migration name
    const migrationName = await question('Enter a name for this migration: ');
    if (!migrationName) {
      console.error('Migration name is required');
      rl.close();
      return;
    }
    
    // Run migration creation
    const { stdout, stderr } = await execAsync(`npx prisma migrate dev --name ${migrationName}`);
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Migration created successfully');
  } catch (error) {
    console.error('❌ Error creating migration:', error);
  } finally {
    rl.close();
  }
}

createMigration(); 