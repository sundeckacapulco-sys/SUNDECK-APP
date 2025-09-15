import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const API_URL = 'http://localhost:8000'

const COLORS = ['#60a5fa', '#facc15', '#f87171']

export default function Escalaciones() {
  const [items, setItems] = useState([])

  const load = async () => {
    const res = await fetch(`${API_URL}/escalaciones`)
    const data = await res.json()
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  const resolve = async (id) => {
    await fetch(`${API_URL}/escalaciones/${id}/resolver`, {
      method: 'POST',
    })
    load()
  }

  const pieData = [
    { name: 'Normal', value: items.filter((i) => i.prioridad === 'Normal').length },
    { name: 'Urgente', value: items.filter((i) => i.prioridad === 'Urgente').length },
    { name: 'Crítico', value: items.filter((i) => i.prioridad === 'Crítico').length },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow">Recordatorios vencidos: {items.length}</div>
        <div className="bg-white p-4 shadow">Escalaciones creadas: {items.length}</div>
        <div className="bg-white p-4 shadow">Notificaciones enviadas: {items.length}</div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <PieChart width={300} height={300}>
          <Pie data={pieData} dataKey="value" nameKey="name" label>
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>

        <table className="text-left w-full">
          <thead>
            <tr>
              <th className="border p-2">Cliente</th>
              <th className="border p-2">Etapa</th>
              <th className="border p-2">Responsable</th>
              <th className="border p-2">Fecha vencida</th>
              <th className="border p-2">Prioridad</th>
              <th className="border p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td className="border p-2">{e.cliente}</td>
                <td className="border p-2">{e.etapa}</td>
                <td className="border p-2">{e.responsable}</td>
                <td className="border p-2">
                  {new Date(e.fechaVencida).toLocaleDateString()}
                </td>
                <td className="border p-2">{e.prioridad}</td>
                <td className="border p-2">
                  <button
                    onClick={() => resolve(e.id)}
                    className="bg-green-500 text-white px-2 py-1"
                  >
                    Resolver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

