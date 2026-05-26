import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qtxtvmgpxgnjtrrukggn.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0eHR2bWdweGduanRycnVrZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDU5NjAsImV4cCI6MjA5NDY4MTk2MH0.KH21pjjGG4zeb5fVePQtSwn4vjKgi3gRah9hOJ6FFvk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
