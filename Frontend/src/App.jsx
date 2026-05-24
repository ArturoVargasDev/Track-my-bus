import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Registro from "./pages/auth/Registro";
import GoogleSuccess from "./pages/auth/GoogleSuccess";
import MapaPublico from "./pages/public/MapaPublico";
import PanelConductor from "./pages/conductor/PanelConductor.jsx";
import Dashboard from "./pages/operator/Dashboard";
import Rutas from "./pages/operator/Rutas";
import Unidades from "./pages/operator/Unidades";
import Mantenimiento from "./pages/operator/Mantenimiento";
import Incidencias from "./pages/operator/Incidencias";
import NotFound from "./pages/public/NotFound";
import Boletos from "./pages/public/Boletos";
import Horarios from "./pages/operator/Horarios";
import Estudiantes from "./pages/operator/Estudiantes";
import Usuarios from "./pages/operator/Usuarios";
import Perfil from "./pages/public/Perfil";

export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      {/* Publicas */}
      <Route
        path="/login"
        element={!usuario ? <Login /> : <Navigate to="/" />}
      />
      <Route
        path="/registro"
        element={!usuario ? <Registro /> : <Navigate to="/" />}
      />

      {/* Callback de Google OAuth — no requiere autenticacion previa */}
      <Route path="/auth/google/success" element={<GoogleSuccess />} />

      {/* Mapa publico */}
      <Route path="/" element={<MapaPublico />} />

      {/* Conductor */}
      <Route
        path="/conductor"
        element={
          <ProtectedRoute roles={["conductor"]}>
            <PanelConductor />
          </ProtectedRoute>
        }
      />

      {/* Operador / Admin */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/rutas"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Rutas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/unidades"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Unidades />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/mantenimiento"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Mantenimiento />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/incidencias"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Incidencias />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boletos"
        element={
          <ProtectedRoute roles={["usuario", "admin", "operador", "conductor"]}>
            <Boletos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/horarios"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Horarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/estudiantes"
        element={
          <ProtectedRoute roles={["admin", "operador"]}>
            <Estudiantes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/usuarios"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute roles={["admin", "operador", "conductor", "usuario"]}>
            <Perfil />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
