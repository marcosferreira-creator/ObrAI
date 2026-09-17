import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { processarNotaFoto } from '../lib/processarNota'

export default function CapturarFoto() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [categorias, setCategorias] = useState([])
  const [obraId, setObraId] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const [o, c] = await Promise.all([
        supabase.from('obras').select('id, nome'),
        supabase.from('categorias').select('nome').order('nome'),
      ])
      setObras(o.data || [])
      setCategorias((c.data || []).map((cat) => cat.nome))
    }
    carregar()
  }, [])

  function selecionarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setArquivo(file)
    setPreview(URL.createObjectURL(file))
    setErro('')
  }

  async function processar() {
    if (!obraId) return setErro('Selecione a obra antes.')
    if (!arquivo) return setErro('Selecione ou tire uma foto da nota.')
    setErro('')
    setProcessando(true)
    try {
      const extraido = await processarNotaFoto({ file: arquivo, categorias })
      navigate('/despesas/confirmar', {
        state: { obraId, origem: 'foto', extraido, arquivoOriginal: arquivo },
      })
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Nova despesa por foto</div>

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
          <label className="label">Foto da nota / recibo</label>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={selecionarArquivo} />
        </div>

        {preview && (
          <img src={preview} alt="Prévia da nota" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #E4E6EA' }} />
        )}

        {erro && <div style={{ color: '#D92D20' }}>{erro}</div>}

        <button className="btn btn-accent" onClick={processar} disabled={processando}>
          {processando ? 'Lendo a nota com IA…' : 'Ler nota com IA'}
        </button>
      </div>
    </div>
  )
}
