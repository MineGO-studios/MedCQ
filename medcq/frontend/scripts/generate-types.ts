// scripts/generate-types.ts
import { execSync } from 'child_process';
import * as path from 'path';

// Run the Supabase CLI to generate types
try {
  console.log('Generating types from Supabase schema...');
  execSync('npx supabase gen types typescript --local > src/types/supabase.ts');
  console.log('Types generated successfully!');
} catch (error) {
  console.error('Error generating types:', error);
  process.exit(1);
}