import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Obras() {
  const [obras, setObras] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [novoOrcamento, setNovoOrcamento] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data } = await supabase.from('obras').select('*').order('criado_em', { ascending: false })
    setObras(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function criarObra(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSalvando(true)
    await supabase.from('obras').insert({
      nome: novoNome.trim(),
      orcamento_previsto: Number(novoOrcamento) || 0,
    })
    setNovoNome('')
    setNovoOrcamento('')
    setSalvando(false)
    carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={criarObra} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Nova obra</div>
        <div>
          <label className="label">Nome</label>
          <input className="input" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required />
        </div>
        <div>
          <label className="label">Orçamento previsto (R$)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={novoOrcamento}
            onChange={(e) => setNovoOrcamento(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Cadastrar obra'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {obras.map((o) => (
          <Link key={o.id} to={`/obras/${o.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontWeight: 700 }}>{o.nome}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Orçamento: {Number(o.orcamento_previsto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </Link>
        ))}
        {obras.length === 0 && <div style={{ color: '#6B7280' }}>Nenhuma obra cadastrada ainda.</div>}
      </div>
    </div>
  )
}
