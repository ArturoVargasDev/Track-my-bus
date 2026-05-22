import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

// ─── Mocks necesarios ────────────────────────────────────────────────────────

// Mock de useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock del AuthContext — lo configuramos diferente en cada test
const mockLogout = vi.fn()
let mockUsuario = null

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    usuario: mockUsuario,
    logout: mockLogout,
  }),
}))

// ─── Helper para renderizar el componente ────────────────────────────────────
const renderNavbar = () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

// ─── Suite de pruebas ────────────────────────────────────────────────────────
describe('Componente Navbar — Track My Bus', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsuario = null // Sin usuario por defecto
  })

  // PRUEBA 1 ─────────────────────────────────────────────────────────────────
  it('debe mostrar links de Login y Registro cuando no hay sesión iniciada', () => {
    mockUsuario = null
    renderNavbar()

    // Verifica que el logo/titulo esté presente
    expect(screen.getByText(/track my bus/i)).toBeInTheDocument()

    // Cuando no hay sesión, debe mostrar estas opciones
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /registrarse/i })).toBeInTheDocument()

    // NO debe mostrar el botón de salir
    expect(screen.queryByRole('button', { name: /salir/i })).not.toBeInTheDocument()
  })

  // PRUEBA 2 ─────────────────────────────────────────────────────────────────
  it('debe mostrar el nombre del usuario y botón Salir cuando hay sesión activa', () => {
    mockUsuario = { nombre: 'Juan Pérez', rol: 'usuario' }
    renderNavbar()

    // Debe mostrar el nombre del usuario
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()

    // Debe mostrar el botón de cerrar sesión
    expect(screen.getByRole('button', { name: /salir/i })).toBeInTheDocument()

    // NO debe mostrar links de login/registro
    expect(screen.queryByRole('link', { name: /iniciar sesión/i })).not.toBeInTheDocument()
  })

  // PRUEBA 3 ─────────────────────────────────────────────────────────────────
  it('debe mostrar el link de Dashboard cuando el usuario es admin u operador', () => {
    mockUsuario = { nombre: 'Admin', rol: 'admin' }
    renderNavbar()

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  // PRUEBA 4 ─────────────────────────────────────────────────────────────────
  it('debe mostrar el link Mi panel cuando el usuario es conductor', () => {
    mockUsuario = { nombre: 'Carlos Conductor', rol: 'conductor' }
    renderNavbar()

    expect(screen.getByRole('link', { name: /mi panel/i })).toBeInTheDocument()

    // Un conductor NO debe ver el Dashboard
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  // PRUEBA 5 ─────────────────────────────────────────────────────────────────
  it('debe cerrar sesión y redirigir al login al hacer clic en Salir', async () => {
    mockUsuario = { nombre: 'Juan', rol: 'usuario' }
    mockLogout.mockResolvedValueOnce(undefined)

    renderNavbar()

    const btnSalir = screen.getByRole('button', { name: /salir/i })
    fireEvent.click(btnSalir)

    // Verificamos que se haya llamado a logout
    await vi.waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    // Verificamos que redirija al login
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})
