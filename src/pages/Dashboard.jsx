import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function inicioDoDia() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function inicioDaSemana() {
  const d = new Date()
  const dia = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - dia + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function inicioDoMes() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function fmt(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const [totais, setTotais] = useState({ hoje: 0, semana: 0, mes: 0 })
  const [obras, setObras] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: despesas } = await supabase
        .from('despesas')
        .select('valor_total, data_compra, obra_id')

      const hoje = inicioDoDia().slice(0, 10)
      const semana = inicioDaSemana().slice(0, 10)
      const mes = inicioDoMes().slice(0, 10)

      let tHoje = 0, tSemana = 0, tMes = 0
      const porObra = {}

      for (const d of despesas || []) {
        const val = Number(d.valor_total) || 0
        if (d.data_compra >= hoje) tHoje += val
        if (d.data_compra >= semana) tSemana += val
        if (d.data_compra >= mes) tMes += val
        porObra[d.obra_id] = (porObra[d.obra_id] || 0) + val
      }
      setTotais({ hoje: tHoje, semana: tSemana, mes: tMes })

      const { data: obrasData } = await supabase.from('obras').select('id, nome, orcamento_previsto')
      setObras((obrasData || []).map((o) => ({ ...o, gasto: porObra[o.id] || 0 })))
      setCarregando(false)
    }
    carregar()
  }, [])

  if (carregando) return <div style={{ color: '#6B7280' }}>Carregando…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="card">
          <div className="label">Hoje</div>
          <div style={{ fontWeight: 700 }}>{fmt(totais.hoje)}</div>
        </div>
        <div className="card">
          <div className="label">Semana</div>
          <div style={{ fontWeight: 700 }}>{fmt(totais.semana)}</div>
        </div>
        <div className="card">
          <div className="label">Mês</div>
          <div style={{ fontWeight: 700 }}>{fmt(totais.mes)}</div>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Orçamento x realizado por obra</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {obras.map((o) => {
            const pct = o.orcamento_previsto > 0 ? Math.min(100, (o.gasto / o.orcamento_previsto) * 100) : 0
            return (
              <div key={o.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{o.nome}</span>
                  <span>{fmt(o.gasto)} / {fmt(o.orcamento_previsto)}</span>
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
            )
          })}
          {obras.length === 0 && <div style={{ color: '#6B7280' }}>Nenhuma obra cadastrada ainda.</div>}
        </div>
      </div>
    </div>
  )
}
