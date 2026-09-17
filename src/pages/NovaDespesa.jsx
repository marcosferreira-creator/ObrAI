import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function novoItem() {
  return {
    produto: '',
    categoria_id: '',
    subcategoria_id: '',
    quantidade: 1,
    unidade: 'un',
    preco_unitario: 0,
    frete: 0,
    desconto: 0,
  }
}

function totalItem(it) {
  return Number(it.quantidade || 0) * Number(it.preco_unitario || 0) + Number(it.frete || 0) - Number(it.desconto || 0)
}

export default function NovaDespesa() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [etapas, setEtapas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])

  const [obraId, setObraId] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10))
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [aPagarDepois, setAPagarDepois] = useState(false)
  const [vencimento, setVencimento] = useState('')
  const [itens, setItens] = useState([novoItem()])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const [o, f, c, s] = await Promise.all([
        supabase.from('obras').select('id, nome'),
        supabase.from('fornecedores').select('id, nome'),
        supabase.from('categorias').select('id, nome').order('nome'),
        supabase.from('subcategorias').select('id, nome, categoria_id'),
      ])
      setObras(o.data || [])
      setFornecedores(f.data || [])
      setCategorias(c.data || [])
      setSubcategorias(s.data || [])
    }
    carregar()
  }, [])

  useEffect(() => {
    async function carregarEtapas() {
      if (!obraId) {
        setEtapas([])
        return
      }
      const { data } = await supabase.from('etapas').select('id, nome').eq('obra_id', obraId)
      setEtapas(data || [])
    }
    carregarEtapas()
  }, [obraId])

  function atualizarItem(idx, campo, valor) {
    setItens((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      if (campo === 'categoria_id') copia[idx].subcategoria_id = ''
      return copia
    })
  }

  function adicionarItem() {
    setItens((prev) => [...prev, novoItem()])
  }

  function removerItem(idx) {
    setItens((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalGeral = itens.reduce((s, it) => s + totalItem(it), 0)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!obraId) return setErro('Selecione a obra.')
    if (itens.some((it) => !it.produto.trim())) return setErro('Preencha o nome de todos os itens.')
    if (aPagarDepois && !vencimento) return setErro('Informe o vencimento ou desmarque "ainda vou pagar".')

    setSalvando(true)
    const { data: despesa, error: errDespesa } = await supabase
      .from('despesas')
      .insert({
        obra_id: obraId,
        etapa_id: etapaId || null,
        fornecedor_id: fornecedorId || null,
        data_compra: dataCompra,
        forma_pagamento: formaPagamento,
        valor_total: totalGeral,
        status_pagamento: aPagarDepois ? 'pendente' : 'pago',
        origem: 'manual',
      })
      .select()
      .single()

    if (errDespesa) {
      setErro('Erro ao salvar despesa: ' + errDespesa.message)
      setSalvando(false)
      return
    }

    const itensParaInserir = itens.map((it) => ({
      despesa_id: despesa.id,
      produto: it.produto.trim(),
      categoria_id: it.categoria_id || null,
      subcategoria_id: it.subcategoria_id || null,
      categoria_confirmada: true, // lançamento manual: usuário já escolheu a categoria
      quantidade: Number(it.quantidade) || 0,
      unidade: it.unidade,
      preco_unitario: Number(it.preco_unitario) || 0,
      frete: Number(it.frete) || 0,
      desconto: Number(it.desconto) || 0,
      valor_total: totalItem(it),
    }))

    const { error: errItens } = await supabase.from('itens_compra').insert(itensParaInserir)

    if (errItens) {
      setSalvando(false)
      setErro('Despesa salva, mas houve erro ao salvar os itens: ' + errItens.message)
      return
    }

    if (aPagarDepois) {
      await supabase.from('contas_pagar').insert({
        despesa_id: despesa.id,
        fornecedor_id: fornecedorId || null,
        valor: totalGeral,
        vencimento,
        status: 'pendente',
      })
    }

    setSalvando(false)
    navigate(`/obras/${obraId}`)
  }

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Nova despesa</div>

        <div>
          <label className="label">Obra</label>
          <select className="input" value={obraId} onChange={(e) => setObraId(e.target.value)} required>
            <option value="">Selecione…</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Etapa (opcional)</label>
          <select className="input" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} disabled={!obraId}>
            <option value="">Sem etapa específica</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Fornecedor (opcional)</label>
          <select className="input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
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

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={aPagarDepois} onChange={(e) => setAPagarDepois(e.target.checked)} />
          Ainda vou pagar essa despesa (entra em Contas a Pagar)
        </label>

        {aPagarDepois && (
          <div>
            <label className="label">Vencimento</label>
            <input className="input" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Itens</div>
        {itens.map((it, idx) => {
          const subcatsDoItem = subcategorias.filter((s) => s.categoria_id === it.categoria_id)
          return (
            <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#6B7280' }}>Item {idx + 1}</span>
                {itens.length > 1 && (
                  <button type="button" onClick={() => removerItem(idx)} style={{ border: 'none', background: 'none', color: '#D92D20', fontSize: 13 }}>
                    Remover
                  </button>
                )}
              </div>

              <input
                className="input"
                placeholder="Produto (ex: cimento CP-II 50kg)"
                value={it.produto}
                onChange={(e) => atualizarItem(idx, 'produto', e.target.value)}
                required
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" value={it.categoria_id} onChange={(e) => atualizarItem(idx, 'categoria_id', e.target.value)}>
                  <option value="">Categoria — a IA sugere depois</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <select
                  className="input"
                  value={it.subcategoria_id}
                  onChange={(e) => atualizarItem(idx, 'subcategoria_id', e.target.value)}
                  disabled={!it.categoria_id}
                >
                  <option value="">Subcategoria</option>
                  {subcatsDoItem.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" step="0.01" min="0" placeholder="Qtd" value={it.quantidade} onChange={(e) => atualizarItem(idx, 'quantidade', e.target.value)} />
                <input className="input" placeholder="Un" value={it.unidade} onChange={(e) => atualizarItem(idx, 'unidade', e.target.value)} style={{ maxWidth: 70 }} />
                <input className="input" type="number" step="0.01" min="0" placeholder="Preço unit." value={it.preco_unitario} onChange={(e) => atualizarItem(idx, 'preco_unitario', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" step="0.01" min="0" placeholder="Frete" value={it.frete} onChange={(e) => atualizarItem(idx, 'frete', e.target.value)} />
                <input className="input" type="number" step="0.01" min="0" placeholder="Desconto" value={it.desconto} onChange={(e) => atualizarItem(idx, 'desconto', e.target.value)} />
              </div>

              <div style={{ textAlign: 'right', fontWeight: 700 }}>
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

      <button className="btn btn-accent" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar despesa'}
      </button>
    </form>
  )
}
