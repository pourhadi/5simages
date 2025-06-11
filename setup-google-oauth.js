// Run this script to set up Google OAuth in Supabase
// Usage: node setup-google-oauth.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const setupGoogleOAuth = async () => {
  try {
    console.log('Setting up Google OAuth in Supabase...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-google-oauth.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      const { data: queryData, error: queryError } = await supabase
        .from('_prisma_migrations')
        .select('*')
        .limit(0); // Just to test connection

      if (queryError) {
        console.error('Database connection error:', queryError);
        console.log('\nPlease run the SQL script manually in Supabase SQL editor:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of setup-google-oauth.sql');
        console.log('4. Run the query');
        console.log('\nThen configure Google OAuth in Authentication > Providers > Google with:');
        console.log(`- Client ID: ${process.env.GOOGLE_CLIENT_ID || '580559758743-smvvvip811bibamnkfkanlbf6t1nopse.apps.googleusercontent.com'}`);
        console.log(`- Client Secret: ${process.env.GOOGLE_CLIENT_SECRET || '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'}`);
        return;
      }

      // Try executing SQL statements individually
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements...\n`);

      for (const statement of statements) {
        if (statement.includes('CREATE') || statement.includes('ALTER') || statement.includes('DROP') || statement.includes('GRANT')) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          // For DDL statements, we need to use the SQL editor manually
          console.log('⚠️  This statement requires manual execution in Supabase SQL editor');
        }
      }

      console.log('\n⚠️  Direct SQL execution via API is limited.');
      console.log('\nPlease run the SQL script manually in Supabase SQL editor:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of setup-google-oauth.sql');
      console.log('4. Run the query');
    } else {
      console.log('✓ Google OAuth setup SQL executed successfully!');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Go to Supabase Dashboard > Authentication > Providers > Google');
    console.log('2. Enable Google provider');
    console.log('3. Set the following:');
    console.log(`   - Client ID: ${process.env.GOOGLE_CLIENT_ID || '580559758743-smvvvip811bibamnkfkanlbf6t1nopse.apps.googleusercontent.com'}`);
    console.log(`   - Client Secret: ${process.env.GOOGLE_CLIENT_SECRET || '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'}`);
    console.log('4. Ensure the redirect URL matches your Supabase project URL');
    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('Error setting up Google OAuth:', error);
    process.exit(1);
  }
};

setupGoogleOAuth();