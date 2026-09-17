// ObrAI — Edge Function: processar-nota
// Recebe a foto de uma nota/recibo em base64, manda pra IA da Anthropic (Claude,
// com visão) e devolve os dados extraídos em JSON estruturado.
//
// Regra importante (pedida pelo usuário): a IA NUNCA deve inventar um valor que
// não conseguiu ler com confiança — nesses casos o campo volta como null, e o
// usuário corrige na tela de confirmação.
//
// Deploy: cole este arquivo no Supabase Dashboard em
// Edge Functions -> Create a new function -> nome "processar-nota".
// Depois configure a secret ANTHROPIC_API_KEY em Edge Functions -> Manage secrets.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
// Pode trocar o modelo depois via secret ANTHROPIC_MODEL, sem precisar editar o código.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5-20250929"

const EXTRACT_TOOL = {
  name: "extrair_nota",
  description:
    "Extrai os dados estruturados de uma nota fiscal, cupom fiscal, recibo ou comprovante de compra de material/serviço de construção civil.",
  input_schema: {
    type: "object",
    properties: {
      fornecedor_nome: {
        type: ["string", "null"],
        description: "Nome do fornecedor/loja/emitente, como aparece na nota. null se ilegível.",
      },
      fornecedor_cnpj: {
        type: ["string", "null"],
        description: "CNPJ do fornecedor. null se não aparecer ou estiver ilegível.",
      },
      data_compra: {
        type: ["string", "null"],
        description: "Data da compra, formato AAAA-MM-DD. null se ilegível.",
      },
      forma_pagamento: {
        type: ["string", "null"],
        enum: ["pix", "dinheiro", "cartao", "boleto", "transferencia", null],
        description: "Forma de pagamento, só se estiver claramente identificável na nota. null caso contrário.",
      },
      valor_total: {
        type: ["number", "null"],
        description: "Valor total da nota. null se ilegível.",
      },
      itens: {
        type: "array",
        description: "Cada produto ou serviço listado na nota.",
        items: {
          type: "object",
          properties: {
            produto: { type: "string", description: "Descrição do item, como está escrita na nota." },
            quantidade: { type: ["number", "null"] },
            unidade: { type: ["string", "null"], description: "Ex: un, kg, m, m2, m3, sc (saco), pç." },
            preco_unitario: { type: ["number", "null"] },
            categoria_sugerida: {
              type: ["string", "null"],
              description:
                "Uma das categorias da lista fornecida no prompt que melhor classifica este item. null se nenhuma se encaixar com confiança.",
            },
          },
          required: ["produto"],
        },
      },
    },
    required: ["itens"],
  },
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada nas secrets da function.")
    }

    const { image_base64, media_type, categorias } = await req.json()
    if (!image_base64 || !media_type) {
      throw new Error("Envie image_base64 e media_type no corpo da requisição.")
    }

    const listaCategorias =
      Array.isArray(categorias) && categorias.length
        ? categorias.join(", ")
        : "Fundação, Estrutura, Alvenaria, Cobertura, Hidráulica, Elétrica, Acabamento, Pintura, Esquadrias, Marcenaria, Serralheria, Climatização, Mão de obra, Equipamentos, Transporte, Projetos, Taxas, Administração"

    const prompt = `Você está lendo a foto de uma nota fiscal, cupom fiscal, recibo ou comprovante de compra de uma obra de construção civil no Brasil.

Extraia os dados usando a ferramenta "extrair_nota". Regras importantes:
- Nunca invente, estime ou "chute" um valor que não está legível na imagem. Se um campo estiver ilegível, borrado, cortado, ou você não tiver certeza, retorne null para ele.
- Para "categoria_sugerida" de cada item, escolha SOMENTE entre estas categorias: ${listaCategorias}. Se o item não se encaixar claramente em nenhuma com confiança, retorne null.
- Datas sempre no formato AAAA-MM-DD.
- Números sempre com ponto decimal (nunca vírgula).`

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "tool", name: "extrair_nota" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      throw new Error(`Erro na API da Anthropic (${anthropicRes.status}): ${errText}`)
    }

    const data = await anthropicRes.json()
    const toolUse = (data.content || []).find((c: any) => c.type === "tool_use")
    if (!toolUse) {
      throw new Error("A IA não retornou os dados extraídos no formato esperado.")
    }

    return new Response(JSON.stringify({ extraido: toolUse.input }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  }
})
