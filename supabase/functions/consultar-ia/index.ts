// ObrAI — Edge Function: consultar-ia
// IA de consulta em linguagem natural sobre os gastos das obras: responde
// perguntas, aponta aumentos de custo, despesas fora do padrão e prováveis
// duplicidades — sempre com base nos lançamentos reais do banco, nunca chutando.
//
// Deploy: cole no Supabase Dashboard em Edge Functions -> Create a new
// function -> nome "consultar-ia". Usa a mesma secret ANTHROPIC_API_KEY já
// configurada para a função "processar-nota" — não precisa configurar de novo.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5-20250929"
// SUPABASE_URL e SUPABASE_ANON_KEY são injetadas automaticamente pelo Supabase
// em toda Edge Function — não precisam ser configuradas como secret.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada nas secrets da function.")

    const authHeader = req.headers.get("Authorization") || ""
    // Usa o token do próprio usuário logado, não a service role — assim as
    // regras de RLS valem aqui também (importante já pensando na Fase 5,
    // multiusuário, quando cada um só deve ver as obras que tem permissão).
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { pergunta, historico } = await req.json()
    if (!pergunta || typeof pergunta !== "string") {
      throw new Error("Envie a pergunta no campo `pergunta`.")
    }

    const { data: despesas, error } = await supabase
      .from("despesas")
      .select(
        "data_compra, valor_total, origem, status_pagamento, obras(nome), fornecedores(nome), itens_compra(produto, quantidade, unidade, preco_unitario, valor_total, categorias(nome), subcategorias(nome))"
      )
      .order("data_compra", { ascending: false })
      .limit(1000)

    if (error) throw new Error("Erro ao consultar o banco: " + error.message)

    const linhas: any[] = []
    for (const d of despesas || []) {
      for (const it of (d as any).itens_compra || []) {
        linhas.push({
          data: d.data_compra,
          obra: (d as any).obras?.nome || null,
          fornecedor: (d as any).fornecedores?.nome || null,
          produto: it.produto,
          categoria: it.categorias?.nome || null,
          subcategoria: it.subcategorias?.nome || null,
          quantidade: it.quantidade,
          unidade: it.unidade,
          preco_unitario: it.preco_unitario,
          valor_total: it.valor_total,
          origem: d.origem,
          status_pagamento: d.status_pagamento,
        })
      }
    }

    const system = `Você é a IA financeira do ObrAI, sistema de gestão de obras. Responda sempre em português do Brasil, de forma direta e objetiva, sem enrolação.

Abaixo está a lista de TODOS os lançamentos de despesa cadastrados (um item de nota por linha), em JSON. Use SOMENTE esses dados para responder — nunca invente números, fornecedores, produtos ou datas que não estejam na lista. Se a pergunta não puder ser respondida com os dados disponíveis, diga isso claramente em vez de chutar.

Quando o usuário pedir para identificar aumento de custos, despesas fora do padrão, ou possíveis duplicidades, analise os dados e cite exemplos concretos (data, fornecedor, produto, valor) — nunca uma resposta genérica sem exemplo.
- Aumento de custo: compare o preço unitário do mesmo produto/categoria ao longo do tempo.
- Fora do padrão: um valor muito acima da média para aquele tipo de item/categoria.
- Duplicidade provável: mesmo fornecedor + mesmo produto (ou muito parecido) + mesma data ou datas muito próximas + valor igual ou muito parecido.

DADOS (JSON):
${JSON.stringify(linhas)}`

    const messages = [...(Array.isArray(historico) ? historico.slice(-8) : []), { role: "user", content: pergunta }]

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages,
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      throw new Error(`Erro na API da Anthropic (${anthropicRes.status}): ${errText}`)
    }

    const data = await anthropicRes.json()
    const textoResposta = (data.content || [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n")

    return new Response(JSON.stringify({ resposta: textoResposta }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  }
})
