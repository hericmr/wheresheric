import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase - funciona localmente e no GitHub Pages
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://kbekziboncpvjqffmhlx.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWt6aWJvbmNwdmpxZmZtaGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjc2OTYsImV4cCI6MjA1Njg0MzY5Nn0.FTtiCL3VKLdrcR9aKs3tF6AwgdoyKo604rMBdpWRLko';

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  env: process.env.NODE_ENV
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
