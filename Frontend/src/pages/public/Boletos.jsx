import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toPng } from "html-to-image";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_STYLE = {
  style: {
    base: { fontSize: '14px', color: '#374151', '::placeholder': { color: '#9CA3AF' } },
    invalid: { color: '#EF4444' },
  },
};

const ESTADO_COLOR = {
  pagado:   "bg-green-100 text-green-700",
  usado:    "bg-gray-100 text-gray-500",
  expirado: "bg-red-100 text-red-600",
  cancelado:"bg-red-100 text-red-600",
};

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatFechaHora(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function tiempoRestante(isoFecha) {
  const diff = new Date(isoFecha) - new Date();
  if (diff <= 0) return 'Expirado';
  const dias  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0)  return `${dias} dia${dias > 1 ? 's' : ''}, ${horas} h`;
  if (horas > 0) return `${horas} h, ${mins} min`;
  return `${mins} min`;
}

function ContadorExpiracion({ validoHasta }) {
  const [texto, setTexto] = useState(() => tiempoRestante(validoHasta));
  useEffect(() => {
    const intervalo = setInterval(() => setTexto(tiempoRestante(validoHasta)), 60 * 1000);
    return () => clearInterval(intervalo);
  }, [validoHasta]);
  const diff        = new Date(validoHasta) - new Date();
  const pocasTiempo = diff > 0 && diff < 24 * 60 * 60 * 1000;
  if (texto === 'Expirado') return null;
  return (
    <p className={`text-xs font-medium mt-0.5 ${pocasTiempo ? 'text-red-500' : 'text-gray-400'}`}>
      {pocasTiempo ? 'Expira en: ' : 'Vigente: '}{texto}
    </p>
  );
}

function HistorialUso({ boleto }) {
  if (boleto.estado !== 'usado' || !boleto.usado_at) return null;
  return (
    <div className="mt-1 text-xs text-gray-400 space-y-0.5">
      <p>Usado: {formatFechaHora(boleto.usado_at)}</p>
      {boleto.unidad_numero && <p>Unidad: {boleto.unidad_numero} — {boleto.unidad_placa}</p>}
    </div>
  );
}

function AvisoExpiracion({ boletos }) {
  const proximos = boletos.filter(b => {
    if (b.estado !== 'pagado') return false;
    const diff = new Date(b.valido_hasta) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  });
  if (!proximos.length) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
      <p className="font-semibold mb-1">Boletos por expirar</p>
      {proximos.map(b => (
        <p key={b.id} className="text-xs">{b.ruta} — expira en {tiempoRestante(b.valido_hasta)}</p>
      ))}
    </div>
  );
}

function FormularioPago({ ruta, onSuccess, onCancel }) {
  const stripe    = useStripe();
  const elements  = useElements();
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(''); setLoading(true);
    try {
      const { data: intentData } = await api.post('/pagos/create-payment-intent', {
        monto: ruta.precio, ruta_nombre: ruta.nombre,
      });
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: { card: elements.getElement(CardElement) } }
      );
      if (stripeError) { setError(stripeError.message); return; }
      if (paymentIntent.status === 'succeeded') {
        const ahora = new Date();
        const unMes = new Date();
        unMes.setMonth(unMes.getMonth() + 1);
        await api.post('/boletos/comprar', {
          ruta_id:      ruta.id,
          valido_desde: ahora.toISOString(),
          valido_hasta: unMes.toISOString(),
          precio:       ruta.precio,
        });
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">
        Ruta: {ruta.nombre} — Total: ${ruta.precio} MXN
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Datos de tarjeta</label>
        <div className="border border-gray-300 rounded-lg px-3 py-3">
          <CardElement options={CARD_STYLE} />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Prueba: <span className="font-mono">4242 4242 4242 4242</span>, cualquier fecha futura y CVC
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">Atras</button>
        <button type="submit" disabled={!stripe || loading}
          className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
          {loading ? 'Procesando...' : `Pagar $${ruta.precio} MXN`}
        </button>
      </div>
    </form>
  );
}

function ModalQR({ boleto, onClose }) {
  const qrRef                         = useRef(null);
  const [qrData,      setQrData]      = useState(null);
  const [loadingQr,   setLoadingQr]   = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error,       setError]       = useState('');

  // Obtener qr_data con firma ECDSA fresca del backend
  useEffect(() => {
    api.get(`/boletos/${boleto.id}/qr`)
      .then(({ data }) => setQrData(data.qr_data))
      .catch(() => setError('No se pudo obtener el QR. Intenta de nuevo.'))
      .finally(() => setLoadingQr(false));
  }, [boleto.id]);

  const descargarQR = async () => {
    if (!qrRef.current) return;
    setDescargando(true); setError('');
    try {
      const dataUrl = await toPng(qrRef.current, { cacheBust: true, pixelRatio: 2 });
      const link    = document.createElement('a');
      link.download = `boleto-${boleto.id}-${boleto.ruta.replace(/\s+/g, '-')}.png`;
      link.href     = dataUrl;
      link.click();
    } catch {
      setError('No se pudo generar la imagen. Intenta de nuevo.');
    } finally { setDescargando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
        <h2 className="text-lg font-bold text-gray-800">Boleto QR</h2>
        <p className="text-sm text-gray-500 font-medium">{boleto.ruta}</p>

        {loadingQr ? (
          <div className="py-8 text-gray-400 text-sm">Cargando QR...</div>
        ) : error ? (
          <div className="py-4 text-red-500 text-sm">{error}</div>
        ) : (
          <div ref={qrRef}
            className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
            <QRCodeSVG value={qrData} size={200} />
            <div className="text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-700">{boleto.ruta}</p>
              <p>Valido: {formatFecha(boleto.valido_desde)} — {formatFecha(boleto.valido_hasta)}</p>
              <p className="font-mono text-gray-300 text-[10px] break-all">{boleto.qr_token}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50 transition">
            Cerrar
          </button>
          {qrData && (
            <button onClick={descargarQR} disabled={descargando}
              className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
              {descargando ? 'Generando...' : 'Descargar PNG'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalCompra({ rutas, onClose, onSuccess }) {
  const [paso,        setPaso]        = useState(1);
  const [rutaSel,     setRutaSel]     = useState(null);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [errorCompra, setErrorCompra] = useState('');

  const handleExito = () => { setPagoExitoso(true); onSuccess(); setTimeout(() => onClose(), 2500); };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        {pagoExitoso ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-5xl">✓</p>
            <p className="font-semibold text-green-700 text-lg">Pago exitoso</p>
            <p className="text-sm text-gray-500">Tu boleto ha sido generado correctamente.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Comprar boleto estudiantil</h2>
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${paso===1?'bg-blue-700 text-white':'bg-gray-100 text-gray-400'}`}>1. Ruta</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${paso===2?'bg-blue-700 text-white':'bg-gray-100 text-gray-400'}`}>2. Pago</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">El boleto tendra validez de <strong>1 mes</strong> a partir de hoy.</p>
            {errorCompra && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errorCompra}</p>}
            {paso === 1 && (
              <div className="space-y-3">
                <select value={rutaSel?.id || ''} onChange={e => { setErrorCompra(''); setRutaSel(rutas.find(r => r.id === parseInt(e.target.value)) || null); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar ruta</option>
                  {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre} — ${r.precio} MXN</option>)}
                </select>
                {rutaSel && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 space-y-0.5">
                    <p className="font-medium">{rutaSel.nombre}</p>
                    <p>Precio: <strong>${rutaSel.precio} MXN</strong></p>
                    {rutaSel.tipo && <p className="capitalize text-blue-500">{rutaSel.tipo}</p>}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">Cancelar</button>
                  <button disabled={!rutaSel} onClick={() => setPaso(2)}
                    className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            )}
            {paso === 2 && rutaSel && (
              <Elements stripe={stripePromise}>
                <FormularioPago ruta={rutaSel} onSuccess={handleExito} onCancel={() => setPaso(1)} />
              </Elements>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Boletos() {
  const { usuario } = useAuth();
  const [boletos,     setBoletos]     = useState([]);
  const [rutas,       setRutas]       = useState([]);
  const [modalCompra, setModalCompra] = useState(false);
  const [boletoQR,    setBoletoQR]    = useState(null);
  const [filtro,      setFiltro]      = useState('todos');
  const [cargando,    setCargando]    = useState(true);

  const cargar = async () => {
    try {
      const [b, r] = await Promise.all([api.get('/boletos/mis-boletos'), api.get('/rutas')]);
      setBoletos(b.data); setRutas(r.data);
    } catch (err) { console.error('Error al cargar datos:', err); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const puedeComprar     = usuario?.es_estudiante && usuario?.credencial_valida;
  const boletosFiltrados = filtro === 'todos' ? boletos : boletos.filter(b => b.estado === filtro);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700">Mis boletos</h1>
          {puedeComprar && (
            <button onClick={() => setModalCompra(true)}
              className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
              + Comprar boleto
            </button>
          )}
        </div>

        {!puedeComprar && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
            {!usuario?.es_estudiante
              ? 'Solo estudiantes pueden comprar boletos con descuento.'
              : 'Tu credencial estudiantil esta pendiente de validacion por un administrador.'}
          </div>
        )}

        <AvisoExpiracion boletos={boletos} />

        {boletos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {['todos','pagado','usado','expirado'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition
                  ${filtro===f ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {cargando ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : boletosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            {filtro === 'todos' ? 'No tienes boletos aun.' : `No tienes boletos con estado "${filtro}".`}
          </div>
        ) : (
          <div className="space-y-3">
            {boletosFiltrados.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{b.ruta}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatFecha(b.valido_desde)} — {formatFecha(b.valido_hasta)}</p>
                  {b.estado === 'pagado' && <ContadorExpiracion validoHasta={b.valido_hasta} />}
                  <HistorialUso boleto={b} />
                  <p className="text-xs text-gray-400 mt-0.5">${b.precio} MXN</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[b.estado]}`}>{b.estado}</span>
                  {b.estado === 'pagado' && (
                    <button onClick={() => setBoletoQR(b)} className="text-blue-700 text-xs font-semibold hover:underline">
                      Ver QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalCompra && <ModalCompra rutas={rutas} onClose={() => setModalCompra(false)} onSuccess={cargar} />}
      {boletoQR && <ModalQR boleto={boletoQR} onClose={() => setBoletoQR(null)} />}
    </div>
  );
}
