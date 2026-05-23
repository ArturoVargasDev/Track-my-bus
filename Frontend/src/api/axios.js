import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

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

// Interceptor de request: solo CSRF, autenticación va por cookie HttpOnly
api.interceptors.request.use(async config => {
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