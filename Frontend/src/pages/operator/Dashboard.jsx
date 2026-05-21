import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'

export default function Dashboard() {
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/resumen')
      .then(r => setResumen(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = resumen ? [
    { label: 'Unidades totales',    value: resumen.unidades_totales,    icon: '🚌', color: 'blue' },
    { label: 'Rutas activas',       value: resumen.rutas_activas,       icon: '🗺️',  color: 'indigo' },
    { label: 'Buses en ruta',       value: resumen.unidades_en_ruta,    icon: '📍', color: 'green' },
    { label: 'Incidencias activas', value: resumen.incidencias_activas, icon: '⚠️',  color: 'yellow' },
    { label: 'Boletos hoy',         value: resumen.boletos_hoy,         icon: '🎫', color: 'purple' },
  ] : []

  const colorMap = {
    blue:   'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map(c => (
              <div key={c.label} className={`rounded-2xl p-5 ${colorMap[c.color]} flex flex-col items-center text-center`}>
                <span className="text-3xl mb-2">{c.icon}</span>
                <span className="text-3xl font-bold">{c.value}</span>
                <span className="text-xs mt-1 opacity-75">{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navegación rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/dashboard/rutas',        icon: '🗺️',  label: 'Gestionar rutas',    desc: 'Crear y editar rutas' },
            { to: '/dashboard/unidades',      icon: '🚌', label: 'Gestionar unidades', desc: 'Flota de autobuses' },
            { to: '/dashboard/mantenimiento', icon: '🔧', label: 'Mantenimiento',      desc: 'Órdenes y alertas' },
            { to: '/dashboard/incidencias',   icon: '⚠️',  label: 'Incidencias',        desc: 'Ver y resolver incidencias' },
            { to: '/dashboard/horarios', icon: '🕐', label: 'Horarios', desc: 'Gestionar horarios de rutas' },
            { to: '/dashboard/estudiantes', icon: '🎓', label: 'Estudiantes', desc: 'Validar credenciales' },
            { to: '/dashboard/usuarios', icon: '👥', label: 'Usuarios', desc: 'Gestionar usuarios y roles' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition flex items-start gap-4">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
