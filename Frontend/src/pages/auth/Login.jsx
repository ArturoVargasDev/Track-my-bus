// src/pages/auth/Login.jsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google`

export default function Login() {
  const { login, loading } = useAuth()
  const navigate           = useNavigate()
  const [params]           = useSearchParams()
  const [form,  setForm]   = useState({ email: '', password: '' })
  const [error, setError]  = useState(
    params.get('error') === 'google' ? 'No se pudo iniciar sesion con Google. Intenta de nuevo.' : ''
  )

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      const usuario = await login(form.email, form.password)
      if (usuario.rol === 'conductor')                               navigate('/conductor')
      else if (usuario.rol === 'admin' || usuario.rol === 'operador') navigate('/dashboard')
      else                                                           navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error de red')
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-700 mt-2">Track My Bus</h1>
          <p className="text-gray-500 text-sm mt-1">Inicia sesion en tu cuenta</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
            <input type="email" required value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <input type="password" required value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
            {loading ? 'Entrando...' : 'Iniciar sesion'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">o continua con</span>
          </div>
        </div>

        {/* Boton Google OAuth */}
        <a href={GOOGLE_AUTH_URL}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continuar con Google
        </a>

        <p className="text-center text-sm text-gray-500 mt-6">
          No tienes cuenta?{' '}
          <Link to="/registro" className="text-blue-700 font-semibold hover:underline">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
