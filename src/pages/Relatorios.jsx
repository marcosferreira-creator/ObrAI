import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function somarDias(dataISO, dias) {
  const d = new Date(dataISO + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function inicioDoMes(dataISO) {
  const d = new Date(dataISO + 'T00:00:00')
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'personalizado', label: 'Personalizado' },
]

function BarraLista({ titulo, itens }) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 700 }}>{titulo}</div>
      {itens.length === 0 && <div style={{ color: '#6B7280', fontSize: 13 }}>Sem dados no período.</div>}
      {itens.map((i) => (
        <div key={i.nome}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
            <span>{i.nome}</span>
            <span style={{ fontWeight: 600 }}>{i.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div style={{ background: '#EEF0F3', borderRadius: 6, height: 8 }}>
            <div style={{ width: `${(i.valor / max) * 100}%`, background: '#F2701C', height: 8, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const [aba, setAba] = useState('resumo') // 'resumo' | 'contas'

  const [obras, setObras] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [categorias, setCategorias] = useState([])

  const [periodo, setPeriodo] = useState('mes')
  const [dataInicio, setDataInicio] = useState(inicioDoMes(hojeISO()))
  const [dataFim, setDataFim] = useState(hojeISO())
  const [obraId, setObraId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')

  const [despesas, setDespesas] = useState([])
  const [carregando, setCarregando] = useState(false)

  const [contasPagar, setContasPagar] = useState([])

  useEffect(() => {
    async function carregarFiltros() {
      const [o, f, c] = await Promise.all([
        supabase.from('obras').select('id, nome').order('nome'),
        supabase.from('fornecedores').select('id, nome').order('nome'),
        supabase.from('categorias').select('id, nome').order('nome'),
      ])
      setObras(o.data || [])
      setFornecedores(f.data || [])
      setCategorias(c.data || [])
    }
    carregarFiltros()
  }, [])

  useEffect(() => {
    const hoje = hojeISO()
    if (periodo === 'hoje') {
      setDataInicio(hoje)
      setDataFim(hoje)
    } else if (periodo === 'semana') {
      setDataInicio(somarDias(hoje, -6))
      setDataFim(hoje)
    } else if (periodo === 'mes') {
      setDataInicio(inicioDoMes(hoje))
      setDataFim(hoje)
    }
  }, [periodo])

  useEffect(() => {
    if (aba !== 'resumo') return
    async function carregar() {
      setCarregando(true)
      let query = supabase
        .from('despesas')
        .select('id, data_compra, valor_total, origem, obra_id, fornecedor_id, obras(nome), fornecedores(nome), itens_compra(valor_total, categoria_id, categorias(nome))')
        .gte('data_compra', dataInicio)
        .lte('data_compra', dataFim)
        .order('data_compra', { ascending: false })

      if (obraId) query = query.eq('obra_id', obraId)
      if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId)

      const { data } = await query
      setDespesas(data || [])
      setCarregando(false)
    }
    carregar()
  }, [aba, dataInicio, dataFim, obraId, fornecedorId])

  useEffect(() => {
    if (aba !== 'contas') return
    async function carregar() {
      const { data } = await supabase
        .from('contas_pagar')
        .select('id, valor, vencimento, status, despesa_id, fornecedor_id, fornecedores(nome), despesas(obra_id, obras(nome))')
        .eq('status', 'pendente')
        .order('vencimento', { ascending: true })
      setContasPagar(data || [])
    }
    carregar()
  }, [aba])

  const resumo = useMemo(() => {
    // achata os itens de todas as despesas do período, respeitando o filtro de categoria
    const itensFiltrados = []
    for (const d of despesas) {
      for (const it of d.itens_compra || []) {
        if (categoriaId && it.categoria_id !== categoriaId) continue
        itensFiltrados.push({
          valor: Number(it.valor_total) || 0,
          categoriaNome: it.categorias?.nome || 'Sem categoria',
          obraNome: d.obras?.nome || 'Sem obra',
          fornecedorNome: d.fornecedores?.nome || 'Sem fornecedor',
        })
      }
    }

    const totalGeral = itensFiltrados.reduce((s, i) => s + i.valor, 0)

    function agrupar(chave) {
      const mapa = new Map()
      for (const i of itensFiltrados) {
        const nome = i[chave]
        mapa.set(nome, (mapa.get(nome) || 0) + i.valor)
      }
      return Array.from(mapa.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
    }

    return {
      totalGeral,
      porCategoria: agrupar('categoriaNome'),
      porObra: agrupar('obraNome'),
      porFornecedor: agrupar('fornecedorNome'),
      qtdDespesas: despesas.length,
    }
  }, [despesas, categoriaId])

  async function marcarComoPago(conta) {
    await supabase.from('contas_pagar').update({ status: 'pago', data_pagamento: hojeISO() }).eq('id', conta.id)
    if (conta.despesa_id) {
      await supabase.from('despesas').update({ status_pagamento: 'pago' }).eq('id', conta.despesa_id)
    }
    setContasPagar((prev) => prev.filter((c) => c.id !== conta.id))
  }

  const hoje = hojeISO()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={aba === 'resumo' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setAba('resumo')}
          style={{ flex: 1 }}
        >
          Resumo
        </button>
        <button
          type="button"
          className={aba === 'contas' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setAba('contas')}
          style={{ flex: 1 }}
        >
          Contas a pagar
        </button>
      </div>

      {aba === 'resumo' && (
        <>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodo(p.id)}
                  className={periodo === p.id ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {periodo === 'personalizado' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                <input className="input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="input" value={obraId} onChange={(e) => setObraId(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
                <option value="">Todas as obras</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
              <select className="input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
                <option value="">Todos os fornecedores</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              <select className="input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
                <option value="">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{dataInicio} a {dataFim} · {resumo.qtdDespesas} despesa(s)</div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>
                {resumo.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>

          {carregando && <div style={{ color: '#6B7280' }}>Carregando…</div>}

          {!carregando && (
            <>
              <BarraLista titulo="Por categoria" itens={resumo.porCategoria} />
              <BarraLista titulo="Por obra" itens={resumo.porObra} />
              <BarraLista titulo="Por fornecedor" itens={resumo.porFornecedor} />
            </>
          )}
        </>
      )}

      {aba === 'contas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contasPagar.length === 0 && <div className="card" style={{ color: '#6B7280' }}>Nenhuma conta pendente.</div>}
          {contasPagar.map((c) => {
            const vencida = c.vencimento < hoje
            return (
              <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.fornecedores?.nome || 'Sem fornecedor'}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{c.despesas?.obras?.nome || 'Sem obra'}</div>
                  <div style={{ fontSize: 13, color: vencida ? '#D92D20' : '#6B7280', fontWeight: vencida ? 700 : 400 }}>
                    Vence em {c.vencimento}{vencida ? ' — vencida' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>
                    {Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => marcarComoPago(c)}>
                    Marcar como pago
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
