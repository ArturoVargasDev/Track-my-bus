import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // necesario para que las cookies CSRF funcionen
})

// Obtener el token CSRF una sola vez y guardarlo
let csrfToken = null

async function getCsrfToken() {
  if (!csrfToken) {
    const res = await axios.get(
      (import.meta.env.VITE_API_URL || '/api') + '/csrf-token',
      { withCredentials: true }
    )
    csrfToken = res.data.csrfToken
  }
  return csrfToken
}

// Interceptor de request: agrega JWT y CSRF token
api.interceptors.request.use(async config => {
  // JWT
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // CSRF solo en métodos que lo requieren
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const csrf = await getCsrfToken()
    config.headers['x-csrf-token'] = csrf
  }

  return config
})

// Interceptor de response
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    // Si el CSRF expiró, limpiamos el token para que se regenere
    if (err.response?.status === 403) {
      csrfToken = null
    }
    return Promise.reject(err)
  }
)

export default api