import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function fmt(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ObraDetalhe() {
  const { id } = useParams()
  const [obra, setObra] = useState(null)
  const [despesas, setDespesas] = useState([])
  const [etapas, setEtapas] = useState([])
  const [novaEtapa, setNovaEtapa] = useState('')

  async function carregar() {
    const { data: obraData } = await supabase.from('obras').select('*').eq('id', id).single()
    setObra(obraData)

    const { data: despesasData } = await supabase
      .from('despesas')
      .select('id, valor_total, data_compra, status_pagamento, fornecedores(nome)')
      .eq('obra_id', id)
      .order('data_compra', { ascending: false })
    setDespesas(despesasData || [])

    const { data: etapasData } = await supabase.from('etapas').select('*').eq('obra_id', id).order('ordem')
    setEtapas(etapasData || [])
  }

  useEffect(() => {
    carregar()
  }, [id])

  async function criarEtapa(e) {
    e.preventDefault()
    if (!novaEtapa.trim()) return
    await supabase.from('etapas').insert({ obra_id: id, nome: novaEtapa.trim(), ordem: etapas.length })
    setNovaEtapa('')
    carregar()
  }

  if (!obra) return <div style={{ color: '#6B7280' }}>Carregando…</div>

  const gasto = despesas.reduce((s, d) => s + Number(d.valor_total || 0), 0)
  const pct = obra.orcamento_previsto > 0 ? Math.min(100, (gasto / obra.orcamento_previsto) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18 }}>{obra.nome}</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {fmt(gasto)} de {fmt(obra.orcamento_previsto)} ({pct.toFixed(0)}%)
        </div>
        <div style={{ background: '#F2F3F5', borderRadius: 8, height: 8, marginTop: 8, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: pct >= 100 ? '#D92D20' : pct >= 80 ? '#F2701C' : '#16A34A',
            }}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Etapas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {etapas.map((e) => (
            <span key={e.id} style={{ background: '#F2F3F5', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>
              {e.nome}
            </span>
          ))}
          {etapas.length === 0 && <span style={{ color: '#6B7280', fontSize: 13 }}>Nenhuma etapa cadastrada.</span>}
        </div>
        <form onSubmit={criarEtapa} style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Nome da etapa" value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} />
          <button className="btn btn-ghost">Adicionar</button>
        </form>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Lançamentos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {despesas.map((d) => (
            <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.fornecedores?.nome || 'Sem fornecedor'}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{d.data_compra}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{fmt(d.valor_total)}</div>
            </div>
          ))}
          {despesas.length === 0 && <div style={{ color: '#6B7280' }}>Nenhum lançamento ainda.</div>}
        </div>
      </div>
    </div>
  )
}
