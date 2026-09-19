import { supabase } from './supabaseClient'

async function chamarFuncao(payload) {
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
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao processar a solicitação.')
  }
  return json
}

export async function criarUsuario({ nome, email, senha, papel }) {
  return chamarFuncao({ acao: 'criar_usuario', nome, email, senha, papel })
}

// Só quem é super_admin (Marcos) consegue — cria uma empresa nova (um
// cliente novo do ObrAI) já com o primeiro login admin dela.
export async function criarEmpresa({ nome_empresa, nome, email, senha }) {
  return chamarFuncao({ acao: 'criar_empresa', nome_empresa, nome, email, senha })
}
