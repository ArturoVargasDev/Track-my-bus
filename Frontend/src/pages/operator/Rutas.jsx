import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

// Fix icono leaflet con vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COLIMA = [19.2433, -103.7241]

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    }
  })
  return null
}

function MapaEditor({ puntos, setPuntos, colorHex }) {
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const handleMapClick = (latlng) => {
    setPuntos(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }])
  }

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    puntos.forEach((p, i) => {
      const color = i === 0 ? '#16a34a' : i === puntos.length - 1 ? '#dc2626' : colorHex
      const circle = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(mapRef.current)
      circle.bindTooltip(`Punto ${i + 1}`, { permanent: false })
      markersRef.current.push(circle)
    })
  }, [puntos, colorHex])

  return (
    <MapContainer
      center={COLIMA}
      zoom={13}
      className="w-full h-full z-0"
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <MapClickHandler onMapClick={handleMapClick} />
      {puntos.length > 1 && (
        <Polyline
          positions={puntos.map(p => [p.lat, p.lng])}
          color={colorHex || '#2563EB'}
          weight={4}
        />
      )}
    </MapContainer>
  )
}

export default function Rutas() {
  const [rutas,    setRutas]    = useState([])
  const [form,     setForm]     = useState({ nombre:'', clave:'', tipo:'urbana', color_hex:'#2563EB', empresa_id:'', zona_id:'', precio:'' })
  const [empresas, setEmpresas] = useState([])
  const [zonas,    setZonas]    = useState([])
  const [modal,    setModal]    = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [puntos,   setPuntos]   = useState([])
  const [paso,     setPaso]     = useState(1)

  const cargar = async () => {
    const [r, e, z] = await Promise.all([api.get('/rutas'), api.get('/empresas'), api.get('/zonas')])
    setRutas(r.data); setEmpresas(e.data); setZonas(z.data)
  }

  useEffect(() => { cargar() }, [])

  const abrirModal = () => {
    setModal(true)
    setPuntos([])
    setPaso(1)
    setError('')
    setForm({ nombre:'', clave:'', tipo:'urbana', color_hex:'#2563EB', empresa_id:'', zona_id:'', precio:'' })
  }

  const crear = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: nuevaRuta } = await api.post('/rutas', form)
      if (puntos.length > 1 && nuevaRuta.id) {
        const polylineData = puntos.map((p, i) => ({
          orden: i + 1,
          latitud: p.lat,
          longitud: p.lng,
        }))
        try {
          await api.put(`/rutas/${nuevaRuta.id}/polyline`, { puntos: polylineData })
        } catch {}
      }
      setModal(false)
      cargar()
    } catch(err) {
      setError(err.response?.data?.error || 'Error al crear ruta')
    } finally {
      setLoading(false)
    }
  }

  const desactivar = async id => {
    if (!confirm('¿Desactivar esta ruta?')) return
    await api.delete(`/rutas/${id}`)
    cargar()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Rutas</h1>
          </div>
          <button onClick={abrirModal}
            className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
            + Nueva ruta
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Clave</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Precio</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rutas.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{r.clave || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{r.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.empresa}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">${r.precio ?? '0.00'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ background: r.color_hex }} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => desactivar(r.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
              {!rutas.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay rutas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva ruta */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full ${paso === 2 ? 'max-w-4xl' : 'max-w-md'} p-6 space-y-4 transition-all`}>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Nueva ruta</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paso === 1 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  1. Datos
                </span>
                <span className="text-gray-300">→</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paso === 2 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  2. Trazar ruta
                </span>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            {/* Paso 1: Datos de la ruta */}
            {paso === 1 && (
              <form onSubmit={e => { e.preventDefault(); setPaso(2) }} className="space-y-3">
                <input placeholder="Nombre *" required value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Clave (ej. R-01)" value={form.clave}
                  onChange={e => setForm({...form, clave: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="urbana">Urbana</option>
                  <option value="suburbana">Suburbana</option>
                  <option value="foranea">Foránea</option>
                </select>
                <select required value={form.empresa_id} onChange={e => setForm({...form, empresa_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Empresa *</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <select required value={form.zona_id} onChange={e => setForm({...form, zona_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Zona *</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Precio del boleto ($) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="ej. 12.00"
                      value={form.precio}
                      onChange={e => setForm({...form, precio: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color</label>
                    <input type="color" value={form.color_hex}
                      onChange={e => setForm({...form, color_hex: e.target.value})}
                      className="w-10 h-9 rounded cursor-pointer border" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setModal(false)}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 transition">
                    Siguiente → Trazar ruta
                  </button>
                </div>
              </form>
            )}

            {/* Paso 2: Dibujar polyline en el mapa */}
            {paso === 2 && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                  🗺️ Haz clic en el mapa para agregar puntos al recorrido de la ruta. El primer punto es verde y el último rojo.
                </div>
                <div className="h-96 rounded-xl overflow-hidden border border-gray-200">
                  <MapaEditor
                    puntos={puntos}
                    setPuntos={setPuntos}
                    colorHex={form.color_hex}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{puntos.length} punto{puntos.length !== 1 ? 's' : ''} marcado{puntos.length !== 1 ? 's' : ''}</span>
                  {puntos.length > 0 && (
                    <button onClick={() => setPuntos([])}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Borrar todos los puntos
                    </button>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setPaso(1)}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
                    ← Atrás
                  </button>
                  <button
                    onClick={crear}
                    disabled={loading}
                    className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                    {loading ? 'Creando...' : puntos.length > 1 ? 'Crear ruta con recorrido' : 'Crear ruta sin recorrido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
