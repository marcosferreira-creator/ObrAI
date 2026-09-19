import { supabase } from './supabaseClient'

// Recalcula o status_pagamento de uma despesa a partir da soma dos
// pagamentos (contas_pagar) já marcados como "pago" — permite pagamento
// parcial/parcelado (ex: empreiteiro que recebe conforme entrega).
export async function recalcularStatusPagamento(despesaId) {
  const [{ data: despesa }, { data: pagamentos }] = await Promise.all([
    supabase.from('despesas').select('valor_total').eq('id', despesaId).single(),
    supabase.from('contas_pagar').select('valor, status').eq('despesa_id', despesaId),
  ])

  const valorTotal = Number(despesa?.valor_total || 0)
  const totalPago = (pagamentos || [])
    .filter((p) => p.status === 'pago')
    .reduce((s, p) => s + Number(p.valor || 0), 0)

  let status = 'pendente'
  if (valorTotal > 0 && totalPago >= valorTotal) status = 'pago'
  else if (totalPago > 0) status = 'parcial'

  await supabase.from('despesas').update({ status_pagamento: status }).eq('id', despesaId)
  return status
}
