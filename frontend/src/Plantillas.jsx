import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function Plantillas() {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({ nombre: '', descripcion: '', texto: '', creador: '' })

  const fetchTemplates = async () => {
    const res = await fetch(`${API_URL}/plantillas`)
    const data = await res.json()
    setTemplates(data)
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch(`${API_URL}/plantillas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ nombre: '', descripcion: '', texto: '', creador: '' })
    fetchTemplates()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Plantillas WhatsApp</h1>
      <form onSubmit={handleSubmit} className="space-y-2 mb-6 max-w-md">
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Nombre"
          className="w-full p-2 border"
        />
        <input
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Descripción"
          className="w-full p-2 border"
        />
        <textarea
          name="texto"
          value={form.texto}
          onChange={handleChange}
          placeholder="Texto"
          className="w-full p-2 border"
        />
        <input
          name="creador"
          value={form.creador}
          onChange={handleChange}
          placeholder="Creador"
          className="w-full p-2 border"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Guardar
        </button>
      </form>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="border p-2">
            <h2 className="font-semibold">{t.nombre}</h2>
            {t.descripcion && <p className="text-sm">{t.descripcion}</p>}
            <p className="mt-1 whitespace-pre-line">{t.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
