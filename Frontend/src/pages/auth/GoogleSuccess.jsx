// src/pages/auth/GoogleSuccess.jsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function GoogleSuccess() {
  const { loginConGoogle } = useAuth()
  const navigate           = useNavigate()
  const [params]           = useSearchParams()

  useEffect(() => {
    const userParam = params.get('user')
    const error     = params.get('error')

    if (error || !userParam) {
      navigate('/login?error=google')
      return
    }

    try {
      const usuario = JSON.parse(decodeURIComponent(userParam))
      loginConGoogle(usuario)

      // Esperar a que React actualice el estado antes de navegar
      setTimeout(() => {
        if (usuario.rol === 'conductor')                               navigate('/conductor')
        else if (usuario.rol === 'admin' || usuario.rol === 'operador') navigate('/dashboard')
        else                                                            navigate('/')
      }, 100)
    } catch {
      navigate('/login?error=google')
    }
  }, [])

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Iniciando sesion con Google...</p>
    </div>
  )
}
