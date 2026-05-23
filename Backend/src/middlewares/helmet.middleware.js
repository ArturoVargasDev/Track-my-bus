import helmet from 'helmet';

export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },

  // HSTS: 1 año
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // X-XSS-Protection: 1; mode=block
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Permissions-Policy (no micrófono, cámara, geolocalización)
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // X-Content-Type-Options: nosniff
  noSniff: true,

  // Ocultar X-Powered-By
  hidePoweredBy: true,
});