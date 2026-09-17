import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey || url.includes('SEU-PROJETO')) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ObrAI] Supabase não configurado ainda. Copie .env.example para .env e preencha com as credenciais do seu projeto.'
  )
}

export const supabase = createClient(url, anonKey)
