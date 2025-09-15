import { useState, useEffect } from 'react'
import Kanban from './Kanban'
import ProspectModal from './ProspectModal'
import Metrics from './Metrics'
import Escalaciones from './Escalaciones'
import Exportar from './Exportar'
import Reportes from './Reportes'
import Training from './Training'
import Plantillas from './Plantillas'

const API_URL = 'http://localhost:8000'

export default function App() {
  const [form, setForm] = useState({ nombre: '', telefono: '', producto: '', direccion: '', fechaCita: '' })
  const [prospectos, setProspectos] = useState([])
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('prospectos')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const fetchProspectos = async () => {
    const res = await fetch(`${API_URL}/prospectos`)
    const data = await res.json()
    setProspectos(data)
  }

  useEffect(() => {
    fetchProspectos()
  }, [])

  const handleDragEnd = async ({ destination, source, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId) return
    const nuevoEstado = destination.droppableId
    await fetch(`${API_URL}/prospectos/${draggableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    setProspectos((prev) =>
      prev.map((p) => (p.id === draggableId ? { ...p, estado: nuevoEstado } : p))
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch(`${API_URL}/prospectos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        telefono: form.telefono,
        producto: form.producto,
        direccion: form.direccion || undefined,
        fechaCita: form.fechaCita ? new Date(form.fechaCita).toISOString() : undefined,
      }),
    })
    alert('Prospecto creado')
    setForm({ nombre: '', telefono: '', producto: '', direccion: '', fechaCita: '' })
    fetchProspectos()
  }

  return (
    <div className="p-4">
      <nav className="mb-4 space-x-4">
        <button
          className={`px-3 py-2 ${view === 'prospectos' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('prospectos')}
        >
          Prospectos
        </button>
        <button
          className={`px-3 py-2 ${view === 'metrics' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('metrics')}
        >
          Métricas
        </button>
        <button
          className={`px-3 py-2 ${view === 'escalaciones' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('escalaciones')}
        >
          Escalaciones
        </button>
        <button
          className={`px-3 py-2 ${view === 'exportar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('exportar')}
        >
          Exportar
        </button>
        <button
          className={`px-3 py-2 ${view === 'reportes' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('reportes')}
        >
          Reportes
        </button>
        <button
          className={`px-3 py-2 ${view === 'training' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('training')}
        >
          Capacitación
        </button>
        <button
          className={`px-3 py-2 ${view === 'plantillas' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('plantillas')}
        >
          Plantillas
        </button>
      </nav>
      {view === 'prospectos' && (
        <>
          <h1 className="text-2xl font-bold mb-4">Prospectos</h1>
          <form onSubmit={handleSubmit} className="space-y-2 mb-8 max-w-md">
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full p-2 border" />
            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="w-full p-2 border" />
            <input name="producto" value={form.producto} onChange={handleChange} placeholder="Producto" className="w-full p-2 border" />
            <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" className="w-full p-2 border" />
            <input type="datetime-local" name="fechaCita" value={form.fechaCita} onChange={handleChange} className="w-full p-2 border" />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2">Crear</button>
          </form>
          <Kanban prospectos={prospectos} onDragEnd={handleDragEnd} onSelect={setSelected} />
          {selected && (
            <ProspectModal prospect={selected} onClose={() => setSelected(null)} />
          )}
        </>
      )}
      {view === 'metrics' && <Metrics />}
      {view === 'escalaciones' && <Escalaciones />}
      {view === 'exportar' && <Exportar />}
      {view === 'reportes' && <Reportes />}
      {view === 'training' && <Training />}
      {view === 'plantillas' && <Plantillas />}
    </div>
  )
}
