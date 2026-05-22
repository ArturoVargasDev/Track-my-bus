import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      color: '#374151',
      '::placeholder': { color: '#9CA3AF' },
    },
    invalid: { color: '#EF4444' },
  },
};

function FormularioPago({ ruta, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/pagos/create-payment-intent', {
        monto: ruta.precio,
        ruta_nombre: ruta.nombre,
      });

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        { payment_method: { card: elements.getElement(CardElement) } }
      );

      if (stripeError) { setError(stripeError.message); return; }

      if (paymentIntent.status === 'succeeded') {
        const ahora = new Date();
        const unMes = new Date();
        unMes.setMonth(unMes.getMonth() + 1);

        await api.post('/boletos/comprar', {
          ruta_id: ruta.id,
          valido_desde: ahora.toISOString(),
          valido_hasta: unMes.toISOString(),
          precio: ruta.precio,
        });
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
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
          Prueba: usa <span className="font-mono">4242 4242 4242 4242</span>, cualquier fecha futura y CVC
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
          Atrás
        </button>
        <button type="submit" disabled={!stripe || loading}
          className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
          {loading ? 'Procesando...' : `Pagar $${ruta.precio} MXN`}
        </button>
      </div>
    </form>
  );
}

export default function Boletos() {
  const { usuario } = useAuth();
  const [boletos, setBoletos] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [modal, setModal] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [rutaSel, setRutaSel] = useState(null);
  const [pasoModal, setPasoModal] = useState(1);
  const [pagoExitoso, setPagoExitoso] = useState(false);

  const cargar = async () => {
    try {
      const [b, r] = await Promise.all([
        api.get("/boletos/mis-boletos"),
        api.get("/rutas"),
      ]);
      setBoletos(b.data);
      setRutas(r.data);
    } catch (err) {
      console.error("Error al cargar boletos o rutas:", err);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = () => {
    setModal(true); setPasoModal(1); setRutaSel(null); setPagoExitoso(false);
  };

  const cerrarModal = () => {
    setModal(false); setPasoModal(1); setRutaSel(null); setPagoExitoso(false);
  };

  const handlePagoExitoso = () => {
    setPagoExitoso(true);
    cargar();
    setTimeout(() => cerrarModal(), 2000);
  };

  const ESTADO_COLOR = {
    pagado:   "bg-green-100 text-green-700",
    usado:    "bg-gray-100 text-gray-500",
    expirado: "bg-red-100 text-red-600",
    cancelado:"bg-red-100 text-red-600",
  };

  const puedeComprar = usuario?.es_estudiante && usuario?.credencial_valida;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700">Mis boletos</h1>
          {puedeComprar && (
            <button onClick={abrirModal}
              className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
              + Comprar boleto
            </button>
          )}
        </div>

        {!puedeComprar && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
            {!usuario?.es_estudiante
              ? "Solo estudiantes pueden comprar boletos con descuento."
              : "Tu credencial estudiantil está pendiente de validación por un administrador."}
          </div>
        )}

        {boletos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            No tienes boletos aún
          </div>
        ) : (
          <div className="space-y-3">
            {boletos.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{b.ruta}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Válido: {new Date(b.valido_desde).toLocaleDateString()} —{" "}
                    {new Date(b.valido_hasta).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400">Precio: ${b.precio}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[b.estado]}`}>
                    {b.estado}
                  </span>
                  {b.estado === "pagado" && (
                    <button onClick={() => setQrModal(b)}
                      className="text-blue-700 text-xs font-semibold hover:underline">
                      Ver QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {pagoExitoso ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-semibold text-green-700 text-lg">¡Pago exitoso!</p>
                <p className="text-sm text-gray-500">Tu boleto ha sido generado.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800">Comprar boleto estudiantil</h2>
                  <div className="flex gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${pasoModal === 1 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'}`}>1. Ruta</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${pasoModal === 2 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'}`}>2. Pago</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">El boleto tendrá validez de <strong>1 mes</strong> a partir de hoy.</p>

                {pasoModal === 1 && (
                  <div className="space-y-3">
                    <select
                      value={rutaSel?.id || ''}
                      onChange={e => setRutaSel(rutas.find(r => r.id === parseInt(e.target.value)))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar ruta *</option>
                      {rutas.map((r) => (
                        <option key={r.id} value={r.id}>{r.nombre} — ${r.precio}</option>
                      ))}
                    </select>
                    {rutaSel && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">
                        Precio: ${rutaSel.precio} MXN
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={cerrarModal}
                        className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
                        Cancelar
                      </button>
                      <button type="button" disabled={!rutaSel} onClick={() => setPasoModal(2)}
                        className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                        Siguiente → Pagar
                      </button>
                    </div>
                  </div>
                )}

                {pasoModal === 2 && rutaSel && (
                  <Elements stripe={stripePromise}>
                    <FormularioPago ruta={rutaSel} onSuccess={handlePagoExitoso} onCancel={() => setPasoModal(1)} />
                  </Elements>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
            <h2 className="text-lg font-bold">Boleto QR</h2>
            <p className="text-sm text-gray-500">{qrModal.ruta}</p>
            <div className="flex justify-center">
              <QRCodeSVG value={qrModal.qr_token} size={220} />
            </div>
            <p className="text-xs text-gray-400">
              Válido hasta: {new Date(qrModal.valido_hasta).toLocaleString()}
            </p>
            <button onClick={() => setQrModal(null)}
              className="w-full border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}