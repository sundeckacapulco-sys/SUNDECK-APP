import { useState, useEffect } from 'react'
import { FunnelChart, Funnel, Tooltip, LabelList } from 'recharts'

const API_URL = 'http://localhost:8000'

const periodOptions = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'personalizado', label: 'Personalizado' },
]

export default function Metrics() {
  const [periodo, setPeriodo] = useState('mensual')
  const [usuario, setUsuario] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [general, setGeneral] = useState(null)
  const [conversions, setConversions] = useState(null)
  const [userPerf, setUserPerf] = useState([])

  const computeRange = () => {
    const now = new Date()
    let s, e
    if (periodo === 'diario') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      e = now
    } else if (periodo === 'semanal') {
      s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      e = now
    } else if (periodo === 'mensual') {
      s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      e = now
    } else if (periodo === 'personalizado') {
      s = start ? new Date(start) : undefined
      e = end ? new Date(end) : undefined
    }
    return { s, e }
  }

  const loadData = async () => {
    const { s, e } = computeRange()
    const params = new URLSearchParams()
    if (s) params.append('start', s.toISOString())
    if (e) params.append('end', e.toISOString())
    if (usuario) params.append('usuario', usuario)
    const qs = params.toString() ? `?${params.toString()}` : ''

    const [g, c, u] = await Promise.all([
      fetch(`${API_URL}/metrics/general${qs}`).then((r) => r.json()),
      fetch(`${API_URL}/metrics/conversions${qs}`).then((r) => r.json()),
      fetch(`${API_URL}/metrics/user-performance${qs}`).then((r) => r.json()),
    ])
    setGeneral(g)
    setConversions(c)
    setUserPerf(u)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-end space-x-4">
        <div>
          <label className="block text-sm">Periodo</label>
          <select
            className="border p-2"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {periodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {periodo === 'personalizado' && (
          <>
            <div>
              <label className="block text-sm">Inicio</label>
              <input
                type="date"
                className="border p-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm">Fin</label>
              <input
                type="date"
                className="border p-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm">Responsable</label>
          <input
            className="border p-2"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuario"
          />
        </div>
        <button
          onClick={loadData}
          className="bg-blue-500 text-white px-4 py-2"
        >
          Filtrar
        </button>
      </div>

      {general && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 shadow">Total prospectos: {general.totalProspectos}</div>
          <div className="bg-white p-4 shadow">
            Tasa de conversión: {general.conversionRate.toFixed(2)}%
          </div>
          <div className="bg-white p-4 shadow">
            Tiempo cierre promedio: {general.avgTimeToClose.toFixed(2)} días
          </div>
          <div className="bg-white p-4 shadow">
            Cotizaciones activas: {general.cotizacionesActivas}
          </div>
          <div className="bg-white p-4 shadow">
            Pedidos generados: {general.pedidosGenerados}
          </div>
          <div className="bg-white p-4 shadow">
            Instalaciones confirmadas: {general.instalacionesConfirmadas}
          </div>
        </div>
      )}

      {conversions && (
        <div className="grid md:grid-cols-2 gap-4">
          <FunnelChart width={400} height={300}>
            <Tooltip />
            <Funnel dataKey="count" data={conversions.funnel}>
              <LabelList position="right" fill="#000" stroke="none" dataKey="count" />
            </Funnel>
          </FunnelChart>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="border p-2">De</th>
                <th className="border p-2">A</th>
                <th className="border p-2">Tasa %</th>
              </tr>
            </thead>
            <tbody>
              {conversions.conversionRates.map((r) => (
                <tr key={r.from}>
                  <td className="border p-2">{r.from}</td>
                  <td className="border p-2">{r.to}</td>
                  <td className="border p-2">{r.rate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {userPerf.length > 0 && (
        <div>
          <h2 className="text-xl mb-2">Rendimiento por usuario</h2>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="border p-2">Usuario</th>
                <th className="border p-2">% Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {userPerf.map((u) => (
                <tr key={u.usuario}>
                  <td className="border p-2">{u.usuario}</td>
                  <td className="border p-2">{u.porcentaje.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
