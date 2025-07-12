import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key-here';

// Verificar se as variáveis estão configuradas corretamente
if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase não configurado. Configure as variáveis de ambiente:');
  console.warn('REACT_APP_SUPABASE_URL=sua_url_do_supabase');
  console.warn('REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
