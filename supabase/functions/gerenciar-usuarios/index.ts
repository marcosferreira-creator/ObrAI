// ObrAI — Edge Function: gerenciar-usuarios
// Cria um novo login (Supabase Auth + linha em `usuarios`) para um
// funcionário. Só quem chama como admin pode usar — a criação de usuário
// do Supabase Auth exige a service role key, que por isso NUNCA pode ir
// pro código do app (só existe aqui, no servidor).
//
// Deploy: cole no Supabase Dashboard em Edge Functions -> Create a new
// function -> nome "gerenciar-usuarios". Não precisa configurar secret
// nova — SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já
// são injetadas automaticamente pelo Supabase em toda Edge Function.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const PAPEIS_VALIDOS = ["admin", "financeiro", "mestre_obra", "visualizacao"]

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get("Authorization") || ""

    // Cliente com o token de quem chamou — só pra checar se é admin.
    const supabaseComoQuemChama = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await supabaseComoQuemChama.auth.getUser()
    if (!userData?.user) throw new Error("Não autenticado.")

    const { data: meuUsuario } = await supabaseComoQuemChama
      .from("usuarios")
      .select("papel, ativo")
      .eq("auth_user_id", userData.user.id)
      .single()

    if (!meuUsuario || meuUsuario.papel !== "admin" || !meuUsuario.ativo) {
      throw new Error("Só administradores podem gerenciar usuários.")
    }

    const { nome, email, senha, papel } = await req.json()
    if (!nome || !email || !senha || !papel) {
      throw new Error("Envie nome, email, senha e papel.")
    }
    if (!PAPEIS_VALIDOS.includes(papel)) {
      throw new Error("Papel inválido.")
    }
    if (senha.length < 6) {
      throw new Error("A senha provisória precisa ter pelo menos 6 caracteres.")
    }

    // Cliente com a service role — só a partir daqui, e só depois de já
    // termos confirmado que quem chamou é admin.
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: novoAuthUser, error: errCriar } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (errCriar) throw new Error("Erro ao criar o login: " + errCriar.message)

    const { error: errUsuario } = await supabaseAdmin.from("usuarios").insert({
      auth_user_id: novoAuthUser.user.id,
      nome,
      email,
      papel,
      ativo: true,
    })

    if (errUsuario) {
      // limpa o auth user órfão se a linha de usuarios falhar
      await supabaseAdmin.auth.admin.deleteUser(novoAuthUser.user.id)
      throw new Error("Erro ao salvar o usuário: " + errUsuario.message)
    }

    return new Response(JSON.stringify({ ok: true, email, papel }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    })
  }
})
