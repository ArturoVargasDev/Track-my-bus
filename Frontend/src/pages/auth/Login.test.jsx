import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

// ─── Mocks necesarios ────────────────────────────────────────────────────────

// Mock del contexto de autenticación (AuthContext)
const mockLogin = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: false,
  }),
}))

// Mock de useNavigate para verificar redirecciones
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Helper para renderizar el componente ────────────────────────────────────
const renderLogin = () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

// ─── Suite de pruebas ────────────────────────────────────────────────────────
describe('Componente Login — Track My Bus', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // PRUEBA 1 ─────────────────────────────────────────────────────────────────
  it('debe renderizar el formulario de login correctamente', () => {
    renderLogin()

    // Verifica que el título de la app esté visible
    expect(screen.getByText('Track My Bus')).toBeInTheDocument()

    // Verifica que existan los campos del formulario
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()

    // Verifica que el botón de iniciar sesión esté presente
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  // PRUEBA 2 ─────────────────────────────────────────────────────────────────
  it('debe mostrar error cuando las credenciales son incorrectas', async () => {
    // Simulamos que el servidor responde con error de credenciales
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Credenciales inválidas' } }
    })

    renderLogin()

    // Llenamos el formulario con datos incorrectos
    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'noexiste@correo.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    })

    // Enviamos el formulario
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Verificamos que el mensaje de error aparezca en pantalla
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })

  // PRUEBA 3 ─────────────────────────────────────────────────────────────────
  it('debe redirigir al dashboard cuando inicia sesión como admin', async () => {
    // Simulamos respuesta exitosa con rol admin
    mockLogin.mockResolvedValueOnce({ rol: 'admin', nombre: 'Admin Test' })

    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'admin@trackmybus.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Admin123' }
    })

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Verificamos que se haya redirigido al dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  // PRUEBA 4 ─────────────────────────────────────────────────────────────────
  it('debe redirigir al panel del conductor cuando inicia sesión como conductor', async () => {
    // Simulamos respuesta exitosa con rol conductor
    mockLogin.mockResolvedValueOnce({ rol: 'conductor', nombre: 'Conductor Test' })

    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'conductor@trackmybus.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Conductor123' }
    })

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Verificamos redirección al panel conductor
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/conductor')
    })
  })

  // PRUEBA 5 ─────────────────────────────────────────────────────────────────
  it('debe existir el link para registrarse', () => {
    renderLogin()

    const linkRegistro = screen.getByRole('link', { name: /regístrate/i })
    expect(linkRegistro).toBeInTheDocument()
    expect(linkRegistro).toHaveAttribute('href', '/registro')
  })
})
