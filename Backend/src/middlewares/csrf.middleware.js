import { doubleCsrf } from 'csrf-csrf';

const IS_PROD = process.env.NODE_ENV === 'production';

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret:            () => process.env.CSRF_SECRET || 'csrf-secret-cambiar-en-prod',
  getSessionIdentifier: (req) => IS_PROD ? req.ip : 'dev_session',
  cookieName:    'x-csrf-token',
  cookieOptions: {
    sameSite: IS_PROD ? 'none' : 'strict',
    secure:   IS_PROD,
    httpOnly: false,
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
