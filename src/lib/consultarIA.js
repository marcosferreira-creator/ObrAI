// Chama a Edge Function `consultar-ia` (Supabase) para fazer perguntas em
// linguagem natural sobre os gastos das obras.

import { supabase } from './supabaseClient'

export async function consultarIA({ pergunta, historico }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultar-ia`

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ pergunta, historico }),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao consultar a IA.')
  }
  return json.resposta
}
