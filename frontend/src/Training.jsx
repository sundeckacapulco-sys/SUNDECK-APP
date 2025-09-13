import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'
const USER = 'demo'

export default function Training() {
  const [items, setItems] = useState([])
  const [progress, setProgress] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const categories = ['Ventas', 'Instalaciones', 'Promoción']

  const load = async () => {
    const res = await fetch(`${API_URL}/training/list`)
    const data = await res.json()
    setItems(data)
    const p = await fetch(`${API_URL}/training/progress?user=${USER}`)
    const pdata = await p.json()
    setProgress(pdata.completed)
  }

  useEffect(() => {
    load()
  }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    fd.append('usuario', USER)
    await fetch(`${API_URL}/training/upload`, { method: 'POST', body: fd })
    e.target.reset()
    load()
  }

  const handleAccess = async (id) => {
    await fetch(`${API_URL}/training/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainingId: id, user: USER })
    })
    setProgress((p) => [...new Set([...p, id])])
  }

  const fileIcon = (type) => {
    if (type.includes('pdf')) return '📄'
    if (type.startsWith('image')) return '🖼️'
    if (type.startsWith('video')) return '🎥'
    return '📁'
  }

  const filtered = (cat) =>
    items.filter((i) =>
      i.categoria === cat &&
      (!search || i.nombre.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || i.tipo.startsWith(typeFilter))
    )

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Capacitación</h2>
      <form onSubmit={handleUpload} className="space-y-2 mb-4 max-w-md">
        <input name="nombre" placeholder="Nombre" className="w-full p-2 border" required />
        <select name="categoria" className="w-full p-2 border">
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name="descripcion" placeholder="Descripción (opcional)" className="w-full p-2 border" />
        <input type="file" name="file" className="w-full" required />
        <button className="bg-blue-500 text-white px-4 py-2">Subir</button>
      </form>
      <div className="flex space-x-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
          className="p-2 border"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="p-2 border">
          <option value="">Todos</option>
          <option value="image">Imágenes</option>
          <option value="video">Videos</option>
          <option value="application/pdf">PDF</option>
        </select>
      </div>
      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="font-semibold mb-2">{cat}</h3>
          <ul className="space-y-1">
            {filtered(cat).map((item) => (
              <li key={item.id} className="flex items-center space-x-2">
                <span>{fileIcon(item.tipo)}</span>
                <span className="flex-1">{item.nombre}</span>
                {progress.includes(item.id) && <span className="text-green-600">✔</span>}
                {item.tipo.startsWith('image') || item.tipo.startsWith('video') ? (
                  <button
                    className="text-blue-500 underline"
                    onClick={() => {
                      handleAccess(item.id)
                      window.open(item.url, '_blank')
                    }}
                  >
                    Ver
                  </button>
                ) : (
                  <a
                    href={item.url}
                    download
                    onClick={() => handleAccess(item.id)}
                    className="text-blue-500 underline"
                  >
                    Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
