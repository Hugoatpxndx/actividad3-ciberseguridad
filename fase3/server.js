require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 24) {
  console.error('JWT_SECRET debe existir y tener al menos 24 caracteres.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Usuarios de demostración con contraseñas derivadas con scrypt.
// En producción: base de datos, contraseñas con hash y bloqueo por intentos.
// ---------------------------------------------------------------------------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createUser(id, username, password, role) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id,
    username,
    role,
    salt,
    passwordHash: hashPassword(password, salt)
  };
}

const users = [
  createUser(1, 'admin', 'admin123', 'admin'),
  createUser(2, 'usuario', 'usuario123', 'user')
];

function verifyPassword(password, user) {
  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = crypto.scryptSync(password, user.salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------
// Límite simple de intentos de login por IP (en memoria, solo demostración).
// ---------------------------------------------------------------------------
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + LOGIN_WINDOW_MS;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);

  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Demasiados intentos. Espera un momento.' });
  }

  return next();
}

// ---------------------------------------------------------------------------
// Cabeceras de seguridad y parseo del cuerpo.
// ---------------------------------------------------------------------------
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// ---------------------------------------------------------------------------
// Utilidades JWT y middlewares.
// ---------------------------------------------------------------------------
const JWT_OPTIONS = {
  algorithm: 'HS256',
  issuer: 'act3-api',
  audience: 'act3-web'
};

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    {
      ...JWT_OPTIONS,
      expiresIn: '15m'
    }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.slice(7).trim();

  try {
    req.user = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience
    });
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes' });
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'act3-fase3', timestamp: new Date().toISOString() });
});

app.post('/api/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const user = users.find((candidate) => candidate.username === username);

  if (!user || !verifyPassword(password, user)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  return res.json({
    token: signToken(user),
    tokenType: 'Bearer',
    expiresIn: 900
  });
});

app.get('/api/public', (req, res) => {
  res.json({
    message: 'Este endpoint es público y no requiere token',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/me', authenticate, (req, res) => {
  res.json({
    message: 'Token válido',
    user: req.user
  });
});

app.get('/api/admin', authenticate, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Acceso concedido al panel de administración',
    user: req.user,
    stats: {
      usuarios: 2,
      buckets: 1,
      estado: 'operativo'
    }
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`API segura escuchando en http://localhost:${PORT}`);
});
