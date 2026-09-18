import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey || url.includes('SEU-PROJETO')) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ObrAI] Supabase não configurado ainda. Copie .env.example para .env e preencha com as credenciais do seu projeto.'
  )
}

// "Manter conectado" (tela de login): quando ligado (padrão), a sessão fica
// em localStorage e sobrevive a fechar o navegador/app — só sai apertando
// "Sair". Quando desligado, a sessão vai pra sessionStorage e some ao
// fechar a aba/app.
const CHAVE_MANTER_CONECTADO = 'obrai-manter-conectado'

export function getManterConectado() {
  try {
    const v = window.localStorage.getItem(CHAVE_MANTER_CONECTADO)
    return v === null ? true : v === 'true'
  } catch {
    return true
  }
}

export function setManterConectado(valor) {
  try {
    window.localStorage.setItem(CHAVE_MANTER_CONECTADO, String(valor))
  } catch {
    // ignora — pior caso, cai no padrão (mantém conectado)
  }
}

const storageDinamico = {
  getItem: (chave) => {
    try {
      const store = getManterConectado() ? window.localStorage : window.sessionStorage
      return store.getItem(chave)
    } catch {
      return null
    }
  },
  setItem: (chave, valor) => {
    try {
      const store = getManterConectado() ? window.localStorage : window.sessionStorage
      store.setItem(chave, valor)
    } catch {
      // ignora
    }
  },
  removeItem: (chave) => {
    try {
      window.localStorage.removeItem(chave)
      window.sessionStorage.removeItem(chave)
    } catch {
      // ignora
    }
  },
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: storageDinamico,
  },
})
