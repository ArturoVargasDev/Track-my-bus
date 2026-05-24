import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const busIcon = new L.Icon({
  iconUrl:    'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
  popupAnchor:[0, -18],
})

const paradaIcon = (esTerminal) => new L.Icon({
  iconUrl:    esTerminal
    ? 'https://cdn-icons-png.flaticon.com/512/684/684908.png'
    : 'https://cdn-icons-png.flaticon.com/512/684/684809.png',
  iconSize:   [24, 24],
  iconAnchor: [12, 24],
})

const COLIMA     = [19.2433, -103.7241]
const REFRESH_MS = 3000

const DIAS = { 0:'Domingo', 1:'Lunes', 2:'Martes', 3:'Miercoles', 4:'Jueves', 5:'Viernes', 6:'Sabado' }

// Distancia en km entre dos puntos (Haversine)
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R  = 6371
  const dL = (lat2 - lat1) * Math.PI / 180
  const dl = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dl/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

/**
 * Calcula el ETA siguiendo los puntos de la polyline de la ruta.
 * 1. Encuentra el punto de la polyline mas cercano al bus
 * 2. Desde ese punto suma las distancias hasta la parada siguiendo la ruta
 * 3. Divide entre la velocidad del bus
 */
function calcularETAPolyline(bus, parada, polylinePuntos) {
  if (!bus || !parada || !polylinePuntos?.length) return null

  const vel = Math.max(bus.velocidad_kmh || 20, 5)

  // Si no hay polyline usa linea recta
  if (polylinePuntos.length < 2) {
    const dist = distanciaKm(bus.latitud, bus.longitud, parada.latitud, parada.longitud)
    return Math.round((dist / vel) * 60)
  }

  // Encontrar el indice del punto de la polyline mas cercano al bus
  let indiceBus = 0
  let distMinBus = Infinity
  polylinePuntos.forEach(([lat, lng], i) => {
    const d = distanciaKm(bus.latitud, bus.longitud, lat, lng)
    if (d < distMinBus) { distMinBus = d; indiceBus = i }
  })

  // Encontrar el indice del punto mas cercano a la parada
  let indiceParada = 0
  let distMinParada = Infinity
  polylinePuntos.forEach(([lat, lng], i) => {
    const d = distanciaKm(parada.latitud, parada.longitud, lat, lng)
    if (d < distMinParada) { distMinParada = d; indiceParada = i }
  })

  // Si la parada ya fue superada por el bus en esta ruta, no mostrar ETA
  if (indiceParada <= indiceBus) return null

  // Sumar distancias entre puntos de la polyline desde el bus hasta la parada
  let distTotal = distanciaKm(
    bus.latitud, bus.longitud,
    polylinePuntos[indiceBus][0], polylinePuntos[indiceBus][1]
  )
  for (let i = indiceBus; i < indiceParada; i++) {
    distTotal += distanciaKm(
      polylinePuntos[i][0],   polylinePuntos[i][1],
      polylinePuntos[i+1][0], polylinePuntos[i+1][1]
    )
  }
  distTotal += distanciaKm(
    polylinePuntos[indiceParada][0], polylinePuntos[indiceParada][1],
    parada.latitud, parada.longitud
  )

  return Math.round((distTotal / vel) * 60)
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 1 })
  }, [target])
  return null
}

export default function MapaPublico() {
  const [unidades,  setUnidades]  = useState([])
  const [rutas,     setRutas]     = useState([])
  const [rutaSel,   setRutaSel]   = useState(null)
  const [polyline,  setPolyline]  = useState([])
  const [paradas,   setParadas]   = useState([])
  const [horarios,  setHorarios]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [flyTarget, setFlyTarget] = useState(null)
  const [paradaSel, setParadaSel] = useState(null)
  const intervalRef = useRef(null)

  const cargarUnidades = async () => {
    try {
      const { data } = await api.get('/gps/live')
      setUnidades(data)
    } catch {}
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/rutas')
        setRutas(data)
      } catch {}
      await cargarUnidades()
      setLoading(false)
    }
    init()
    intervalRef.current = setInterval(cargarUnidades, REFRESH_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  const seleccionarRuta = async ruta => {
    if (rutaSel?.id === ruta.id) {
      setRutaSel(null); setPolyline([]); setParadas([]); setHorarios([])
      setPanelOpen(false); setParadaSel(null); return
    }
    setRutaSel(ruta); setPanelOpen(true); setParadaSel(null)
    try {
      const [poly, pars, hors] = await Promise.all([
        api.get(`/rutas/${ruta.id}/polyline`),
        api.get(`/paradas?ruta_id=${ruta.id}`),
        api.get(`/horarios?ruta_id=${ruta.id}`),
      ])
      setPolyline(poly.data.map(p => [p.latitud, p.longitud]))
      setParadas(pars.data)
      setHorarios(hors.data)
    } catch {}
  }

  const rutasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return rutas
    return rutas.filter(r =>
      r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.clave || '').toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [rutas, busqueda])

  // Buses activos en la ruta seleccionada
  const busesEnRuta = useMemo(() => {
    if (!rutaSel) return []
    return unidades.filter(u => u.ruta_id === rutaSel.id)
  }, [unidades, rutaSel])

  const horariosPorDia = Object.entries(DIAS).map(([val, nombre]) => ({
    dia: Number(val), nombre,
    horarios: horarios.filter(h => h.dia_semana === Number(val)),
  })).filter(d => d.horarios.length > 0)

  // ETA por parada usando polyline
  const etaPorParada = useMemo(() => {
    const map = {}
    paradas.forEach(parada => {
      if (!busesEnRuta.length) { map[parada.id] = null; return }
      // Tomar el ETA minimo entre todos los buses activos en la ruta
      const etas = busesEnRuta
        .map(bus => calcularETAPolyline(bus, parada, polyline))
        .filter(e => e !== null && e >= 0)
      map[parada.id] = etas.length ? Math.min(...etas) : null
    })
    return map
  }, [paradas, busesEnRuta, polyline])

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      {/* Barra de rutas con busqueda */}
      <div className="bg-white border-b px-4 py-2 space-y-2">
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Buscar ruta..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
          <div className="flex gap-2 overflow-x-auto flex-1">
            {rutasFiltradas.map(r => (
              <button key={r.id} onClick={() => seleccionarRuta(r)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium border transition
                  ${rutaSel?.id === r.id ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                style={{
                  backgroundColor: rutaSel?.id === r.id ? r.color_hex : undefined,
                  borderColor:     rutaSel?.id === r.id ? r.color_hex : undefined,
                }}>
                {r.nombre}
                {unidades.some(u => u.ruta_id === r.id) && (
                  <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </button>
            ))}
            {!rutasFiltradas.length && busqueda && (
              <span className="text-sm text-gray-400 py-1">Sin resultados</span>
            )}
            {!rutas.length && !busqueda && (
              <span className="text-sm text-gray-400 py-1">Cargando rutas...</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Panel lateral */}
        {panelOpen && rutaSel && (
          <div className="w-72 bg-white border-r shadow-lg flex flex-col overflow-hidden z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderLeftColor: rutaSel.color_hex, borderLeftWidth: 4 }}>
              <div>
                <p className="font-bold text-gray-800">{rutaSel.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {rutaSel.clave && <span className="text-xs text-gray-500">{rutaSel.clave}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${rutaSel.tipo === 'urbana'    ? 'bg-blue-50 text-blue-700'     :
                      rutaSel.tipo === 'suburbana' ? 'bg-purple-50 text-purple-700' :
                      'bg-orange-50 text-orange-700'}`}>
                    {rutaSel.tipo}
                  </span>
                  {rutaSel.accesible && <span className="text-green-600 text-xs">Accesible</span>}
                </div>
              </div>
              <button onClick={() => { setPanelOpen(false); setRutaSel(null); setPolyline([]); setParadas([]); setHorarios([]); setParadaSel(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            {/* Precio y buses activos */}
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between text-sm">
              <div>
                <p className="text-gray-500 text-xs">Precio del boleto</p>
                <p className="font-bold text-blue-700 text-lg">${rutaSel.precio} MXN</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Buses en ruta</p>
                <p className={`font-bold text-lg ${busesEnRuta.length ? 'text-green-600' : 'text-gray-400'}`}>
                  {busesEnRuta.length}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Paradas con ETA por polyline */}
              {paradas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm mb-2">
                    Paradas ({paradas.length})
                  </h3>
                  {busesEnRuta.length === 0 && (
                    <p className="text-xs text-gray-400 mb-2">Sin buses activos en esta ruta</p>
                  )}
                  <div className="space-y-1">
                    {paradas.map(p => {
                      const eta = etaPorParada[p.id]
                      return (
                        <button key={p.id}
                          onClick={() => { setParadaSel(p); setFlyTarget([p.latitud, p.longitud]) }}
                          className={`w-full flex items-center justify-between text-sm py-2 px-3 rounded-lg text-left transition
                            ${paradaSel?.id === p.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{p.es_terminal ? '🏁' : '•'}</span>
                            <span className="truncate text-gray-700">{p.nombre}</span>
                            {p.accesible && <span className="text-green-500 text-xs shrink-0">Accesible</span>}
                          </div>
                          {eta !== null ? (
                            <span className={`shrink-0 ml-2 text-xs font-semibold px-2 py-0.5 rounded-full
                              ${eta <= 5  ? 'bg-green-100 text-green-700'   :
                                eta <= 15 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-500'}`}>
                              {eta} min
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Horarios */}
              <div className="border-t pt-3">
                <h3 className="font-semibold text-gray-700 text-sm mb-2">Horarios</h3>
                {horariosPorDia.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">Sin horarios registrados</p>
                ) : (
                  horariosPorDia.map(d => (
                    <div key={d.dia} className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{d.nombre}</p>
                      <div className="space-y-1">
                        {d.horarios.map(h => (
                          <div key={h.id}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm
                              ${h.es_hora_pico ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                              {h.es_hora_pico && <span className="text-red-500 text-xs">Pico</span>}
                              <span className="font-mono font-semibold text-blue-700">{h.hora_salida}</span>
                              <span className="text-gray-400 text-xs">→</span>
                              <span className="font-mono text-gray-600 text-xs">{h.hora_llegada}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mapa */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-50 flex items-center justify-center">
              <span className="text-blue-700 font-semibold animate-pulse">Cargando mapa...</span>
            </div>
          )}
          <MapContainer center={COLIMA} zoom={13} className="w-full h-full z-0">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <FlyTo target={flyTarget} />

            {polyline.length > 0 && (
              <Polyline positions={polyline} color={rutaSel?.color_hex || '#2563EB'} weight={4} />
            )}

            {paradas.map(p => (
              <Marker key={p.id} position={[p.latitud, p.longitud]} icon={paradaIcon(p.es_terminal)}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-bold">{p.nombre}</p>
                    {p.es_terminal && <p className="text-blue-600 text-xs">Terminal</p>}
                    {p.accesible   && <p className="text-green-600 text-xs">Accesible</p>}
                    {etaPorParada[p.id] !== null && etaPorParada[p.id] !== undefined ? (
                      <p className="text-orange-600 text-xs font-semibold">
                        Bus en aprox. {etaPorParada[p.id]} min
                      </p>
                    ) : busesEnRuta.length === 0 ? (
                      <p className="text-gray-400 text-xs">Sin buses activos</p>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))}

            {unidades.map(u => (
              <Marker key={u.unidad_id} position={[u.latitud, u.longitud]} icon={busIcon}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-bold">{u.ruta || 'Sin ruta'}</p>
                    <p>{u.numero_economico} — {u.placa}</p>
                    <p className="text-blue-700">{Number(u.velocidad_kmh || 0).toFixed(1)} km/h</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-md px-4 py-2 text-sm">
            <span className="font-semibold text-blue-700">{unidades.length}</span>
            <span className="text-gray-500 ml-1">
              bus{unidades.length !== 1 ? 'es' : ''} activo{unidades.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
