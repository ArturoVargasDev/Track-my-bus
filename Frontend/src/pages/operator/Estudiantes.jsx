import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState('pendiente') // pendiente | aprobado | rechazado

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/estudiantes')
      setEstudiantes(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const validar = async (id, valida) => {
    const accion = valida ? 'aprobar' : 'rechazar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} esta credencial?`)) return
    try {
      await api.patch(`/auth/credencial/${id}`, { valida })
      cargar()
    } catch {}
  }

  const filtrados = estudiantes.filter(e => {
    if (filtro === 'pendiente') return e.es_estudiante && !e.credencial_valida
    if (filtro === 'aprobado')  return e.es_estudiante && e.credencial_valida
    return e.es_estudiante
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Estudiantes</h1>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'pendiente', label: '⏳ Pendientes' },
              { value: 'aprobado',  label: '✅ Aprobados' },
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
            No hay estudiantes {filtro === 'pendiente' ? 'pendientes de validación' : filtro === 'aprobado' ? 'aprobados' : ''}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
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
                      {e.credencial_valida
                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">✅ Aprobado</span>
                        : <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold">⏳ Pendiente</span>
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
    </div>
  )
}
