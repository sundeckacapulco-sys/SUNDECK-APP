import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

const columns = [
  { id: 'prospecto_nuevo', title: 'Prospectos Nuevos' },
  { id: 'cotizacion_activa', title: 'Cotizaciones Activas' },
  { id: 'pedido', title: 'Pedidos' },
  { id: 'fabricacion', title: 'Fabricación' },
  { id: 'instalacion', title: 'Instalación' },
  { id: 'entrega', title: 'Entrega' },
  { id: 'postventa', title: 'Postventa' },
]

export default function Kanban({ prospectos, onDragEnd, onSelect }) {
  const grouped = columns.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {})
  prospectos.forEach((p) => {
    if (grouped[p.estado]) {
      grouped[p.estado].push(p)
    } else {
      grouped['prospecto_nuevo'].push(p)
    }
  })

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex space-x-4 overflow-x-auto">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-gray-100 rounded p-2 min-w-[200px]"
              >
                <h2 className="font-semibold mb-2">{col.title}</h2>
                {grouped[col.id].map((p, index) => (
                  <Draggable draggableId={p.id} index={index} key={p.id}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className="bg-white p-2 mb-2 shadow cursor-pointer"
                        onClick={() => onSelect && onSelect(p)}
                      >
                        <p className="font-medium">{p.nombre}</p>
                        <p className="text-sm">{p.producto}</p>
                        <p className="text-sm">{p.telefono}</p>
                        {p.fechaCita && (
                          <p className="text-sm">
                            {new Date(p.fechaCita).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}
