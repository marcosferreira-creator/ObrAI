import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePermissao } from '../lib/AuthContext.jsx'

function FornecedorForm({ inicial, onSalvar, onCancelar, salvando }) {
  const [nome, setNome] = useState(inicial?.nome || '')
  const [cnpj, setCnpj] = useState(inicial?.cnpj || '')
  const [telefone, setTelefone] = useState(inicial?.telefone || '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nome.trim()) return
        onSalvar({ nome: nome.trim(), cnpj: cnpj.trim() || null, telefone: telefone.trim() || null })
      }}
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div>
        <label className="label">Nome</label>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div>
        <label className="label">CNPJ</label>
        <input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      </div>
      <div>
        <label className="label">Telefone</label>
        <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" disabled={salvando} style={{ flex: 1 }}>
          {salvando ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </button>
        {onCancelar && (
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default function Fornecedores() {
  const podeEditar = usePermissao('admin', 'financeiro')
  const [lista, setLista] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setLista(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function criar(dados) {
    setSalvando(true)
    await supabase.from('fornecedores').insert(dados)
    setSalvando(false)
    carregar()
  }

  async function salvarEdicao(id, dados) {
    setSalvando(true)
    await supabase.from('fornecedores').update(dados).eq('id', id)
    setSalvando(false)
    setEditandoId(null)
    carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {podeEditar && (
        <>
          <div style={{ fontWeight: 700 }}>Novo fornecedor</div>
          <FornecedorForm onSalvar={criar} salvando={salvando} />
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.map((f) =>
          editandoId === f.id ? (
            <FornecedorForm
              key={f.id}
              inicial={f}
              salvando={salvando}
              onSalvar={(dados) => salvarEdicao(f.id, dados)}
              onCancelar={() => setEditandoId(null)}
            />
          ) : (
            <div key={f.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{f.nome}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {f.cnpj || 'CNPJ não informado'}{f.telefone ? ` · ${f.telefone}` : ''}
                </div>
              </div>
              {podeEditar && (
                <button type="button" className="btn btn-ghost" onClick={() => setEditandoId(f.id)} style={{ padding: '6px 12px', fontSize: 12 }}>
                  Editar
                </button>
              )}
            </div>
          )
        )}
        {lista.length === 0 && <div style={{ color: '#6B7280' }}>Nenhum fornecedor cadastrado ainda.</div>}
      </div>
    </div>
  )
}
