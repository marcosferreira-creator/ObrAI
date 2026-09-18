import { useState } from 'react'
import { supabase, getManterConectado, setManterConectado } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [manterConectado, setManterConectadoState] = useState(getManterConectado())
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    // precisa ser definido antes do login, pra sessão já nascer no lugar certo
    setManterConectado(manterConectado)
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
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            className="input"
            type={mostrarSenha ? 'text' : 'password'}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 18,
              padding: 6,
              lineHeight: 1,
            }}
          >
            {mostrarSenha ? '🙈' : '👁️'}
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 14, color: '#374151' }}>
          <input
            type="checkbox"
            checked={manterConectado}
            onChange={(e) => setManterConectadoState(e.target.checked)}
          />
          Manter conectado neste aparelho
        </label>

        {erro && <div style={{ color: '#D92D20', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
