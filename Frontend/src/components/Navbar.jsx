import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const esAdmin    = usuario?.rol === "admin";
  const esOperador = usuario?.rol === "operador";
  const esConductor = usuario?.rol === "conductor";

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <Link to="/" className="flex items-center gap-2 font-bold text-lg">
        Track My Bus
      </Link>

      <div className="flex items-center gap-4 text-sm">
        {!usuario ? (
          <>
            <Link to="/login" className="hover:underline">
              Iniciar sesion
            </Link>
            <Link to="/registro"
              className="bg-white text-blue-700 px-3 py-1 rounded-full font-semibold hover:bg-blue-50">
              Registrarse
            </Link>
          </>
        ) : (
          <>
            {(esAdmin || esOperador) && (
              <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            )}
            {esConductor && (
              <Link to="/conductor" className="hover:underline">Mi panel</Link>
            )}
            {usuario.es_estudiante == 1 && usuario.credencial_valida && (
              <Link to="/boletos" className="hover:underline">Mis boletos</Link>
            )}
            <Link to="/" className="hover:underline">Mapa</Link>
            <Link to="/perfil" className="hover:underline opacity-75">
              {usuario.nombre}
            </Link>
            <button onClick={handleLogout}
              className="bg-white text-blue-700 px-3 py-1 rounded-full font-semibold hover:bg-blue-50">
              Salir
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
