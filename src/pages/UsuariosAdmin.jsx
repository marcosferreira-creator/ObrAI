import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { criarUsuario, criarEmpresa } from '../lib/gerenciarUsuarios'
import { useAuth, usePermissao } from '../lib/AuthContext.jsx'

const PAPEIS = [
  { valor: 'admin', label: 'Admin — acesso total' },
  { valor: 'financeiro', label: 'Financeiro — lança/edita despesas e fornecedores' },
  { valor: 'mestre_obra', label: 'Mestre de obra / Comprador — só lança despesas' },
  { valor: 'visualizacao', label: 'Visualização — só consulta' },
]

function labelPapel(valor) {
  return PAPEIS.find((p) => p.valor === valor)?.label || valor
}

export default function UsuariosAdmin() {
  const souAdmin = usePermissao('admin')
  const { usuario } = useAuth()

  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState('mestre_obra')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  // Só existe pra quem é super_admin (hoje, só o Marcos) — cria uma
  // empresa cliente nova, isolada de todo o resto.
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [nomeAdminEmpresa, setNomeAdminEmpresa] = useState('')
  const [emailAdminEmpresa, setEmailAdminEmpresa] = useState('')
  const [senhaAdminEmpresa, setSenhaAdminEmpresa] = useState('')
  const [criandoEmpresa, setCriandoEmpresa] = useState(false)
  const [erroEmpresa, setErroEmpresa] = useState('')
  const [okEmpresa, setOkEmpresa] = useState('')

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase.from('usuarios').select('*').order('criado_em')
    setLista(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    if (souAdmin) carregar()
  }, [souAdmin])

  if (!souAdmin) {
    return <div className="card" style={{ color: '#6B7280' }}>Essa tela é só para administradores.</div>
  }

  async function criar(e) {
    e.preventDefault()
    setErro('')
    setOk('')
    setCriando(true)
    try {
      await criarUsuario({ nome, email, senha, papel })
      setOk(`Acesso criado para ${email}. Passe o e-mail e a senha provisória para a pessoa.`)
      setNome('')
      setEmail('')
      setSenha('')
      setPapel('mestre_obra')
      carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setCriando(false)
    }
  }

  async function alterarPapel(usuario, novoPapel) {
    await supabase.from('usuarios').update({ papel: novoPapel }).eq('id', usuario.id)
    carregar()
  }

  async function alternarAtivo(usuario) {
    await supabase.from('usuarios').update({ ativo: !usuario.ativo }).eq('id', usuario.id)
    carregar()
  }

  async function criarEmpresaNova(e) {
    e.preventDefault()
    setErroEmpresa('')
    setOkEmpresa('')
    setCriandoEmpresa(true)
    try {
      const r = await criarEmpresa({
        nome_empresa: nomeEmpresa,
        nome: nomeAdminEmpresa,
        email: emailAdminEmpresa,
        senha: senhaAdminEmpresa,
      })
      setOkEmpresa(`Empresa "${r.empresa}" criada. Login admin: ${r.email}.`)
      setNomeEmpresa('')
      setNomeAdminEmpresa('')
      setEmailAdminEmpresa('')
      setSenhaAdminEmpresa('')
    } catch (err) {
      setErroEmpresa(err.message)
    } finally {
      setCriandoEmpresa(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {usuario?.empresas?.nome && (
        <div style={{ fontSize: 12, color: '#6B7280' }}>Empresa: {usuario.empresas.nome}</div>
      )}

      {usuario?.super_admin && (
        <form
          onSubmit={criarEmpresaNova}
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #F2701C' }}
        >
          <div style={{ fontWeight: 700 }}>Criar empresa cliente nova</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            Isso cria um espaço isolado (dados, obras e usuários próprios) pra
            um novo cliente do ObrAI, com o primeiro login como admin dele.
          </div>

          <div>
            <label className="label">Nome da empresa</label>
            <input className="input" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required />
          </div>
          <div>
            <label className="label">Nome do admin</label>
            <input className="input" value={nomeAdminEmpresa} onChange={(e) => setNomeAdminEmpresa(e.target.value)} required />
          </div>
          <div>
            <label className="label">E-mail do admin</label>
            <input className="input" type="email" value={emailAdminEmpresa} onChange={(e) => setEmailAdminEmpresa(e.target.value)} required />
          </div>
          <div>
            <label className="label">Senha provisória</label>
            <input className="input" value={senhaAdminEmpresa} onChange={(e) => setSenhaAdminEmpresa(e.target.value)} required minLength={6} />
          </div>

          {erroEmpresa && <div style={{ color: '#D92D20', fontSize: 13 }}>{erroEmpresa}</div>}
          {okEmpresa && <div style={{ color: '#16A34A', fontSize: 13 }}>{okEmpresa}</div>}

          <button className="btn btn-ghost" disabled={criandoEmpresa}>
            {criandoEmpresa ? 'Criando…' : 'Criar empresa'}
          </button>
        </form>
      )}

      <form onSubmit={criar} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Criar acesso para funcionário</div>

        <div>
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha provisória</label>
          <input className="input" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="label">Permissão</label>
          <select className="input" value={papel} onChange={(e) => setPapel(e.target.value)}>
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>{p.label}</option>
            ))}
          </select>
        </div>

        {erro && <div style={{ color: '#D92D20', fontSize: 13 }}>{erro}</div>}
        {ok && <div style={{ color: '#16A34A', fontSize: 13 }}>{ok}</div>}

        <button className="btn btn-accent" disabled={criando}>
          {criando ? 'Criando…' : 'Criar acesso'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Usuários</div>
        {carregando && <div style={{ color: '#6B7280' }}>Carregando…</div>}
        {!carregando &&
          lista.map((u) => (
            <div key={u.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.nome}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                    height: 'fit-content',
                    background: u.ativo ? '#E7F6EC' : '#FEE2E2',
                    color: u.ativo ? '#16A34A' : '#D92D20',
                  }}
                >
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <select className="input" value={u.papel} onChange={(e) => alterarPapel(u, e.target.value)}>
                {PAPEIS.map((p) => (
                  <option key={p.valor} value={p.valor}>{p.label}</option>
                ))}
              </select>

              <button type="button" className="btn btn-ghost" onClick={() => alternarAtivo(u)}>
                {u.ativo ? 'Desativar acesso' : 'Reativar acesso'}
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
