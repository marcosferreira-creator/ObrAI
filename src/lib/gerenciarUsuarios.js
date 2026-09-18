import { supabase } from './supabaseClient'

export async function criarUsuario({ nome, email, senha, papel }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerenciar-usuarios`

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ nome, email, senha, papel }),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao criar usuário.')
  }
  return json
}
