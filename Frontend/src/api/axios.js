// src/api/axios.js
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL:         `${BASE}/api`,
  withCredentials: true,
})

let csrfToken = null

async function getCsrfToken() {
  const res = await axios.get(`${BASE}/api/csrf-token`, { withCredentials: true })
  csrfToken = res.data.csrfToken
  return csrfToken
}

// Permite limpiar el token desde fuera (login, logout)
export function clearCsrfToken() {
  csrfToken = null
}

api.interceptors.request.use(async config => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    // Siempre obtener un token fresco para mutaciones
    const csrf = await getCsrfToken()
    config.headers['x-csrf-token'] = csrf
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    if (err.response?.status === 403) {
      csrfToken = null
    }
    return Promise.reject(err)
  }
)

export default api
