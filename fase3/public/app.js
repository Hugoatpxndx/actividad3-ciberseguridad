const TOKEN_KEY = 'act3_token';

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) || null
};

const $ = (selector) => document.querySelector(selector);

function decodeJwt(token) {
  try {
    const part = token.split('.')[1];
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    return null;
  }
}

function isExpired(payload) {
  return !payload || !payload.exp || payload.exp * 1000 <= Date.now();
}

function setMessage(text, type = '') {
  const element = $('#loginMessage');
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function setServerStatus(status, text) {
  const pill = $('#serverStatus');
  pill.className = `status-pill ${status}`.trim();
  $('#serverStatusText').textContent = text;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.noAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    data = text;
  }

  return { status: response.status, ok: response.ok, data };
}

function showLogin() {
  $('#dashboardView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
}

function showDashboard() {
  const payload = decodeJwt(state.token);

  if (!payload) {
    clearSession();
    return;
  }

  $('#loginView').classList.add('hidden');
  $('#dashboardView').classList.remove('hidden');

  $('#tokenPreview').textContent = state.token;
  $('#payloadPreview').textContent = JSON.stringify(payload, null, 2);
  $('#roleBadge').textContent = `role: ${payload.role || 'desconocido'}`;
  $('#expiresBadge').textContent = `exp: ${new Date(payload.exp * 1000).toLocaleTimeString()}`;
}

function clearSession() {
  state.token = null;
  sessionStorage.removeItem(TOKEN_KEY);
  $('#testResult').textContent = 'Ejecuta una prueba para ver el código HTTP y la respuesta.';
  $('#testResult').className = 'result';
  showLogin();
}

async function verifySession() {
  if (!state.token || isExpired(decodeJwt(state.token))) {
    clearSession();
    return;
  }

  try {
    const result = await api('/api/me');

    if (result.ok) {
      showDashboard();
    } else {
      clearSession();
      setMessage('La sesión expiró. Inicia sesión de nuevo.', 'error');
    }
  } catch (error) {
    clearSession();
    setMessage('No se pudo verificar la sesión.', 'error');
  }
}

async function login(event) {
  event.preventDefault();

  const button = $('#loginBtn');
  const username = $('#username').value.trim();
  const password = $('#password').value;

  button.disabled = true;
  setMessage('Solicitando token...');

  try {
    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      noAuth: true
    });

    if (result.ok && result.data.token) {
      state.token = result.data.token;
      sessionStorage.setItem(TOKEN_KEY, state.token);
      setMessage('Token obtenido correctamente.', 'success');
      showDashboard();
    } else {
      setMessage(result.data.error || 'No se pudo iniciar sesión.', 'error');
    }
  } catch (error) {
    setMessage('Error de conexión con la API.', 'error');
  } finally {
    button.disabled = false;
  }
}

async function runTest(button) {
  const path = button.dataset.test;
  const noAuth = button.dataset.noauth === 'true';
  const resultBox = $('#testResult');

  resultBox.className = 'result';
  resultBox.textContent = `Consultando ${path}...`;

  try {
    const result = await api(path, { noAuth });

    const label = noAuth ? 'sin token' : 'con token';
    resultBox.textContent = `${path} (${label})\nHTTP ${result.status}\n\n${JSON.stringify(result.data, null, 2)}`;
    resultBox.classList.add(result.ok ? 'ok' : 'denied');
  } catch (error) {
    resultBox.textContent = `Error de conexión al consultar ${path}`;
    resultBox.classList.add('denied');
  }
}

async function checkServer() {
  try {
    const result = await api('/health', { noAuth: true });

    if (result.ok) {
      setServerStatus('online', 'API en línea');
    } else {
      setServerStatus('offline', 'API con errores');
    }
  } catch (error) {
    setServerStatus('offline', 'API fuera de línea');
  }
}

$('#loginForm').addEventListener('submit', login);

$('#logoutBtn').addEventListener('click', () => {
  clearSession();
  setMessage('Sesión cerrada.', 'success');
});

document.querySelectorAll('[data-test]').forEach((button) => {
  button.addEventListener('click', () => runTest(button));
});

checkServer();

if (state.token) {
  verifySession();
} else {
  showLogin();
}
