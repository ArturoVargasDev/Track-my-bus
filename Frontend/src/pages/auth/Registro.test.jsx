import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Registro from './Registro'

// ─── Mocks necesarios ────────────────────────────────────────────────────────

vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import api from '../../api/axios'

// ─── Helper ──────────────────────────────────────────────────────────────────
const renderRegistro = () => {
  render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>
  )
}

// ─── Suite de pruebas ────────────────────────────────────────────────────────
describe('Componente Registro — Track My Bus', () => {

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // PRUEBA 1 ─────────────────────────────────────────────────────────────────
  it('debe renderizar el formulario de registro con todos sus campos', () => {
    renderRegistro()

    // Verifica el título
    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument()

    // Busca los inputs por tipo (tu componente no tiene placeholder/id en los inputs)
    const inputsTexto = document.querySelectorAll('input[type="text"]')
    const inputEmail  = document.querySelector('input[type="email"]')
    const inputPass   = document.querySelector('input[type="password"]')
    const inputCheck  = document.querySelector('input[type="checkbox"]')

    expect(inputsTexto.length).toBeGreaterThanOrEqual(1) // Nombre y Apellidos
    expect(inputEmail).toBeInTheDocument()
    expect(inputPass).toBeInTheDocument()
    expect(inputCheck).toBeInTheDocument()

    // Verifica el botón de envío
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
  })

  // PRUEBA 2 ─────────────────────────────────────────────────────────────────
  it('debe registrar al usuario y redirigir al login cuando todo es correcto', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } })

    renderRegistro()

    // Llenamos email y contraseña (los únicos required junto a nombre)
    fireEvent.change(document.querySelector('input[type="email"]'), {
      target: { value: 'nuevo@correo.com' }
    })
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: 'MiPassword123' }
    })
    // Llenamos el campo Nombre (primer input type text)
    fireEvent.change(document.querySelectorAll('input[type="text"]')[0], {
      target: { value: 'Juan' }
    })

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/registro', expect.any(Object))
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  // PRUEBA 3 ─────────────────────────────────────────────────────────────────
  it('debe mostrar error cuando el correo ya está registrado', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'El correo ya está registrado' } }
    })

    renderRegistro()

    fireEvent.change(document.querySelector('input[type="email"]'), {
      target: { value: 'existente@correo.com' }
    })
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: 'Password123' }
    })
    fireEvent.change(document.querySelectorAll('input[type="text"]')[0], {
      target: { value: 'Juan' }
    })

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText('El correo ya está registrado')).toBeInTheDocument()
  })

  // PRUEBA 4 ─────────────────────────────────────────────────────────────────
  it('debe poder marcar y desmarcar el checkbox de estudiante', () => {
    renderRegistro()

    const checkbox = document.querySelector('input[type="checkbox"]')

    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  // PRUEBA 5 ─────────────────────────────────────────────────────────────────
  it('debe existir un link de regreso al login', () => {
    renderRegistro()

    const linkLogin = screen.getByRole('link', { name: /inicia sesión/i })
    expect(linkLogin).toBeInTheDocument()
    expect(linkLogin).toHaveAttribute('href', '/login')
  })
})
