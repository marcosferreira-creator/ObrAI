import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { usePermissao } from '../lib/AuthContext.jsx'
import { parseValorBR } from '../lib/numero'
import { recalcularStatusPagamento } from '../lib/statusPagamento'

function totalItem(it) {
  return parseValorBR(it.quantidade) * parseValorBR(it.preco_unitario)
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function DespesaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const podeEditar = usePermissao('admin', 'financeiro')

  const [carregando, setCarregando] = useState(true)
  const [obraId, setObraId] = useState('')
  const [etapas, setEtapas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])

  const [etapaId, setEtapaId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [dataCompra, setDataCompra] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [statusPagamento, setStatusPagamento] = useState('pago')
  const [itens, setItens] = useState([])

  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  const [criandoSubcatIdx, setCriandoSubcatIdx] = useState(null)
  const [nomeNovaSubcat, setNomeNovaSubcat] = useState('')

  const [valorTotalSalvo, setValorTotalSalvo] = useState(0)
  const [pagamentos, setPagamentos] = useState([])
  const [novoPagValor, setNovoPagValor] = useState('')
  const [novoPagData, setNovoPagData] = useState(hojeISO())
  const [novoPagJaPago, setNovoPagJaPago] = useState(true)
  const [salvandoPagamento, setSalvandoPagamento] = useState(false)
  const [erroPagamento, setErroPagamento] = useState('')

  async function carregarPagamentos() {
    const { data } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('despesa_id', id)
      .order('vencimento', { ascending: true })
    setPagamentos(data || [])
  }

  useEffect(() => {
    async function carregar() {
      const { data: despesa } = await supabase
        .from('despesas')
        .select('*, itens_compra(*)')
        .eq('id', id)
        .single()

      if (!despesa) {
        setCarregando(false)
        return
      }

      setObraId(despesa.obra_id)
      setValorTotalSalvo(Number(despesa.valor_total) || 0)
      setEtapaId(despesa.etapa_id || '')
      setFornecedorId(despesa.fornecedor_id || '')
      setDataCompra(despesa.data_compra)
      setFormaPagamento(despesa.forma_pagamento || 'pix')
      setStatusPagamento(despesa.status_pagamento)
      setItens(
        (despesa.itens_compra || []).map((it) => ({
          id: it.id,
          produto: it.produto,
          categoria_id: it.categoria_id || '',
          subcategoria_id: it.subcategoria_id || '',
          quantidade: it.quantidade,
          unidade: it.unidade,
          preco_unitario: it.preco_unitario,
        }))
      )

      const [e, f, c, s] = await Promise.all([
        supabase.from('etapas').select('id, nome').eq('obra_id', despesa.obra_id),
        supabase.from('fornecedores').select('id, nome').order('nome'),
        supabase.from('categorias').select('id, nome').order('nome'),
        supabase.from('subcategorias').select('id, nome, categoria_id').order('nome'),
      ])
      setEtapas(e.data || [])
      setFornecedores(f.data || [])
      setCategorias(c.data || [])
      setSubcategorias(s.data || [])
      setCarregando(false)
    }
    carregar()
    carregarPagamentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const totalPago = pagamentos.filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.valor || 0), 0)
  const saldoDevedor = Math.max(0, valorTotalSalvo - totalPago)

  async function registrarPagamento(e) {
    e.preventDefault()
    setErroPagamento('')
    const valor = parseValorBR(novoPagValor)
    if (valor <= 0) return setErroPagamento('Informe um valor válido.')
    if (!novoPagData) return setErroPagamento('Informe a data.')

    setSalvandoPagamento(true)
    const { error } = await supabase.from('contas_pagar').insert({
      despesa_id: id,
      fornecedor_id: fornecedorId || null,
      valor,
      vencimento: novoPagData,
      status: novoPagJaPago ? 'pago' : 'pendente',
      data_pagamento: novoPagJaPago ? novoPagData : null,
    })
    if (error) {
      setSalvandoPagamento(false)
      setErroPagamento('Erro ao registrar: ' + error.message)
      return
    }
    const novoStatus = await recalcularStatusPagamento(id)
    setStatusPagamento(novoStatus)
    setNovoPagValor('')
    setNovoPagData(hojeISO())
    setNovoPagJaPago(true)
    await carregarPagamentos()
    setSalvandoPagamento(false)
  }

  async function marcarPagamentoComoPago(pagamento) {
    await supabase.from('contas_pagar').update({ status: 'pago', data_pagamento: hojeISO() }).eq('id', pagamento.id)
    const novoStatus = await recalcularStatusPagamento(id)
    setStatusPagamento(novoStatus)
    await carregarPagamentos()
  }

  async function excluirPagamento(pagamento) {
    if (!window.confirm('Excluir esse pagamento/parcela?')) return
    await supabase.from('contas_pagar').delete().eq('id', pagamento.id)
    const novoStatus = await recalcularStatusPagamento(id)
    setStatusPagamento(novoStatus)
    await carregarPagamentos()
  }

  function atualizarItem(idx, campo, valor) {
    setItens((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      if (campo === 'categoria_id') copia[idx].subcategoria_id = ''
      return copia
    })
  }

  function selecionarSubcategoria(idx, valor) {
    if (valor === '__nova__') {
      setCriandoSubcatIdx(idx)
      setNomeNovaSubcat('')
      return
    }
    atualizarItem(idx, 'subcategoria_id', valor)
  }

  async function confirmarNovaSubcategoria(idx) {
    const nome = nomeNovaSubcat.trim()
    const categoriaId = itens[idx].categoria_id
    if (!nome || !categoriaId) return
    const { data, error } = await supabase
      .from('subcategorias')
      .insert({ categoria_id: categoriaId, nome })
      .select()
      .single()
    if (error) {
      setErro('Erro ao criar subcategoria: ' + error.message)
      return
    }
    setSubcategorias((prev) => [...prev, data])
    atualizarItem(idx, 'subcategoria_id', data.id)
    setCriandoSubcatIdx(null)
    setNomeNovaSubcat('')
  }

  function adicionarItem() {
    setItens((prev) => [...prev, { produto: '', categoria_id: '', subcategoria_id: '', quantidade: 1, unidade: 'un', preco_unitario: 0 }])
  }

  function removerItem(idx) {
    setItens((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalGeral = itens.reduce((s, it) => s + totalItem(it), 0)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setOk(false)
    if (itens.some((it) => !it.produto.trim())) return setErro('Preencha o nome de todos os itens.')

    setSalvando(true)

    const { error: errDespesa } = await supabase
      .from('despesas')
      .update({
        etapa_id: etapaId || null,
        fornecedor_id: fornecedorId || null,
        data_compra: dataCompra,
        forma_pagamento: formaPagamento,
        status_pagamento: statusPagamento,
        valor_total: totalGeral,
      })
      .eq('id', id)

    if (errDespesa) {
      setErro('Erro ao salvar: ' + errDespesa.message)
      setSalvando(false)
      return
    }

    // substitui os itens: apaga os antigos e insere os atuais
    await supabase.from('itens_compra').delete().eq('despesa_id', id)
    const itensParaInserir = itens.map((it) => ({
      despesa_id: id,
      produto: it.produto.trim(),
      categoria_id: it.categoria_id || null,
      subcategoria_id: it.subcategoria_id || null,
      categoria_confirmada: true,
      quantidade: parseValorBR(it.quantidade),
      unidade: it.unidade,
      preco_unitario: parseValorBR(it.preco_unitario),
      valor_total: totalItem(it),
    }))
    const { error: errItens } = await supabase.from('itens_compra').insert(itensParaInserir)

    setSalvando(false)
    if (errItens) {
      setErro('Despesa salva, mas houve erro ao salvar os itens: ' + errItens.message)
      return
    }
    setValorTotalSalvo(totalGeral)
    setOk(true)
  }

  async function excluir() {
    if (!window.confirm('Excluir essa despesa e todos os itens dela? Essa ação não pode ser desfeita.')) return
    setExcluindo(true)
    const { error } = await supabase.from('despesas').delete().eq('id', id)
    setExcluindo(false)
    if (error) {
      setErro('Erro ao excluir: ' + error.message)
      return
    }
    navigate(`/obras/${obraId}`)
  }

  if (carregando) return <div style={{ color: '#6B7280' }}>Carregando…</div>

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Editar despesa</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Etapa (opcional)</label>
            <select className="input" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
              <option value="">Sem etapa</option>
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Fornecedor</label>
            <select className="input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Sem fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Data da compra</label>
            <input className="input" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Forma de pagamento</label>
            <select className="input" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Status do pagamento</label>
          <select className="input" value={statusPagamento} onChange={(e) => setStatusPagamento(e.target.value)}>
            <option value="pago">Pago</option>
            <option value="parcial">Pago parcialmente</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
          </select>
          {pagamentos.length > 0 && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Esse status é atualizado automaticamente conforme os pagamentos abaixo.
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Pagamentos</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          Útil pra despesas pagas aos poucos — ex: uma empreitada que você vai
          quitando conforme o serviço avança.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Total da despesa</span>
          <span style={{ fontWeight: 700 }}>{valorTotalSalvo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Já pago</span>
          <span style={{ fontWeight: 700, color: '#16A34A' }}>{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Saldo devedor</span>
          <span style={{ fontWeight: 700, color: saldoDevedor > 0 ? '#D92D20' : '#16A34A' }}>
            {saldoDevedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        {valorTotalSalvo > 0 && (
          <div style={{ background: '#F2F3F5', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (totalPago / valorTotalSalvo) * 100)}%`,
                height: '100%',
                background: totalPago >= valorTotalSalvo ? '#16A34A' : '#F2701C',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pagamentos.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB', borderRadius: 8, padding: '6px 10px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {Number(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {p.status === 'pago' ? `Pago em ${p.data_pagamento || p.vencimento}` : `Vence em ${p.vencimento}`}
                </div>
              </div>
              {podeEditar && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {p.status !== 'pago' && (
                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => marcarPagamentoComoPago(p)}>
                      Marcar pago
                    </button>
                  )}
                  <button type="button" onClick={() => excluirPagamento(p)} style={{ border: 'none', background: 'none', color: '#D92D20', fontSize: 12 }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
          {pagamentos.length === 0 && <div style={{ color: '#6B7280', fontSize: 13 }}>Nenhum pagamento registrado ainda.</div>}
        </div>

        {podeEditar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #E4E6EA', paddingTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Registrar pagamento ou parcela</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder="Valor (R$)"
                value={novoPagValor}
                onChange={(e) => setNovoPagValor(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="input"
                type="date"
                value={novoPagData}
                onChange={(e) => setNovoPagData(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={novoPagJaPago} onChange={(e) => setNovoPagJaPago(e.target.checked)} />
              Já paguei esse valor (senão entra como parcela a vencer)
            </label>
            {erroPagamento && <div style={{ color: '#D92D20', fontSize: 12 }}>{erroPagamento}</div>}
            <button type="button" className="btn btn-ghost" disabled={salvandoPagamento} onClick={registrarPagamento}>
              {salvandoPagamento ? 'Salvando…' : '+ Registrar'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Itens</div>
        {itens.map((it, idx) => {
          const subcatsDoItem = subcategorias.filter((s) => s.categoria_id === it.categoria_id)
          return (
            <div key={it.id || idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: '#6B7280' }}>Item {idx + 1}</span>
                {itens.length > 1 && (
                  <button type="button" onClick={() => removerItem(idx)} style={{ border: 'none', background: 'none', color: '#D92D20', fontSize: 12 }}>
                    Remover
                  </button>
                )}
              </div>

              <input
                className="input"
                placeholder="Produto"
                value={it.produto}
                onChange={(e) => atualizarItem(idx, 'produto', e.target.value)}
                required
              />

              <div style={{ display: 'flex', gap: 6 }}>
                <select className="input" value={it.categoria_id} onChange={(e) => atualizarItem(idx, 'categoria_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <select
                  className="input"
                  value={it.subcategoria_id}
                  onChange={(e) => selecionarSubcategoria(idx, e.target.value)}
                  disabled={!it.categoria_id}
                  style={{ flex: 1 }}
                >
                  <option value="">Subcategoria</option>
                  {subcatsDoItem.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                  <option value="__nova__">+ Nova subcategoria…</option>
                </select>
              </div>

              {criandoSubcatIdx === idx && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="input"
                    placeholder="Nome da nova subcategoria"
                    value={nomeNovaSubcat}
                    onChange={(e) => setNomeNovaSubcat(e.target.value)}
                    autoFocus
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => confirmarNovaSubcategoria(idx)}>
                    Criar
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="text" inputMode="decimal" placeholder="Qtd" value={it.quantidade} onChange={(e) => atualizarItem(idx, 'quantidade', e.target.value)} style={{ flex: 1 }} />
                <input className="input" placeholder="Un" value={it.unidade} onChange={(e) => atualizarItem(idx, 'unidade', e.target.value)} style={{ maxWidth: 60 }} />
                <input className="input" type="text" inputMode="decimal" placeholder="Preço unit." value={it.preco_unitario} onChange={(e) => atualizarItem(idx, 'preco_unitario', e.target.value)} style={{ flex: 1 }} />
              </div>

              <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                {totalItem(it).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          )
        })}

        <button type="button" onClick={adicionarItem} className="btn btn-ghost">
          + Adicionar item
        </button>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>Total da despesa</span>
        <span style={{ fontWeight: 800, fontSize: 18 }}>
          {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>

      {erro && <div style={{ color: '#D92D20' }}>{erro}</div>}
      {ok && <div style={{ color: '#16A34A' }}>Salvo com sucesso.</div>}

      {podeEditar ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-accent" disabled={salvando} style={{ flex: 1 }}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ color: '#D92D20' }} disabled={excluindo} onClick={excluir}>
            {excluindo ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      ) : (
        <div style={{ color: '#6B7280', fontSize: 13 }}>Seu acesso é só visualização — não dá pra editar essa despesa.</div>
      )}
    </form>
  )
}
