import { doubleCsrf } from 'csrf-csrf';

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-cambiar-en-prod',
  getSessionIdentifier: (req) => req.ip,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body?._csrf,
});

export { doubleCsrfProtection };

export function csrfTokenHandler(req, res) {
  try {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}