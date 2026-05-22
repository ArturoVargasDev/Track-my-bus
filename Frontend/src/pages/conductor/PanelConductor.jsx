import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const PING_MS = 2500;

const TIPOS_INCIDENCIA = [
  { value: 'accidente',  label: '🚨 Accidente' },
  { value: 'trafico',    label: '🚦 Tráfico' },
  { value: 'desvio',     label: '🔀 Desvío' },
  { value: 'averia',     label: '🔧 Avería / Ponchadura' },
  { value: 'otro',       label: '📋 Otro' },
]

export default function PanelConductor() {
  const { usuario } = useAuth();
  const [activo, setActivo] = useState(false);
  const [unidad, setUnidad] = useState("");
  const [unidades, setUnidades] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [rutaSel, setRutaSel] = useState("");
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");
  const [pings, setPings] = useState(0);

  // Incidencias
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState('');
  const [descripcionIncidencia, setDescripcionIncidencia] = useState('');
  const [loadingIncidencia, setLoadingIncidencia] = useState(false);
  const [incidenciaOk, setIncidenciaOk] = useState(false);

  const posRef = useRef(null);
  const intervalRef = useRef(null);
  const watchRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [u, r] = await Promise.all([api.get("/unidades"), api.get("/rutas")]);
        setUnidades(u.data);
        setRutas(r.data);
      } catch {}
    };
    cargar();
  }, []);

  const iniciarTurno = async () => {
    if (!unidad || !rutaSel) { setError("Selecciona una unidad y una ruta"); return; }
    setError("");
    try {
      await api.post("/asignaciones", { unidad_id: unidad, conductor_id: usuario.id, ruta_id: rutaSel });
      setActivo(true);

      navigator.geolocation.getCurrentPosition(
        (p) => {
          const nuevaPos = { lat: p.coords.latitude, lng: p.coords.longitude, vel: p.coords.speed || 0 };
          setPos(nuevaPos); posRef.current = nuevaPos;
        },
        (err) => setError("GPS error: " + err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      watchRef.current = navigator.geolocation.watchPosition(
        (p) => {
          const nuevaPos = { lat: p.coords.latitude, lng: p.coords.longitude, vel: p.coords.speed || 0 };
          setPos(nuevaPos); posRef.current = nuevaPos;
        },
        (err) => setError("GPS error: " + err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      intervalRef.current = setInterval(async () => {
        if (!posRef.current) return;
        try {
          await api.post("/gps/ping", {
            unidad_id: unidad,
            latitud: posRef.current.lat,
            longitud: posRef.current.lng,
            velocidad_kmh: posRef.current.vel * 3.6,
            conductor_activo: true,
          });
          setPings((p) => p + 1);
        } catch (err) {
          setError("Ping error: " + (err.response?.data?.error || err.message));
        }
      }, PING_MS);
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar turno");
    }
  };

  const terminarTurno = async () => {
    clearInterval(intervalRef.current);
    navigator.geolocation.clearWatch(watchRef.current);
    setActivo(false); setPings(0); posRef.current = null;
    try {
      const { data } = await api.get("/asignaciones?activo=true");
      const mia = data.find((a) => a.conductor_id === usuario.id);
      if (mia) await api.patch(`/asignaciones/${mia.id}/cerrar`);
    } catch {}
  };

  const reportarIncidencia = async () => {
    if (!tipoIncidencia) return;
    setLoadingIncidencia(true);
    try {
      await api.post('/incidencias', {
        unidad_id: unidad,
        ruta_id: rutaSel,
        tipo: tipoIncidencia,
        descripcion: descripcionIncidencia,
        latitud: posRef.current?.lat || null,
        longitud: posRef.current?.lng || null,
      });
      setIncidenciaOk(true);
      setTimeout(() => {
        setModalIncidencia(false);
        setTipoIncidencia('');
        setDescripcionIncidencia('');
        setIncidenciaOk(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reportar incidencia');
    } finally {
      setLoadingIncidencia(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-blue-700">Panel del Conductor</h1>

        {!activo ? (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Iniciar turno</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Unidad</label>
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar unidad...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>{u.numero_economico} — {u.placa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ruta</label>
              <select value={rutaSel} onChange={(e) => setRutaSel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar ruta...</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button onClick={iniciarTurno}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition">
              Iniciar turno
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <p className="font-bold text-green-700 text-lg">Turno activo</p>
              <p className="text-sm text-green-600 mt-1">{pings} pings enviados</p>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>

            {pos && (
              <div className="bg-white rounded-2xl shadow p-4 space-y-2">
                <h3 className="font-semibold text-gray-700">Posición actual</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Latitud</p>
                    <p className="font-mono font-bold">{pos.lat.toFixed(6)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Longitud</p>
                    <p className="font-mono font-bold">{pos.lng.toFixed(6)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-gray-500">Velocidad</p>
                    <p className="font-bold text-blue-700">{(pos.vel * 3.6).toFixed(1)} km/h</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón reportar incidencia */}
            <button onClick={() => setModalIncidencia(true)}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-orange-600 transition flex items-center justify-center gap-2">
              ⚠️ Reportar incidencia
            </button>

            <button onClick={terminarTurno}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition">
              Terminar turno
            </button>
          </div>
        )}
      </div>

      {/* Modal incidencia */}
      {modalIncidencia && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">⚠️ Reportar incidencia</h2>

            {incidenciaOk ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-semibold text-green-700">Incidencia reportada correctamente</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de incidencia *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {TIPOS_INCIDENCIA.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => setTipoIncidencia(t.value)}
                        className={`text-left px-4 py-2 rounded-lg border text-sm font-medium transition
                          ${tipoIncidencia === t.value
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={descripcionIncidencia}
                    onChange={e => setDescripcionIncidencia(e.target.value)}
                    placeholder="Describe lo que ocurrió..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setModalIncidencia(false); setTipoIncidencia(''); setDescripcionIncidencia(''); }}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button type="button" onClick={reportarIncidencia}
                    disabled={!tipoIncidencia || loadingIncidencia}
                    className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition">
                    {loadingIncidencia ? 'Reportando...' : 'Reportar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
