import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { parseValorBR } from '../lib/numero'

function totalItem(it) {
  return parseValorBR(it.quantidade) * parseValorBR(it.preco_unitario)
}

export default function ConfirmarDespesa() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const extraido = state?.extraido || null
  const obraId = state?.obraId || ''
  const origem = state?.origem || 'manual'
  const arquivoOriginal = state?.arquivoOriginal || null

  const [etapas, setEtapas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])

  const [etapaId, setEtapaId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [dataCompra, setDataCompra] = useState(extraido?.data_compra || new Date().toISOString().slice(0, 10))
  const [formaPagamento, setFormaPagamento] = useState(extraido?.forma_pagamento || 'pix')
  const [aPagarDepois, setAPagarDepois] = useState(false)
  const [vencimento, setVencimento] = useState('')
  const [itens, setItens] = useState(() =>
    (extraido?.itens || []).map((it) => ({
      produto: it.produto || '',
      categoria_id: '',
      categoria_nome_sugerida: it.categoria_sugerida || '',
      subcategoria_id: '',
      quantidade: it.quantidade ?? '',
      unidade: it.unidade || 'un',
      preco_unitario: it.preco_unitario ?? '',
    }))
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [criandoSubcatIdx, setCriandoSubcatIdx] = useState(null)
  const [nomeNovaSubcat, setNomeNovaSubcat] = useState('')

  useEffect(() => {
    if (!extraido || !obraId) return
    async function carregar() {
      const [e, f, c, s] = await Promise.all([
        supabase.from('etapas').select('id, nome').eq('obra_id', obraId),
        supabase.from('fornecedores').select('id, nome, cnpj'),
        supabase.from('categorias').select('id, nome').order('nome'),
        supabase.from('subcategorias').select('id, nome, categoria_id').order('nome'),
      ])
      setEtapas(e.data || [])
      setFornecedores(f.data || [])
      setCategorias(c.data || [])
      setSubcategorias(s.data || [])

      if (f.data?.length) {
        const cnpjAlvo = extraido.fornecedor_cnpj?.replace(/\D/g, '')
        const porCnpj = cnpjAlvo && f.data.find((x) => x.cnpj && x.cnpj.replace(/\D/g, '') === cnpjAlvo)
        const porNome =
          !porCnpj &&
          extraido.fornecedor_nome &&
          f.data.find((x) => x.nome.trim().toLowerCase() === extraido.fornecedor_nome.trim().toLowerCase())
        if (porCnpj) setFornecedorId(porCnpj.id)
        else if (porNome) setFornecedorId(porNome.id)
      }

      if (c.data?.length) {
        setItens((prev) =>
          prev.map((it) => {
            if (!it.categoria_nome_sugerida) return it
            const match = c.data.find((cat) => cat.nome.toLowerCase() === it.categoria_nome_sugerida.toLowerCase())
            return match ? { ...it, categoria_id: match.id } : it
          })
        )
      }
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraido, obraId])

  if (!extraido || !obraId) {
    return (
      <div className="card">
        <div>Nenhuma nota pra confirmar. Volte e envie uma foto ou um XML.</div>
        <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => navigate('/despesas')}>
          Voltar
        </button>
      </div>
    )
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
  const fornecedorNaoEncontrado = !fornecedorId && extraido.fornecedor_nome

  async function salvar(e) {
    e.preventDefault()
    setErro('')
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
        origem,
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
      categoria_confirmada: true,
      quantidade: parseValorBR(it.quantidade),
      unidade: it.unidade,
      preco_unitario: parseValorBR(it.preco_unitario),
      valor_total: totalItem(it),
    }))

    const { error: errItens } = await supabase.from('itens_compra').insert(itensParaInserir)

    if (errItens) {
      setSalvando(false)
      setErro('Despesa salva, mas houve erro ao salvar os itens: ' + errItens.message)
      return
    }

    if (arquivoOriginal) {
      try {
        const ext = origem === 'xml' ? 'xml' : arquivoOriginal.name?.split('.').pop() || 'jpg'
        const caminho = `${obraId}/${despesa.id}.${ext}`
        const { error: errUpload } = await supabase.storage.from('notas').upload(caminho, arquivoOriginal, { upsert: true })
        if (!errUpload) {
          const { data: urlData } = supabase.storage.from('notas').getPublicUrl(caminho)
          await supabase.from('anexos').insert({
            despesa_id: despesa.id,
            tipo: origem === 'xml' ? 'xml' : 'foto',
            url: urlData.publicUrl,
            dados_extraidos: extraido,
          })
        }
      } catch (_) {
        // guardar o anexo é best-effort — não trava o lançamento da despesa
      }
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
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Confirmar despesa {origem === 'foto' ? '(lida por foto)' : '(lida do XML)'}</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          Confira os campos abaixo — os que a IA não teve certeza ficaram em branco. Corrija o que precisar antes de salvar.
        </div>

        <div>
          <label className="label">Etapa (opcional)</label>
          <select className="input" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
            <option value="">Sem etapa específica</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Fornecedor</label>
          <select className="input" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          {fornecedorNaoEncontrado && (
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
              A nota parece ser de "{extraido.fornecedor_nome}", mas esse fornecedor não está cadastrado. Cadastre em
              Fornecedores se quiser vincular, ou deixe "Sem fornecedor".
            </div>
          )}
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

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Itens</div>
        {itens.map((it, idx) => {
          const subcatsDoItem = subcategorias.filter((s) => s.categoria_id === it.categoria_id)
          return (
            <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  <option value="">
                    {it.categoria_nome_sugerida && !it.categoria_id ? 'Categoria — IA não teve certeza' : 'Categoria'}
                  </option>
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

      <button className="btn btn-accent" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Confirmar e salvar despesa'}
      </button>
    </form>
  )
}
