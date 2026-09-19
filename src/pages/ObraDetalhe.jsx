import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { usePermissao } from '../lib/AuthContext.jsx'
import { parseValorBR } from '../lib/numero'

function fmt(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ObraDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const podeEditar = usePermissao('admin', 'financeiro')
  const [obra, setObra] = useState(null)
  const [despesas, setDespesas] = useState([])
  const [etapas, setEtapas] = useState([])
  const [novaEtapa, setNovaEtapa] = useState('')

  const [editandoObra, setEditandoObra] = useState(false)
  const [nomeObraEdit, setNomeObraEdit] = useState('')
  const [orcamentoObraEdit, setOrcamentoObraEdit] = useState('')
  const [enderecoObraEdit, setEnderecoObraEdit] = useState('')
  const [salvandoObra, setSalvandoObra] = useState(false)
  const [excluindoObra, setExcluindoObra] = useState(false)
  const [erroObra, setErroObra] = useState('')

  const [etapaEditandoId, setEtapaEditandoId] = useState(null)
  const [nomeEtapaEdit, setNomeEtapaEdit] = useState('')

  async function carregar() {
    const { data: obraData } = await supabase.from('obras').select('*').eq('id', id).single()
    setObra(obraData)
    if (obraData) {
      setNomeObraEdit(obraData.nome)
      setOrcamentoObraEdit(String(obraData.orcamento_previsto ?? ''))
      setEnderecoObraEdit(obraData.endereco || '')
    }

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

  function comecarEdicaoEtapa(etapa) {
    setEtapaEditandoId(etapa.id)
    setNomeEtapaEdit(etapa.nome)
  }

  async function salvarEtapa(etapaId) {
    if (!nomeEtapaEdit.trim()) return
    await supabase.from('etapas').update({ nome: nomeEtapaEdit.trim() }).eq('id', etapaId)
    setEtapaEditandoId(null)
    carregar()
  }

  async function excluirEtapa(etapa) {
    if (!window.confirm(`Excluir a etapa "${etapa.nome}"? Despesas já lançadas nela ficam sem etapa.`)) return
    await supabase.from('etapas').delete().eq('id', etapa.id)
    carregar()
  }

  function comecarEdicaoObra() {
    setErroObra('')
    setNomeObraEdit(obra.nome)
    setOrcamentoObraEdit(String(obra.orcamento_previsto ?? ''))
    setEnderecoObraEdit(obra.endereco || '')
    setEditandoObra(true)
  }

  async function salvarObra(e) {
    e.preventDefault()
    if (!nomeObraEdit.trim()) return
    setErroObra('')
    setSalvandoObra(true)
    const { error } = await supabase
      .from('obras')
      .update({
        nome: nomeObraEdit.trim(),
        orcamento_previsto: parseValorBR(orcamentoObraEdit),
        endereco: enderecoObraEdit.trim() || null,
      })
      .eq('id', id)
    setSalvandoObra(false)
    if (error) {
      setErroObra('Erro ao salvar: ' + error.message)
      return
    }
    setEditandoObra(false)
    carregar()
  }

  async function excluirObra() {
    if (!window.confirm(`Excluir a obra "${obra.nome}"? Essa ação não pode ser desfeita.`)) return
    setExcluindoObra(true)
    setErroObra('')
    const { error } = await supabase.from('obras').delete().eq('id', id)
    setExcluindoObra(false)
    if (error) {
      if (error.code === '23503') {
        setErroObra('Não dá pra excluir: essa obra já tem despesas ou outros lançamentos vinculados. Exclua os lançamentos dela primeiro (em Lançamentos, abaixo).')
      } else {
        setErroObra('Erro ao excluir: ' + error.message)
      }
      return
    }
    navigate('/obras')
  }

  if (!obra) return <div style={{ color: '#6B7280' }}>Carregando…</div>

  const gasto = despesas.reduce((s, d) => s + Number(d.valor_total || 0), 0)
  const pct = obra.orcamento_previsto > 0 ? Math.min(100, (gasto / obra.orcamento_previsto) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!editandoObra ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{obra.nome}</div>
            {podeEditar && (
              <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={comecarEdicaoObra}>
                ✏️ Editar
              </button>
            )}
          </div>
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
      ) : (
        <form onSubmit={salvarObra} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Editar obra</div>
          <div>
            <label className="label">Nome</label>
            <input className="input" value={nomeObraEdit} onChange={(e) => setNomeObraEdit(e.target.value)} required />
          </div>
          <div>
            <label className="label">Orçamento previsto (R$)</label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={orcamentoObraEdit}
              onChange={(e) => setOrcamentoObraEdit(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Endereço (opcional)</label>
            <input className="input" value={enderecoObraEdit} onChange={(e) => setEnderecoObraEdit(e.target.value)} />
          </div>

          {erroObra && <div style={{ color: '#D92D20', fontSize: 13 }}>{erroObra}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" disabled={salvandoObra} style={{ flex: 1 }}>
              {salvandoObra ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditandoObra(false)}>
              Cancelar
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: '#D92D20' }}
            disabled={excluindoObra}
            onClick={excluirObra}
          >
            {excluindoObra ? 'Excluindo…' : 'Excluir obra'}
          </button>
        </form>
      )}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Etapas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {etapas.map((e) =>
            etapaEditandoId === e.id ? (
              <div key={e.id} style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  value={nomeEtapaEdit}
                  onChange={(ev) => setNomeEtapaEdit(ev.target.value)}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => salvarEtapa(e.id)}>
                  Salvar
                </button>
                <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setEtapaEditandoId(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F2F3F5',
                  borderRadius: 20,
                  padding: '4px 6px 4px 12px',
                }}
              >
                <span style={{ fontSize: 13 }}>{e.nome}</span>
                {podeEditar && (
                  <span style={{ display: 'flex', gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => comecarEdicaoEtapa(e)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                      title="Editar etapa"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirEtapa(e)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 6px', color: '#D92D20' }}
                      title="Excluir etapa"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            )
          )}
          {etapas.length === 0 && <span style={{ color: '#6B7280', fontSize: 13 }}>Nenhuma etapa cadastrada.</span>}
        </div>
        {podeEditar && (
          <form onSubmit={criarEtapa} style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Nome da etapa" value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} />
            <button className="btn btn-ghost">Adicionar</button>
          </form>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Lançamentos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {despesas.map((d) => (
            <Link
              key={d.id}
              to={`/despesas/${d.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{d.fornecedores?.nome || 'Sem fornecedor'}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {d.data_compra}
                  {d.status_pagamento === 'pendente' ? ' · a pagar' : ''}
                  {d.status_pagamento === 'parcial' ? ' · pago parcialmente' : ''}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>{fmt(d.valor_total)}</div>
            </Link>
          ))}
          {despesas.length === 0 && <div style={{ color: '#6B7280' }}>Nenhum lançamento ainda.</div>}
        </div>
      </div>
    </div>
  )
}
