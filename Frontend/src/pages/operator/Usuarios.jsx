import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

const ROLES = [
  { id: 1, label: 'Admin' },
  { id: 2, label: 'Operador' },
  { id: 3, label: 'Conductor' },
  { id: 4, label: 'Usuario' },
]

const ROL_COLOR = {
  admin:     'bg-red-100 text-red-700',
  operador:  'bg-purple-100 text-purple-700',
  conductor: 'bg-blue-100 text-blue-700',
  usuario:   'bg-gray-100 text-gray-600',
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [error,    setError]    = useState('')
  const [loadingBtn, setLoadingBtn] = useState(false)
  const [form, setForm] = useState({ nombre:'', apellidos:'', email:'', telefono:'', password:'', rol_id: 3 })

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/usuarios')
      setUsuarios(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const crear = async e => {
    e.preventDefault()
    setError('')
    setLoadingBtn(true)
    try {
      await api.post('/auth/usuarios', form)
      setModal(false)
      setForm({ nombre:'', apellidos:'', email:'', telefono:'', password:'', rol_id: 3 })
      cargar()
    } catch(err) {
      setError(err.response?.data?.error || 'Error al crear usuario')
    } finally { setLoadingBtn(false) }
  }

  const cambiarRol = async (id, rol_id) => {
    try {
      await api.patch(`/auth/usuarios/${id}/rol`, { rol_id: Number(rol_id) })
      cargar()
    } catch {}
  }

  const toggleActivo = async (id, activo) => {
    if (!confirm(`¿${activo ? 'Activar' : 'Desactivar'} este usuario?`)) return
    try {
      await api.patch(`/auth/usuarios/${id}/activo`, { activo })
      cargar()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          </div>
          <button onClick={() => setModal(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
            + Nuevo usuario
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.nombre} {u.apellidos}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.telefono || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol_id}
                        onChange={e => cambiarRol(u.id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${ROL_COLOR[u.rol] || 'bg-gray-100'}`}
                      >
                        {ROLES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                                            {u.es_estudiante ? <span className="ml-1 text-xs">🎓</span> : null}

                    </td>
                    <td className="px-4 py-3">
                      {u.activo
                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">Activo</span>
                        : <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">Inactivo</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActivo(u.id, !u.activo)}
                        className={`text-xs font-medium ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!usuarios.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo usuario */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Nuevo usuario</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={crear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nombre *" required value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Apellidos" value={form.apellidos}
                  onChange={e => setForm({...form, apellidos: e.target.value})}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <input placeholder="Email *" type="email" required value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Teléfono" value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Contraseña *" type="password" required value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Rol *</label>
                <select value={form.rol_id} onChange={e => setForm({...form, rol_id: Number(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModal(false); setError('') }}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingBtn}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                  {loadingBtn ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
