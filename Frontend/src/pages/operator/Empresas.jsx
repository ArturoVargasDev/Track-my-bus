import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function Empresas() {
  const [empresas,    setEmpresas]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [form,        setForm]        = useState({ nombre: '', rfc: '', telefono: '', email: '', logo_url: '' })
  const [error,       setError]       = useState('')
  const [loading2,    setLoading2]    = useState(false)
  const [toast,       setToast]       = useState('')
  const [busqueda,    setBusqueda]    = useState('')

  const mostrarToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/empresas')
      setEmpresas(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const empresasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return empresas
    return empresas.filter(e =>
      `${e.nombre} ${e.rfc || ''} ${e.email || ''}`.toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [empresas, busqueda])

  const crear = async e => {
    e.preventDefault()
    setError(''); setLoading2(true)
    try {
      await api.post('/empresas', form)
      setModal(false)
      setForm({ nombre: '', rfc: '', telefono: '', email: '', logo_url: '' })
      await cargar()
      mostrarToast('Empresa creada correctamente')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear empresa')
    } finally { setLoading2(false) }
  }

  const guardarEdicion = async e => {
    e.preventDefault()
    setError(''); setLoading2(true)
    try {
      await api.put(`/empresas/${modalEditar.id}`, {
        nombre:    modalEditar.nombre,
        rfc:       modalEditar.rfc,
        telefono:  modalEditar.telefono,
        email:     modalEditar.email,
        logo_url:  modalEditar.logo_url,
      })
      setModalEditar(null)
      await cargar()
      mostrarToast('Empresa actualizada correctamente')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar empresa')
    } finally { setLoading2(false) }
  }

  const desactivar = async (id, nombre) => {
    if (!confirm(`¿Desactivar la empresa "${nombre}"?`)) return
    try {
      await api.delete(`/empresas/${id}`)
      await cargar()
      mostrarToast('Empresa desactivada')
    } catch {}
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
            <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
            <span className="text-sm text-gray-400">({empresasFiltradas.length})</span>
          </div>
          <button onClick={() => { setError(''); setModal(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
            + Nueva empresa
          </button>
        </div>

        <input type="text" placeholder="Buscar por nombre, RFC o email..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : empresasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            No hay empresas registradas.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">RFC</th>
                  <th className="px-4 py-3 text-left">Telefono</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresasFiltradas.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{e.rfc || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.telefono || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.email || '—'}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => { setError(''); setModalEditar({ ...e }) }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Editar
                      </button>
                      <button onClick={() => desactivar(e.id, e.nombre)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Nueva empresa</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={crear} className="space-y-3">
              {[
                ['nombre',   'Nombre *',  true,  'text'],
                ['rfc',      'RFC',       false, 'text'],
                ['telefono', 'Telefono',  false, 'tel'],
                ['email',    'Email',     false, 'email'],
                ['logo_url', 'URL Logo',  false, 'url'],
              ].map(([f, l, r, t]) => (
                <input key={f} placeholder={l} required={r} type={t}
                  value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading2}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {loading2 ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar empresa</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={guardarEdicion} className="space-y-3">
              {[
                ['nombre',   'Nombre *',  true,  'text'],
                ['rfc',      'RFC',       false, 'text'],
                ['telefono', 'Telefono',  false, 'tel'],
                ['email',    'Email',     false, 'email'],
                ['logo_url', 'URL Logo',  false, 'url'],
              ].map(([f, l, r, t]) => (
                <input key={f} placeholder={l} required={r} type={t}
                  value={modalEditar[f] || ''}
                  onChange={e => setModalEditar({...modalEditar, [f]: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalEditar(null); setError('') }}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading2}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {loading2 ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
