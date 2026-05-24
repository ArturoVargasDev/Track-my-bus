import { useEffect, useState, useMemo } from 'react'
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

const POR_PAGINA = 10

function exportarCSV(usuarios) {
  const cabecera = ['ID', 'Nombre', 'Apellidos', 'Email', 'Telefono', 'Rol', 'Estado', 'Estudiante']
  const filas = usuarios.map(u => [
    u.id, u.nombre, u.apellidos || '', u.email,
    u.telefono || '', u.rol, u.activo ? 'Activo' : 'Inactivo',
    u.es_estudiante ? 'Si' : 'No',
  ])
  const csv = [cabecera, ...filas].map(f => f.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href     = URL.createObjectURL(blob)
  link.download = `usuarios-${new Date().toISOString().slice(0,10)}.csv`
  link.click()
}

function ordenar(lista, campo, dir) {
  return [...lista].sort((a, b) => {
    const va = (a[campo] ?? '').toString().toLowerCase()
    const vb = (b[campo] ?? '').toString().toLowerCase()
    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })
}

export default function Usuarios() {
  const [usuarios,    setUsuarios]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [modalEditar, setModalEditar] = useState(null)   // usuario a editar
  const [modalRol,    setModalRol]    = useState(null)   // { usuario, nuevoRol }
  const [toast,       setToast]       = useState('')
  const [error,       setError]       = useState('')
  const [loadingBtn,  setLoadingBtn]  = useState(false)
  const [form, setForm] = useState({
    nombre: '', apellidos: '', email: '', telefono: '', password: '', rol_id: 3,
  })

  const [busqueda,     setBusqueda]     = useState('')
  const [filtroRol,    setFiltroRol]    = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pagina,       setPagina]       = useState(1)
  const [orden,        setOrden]        = useState({ campo: 'nombre', dir: 'asc' })

  const mostrarToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/usuarios')
      setUsuarios(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])
  useEffect(() => { setPagina(1) }, [busqueda, filtroRol, filtroEstado, orden])

  const toggleOrden = campo => {
    setOrden(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: 'asc' }
    )
  }

  const icono = campo => orden.campo === campo ? (orden.dir === 'asc' ? ' ↑' : ' ↓') : ''

  const usuariosFiltrados = useMemo(() => {
    const filtrados = usuarios.filter(u => {
      const texto = `${u.nombre} ${u.apellidos || ''} ${u.email} ${u.telefono || ''}`.toLowerCase()
      if (busqueda && !texto.includes(busqueda.toLowerCase())) return false
      if (filtroRol !== 'todos' && String(u.rol_id) !== filtroRol) return false
      if (filtroEstado === 'activo'   && !u.activo) return false
      if (filtroEstado === 'inactivo' &&  u.activo) return false
      return true
    })
    return ordenar(filtrados, orden.campo, orden.dir)
  }, [usuarios, busqueda, filtroRol, filtroEstado, orden])

  const totalPaginas   = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA))
  const usuariosPagina = usuariosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const crear = async e => {
    e.preventDefault(); setError(''); setLoadingBtn(true)
    try {
      await api.post('/auth/usuarios', form)
      setModal(false)
      setForm({ nombre: '', apellidos: '', email: '', telefono: '', password: '', rol_id: 3 })
      await cargar()
      mostrarToast('Usuario creado correctamente')
    } catch(err) {
      setError(err.response?.data?.error || 'Error al crear usuario')
    } finally { setLoadingBtn(false) }
  }

  const guardarEdicion = async e => {
    e.preventDefault(); setError(''); setLoadingBtn(true)
    try {
      await api.patch(`/auth/usuarios/${modalEditar.id}`, {
        nombre:    modalEditar.nombre,
        apellidos: modalEditar.apellidos,
        email:     modalEditar.email,
        telefono:  modalEditar.telefono,
      })
      setModalEditar(null)
      await cargar()
      mostrarToast('Usuario actualizado correctamente')
    } catch(err) {
      setError(err.response?.data?.error || 'Error al actualizar usuario')
    } finally { setLoadingBtn(false) }
  }

  const confirmarCambioRol = async () => {
    if (!modalRol) return
    try {
      await api.patch(`/auth/usuarios/${modalRol.usuario.id}/rol`, { rol_id: Number(modalRol.nuevoRol) })
      setModalRol(null)
      await cargar()
      mostrarToast('Rol actualizado')
    } catch {}
  }

  const toggleActivo = async (id, activo) => {
    try {
      await api.patch(`/auth/usuarios/${id}/activo`, { activo })
      await cargar()
      mostrarToast(`Usuario ${activo ? 'activado' : 'desactivado'}`)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Toast de confirmacion */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
            <span className="text-sm text-gray-400">({usuariosFiltrados.length})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportarCSV(usuariosFiltrados)}
              className="border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
              Exportar CSV
            </button>
            <button onClick={() => setModal(true)}
              className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
              + Nuevo usuario
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar por nombre, email o telefono..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todos los roles</option>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          {(busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos') && (
            <button onClick={() => { setBusqueda(''); setFiltroRol('todos'); setFiltroEstado('todos') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {[['nombre','Nombre'],['email','Email'],['telefono','Telefono'],['rol','Rol']].map(([c,l]) => (
                      <th key={c} onClick={() => toggleOrden(c)}
                        className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 select-none">
                        {l}{icono(c)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuariosPagina.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {u.nombre} {u.apellidos}
                        {u.es_estudiante && <span className="ml-1 text-xs text-blue-500 font-medium">Est.</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.telefono || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.rol_id}
                          onChange={e => setModalRol({ usuario: u, nuevoRol: e.target.value })}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${ROL_COLOR[u.rol] || 'bg-gray-100'}`}>
                          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {u.activo
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">Activo</span>
                          : <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">Inactivo</span>}
                      </td>
                      <td className="px-4 py-3 flex gap-3">
                        <button onClick={() => { setError(''); setModalEditar({...u}) }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Editar
                        </button>
                        <button onClick={() => toggleActivo(u.id, !u.activo)}
                          className={`text-xs font-medium ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!usuariosPagina.length && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos'
                        ? 'No se encontraron usuarios con esos filtros.'
                        : 'No hay usuarios registrados.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <p>Mostrando {((pagina-1)*POR_PAGINA)+1}–{Math.min(pagina*POR_PAGINA, usuariosFiltrados.length)} de {usuariosFiltrados.length}</p>
                <div className="flex gap-1">
                  <button disabled={pagina===1} onClick={() => setPagina(p=>p-1)}
                    className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Anterior</button>
                  {Array.from({length: totalPaginas},(_,i)=>i+1).map(n => (
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
          </>
        )}
      </div>

      {/* Modal crear usuario */}
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
              <input placeholder="Telefono" value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Contrasena *" type="password" required value={form.password}
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

      {/* Modal editar usuario */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Editar usuario</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={guardarEdicion} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nombre *" required value={modalEditar.nombre}
                  onChange={e => setModalEditar({...modalEditar, nombre: e.target.value})}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Apellidos" value={modalEditar.apellidos || ''}
                  onChange={e => setModalEditar({...modalEditar, apellidos: e.target.value})}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <input placeholder="Email *" type="email" required value={modalEditar.email}
                onChange={e => setModalEditar({...modalEditar, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Telefono" value={modalEditar.telefono || ''}
                onChange={e => setModalEditar({...modalEditar, telefono: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalEditar(null); setError('') }}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingBtn}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                  {loadingBtn ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmacion cambio de rol */}
      {modalRol && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
            <h2 className="text-lg font-bold text-gray-800">Confirmar cambio de rol</h2>
            <p className="text-sm text-gray-600">
              Cambiar el rol de <strong>{modalRol.usuario.nombre}</strong> a{' '}
              <strong>{ROLES.find(r => String(r.id) === String(modalRol.nuevoRol))?.label}</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalRol(null)}
                className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarCambioRol}
                className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
