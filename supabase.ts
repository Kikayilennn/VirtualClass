import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://locnydxzosaiigrwmulu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY255ZHh6b3NhaWlncndtdWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MjE4ODYsImV4cCI6MjA2NTE5Nzg4Nn0.STfOP5pGg6zN2ijxJu6rdsdJ5GtSFZ8--lq5kCLbZaw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);