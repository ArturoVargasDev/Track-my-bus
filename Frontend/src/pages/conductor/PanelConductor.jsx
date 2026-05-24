import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PING_MS = 2500;

const TIPOS_INCIDENCIA = [
  { value: "accidente", label: "Accidente" },
  { value: "trafico", label: "Trafico" },
  { value: "desvio", label: "Desvio" },
  { value: "averia", label: "Averia / Ponchadura" },
  { value: "otro", label: "Otro" },
];

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15);
  }, [lat, lng]);
  return null;
}

function formatTiempo(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Componente escaner QR usando html5-qrcode
function EscanerQR({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const scannerId = "qr-reader";
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          html5QrCode
            .stop()
            .then(() => onScan(decodedText))
            .catch(() => onScan(decodedText));
        },
        () => {},
      )
      .catch((err) => setError("No se pudo acceder a la camara: " + err));

    return () => {
      html5QrCode.isScanning && html5QrCode.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 text-center">
        Apunta la camara al codigo QR del boleto
      </p>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
      <button
        onClick={onClose}
        className="w-full border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50"
      >
        Cancelar
      </button>
    </div>
  );
}

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
  const [segundos, setSegundos] = useState(0);
  const [velProm, setVelProm] = useState(0);
  const velAcum = useRef({ suma: 0, count: 0 });

  const [modalQR, setModalQR] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [escaneados, setEscaneados] = useState([]);

  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState("");
  const [descripcionIncidencia, setDescripcionIncidencia] = useState("");
  const [loadingIncidencia, setLoadingIncidencia] = useState(false);
  const [incidenciaOk, setIncidenciaOk] = useState(false);

  const posRef = useRef(null);
  const intervalRef = useRef(null);
  const watchRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [u, r] = await Promise.all([
          api.get("/unidades"),
          api.get("/rutas"),
        ]);
        setUnidades(u.data);
        setRutas(r.data);
      } catch {}
    };
    cargar();
  }, []);

  const iniciarTurno = async () => {
    if (!unidad || !rutaSel) {
      setError("Selecciona una unidad y una ruta");
      return;
    }
    setError("");
    try {
      await api.post("/asignaciones", {
        unidad_id: unidad,
        conductor_id: usuario.id,
        ruta_id: rutaSel,
      });
      setActivo(true);
      setSegundos(0);
      velAcum.current = { suma: 0, count: 0 };

      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);

      navigator.geolocation.getCurrentPosition(
        (p) => {
          const np = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            vel: p.coords.speed || 0,
          };
          setPos(np);
          posRef.current = np;
        },
        (err) => setError("GPS: " + err.message),
        { enableHighAccuracy: true, timeout: 10000 },
      );

      watchRef.current = navigator.geolocation.watchPosition(
        (p) => {
          const np = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            vel: p.coords.speed || 0,
          };
          setPos(np);
          posRef.current = np;
          const kmh = (p.coords.speed || 0) * 3.6;
          velAcum.current.suma += kmh;
          velAcum.current.count += 1;
          setVelProm(velAcum.current.suma / velAcum.current.count);
        },
        (err) => setError("GPS: " + err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
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
          setError("Ping: " + (err.response?.data?.error || err.message));
        }
      }, PING_MS);
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar turno");
    }
  };

  const terminarTurno = async () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
    navigator.geolocation.clearWatch(watchRef.current);
    setActivo(false);
    setPings(0);
    setSegundos(0);
    posRef.current = null;
    try {
      const { data } = await api.get("/asignaciones?activo=true");
      const mia = data.find((a) => a.conductor_id === usuario.id);
      if (mia) await api.patch(`/asignaciones/${mia.id}/cerrar`);
    } catch {}
  };

  const verificarQR = async (qrData) => {
    setModalQR(false);
    setScanLoading(true);
    setScanResult(null);
    try {
      const parsed = JSON.parse(qrData);
      const { data } = await api.post("/boletos/validar", {
        qr_token: parsed.qr_token,
        firma: parsed.firma,
        unidad_id: unidad,
      });
      const resultado = {
        ok: true,
        mensaje: data.mensaje,
        boleto_id: data.boleto_id,
        hora: new Date(),
      };
      setScanResult(resultado);
      setEscaneados((prev) => [resultado, ...prev]);
    } catch (err) {
      const msg = err.response?.data?.error || "Error al verificar boleto";
      const resultado = { ok: false, mensaje: msg, hora: new Date() };
      setScanResult(resultado);
      setEscaneados((prev) => [resultado, ...prev]);
    } finally {
      setScanLoading(false);
    }
  };

  const reportarIncidencia = async () => {
    if (!tipoIncidencia) return;
    setLoadingIncidencia(true);
    try {
      await api.post("/incidencias", {
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
        setTipoIncidencia("");
        setDescripcionIncidencia("");
        setIncidenciaOk(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Error al reportar incidencia");
    } finally {
      setLoadingIncidencia(false);
    }
  };

  const rutaActiva = rutas.find((r) => String(r.id) === String(rutaSel));
  const unidadActiva = unidades.find((u) => String(u.id) === String(unidad));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-blue-700">Panel del Conductor</h1>

        {!activo ? (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Iniciar turno</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Unidad
              </label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar unidad...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.numero_economico} — {u.placa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Ruta
              </label>
              <select
                value={rutaSel}
                onChange={(e) => setRutaSel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar ruta...</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={iniciarTurno}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition"
            >
              Iniciar turno
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estado del turno */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-green-700 text-lg">Turno activo</p>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-mono">
                  {formatTiempo(segundos)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">Ruta</p>
                  <p className="font-semibold text-gray-700 truncate">
                    {rutaActiva?.nombre || "—"}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">Unidad</p>
                  <p className="font-semibold text-gray-700">
                    {unidadActiva?.numero_economico || "—"}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">Vel. prom.</p>
                  <p className="font-semibold text-blue-700">
                    {velProm.toFixed(1)} km/h
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">Pings GPS</p>
                  <p className="font-semibold text-gray-700">{pings}</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">Boletos escaneados</p>
                  <p className="font-semibold text-gray-700">
                    {escaneados.filter((e) => e.ok).length}
                  </p>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>

            {/* Mapa de posicion */}
            {pos && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">
                    Posicion actual
                  </h3>
                  <span className="text-xs text-blue-700 font-mono">
                    {(pos.vel * 3.6).toFixed(1)} km/h
                  </span>
                </div>
                <div className="h-52">
                  <MapContainer
                    center={[pos.lat, pos.lng]}
                    zoom={15}
                    className="w-full h-full z-0"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    <Marker position={[pos.lat, pos.lng]} />
                    <RecenterMap lat={pos.lat} lng={pos.lng} />
                  </MapContainer>
                </div>
                <div className="px-4 py-2 flex gap-4 text-xs text-gray-400 font-mono">
                  <span>Lat: {pos.lat.toFixed(6)}</span>
                  <span>Lng: {pos.lng.toFixed(6)}</span>
                </div>
              </div>
            )}

            {/* Resultado del ultimo escaneo */}
            {scanLoading && (
              <div className="bg-white rounded-2xl shadow p-4 text-center text-sm text-gray-500">
                Verificando boleto...
              </div>
            )}
            {scanResult && !scanLoading && (
              <div
                className={`rounded-2xl p-4 text-center space-y-1
                ${scanResult.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <p
                  className={`text-2xl font-bold ${scanResult.ok ? "text-green-700" : "text-red-600"}`}
                >
                  {scanResult.ok ? "Boleto valido" : "Boleto rechazado"}
                </p>
                <p className="text-sm text-gray-500">{scanResult.mensaje}</p>
                <button
                  onClick={() => setScanResult(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Escanear QR */}
            <button
              onClick={() => {
                setModalQR(true);
                setScanResult(null);
              }}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-800 transition"
            >
              Escanear boleto QR
            </button>

            {/* Historial de escaneos */}
            {escaneados.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-4 space-y-2">
                <h3 className="font-semibold text-gray-700 text-sm">
                  Historial de escaneos ({escaneados.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {escaneados.map((e, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs
                      ${e.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                    >
                      <span className="font-medium">
                        {e.ok ? "Valido" : "Rechazado"} — {e.mensaje}
                      </span>
                      <span className="text-gray-400 ml-2 shrink-0">
                        {e.hora.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setModalIncidencia(true)}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-orange-600 transition"
            >
              Reportar incidencia
            </button>

            <button
              onClick={terminarTurno}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition"
            >
              Terminar turno
            </button>
          </div>
        )}
      </div>

      {/* Modal escaner QR */}
      {modalQR && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Escanear boleto</h2>
            <EscanerQR onScan={verificarQR} onClose={() => setModalQR(false)} />
          </div>
        </div>
      )}

      {/* Modal incidencia */}
      {modalIncidencia && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Reportar incidencia
            </h2>
            {incidenciaOk ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-4xl">✓</p>
                <p className="font-semibold text-green-700">
                  Incidencia reportada correctamente
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Tipo de incidencia *
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {TIPOS_INCIDENCIA.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTipoIncidencia(t.value)}
                        className={`text-left px-4 py-2 rounded-lg border text-sm font-medium transition
                          ${
                            tipoIncidencia === t.value
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Descripcion (opcional)
                  </label>
                  <textarea
                    value={descripcionIncidencia}
                    onChange={(e) => setDescripcionIncidencia(e.target.value)}
                    placeholder="Describe lo que ocurrio..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalIncidencia(false);
                      setTipoIncidencia("");
                      setDescripcionIncidencia("");
                    }}
                    className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={reportarIncidencia}
                    disabled={!tipoIncidencia || loadingIncidencia}
                    className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition"
                  >
                    {loadingIncidencia ? "Reportando..." : "Reportar"}
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
