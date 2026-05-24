import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COLIMA    = [19.2433, -103.7241]
const POR_PAGINA = 10

const TIPO_COLOR = {
  urbana:    'bg-blue-50 text-blue-700',
  suburbana: 'bg-purple-50 text-purple-700',
  foranea:   'bg-orange-50 text-orange-700',
}

function exportarCSV(rutas) {
  const cabecera = ['ID','Nombre','Clave','Tipo','Empresa','Zona','Precio','Accesible']
  const filas = rutas.map(r => [
    r.id, r.nombre, r.clave || '', r.tipo,
    r.empresa || '', r.zona || '', r.precio ?? '0.00',
    r.accesible ? 'Si' : 'No',
  ])
  const csv  = [cabecera, ...filas].map(f => f.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href     = URL.createObjectURL(blob)
  link.download = `rutas-${new Date().toISOString().slice(0,10)}.csv`
  link.click()
}

function ordenar(lista, campo, dir) {
  return [...lista].sort((a, b) => {
    const va = (a[campo] ?? '').toString().toLowerCase()
    const vb = (b[campo] ?? '').toString().toLowerCase()
    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng) } })
  return null
}

function MapaEditor({ puntos, setPuntos, colorHex }) {
  const mapRef     = useRef(null)
  const markersRef = useRef([])

  const handleMapClick = latlng =>
    setPuntos(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }])

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    puntos.forEach((p, i) => {
      const color = i === 0 ? '#16a34a' : i === puntos.length - 1 ? '#dc2626' : colorHex
      const circle = L.circleMarker([p.lat, p.lng], {
        radius: 6, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1,
      }).addTo(mapRef.current)
      circle.bindTooltip(`Punto ${i + 1}`, { permanent: false })
      markersRef.current.push(circle)
    })
  }, [puntos, colorHex])

  return (
    <MapContainer center={COLIMA} zoom={13} className="w-full h-full z-0" ref={mapRef}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <MapClickHandler onMapClick={handleMapClick} />
      {puntos.length > 1 && (
        <Polyline positions={puntos.map(p => [p.lat, p.lng])} color={colorHex || '#2563EB'} weight={4} />
      )}
    </MapContainer>
  )
}

export default function Rutas() {
  const [rutas,       setRutas]       = useState([])
  const [empresas,    setEmpresas]    = useState([])
  const [zonas,       setZonas]       = useState([])
  const [modal,       setModal]       = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [toast,       setToast]       = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [puntos,      setPuntos]      = useState([])
  const [paso,        setPaso]        = useState(1)
  const [form, setForm] = useState({
    nombre: '', clave: '', tipo: 'urbana', color_hex: '#2563EB',
    empresa_id: '', zona_id: '', precio: '', accesible: false,
  })

  // Filtros
  const [busqueda,      setBusqueda]      = useState('')
  const [filtroTipo,    setFiltroTipo]    = useState('todos')
  const [filtroEmpresa, setFiltroEmpresa] = useState('todos')
  const [pagina,        setPagina]        = useState(1)
  const [orden,         setOrden]         = useState({ campo: 'nombre', dir: 'asc' })

  const mostrarToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const cargar = async () => {
    const [r, e, z] = await Promise.all([api.get('/rutas'), api.get('/empresas'), api.get('/zonas')])
    setRutas(r.data); setEmpresas(e.data); setZonas(z.data)
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { setPagina(1) }, [busqueda, filtroTipo, filtroEmpresa, orden])

  const toggleOrden = campo => setOrden(o =>
    o.campo === campo ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: 'asc' }
  )
  const icono = campo => orden.campo === campo ? (orden.dir === 'asc' ? ' ↑' : ' ↓') : ''

  const rutasFiltradas = useMemo(() => {
    const filtradas = rutas.filter(r => {
      const texto = `${r.nombre} ${r.clave || ''} ${r.empresa || ''}`.toLowerCase()
      if (busqueda && !texto.includes(busqueda.toLowerCase())) return false
      if (filtroTipo    !== 'todos' && r.tipo !== filtroTipo) return false
      if (filtroEmpresa !== 'todos' && String(r.empresa_id) !== filtroEmpresa) return false
      return true
    })
    return ordenar(filtradas, orden.campo, orden.dir)
  }, [rutas, busqueda, filtroTipo, filtroEmpresa, orden])

  const totalPaginas = Math.max(1, Math.ceil(rutasFiltradas.length / POR_PAGINA))
  const rutasPagina  = rutasFiltradas.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA)
  const hayFiltros   = busqueda || filtroTipo !== 'todos' || filtroEmpresa !== 'todos'

  const abrirModal = () => {
    setModal(true); setPuntos([]); setPaso(1); setError('')
    setForm({ nombre:'', clave:'', tipo:'urbana', color_hex:'#2563EB', empresa_id:'', zona_id:'', precio:'', accesible: false })
  }

  const crear = async e => {
    if (e?.preventDefault) e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data: nuevaRuta } = await api.post('/rutas', form)
      if (puntos.length > 1 && nuevaRuta.id) {
        await api.put(`/rutas/${nuevaRuta.id}/polyline`, {
          puntos: puntos.map((p, i) => ({ orden: i+1, latitud: p.lat, longitud: p.lng }))
        }).catch(() => {})
      }
      setModal(false)
      await cargar()
      mostrarToast('Ruta creada correctamente')
    } catch(err) {
      setError(err.response?.data?.error || 'Error al crear ruta')
    } finally { setLoading(false) }
  }

  const guardarEdicion = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.patch(`/rutas/${modalEditar.id}`, {
        nombre:    modalEditar.nombre,
        clave:     modalEditar.clave,
        tipo:      modalEditar.tipo,
        color_hex: modalEditar.color_hex,
        precio:    modalEditar.precio,
        accesible: modalEditar.accesible,
      })
      setModalEditar(null)
      await cargar()
      mostrarToast('Ruta actualizada correctamente')
    } catch(err) {
      setError(err.response?.data?.error || 'Error al actualizar ruta')
    } finally { setLoading(false) }
  }

  const desactivar = async id => {
    if (!confirm('¿Desactivar esta ruta?')) return
    await api.delete(`/rutas/${id}`)
    await cargar()
    mostrarToast('Ruta desactivada')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Rutas</h1>
            <span className="text-sm text-gray-400">({rutasFiltradas.length})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportarCSV(rutasFiltradas)}
              className="border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
              Exportar CSV
            </button>
            <button onClick={abrirModal}
              className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
              + Nueva ruta
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar por nombre, clave o empresa..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todos los tipos</option>
            <option value="urbana">Urbana</option>
            <option value="suburbana">Suburbana</option>
            <option value="foranea">Foranea</option>
          </select>
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todas las empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {hayFiltros && (
            <button onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroEmpresa('todos') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {[['nombre','Nombre'],['clave','Clave'],['tipo','Tipo'],['empresa','Empresa'],['precio','Precio']].map(([c,l]) => (
                  <th key={c} onClick={() => toggleOrden(c)}
                    className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 select-none">
                    {l}{icono(c)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rutasPagina.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{r.clave || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[r.tipo] || 'bg-gray-100 text-gray-600'}`}>
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.empresa || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">${r.precio ?? '0.00'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block w-5 h-5 rounded-full border" style={{ background: r.color_hex }} />
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => { setError(''); setModalEditar({...r}) }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Editar
                    </button>
                    <button onClick={() => desactivar(r.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
              {!rutasPagina.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {hayFiltros ? 'No se encontraron rutas con esos filtros.' : 'No hay rutas registradas.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Mostrando {((pagina-1)*POR_PAGINA)+1}–{Math.min(pagina*POR_PAGINA, rutasFiltradas.length)} de {rutasFiltradas.length}</p>
            <div className="flex gap-1">
              <button disabled={pagina===1} onClick={() => setPagina(p=>p-1)}
                className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Anterior</button>
              {Array.from({length:totalPaginas},(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => setPagina(n)}
                  className={`px-3 py-1 rounded-lg border transition ${pagina===n?'bg-blue-700 text-white border-blue-700':'hover:bg-gray-50'}`}>
                  {n}
                </button>
              ))}
              <button disabled={pagina===totalPaginas} onClick={() => setPagina(p=>p+1)}
                className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal nueva ruta */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full ${paso === 2 ? 'max-w-4xl' : 'max-w-md'} p-6 space-y-4 transition-all`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Nueva ruta</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paso===1?'bg-blue-700 text-white':'bg-gray-100 text-gray-500'}`}>1. Datos</span>
                <span className="text-gray-300">→</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paso===2?'bg-blue-700 text-white':'bg-gray-100 text-gray-500'}`}>2. Trazar ruta</span>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

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
                  <option value="foranea">Foranea</option>
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
                    <input type="number" min="0" step="0.01" required placeholder="ej. 12.00"
                      value={form.precio} onChange={e => setForm({...form, precio: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color</label>
                    <input type="color" value={form.color_hex}
                      onChange={e => setForm({...form, color_hex: e.target.value})}
                      className="w-10 h-9 rounded cursor-pointer border" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.accesible}
                    onChange={e => setForm({...form, accesible: e.target.checked})}
                    className="w-4 h-4 accent-blue-700" />
                  Ruta accesible para personas con discapacidad
                </label>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setModal(false)}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">Cancelar</button>
                  <button type="submit"
                    className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 transition">
                    Siguiente → Trazar ruta
                  </button>
                </div>
              </form>
            )}

            {paso === 2 && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                  Haz clic en el mapa para agregar puntos al recorrido. El primer punto es verde y el ultimo rojo.
                </div>
                <div className="h-96 rounded-xl overflow-hidden border border-gray-200">
                  <MapaEditor puntos={puntos} setPuntos={setPuntos} colorHex={form.color_hex} />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{puntos.length} punto{puntos.length !== 1 ? 's' : ''} marcado{puntos.length !== 1 ? 's' : ''}</span>
                  {puntos.length > 0 && (
                    <button onClick={() => setPuntos([])} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Borrar todos los puntos
                    </button>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setPaso(1)}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">← Atras</button>
                  <button onClick={crear} disabled={loading}
                    className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                    {loading ? 'Creando...' : puntos.length > 1 ? 'Crear ruta con recorrido' : 'Crear ruta sin recorrido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal editar ruta */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Editar ruta</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={guardarEdicion} className="space-y-3">
              <input placeholder="Nombre *" required value={modalEditar.nombre}
                onChange={e => setModalEditar({...modalEditar, nombre: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Clave" value={modalEditar.clave || ''}
                onChange={e => setModalEditar({...modalEditar, clave: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={modalEditar.tipo} onChange={e => setModalEditar({...modalEditar, tipo: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="urbana">Urbana</option>
                <option value="suburbana">Suburbana</option>
                <option value="foranea">Foranea</option>
              </select>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Precio del boleto ($)</label>
                  <input type="number" min="0" step="0.01" value={modalEditar.precio || ''}
                    onChange={e => setModalEditar({...modalEditar, precio: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <input type="color" value={modalEditar.color_hex || '#2563EB'}
                    onChange={e => setModalEditar({...modalEditar, color_hex: e.target.value})}
                    className="w-10 h-9 rounded cursor-pointer border" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={modalEditar.accesible || false}
                  onChange={e => setModalEditar({...modalEditar, accesible: e.target.checked})}
                  className="w-4 h-4 accent-blue-700" />
                Ruta accesible para personas con discapacidad
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalEditar(null); setError('') }}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
