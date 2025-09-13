import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

const stages = [
  'Visita Inicial / Medición',
  'Cotización Aprobada',
  'Pedido',
  'Fabricación',
  'Instalación en Proceso',
  'Entrega Final',
  'Postventa',
]

export default function ProspectModal({ prospect, onClose }) {
  const [etapas, setEtapas] = useState([])
  const [active, setActive] = useState(null)
  const [aiMessage, setAiMessage] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)

  const fetchEtapas = async () => {
    const res = await fetch(`${API_URL}/prospectos/${prospect.id}/etapas`)
    const data = await res.json()
    setEtapas(data)
  }

  useEffect(() => {
    fetchEtapas()
  }, [prospect.id])

  const handleSubmit = async (nombre, datos, archivos = []) => {
    await fetch(`${API_URL}/prospectos/${prospect.id}/etapas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, datos, archivos }),
    })
    await fetchEtapas()
    setActive(null)
  }

  const measurementData = etapas.find((e) => e.nombre === stages[0])?.datos

  const etapaMap = {
    prospecto_nuevo: 'prospecto',
    cotizacion_activa: 'cotizacion',
    pedido: 'pedido',
    instalacion: 'instalacion',
    postventa: 'postventa',
  }

  const suggestMessage = async () => {
    setLoadingAI(true)
    const etapa = etapaMap[prospect.estado] || 'prospecto'
    const historial = etapas
      .map((e) => `${e.nombre}: ${e.datos.comentarios || ''}`)
      .join('\n')
    const res = await fetch(`${API_URL}/ai/message-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: prospect.nombre,
        producto: prospect.producto,
        etapa,
        historial,
      }),
    })
    const data = await res.json()
    setAiMessage(data.mensaje || '')
    setShowAI(true)
    setLoadingAI(false)
  }

  const renderForm = () => {
    switch (active) {
      case stages[0]:
        return <MedicionForm onSubmit={(d) => handleSubmit(stages[0], d)} />
      case stages[2]:
        return <PedidoForm onSubmit={(d) => handleSubmit(stages[2], d)} />
      case stages[3]:
        return (
          <FabricacionForm
            onSubmit={(d) => handleSubmit(stages[3], d)}
            measurement={measurementData}
          />
        )
      case stages[4]:
        return <InstalacionForm onSubmit={(d) => handleSubmit(stages[4], d)} />
      case stages[1]:
      case stages[5]:
      case stages[6]:
        return <SimpleForm nombre={active} onSubmit={(d) => handleSubmit(active, d)} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 max-h-[90vh] overflow-y-auto w-full max-w-3xl">
        <button className="float-right" onClick={onClose}>
          X
        </button>
        <h2 className="text-xl font-bold mb-2">{prospect.nombre}</h2>
        <p>{prospect.telefono}</p>
       <p>{prospect.producto}</p>
       {prospect.fechaCita && (
         <p>{new Date(prospect.fechaCita).toLocaleString()}</p>
       )}
        <button
          className="bg-green-500 text-white px-2 py-1 mt-2"
          onClick={suggestMessage}
          disabled={loadingAI}
        >
          {loadingAI ? 'Generando...' : 'Sugerir Mensaje AI'}
        </button>
        {showAI && (
          <div className="my-2">
            <textarea
              className="w-full border p-2"
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
            />
            <div className="flex space-x-2 mt-2">
              <button
                className="bg-blue-500 text-white px-2 py-1"
                onClick={() => navigator.clipboard.writeText(aiMessage)}
              >
                Copiar
              </button>
              <button
                className="bg-gray-500 text-white px-2 py-1"
                onClick={async () => {
                  const nombre = prompt('Nombre de la plantilla')
                  if (!nombre) return
                  const descripcion = prompt('Descripción opcional') || ''
                  await fetch(`${API_URL}/plantillas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nombre: `[AI] ${nombre}`,
                      descripcion,
                      texto: aiMessage,
                      creador: 'IA',
                    }),
                  })
                  alert('Plantilla guardada')
                }}
              >
                Guardar como Plantilla
              </button>
            </div>
          </div>
        )}
        <div className="flex space-x-2 overflow-x-auto my-4">
          {stages.map((s) => (
            <button
              key={s}
              className={`px-2 py-1 border ${
                active === s ? 'bg-blue-500 text-white' : ''
              }`}
              onClick={() => setActive(s)}
            >
              {s}
              {etapas.find((e) => e.nombre === s) ? ' ✓' : ''}
            </button>
          ))}
        </div>
        {active && renderForm()}
      </div>
    </div>
  )
}

function SimpleForm({ nombre, onSubmit }) {
  const [comentarios, setComentarios] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ comentarios })
      }}
      className="space-y-2"
    >
      <textarea
        className="w-full p-2 border"
        placeholder={`Notas para ${nombre}`}
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2" type="submit">
        Guardar
      </button>
    </form>
  )
}

function MedicionForm({ onSubmit }) {
  const [piezas, setPiezas] = useState([
    { ancho: '', alto: '', precioM2: '' },
  ])
  const [fotos, setFotos] = useState('')
  const [comentarios, setComentarios] = useState('')

  const addPiece = () =>
    setPiezas([...piezas, { ancho: '', alto: '', precioM2: '' }])
  const updatePiece = (i, field, value) => {
    const copy = [...piezas]
    copy[i][field] = value
    setPiezas(copy)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const piezasData = piezas.map((p) => ({
          ...p,
          m2: (parseFloat(p.ancho || 0) * parseFloat(p.alto || 0)),
        }))
        onSubmit({
          piezas: piezasData,
          fotos: fotos
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          comentarios,
        })
      }}
      className="space-y-2"
    >
      {piezas.map((p, i) => (
        <div key={i} className="flex space-x-2">
          <input
            className="w-20 p-1 border"
            placeholder="Ancho"
            value={p.ancho}
            onChange={(e) => updatePiece(i, 'ancho', e.target.value)}
          />
          <input
            className="w-20 p-1 border"
            placeholder="Alto"
            value={p.alto}
            onChange={(e) => updatePiece(i, 'alto', e.target.value)}
          />
          <input
            className="w-24 p-1 border"
            placeholder="Precio m²"
            value={p.precioM2}
            onChange={(e) => updatePiece(i, 'precioM2', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        className="px-2 py-1 border"
        onClick={addPiece}
      >
        Agregar pieza
      </button>
      <input
          className="w-full p-2 border"
          placeholder="URLs de fotos, separadas por coma"
          value={fotos}
          onChange={(e) => setFotos(e.target.value)}
        />
      <textarea
        className="w-full p-2 border"
        placeholder="Comentarios"
        value={comentarios}
        onChange={(e) => setComentarios(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2" type="submit">
        Guardar
      </button>
    </form>
  )
}

function PedidoForm({ onSubmit }) {
  const [form, setForm] = useState({
    montoTotal: '',
    anticipo: '',
    saldo: '',
    formaPago: '',
    fechaVencimiento: '',
    urlCotizacion: '',
    urlLevantamiento: '',
  })

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(form)
      }}
      className="space-y-2"
    >
      <input
        name="montoTotal"
        value={form.montoTotal}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="Monto total"
      />
      <input
        name="anticipo"
        value={form.anticipo}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="Anticipo"
      />
      <input
        name="saldo"
        value={form.saldo}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="Saldo pendiente"
      />
      <input
        name="formaPago"
        value={form.formaPago}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="Forma de pago"
      />
      <input
        type="date"
        name="fechaVencimiento"
        value={form.fechaVencimiento}
        onChange={handleChange}
        className="w-full p-2 border"
      />
      <input
        name="urlCotizacion"
        value={form.urlCotizacion}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="URL cotización"
      />
      <input
        name="urlLevantamiento"
        value={form.urlLevantamiento}
        onChange={handleChange}
        className="w-full p-2 border"
        placeholder="URL levantamiento"
      />
      <button className="bg-blue-500 text-white px-4 py-2" type="submit">
        Guardar
      </button>
    </form>
  )
}

function FabricacionForm({ onSubmit, measurement }) {
  const [observaciones, setObservaciones] = useState('')
  const piezas = measurement?.piezas || []
  const materiales = []
  if (piezas.some((p) => parseFloat(p.ancho) > 2.5)) {
    materiales.push('Mecanismo R24')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ piezas, observaciones, materiales })
      }}
      className="space-y-2"
    >
      {piezas.length > 0 && (
        <div className="border p-2">
          <h4 className="font-medium">Medidas</h4>
          {piezas.map((p, i) => (
            <p key={i}>
              {p.ancho} x {p.alto} m
            </p>
          ))}
        </div>
      )}
      <textarea
        className="w-full p-2 border"
        placeholder="Observaciones"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2" type="submit">
        Guardar
      </button>
    </form>
  )
}

function InstalacionForm({ onSubmit }) {
  const [fotos, setFotos] = useState('')
  const [check, setCheck] = useState({
    fijacion: false,
    limpieza: false,
    confirmacion: false,
  })

  const handleCheck = (e) =>
    setCheck({ ...check, [e.target.name]: e.target.checked })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          fotos: fotos
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          checklist: check,
        })
      }}
      className="space-y-2"
    >
      <input
        className="w-full p-2 border"
        placeholder="URLs de fotos, separadas por coma"
        value={fotos}
        onChange={(e) => setFotos(e.target.value)}
      />
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="fijacion"
          checked={check.fijacion}
          onChange={handleCheck}
        />
        <span>Checklist de instalación completado</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="limpieza"
          checked={check.limpieza}
          onChange={handleCheck}
        />
        <span>Limpieza realizada</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="confirmacion"
          checked={check.confirmacion}
          onChange={handleCheck}
        />
        <span>Confirmación del cliente</span>
      </label>
      <button className="bg-blue-500 text-white px-4 py-2" type="submit">
        Guardar
      </button>
    </form>
  )
}

