import { useEffect, useRef, useState } from 'react'
import { consultarIA } from '../lib/consultarIA'

const SUGESTOES = [
  'Quanto gastei este mês?',
  'Teve algum aumento de custo incomum?',
  'Existe alguma despesa que parece duplicada?',
  'Qual fornecedor eu mais uso e quanto gastei com ele?',
]

export default function Assistente() {
  const [mensagens, setMensagens] = useState([])
  const [pergunta, setPergunta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fimRef = useRef(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, enviando])

  async function enviar(texto) {
    const perguntaTexto = (texto ?? pergunta).trim()
    if (!perguntaTexto || enviando) return
    setErro('')

    const historicoAnterior = mensagens.map((m) => ({ role: m.role, content: m.content }))
    setMensagens((prev) => [...prev, { role: 'user', content: perguntaTexto }])
    setPergunta('')
    setEnviando(true)

    try {
      const resposta = await consultarIA({ pergunta: perguntaTexto, historico: historicoAnterior })
      setMensagens((prev) => [...prev, { role: 'assistant', content: resposta }])
    } catch (e) {
      setErro(e.message)
      setMensagens((prev) => prev.slice(0, -1)) // remove a pergunta que falhou, pra poder tentar de novo
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--obrai-header-h) - var(--obrai-nav-h) - 64px)' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Assistente ObrAI</div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 10 }}>
        {mensagens.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>Pergunte sobre os gastos das suas obras. Exemplos:</div>
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => enviar(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {mensagens.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#0B1F3A' : '#F2F3F5',
              color: m.role === 'user' ? '#fff' : '#0B1F3A',
              borderRadius: 12,
              padding: '10px 14px',
              maxWidth: '85%',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
            }}
          >
            {m.content}
          </div>
        ))}

        {enviando && <div style={{ color: '#6B7280', fontSize: 13 }}>Pensando…</div>}
        {erro && <div style={{ color: '#D92D20', fontSize: 13 }}>{erro}</div>}
        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          className="input"
          placeholder="Pergunte sobre seus gastos…"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          disabled={enviando}
        />
        <button className="btn btn-accent" disabled={enviando || !pergunta.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
