// src/pages/public/Perfil.jsx
import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api, { clearCsrfToken } from '../../api/axios'
import Navbar from '../../components/Navbar'

const CLOUDINARY_URL    = 'https://api.cloudinary.com/v1_1/dxgt9zlt5/image/upload'
const CLOUDINARY_PRESET = 'j5erjiji'

function Avatar({ usuario, size = 'lg' }) {
  const initials = `${usuario?.nombre?.[0] || ''}${usuario?.apellidos?.[0] || ''}`.toUpperCase() || '?'
  const sz = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-10 h-10 text-sm'
  if (usuario?.foto_url) {
    return <img src={usuario.foto_url} alt="Foto de perfil"
      className={`${sz} rounded-full object-cover border-2 border-white shadow`} />
  }
  return (
    <div className={`${sz} rounded-full bg-blue-700 text-white flex items-center justify-center font-bold shadow`}>
      {initials}
    </div>
  )
}

export default function Perfil() {
  const { usuario, actualizarUsuario } = useAuth()

  const [form,        setForm]        = useState({ nombre: usuario?.nombre || '', apellidos: usuario?.apellidos || '', telefono: usuario?.telefono || '' })
  const [guardando,   setGuardando]   = useState(false)
  const [toastDatos,  setToastDatos]  = useState('')
  const [errorDatos,  setErrorDatos]  = useState('')

  const [pass,         setPass]         = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardandoPass,setGuardandoPass]= useState(false)
  const [toastPass,    setToastPass]    = useState('')
  const [errorPass,    setErrorPass]    = useState('')

  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto,    setErrorFoto]    = useState('')
  const fileRef = useRef(null)

  const [credencial,   setCredencial]   = useState('')
  const [subiendoCred, setSubiendoCred] = useState(false)
  const [toastCred,    setToastCred]    = useState('')
  const [errorCred,    setErrorCred]    = useState('')

  const mostrarToast = (set, msg) => { set(msg); setTimeout(() => set(''), 3000) }

  const guardarDatos = async e => {
    e.preventDefault(); setErrorDatos(''); setGuardando(true)
    try {
      await api.patch(`/auth/usuarios/${usuario.id}`, {
        nombre: form.nombre, apellidos: form.apellidos,
        email: usuario.email, telefono: form.telefono,
      })
      actualizarUsuario({ nombre: form.nombre, apellidos: form.apellidos, telefono: form.telefono })
      mostrarToast(setToastDatos, 'Datos actualizados correctamente')
    } catch (err) {
      setErrorDatos(err.response?.data?.error || 'Error al actualizar datos')
    } finally { setGuardando(false) }
  }

  const cambiarPassword = async e => {
    e.preventDefault(); setErrorPass('')
    if (pass.nueva !== pass.confirmar) return setErrorPass('Las contrasenas no coinciden')
    if (pass.nueva.length < 8) return setErrorPass('La contrasena debe tener al menos 8 caracteres')
    setGuardandoPass(true)
    try {
      await api.patch('/auth/password', { password_actual: pass.actual, password_nueva: pass.nueva })
      setPass({ actual: '', nueva: '', confirmar: '' })
      mostrarToast(setToastPass, 'Contrasena actualizada correctamente')
    } catch (err) {
      setErrorPass(err.response?.data?.error || 'Error al cambiar contrasena')
    } finally { setGuardandoPass(false) }
  }

  const subirFoto = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setErrorFoto('La imagen no debe superar 2 MB'); return }
    setSubiendoFoto(true); setErrorFoto('')
    try {
      const formData = new FormData()
      formData.append('file',          file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      formData.append('folder',        'track-my-bus/perfiles')

      const res     = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
      const data    = await res.json()
      const fotoUrl = data.secure_url

      // Limpiar token CSRF antes del PATCH para evitar 403
      clearCsrfToken()
      await api.patch(`/auth/usuarios/${usuario.id}`, {
        nombre:    usuario.nombre,
        apellidos: usuario.apellidos || '',
        email:     usuario.email,
        telefono:  usuario.telefono  || '',
        foto_url:  fotoUrl,
      })
      actualizarUsuario({ foto_url: fotoUrl })
      mostrarToast(setToastDatos, 'Foto actualizada correctamente')
    } catch {
      setErrorFoto('Error al subir la imagen. Intenta de nuevo.')
    } finally { setSubiendoFoto(false) }
  }

  const subirCredencial = async e => {
    e.preventDefault()
    if (!credencial) return setErrorCred('Ingresa la URL de tu credencial')
    setSubiendoCred(true); setErrorCred('')
    try {
      await api.patch('/auth/credencial', { credencial_url: credencial })
      setCredencial('')
      mostrarToast(setToastCred, 'Credencial enviada, pendiente de validacion')
    } catch (err) {
      setErrorCred(err.response?.data?.error || 'Error al enviar credencial')
    } finally { setSubiendoCred(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {toastDatos && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">{toastDatos}</div>}
      {toastPass  && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">{toastPass}</div>}
      {toastCred  && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">{toastCred}</div>}

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Mi perfil</h1>

        {/* Foto de perfil */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-6">
          <div className="relative">
            <Avatar usuario={usuario} size="lg" />
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-blue-800 shadow">
              +
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={subirFoto} />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{usuario?.nombre} {usuario?.apellidos}</p>
            <p className="text-sm text-gray-500">{usuario?.email}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">{usuario?.rol}</p>
            {subiendoFoto && <p className="text-xs text-blue-600 mt-1">Subiendo foto...</p>}
            {errorFoto    && <p className="text-xs text-red-500 mt-1">{errorFoto}</p>}
          </div>
        </div>

        {/* Datos basicos */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Datos personales</h2>
          {errorDatos && <p className="text-red-600 text-sm">{errorDatos}</p>}
          <form onSubmit={guardarDatos} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Apellidos</label>
                <input value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
              <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input value={usuario?.email} disabled
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>
            </div>
            <button type="submit" disabled={guardando}
              className="w-full bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        {/* Cambiar contrasena */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Cambiar contrasena</h2>
          {errorPass && <p className="text-red-600 text-sm">{errorPass}</p>}
          <form onSubmit={cambiarPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contrasena actual *</label>
              <input type="password" required value={pass.actual}
                onChange={e => setPass({...pass, actual: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nueva contrasena *</label>
              <input type="password" required value={pass.nueva}
                onChange={e => setPass({...pass, nueva: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar contrasena *</label>
              <input type="password" required value={pass.confirmar}
                onChange={e => setPass({...pass, confirmar: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={guardandoPass}
              className="w-full bg-gray-800 text-white py-2 rounded-xl text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition">
              {guardandoPass ? 'Actualizando...' : 'Cambiar contrasena'}
            </button>
          </form>
        </div>

        {/* Credencial estudiantil */}
        {usuario?.es_estudiante ? (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Credencial estudiantil</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium
                ${usuario.credencial_valida ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {usuario.credencial_valida ? 'Validada' : 'Pendiente de validacion'}
              </span>
            </div>
            {errorCred && <p className="text-red-600 text-sm">{errorCred}</p>}
            <form onSubmit={subirCredencial} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">URL de tu credencial (imagen o PDF)</label>
                <input value={credencial} onChange={e => setCredencial(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Sube tu credencial a Google Drive, Dropbox o similar y pega el enlace aqui</p>
              </div>
              <button type="submit" disabled={subiendoCred}
                className="w-full bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition">
                {subiendoCred ? 'Enviando...' : 'Enviar credencial'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
