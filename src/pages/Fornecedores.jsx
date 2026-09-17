import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Fornecedores() {
  const [lista, setLista] = useState([])
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setLista(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function criar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    await supabase.from('fornecedores').insert({ nome: nome.trim(), cnpj: cnpj.trim() || null, telefone: telefone.trim() || null })
    setNome('')
    setCnpj('')
    setTelefone('')
    setSalvando(false)
    carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={criar} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Novo fornecedor</div>
        <div>
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Cadastrar fornecedor'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.map((f) => (
          <div key={f.id} className="card">
            <div style={{ fontWeight: 600 }}>{f.nome}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{f.cnpj || 'CNPJ não informado'}</div>
          </div>
        ))}
        {lista.length === 0 && <div style={{ color: '#6B7280' }}>Nenhum fornecedor cadastrado ainda.</div>}
      </div>
    </div>
  )
}
