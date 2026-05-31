import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase - funciona localmente e no GitHub Pages
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ypxauswxgbdegvkxgzmi.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweGF1c3d4Z2JkZWd2a3hnem1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDUzNTIsImV4cCI6MjA2ODI4MTM1Mn0._jYk-5djNOllJIGSwRD1lzXWSq5mcZrVijQMC3bTYYc';

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  env: process.env.NODE_ENV
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
