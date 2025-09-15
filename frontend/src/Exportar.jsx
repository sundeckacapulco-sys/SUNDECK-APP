import { useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function Exportar() {
  const [filters, setFilters] = useState({ start: '', end: '', estado: '', responsable: '' })
  const [rows, setRows] = useState([])

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const buildParams = (extra = {}) => {
    const params = new URLSearchParams()
    if (filters.start) params.append('start', new Date(filters.start).toISOString())
    if (filters.end) params.append('end', new Date(filters.end).toISOString())
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.responsable) params.append('responsable', filters.responsable)
    for (const [k, v] of Object.entries(extra)) params.append(k, v)
    return params.toString()
  }

  const buscar = async () => {
    const res = await fetch(`${API_URL}/export?${buildParams()}`)
    const data = await res.json()
    setRows(data)
  }

  const exportar = (formato) => {
    window.open(`${API_URL}/export?${buildParams({ formato })}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Exportar</h1>
      <div className="space-y-2 mb-4">
        <input type="date" name="start" value={filters.start} onChange={handleChange} className="border p-2" />
        <input type="date" name="end" value={filters.end} onChange={handleChange} className="border p-2" />
        <input name="estado" value={filters.estado} onChange={handleChange} placeholder="Estado" className="border p-2" />
        <input name="responsable" value={filters.responsable} onChange={handleChange} placeholder="Responsable" className="border p-2" />
        <div className="space-x-2">
          <button onClick={buscar} className="px-3 py-2 bg-blue-500 text-white">Buscar</button>
          <button onClick={() => exportar('csv')} className="px-3 py-2 bg-green-500 text-white">CSV</button>
          <button onClick={() => exportar('excel')} className="px-3 py-2 bg-green-500 text-white">Excel</button>
        </div>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Prospecto</th>
            <th className="text-left p-2">Producto</th>
            <th className="text-left p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{r.prospecto}</td>
              <td className="p-2">{r.producto}</td>
              <td className="p-2">{r.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
