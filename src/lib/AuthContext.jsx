import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext({ session: undefined, usuario: null, carregandoUsuario: true })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = carregando, null = deslogado
  const [usuario, setUsuario] = useState(null) // linha da tabela `usuarios`: { papel, nome, ativo }
  const [carregandoUsuario, setCarregandoUsuario] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function carregarUsuario() {
      if (!session?.user) {
        setUsuario(null)
        setCarregandoUsuario(false)
        return
      }
      setCarregandoUsuario(true)
      const { data } = await supabase
        .from('usuarios')
        .select('nome, papel, ativo, super_admin, empresa_id, empresas(nome)')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
      setUsuario(data || null)
      setCarregandoUsuario(false)
    }
    carregarUsuario()
  }, [session])

  return (
    <AuthContext.Provider value={{ session, usuario, carregandoUsuario }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// true se o papel do usuário logado estiver na lista permitida.
// Enquanto o papel ainda não carregou, retorna false (mais seguro: some a
// ação até confirmar a permissão, em vez de mostrar e depois esconder).
export function usePermissao(...papeis) {
  const { usuario, carregandoUsuario } = useAuth()
  if (carregandoUsuario) return false
  if (!usuario) return false
  return papeis.includes(usuario.papel)
}
