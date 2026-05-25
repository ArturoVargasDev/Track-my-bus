// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'
import api, { clearCsrfToken } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    clearCsrfToken()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      setUsuario(data.usuario)
      // Esperar a que el navegador procese la cookie Set-Cookie
      await new Promise(resolve => setTimeout(resolve, 300))
      return data.usuario
    } catch (err) {
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loginConGoogle = (userData) => {
    clearCsrfToken()
    localStorage.setItem('usuario', JSON.stringify(userData))
    setUsuario(userData)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    clearCsrfToken()
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  const actualizarUsuario = (datos) => {
    const nuevo = { ...usuario, ...datos }
    localStorage.setItem('usuario', JSON.stringify(nuevo))
    setUsuario(nuevo)
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, loginConGoogle, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
