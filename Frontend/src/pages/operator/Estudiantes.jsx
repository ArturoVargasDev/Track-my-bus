import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState('pendiente')
  const [modalCred,   setModalCred]   = useState(null) // estudiante seleccionado para ver credencial
  const [toast,       setToast]       = useState('')

  const mostrarToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/estudiantes')
      setEstudiantes(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const validar = async (id, valida, cerrarModal = false) => {
    const accion = valida ? 'aprobar' : 'rechazar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} esta credencial?`)) return
    try {
      await api.patch(`/auth/credencial/${id}`, { valida })
      if (cerrarModal) setModalCred(null)
      mostrarToast(`Credencial ${valida ? 'aprobada' : 'rechazada'} correctamente`)
      cargar()
    } catch {}
  }

  const filtrados = estudiantes.filter(e => {
    if (filtro === 'pendiente') return e.es_estudiante && !e.credencial_valida
    if (filtro === 'aprobado')  return e.es_estudiante && e.credencial_valida
    return e.es_estudiante
  })

  // Determina si la URL es una imagen
  const esImagen = url => url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)

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
            <h1 className="text-2xl font-bold text-gray-800">Estudiantes</h1>
            <span className="text-sm text-gray-400">({filtrados.length})</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'aprobado',  label: 'Aprobados' },
              { value: 'todos',     label: 'Todos' },
            ].map(f => (
              <button key={f.value} onClick={() => setFiltro(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border
                  ${filtro === f.value
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            No hay estudiantes {filtro === 'pendiente' ? 'pendientes de validacion' : filtro === 'aprobado' ? 'aprobados' : ''}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Telefono</th>
                  <th className="px-4 py-3 text-left">Credencial</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.nombre} {e.apellidos}</td>
                    <td className="px-4 py-3 text-gray-500">{e.email}</td>
                    <td className="px-4 py-3 text-gray-500">{e.telefono || '—'}</td>
                    <td className="px-4 py-3">
                      {e.credencial_url ? (
                        <button onClick={() => setModalCred(e)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium underline">
                          Ver credencial
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">Sin credencial</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.credencial_valida
                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">Aprobado</span>
                        : <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold">Pendiente</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!e.credencial_valida ? (
                        <div className="flex gap-2">
                          <button onClick={() => validar(e.id, true)}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                            Aprobar
                          </button>
                          <button onClick={() => validar(e.id, false)}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 transition">
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => validar(e.id, false)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ver credencial */}
      {modalCred && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Credencial estudiantil</h2>
                <p className="text-sm text-gray-500">{modalCred.nombre} {modalCred.apellidos}</p>
                <p className="text-xs text-gray-400">{modalCred.email}</p>
              </div>
              <button onClick={() => setModalCred(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>

            {/* Vista previa de la credencial */}
            <div className="border rounded-xl overflow-hidden bg-gray-50 min-h-48 flex items-center justify-center">
              {esImagen(modalCred.credencial_url) ? (
                <img src={modalCred.credencial_url} alt="Credencial"
                  className="max-w-full max-h-80 object-contain" />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <p className="text-gray-500 text-sm">No se puede previsualizar este archivo</p>
                  <a href={modalCred.credencial_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
                    Abrir enlace
                  </a>
                </div>
              )}
            </div>

            {esImagen(modalCred.credencial_url) && (
              <a href={modalCred.credencial_url} target="_blank" rel="noopener noreferrer"
                className="block text-center text-xs text-blue-600 hover:underline">
                Abrir en nueva pestana
              </a>
            )}

            {/* Acciones desde el modal */}
            {!modalCred.credencial_valida ? (
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalCred(null)}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={() => validar(modalCred.id, false, true)}
                  className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-600 transition">
                  Rechazar
                </button>
                <button onClick={() => validar(modalCred.id, true, true)}
                  className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-700 transition">
                  Aprobar
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalCred(null)}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                  Cerrar
                </button>
                <button onClick={() => validar(modalCred.id, false, true)}
                  className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-600 transition">
                  Revocar aprobacion
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
