import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const COLOR_MAP = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  green: "bg-green-50 text-green-700 border-green-100",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
};

const PRIORIDAD_COLOR = {
  critica: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-gray-100 text-gray-500",
};

const PIE_COLORS = ["#2563EB", "#DC2626", "#16A34A", "#D97706", "#7C3AED"];

const TIPO_LABEL = {
  accidente: "Accidente",
  trafico: "Trafico",
  desvio: "Desvio",
  averia: "Averia",
  otro: "Otro",
};

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [boletosDia, setBoletosDia] = useState([]);
  const [incTipo, setIncTipo] = useState([]);
  const [retrasos, setRetrasos] = useState([]);
  const [mantenimiento, setMantenimiento] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/resumen"),
      api.get("/analytics/boletos-por-dia"),
      api.get("/analytics/incidencias-por-tipo"),
      api.get("/analytics/top-retrasos"),
      api.get("/analytics/mantenimiento-pendiente"),
    ])
      .then(([r, b, i, ret, mant]) => {
        setResumen(r.data);
        setBoletosDia(
          b.data.map((d) => ({ ...d, fecha: formatFecha(d.fecha) })),
        );
        setIncTipo(
          i.data.map((d) => ({ ...d, name: TIPO_LABEL[d.tipo] || d.tipo })),
        );
        setRetrasos(ret.data);
        setMantenimiento(mant.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = resumen
    ? [
        {
          label: "Unidades totales",
          value: resumen.unidades_totales,
          color: "blue",
        },
        {
          label: "Rutas activas",
          value: resumen.rutas_activas,
          color: "indigo",
        },
        {
          label: "Buses en ruta",
          value: resumen.unidades_en_ruta,
          color: "green",
        },
        {
          label: "Incidencias activas",
          value: resumen.incidencias_activas,
          color: "yellow",
        },
        { label: "Boletos hoy", value: resumen.boletos_hoy, color: "purple" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Cargando...</p>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {cards.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-2xl p-5 border flex flex-col items-center text-center ${COLOR_MAP[c.color]}`}
                >
                  <span className="text-3xl font-bold">{c.value ?? "—"}</span>
                  <span className="text-xs mt-1 opacity-75">{c.label}</span>
                </div>
              ))}
            </div>

            {/* Graficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Boletos por dia */}
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <h2 className="font-semibold text-gray-700">
                  Boletos emitidos — ultimos 7 dias
                </h2>
                {boletosDia.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">
                    Sin datos
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={boletosDia}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="total"
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                        name="Boletos"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Incidencias por tipo */}
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <h2 className="font-semibold text-gray-700">
                  Incidencias por tipo — ultimos 30 dias
                </h2>
                {incTipo.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">
                    Sin incidencias
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={incTipo}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {incTipo.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top retrasos y mantenimiento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top rutas con retrasos */}
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <h2 className="font-semibold text-gray-700">
                  Rutas con mas retrasos — ultimos 7 dias
                </h2>
                {retrasos.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    Sin datos de retrasos
                  </p>
                ) : (
                  <div className="space-y-2">
                    {retrasos.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {r.ruta}
                          </p>
                          <p className="text-xs text-gray-400">
                            {r.viajes} viajes completados
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-semibold text-red-600">
                            {Number(r.total_retraso).toFixed(1)} min
                          </p>
                          <p className="text-xs text-gray-400">
                            {r.num_retrasos} retrasos
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mantenimiento pendiente */}
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <h2 className="font-semibold text-gray-700">
                  Mantenimiento pendiente
                </h2>
                {mantenimiento.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    Sin ordenes pendientes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mantenimiento.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">
                            {m.numero_economico} — {m.placa}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {m.tipo}
                          </p>
                          {m.fecha_programada && (
                            <p className="text-xs text-gray-400">
                              Programado: {formatFecha(m.fecha_programada)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`ml-3 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDAD_COLOR[m.prioridad]}`}
                        >
                          {m.prioridad}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Navegacion rapida */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  to: "/dashboard/rutas",
                  label: "Gestionar rutas",
                  desc: "Crear y editar rutas",
                },
                {
                  to: "/dashboard/unidades",
                  label: "Gestionar unidades",
                  desc: "Flota de autobuses",
                },
                {
                  to: "/dashboard/mantenimiento",
                  label: "Mantenimiento",
                  desc: "Ordenes y alertas",
                },
                {
                  to: "/dashboard/incidencias",
                  label: "Incidencias",
                  desc: "Ver y resolver incidencias",
                },
                {
                  to: "/dashboard/horarios",
                  label: "Horarios",
                  desc: "Gestionar horarios de rutas",
                },
                {
                  to: "/dashboard/estudiantes",
                  label: "Estudiantes",
                  desc: "Validar credenciales",
                },
                {
                  to: "/dashboard/usuarios",
                  label: "Usuarios",
                  desc: "Gestionar usuarios y roles",
                },
                {
                  to: "/dashboard/empresas",
                  label: "Empresas",
                  desc: "Gestionar empresas de transporte",
                },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition"
                >
                  <p className="font-semibold text-gray-800">{item.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
