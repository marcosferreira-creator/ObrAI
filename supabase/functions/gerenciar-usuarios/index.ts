// ObrAI — Edge Function: gerenciar-usuarios
// Duas ações:
//   - "criar_usuario" (padrão): admin cria um funcionário dentro da PRÓPRIA
//     empresa (empresa_id herdado de quem está chamando).
//   - "criar_empresa": só quem é super_admin (hoje, só o Marcos) pode criar
//     uma empresa nova + o primeiro login admin dela — é assim que uma nova
//     conta cliente (ex: Gustavo) é criada, isolada dos dados de todo mundo.
//
// A criação de usuário do Supabase Auth exige a service role key, que por
// isso NUNCA pode ir pro código do app (só existe aqui, no servidor).
//
// Deploy: cole no Supabase Dashboard em Edge Functions -> Create a new
// function -> nome "gerenciar-usuarios" (ou, se já existir, abra o editor
// dela e substitua todo o conteúdo por este arquivo). Não precisa
// configurar secret nova — SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente pelo Supabase
// em toda Edge Function.

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

    // Cliente com o token de quem chamou — só pra checar quem é.
    const supabaseComoQuemChama = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await supabaseComoQuemChama.auth.getUser()
    if (!userData?.user) throw new Error("Não autenticado.")

    const { data: meuUsuario } = await supabaseComoQuemChama
      .from("usuarios")
      .select("papel, ativo, empresa_id, super_admin")
      .eq("auth_user_id", userData.user.id)
      .single()

    const body = await req.json()
    const acao = body.acao || "criar_usuario"

    // Cliente com a service role — só a partir daqui.
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    if (acao === "criar_empresa") {
      if (!meuUsuario || !meuUsuario.super_admin) {
        throw new Error("Só o super administrador pode criar novas empresas.")
      }

      const { nome_empresa, nome, email, senha } = body
      if (!nome_empresa || !nome || !email || !senha) {
        throw new Error("Envie nome_empresa, nome, email e senha.")
      }
      if (senha.length < 6) {
        throw new Error("A senha provisória precisa ter pelo menos 6 caracteres.")
      }

      const { data: novaEmpresa, error: errEmpresa } = await supabaseAdmin
        .from("empresas")
        .insert({ nome: nome_empresa })
        .select()
        .single()
      if (errEmpresa) throw new Error("Erro ao criar a empresa: " + errEmpresa.message)

      const { data: novoAuthUser, error: errCriar } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      })
      if (errCriar) {
        await supabaseAdmin.from("empresas").delete().eq("id", novaEmpresa.id)
        throw new Error("Erro ao criar o login: " + errCriar.message)
      }

      const { error: errUsuario } = await supabaseAdmin.from("usuarios").insert({
        auth_user_id: novoAuthUser.user.id,
        nome,
        email,
        papel: "admin",
        ativo: true,
        empresa_id: novaEmpresa.id,
        super_admin: false,
      })
      if (errUsuario) {
        await supabaseAdmin.auth.admin.deleteUser(novoAuthUser.user.id)
        await supabaseAdmin.from("empresas").delete().eq("id", novaEmpresa.id)
        throw new Error("Erro ao salvar o usuário: " + errUsuario.message)
      }

      return new Response(JSON.stringify({ ok: true, empresa: novaEmpresa.nome, email }), {
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      })
    }

    // acao === "criar_usuario" (funcionário dentro da própria empresa)
    if (!meuUsuario || meuUsuario.papel !== "admin" || !meuUsuario.ativo) {
      throw new Error("Só administradores podem gerenciar usuários.")
    }
    if (!meuUsuario.empresa_id) {
      throw new Error("Sua conta ainda não está vinculada a uma empresa.")
    }

    const { nome, email, senha, papel } = body
    if (!nome || !email || !senha || !papel) {
      throw new Error("Envie nome, email, senha e papel.")
    }
    if (!PAPEIS_VALIDOS.includes(papel)) {
      throw new Error("Papel inválido.")
    }
    if (senha.length < 6) {
      throw new Error("A senha provisória precisa ter pelo menos 6 caracteres.")
    }

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
      empresa_id: meuUsuario.empresa_id,
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
