import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function crearPaymentIntent(req, res, next) {
  const { monto, ruta_nombre } = req.body;
  if (!monto) return res.status(400).json({ error: 'monto es requerido' });
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(monto * 100), // Stripe maneja centavos
      currency: 'mxn',
      description: `Boleto estudiantil - ${ruta_nombre || 'Track My Bus'}`,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch(err) { next(err); }
}