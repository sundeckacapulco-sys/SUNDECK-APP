import { useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function Reportes() {
  const [range, setRange] = useState('hoy')
  const [custom, setCustom] = useState({ start: '', end: '' })
  const [data, setData] = useState({ reagendamientos: [], comentarios: [] })

  const computeDates = () => {
    const now = new Date()
    let start, end
    if (range === 'hoy') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    } else if (range === 'semana') {
      const first = new Date(now)
      first.setDate(now.getDate() - 6)
      start = first
      end = now
    } else if (range === 'mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = now
    } else {
      start = custom.start ? new Date(custom.start) : null
      end = custom.end ? new Date(custom.end) : null
    }
    return { start, end }
  }

  const buildParams = (extra = {}) => {
    const { start, end } = computeDates()
    const params = new URLSearchParams()
    if (start) params.append('start', start.toISOString())
    if (end) params.append('end', end.toISOString())
    for (const [k, v] of Object.entries(extra)) params.append(k, v)
    return params.toString()
  }

  const buscar = async () => {
    const res = await fetch(`${API_URL}/reports?${buildParams()}`)
    const json = await res.json()
    setData(json)
  }

  const exportar = (formato) => {
    window.open(`${API_URL}/reports?${buildParams({ formato })}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reportes</h1>
      <div className="space-y-2 mb-4">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="border p-2">
          <option value="hoy">Hoy</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
          <option value="custom">Personalizado</option>
        </select>
        {range === 'custom' && (
          <div className="space-x-2">
            <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="border p-2" />
            <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="border p-2" />
          </div>
        )}
        <div className="space-x-2">
          <button onClick={buscar} className="px-3 py-2 bg-blue-500 text-white">Buscar</button>
          <button onClick={() => exportar('csv')} className="px-3 py-2 bg-green-500 text-white">CSV</button>
          <button onClick={() => exportar('excel')} className="px-3 py-2 bg-green-500 text-white">Excel</button>
        </div>
      </div>
      <h2 className="font-bold mt-4">Reagendamientos</h2>
      <table className="min-w-full text-sm mb-4">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Cliente</th>
            <th className="text-left p-2">Producto</th>
            <th className="text-left p-2">Original</th>
            <th className="text-left p-2">Nueva</th>
          </tr>
        </thead>
        <tbody>
          {data.reagendamientos.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{r.cliente}</td>
              <td className="p-2">{r.producto}</td>
              <td className="p-2">{r.fechaOriginal}</td>
              <td className="p-2">{r.fechaNueva}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="font-bold mt-4">Comentarios</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Cliente</th>
            <th className="text-left p-2">Producto</th>
            <th className="text-left p-2">Etapa</th>
            <th className="text-left p-2">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {data.comentarios.map((c, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{c.cliente}</td>
              <td className="p-2">{c.producto}</td>
              <td className="p-2">{c.etapa}</td>
              <td className="p-2">{c.tipo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
