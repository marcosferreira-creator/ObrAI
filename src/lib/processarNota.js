// Chama a Edge Function `processar-nota` (Supabase) para ler uma foto de nota/recibo
// com IA e devolver os dados já estruturados.

import { supabase } from './supabaseClient'

export async function processarNotaFoto({ file, categorias }) {
  const { data: base64, mediaType } = await fileToBase64(file)

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processar-nota`

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      image_base64: base64,
      media_type: mediaType,
      categorias,
    }),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao processar a nota.')
  }
  return json.extraido
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result // "data:image/jpeg;base64,AAAA..."
      const [header, data] = result.split(',')
      const mediaType = header.match(/data:(.*);base64/)?.[1] || file.type || 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = () => reject(new Error('não consegui ler o arquivo de imagem'))
    reader.readAsDataURL(file)
  })
}
