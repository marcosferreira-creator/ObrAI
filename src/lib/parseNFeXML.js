// Lê o XML padrão de NF-e/NFC-e (modelo da SEFAZ) e extrai os dados relevantes.
// Não depende de nenhuma API paga — funciona 100% offline, no navegador do usuário.

export function parseNFeXML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')

  if (doc.querySelector('parsererror')) {
    throw new Error('arquivo XML inválido ou corrompido')
  }

  const ns = doc.documentElement.namespaceURI
  const q = (parent, tag) => (ns ? parent.getElementsByTagNameNS(ns, tag) : parent.getElementsByTagName(tag))
  const text = (parent, tag) => {
    const el = q(parent, tag)[0]
    return el ? el.textContent.trim() : ''
  }

  const infNFe = q(doc, 'infNFe')[0] || doc
  const emit = q(infNFe, 'emit')[0]
  const ide = q(infNFe, 'ide')[0]
  const total = q(infNFe, 'ICMSTot')[0]

  if (!emit && !ide && !total) {
    throw new Error('não parece ser um XML de NF-e/NFC-e (tags esperadas não encontradas)')
  }

  const fornecedor_nome = emit ? text(emit, 'xNome') : ''
  const fornecedor_cnpj = emit ? text(emit, 'CNPJ') || text(emit, 'CPF') : ''

  const dataEmissao = ide ? text(ide, 'dhEmi') || text(ide, 'dEmi') : ''
  const data_compra = dataEmissao ? dataEmissao.slice(0, 10) : null

  const valorTotalTexto = total ? text(total, 'vNF') : ''
  const valor_total = valorTotalTexto ? parseFloat(valorTotalTexto) : null

  const dets = Array.from(q(infNFe, 'det'))
  const itens = dets.map((det) => {
    const prod = q(det, 'prod')[0]
    const qtdTexto = prod ? text(prod, 'qCom') : ''
    const precoTexto = prod ? text(prod, 'vUnCom') : ''
    return {
      produto: prod ? text(prod, 'xProd') || 'Item sem descrição' : 'Item sem descrição',
      quantidade: qtdTexto ? parseFloat(qtdTexto) : null,
      unidade: prod ? text(prod, 'uCom') || null : null,
      preco_unitario: precoTexto ? parseFloat(precoTexto) : null,
      categoria_sugerida: null, // XML não traz categoria — o usuário classifica na tela de confirmação
    }
  })

  return {
    fornecedor_nome: fornecedor_nome || null,
    fornecedor_cnpj: fornecedor_cnpj || null,
    data_compra,
    forma_pagamento: null,
    valor_total,
    itens: itens.length ? itens : [{ produto: '', quantidade: null, unidade: 'un', preco_unitario: null, categoria_sugerida: null }],
  }
}
