import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) setErro('E-mail ou senha inválidos.')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        background: '#0B1F3A',
      }}
    >
      <img src="/icon-192.png" alt="ObrAI" style={{ width: 96, height: 96, borderRadius: 20 }} />
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>ObrAI</div>
        <div style={{ fontSize: 13, letterSpacing: 1, color: '#C9D2E0', textTransform: 'uppercase' }}>
          Gestão inteligente de obras
        </div>
      </div>

      <form onSubmit={entrar} className="card" style={{ width: '100%', maxWidth: 360, background: '#fff' }}>
        <label className="label">E-mail</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <label className="label">Senha</label>
        <input
          className="input"
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        {erro && <div style={{ color: '#D92D20', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
