import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { parseNFeXML } from '../lib/parseNFeXML'

export default function CapturarXML() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    supabase.from('obras').select('id, nome').then(({ data }) => setObras(data || []))
  }, [])

  async function selecionarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!obraId) {
      setErro('Selecione a obra antes de escolher o arquivo.')
      e.target.value = ''
      return
    }
    setErro('')
    setProcessando(true)
    try {
      const texto = await file.text()
      const extraido = parseNFeXML(texto)
      navigate('/despesas/confirmar', {
        state: { obraId, origem: 'xml', extraido, arquivoOriginal: file },
      })
    } catch (err) {
      setErro('Não consegui ler esse XML: ' + err.message)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700 }}>Nova despesa por XML (NF-e/NFC-e)</div>

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
        <label className="label">Arquivo XML da nota</label>
        <input className="input" type="file" accept=".xml,text/xml" onChange={selecionarArquivo} disabled={processando} />
      </div>

      {erro && <div style={{ color: '#D92D20' }}>{erro}</div>}
      {processando && <div style={{ color: '#6B7280' }}>Lendo o arquivo…</div>}
    </div>
  )
}
