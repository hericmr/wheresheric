import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase - funciona localmente e no GitHub Pages
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://reqksafbotcxjbuuwzkx.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWtzYWZib3RjeGpidXV3emt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODc1NjcsImV4cCI6MjA3OTA2MzU2N30.0ZKO-JWRcG4ExCtOiSWxmqgb9H6w9M0u766ObVC_NNo';

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  env: process.env.NODE_ENV
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
