import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const POR_PAGINA = 10;
const ANIO_MIN   = 1990;
const ANIO_MAX   = new Date().getFullYear();

function exportarCSV(unidades) {
  const cabecera = ["ID","No. Economico","Placa","Marca","Modelo","Anio","Capacidad","Empresa","Accesible","Estado"];
  const filas = unidades.map((u) => [
    u.id, u.numero_economico, u.placa, u.marca || "", u.modelo || "",
    u.anio || "", u.capacidad || "", u.empresa || "",
    u.accesible ? "Si" : "No", u.activo ? "Activa" : "Inactiva",
  ]);
  const csv  = [cabecera, ...filas].map((f) => f.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href     = URL.createObjectURL(blob);
  link.download = `unidades-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

function ordenar(lista, campo, dir) {
  return [...lista].sort((a, b) => {
    const va = (a[campo] ?? "").toString().toLowerCase();
    const vb = (b[campo] ?? "").toString().toLowerCase();
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

export default function Unidades() {
  const [unidades,    setUnidades]    = useState([]);
  const [empresas,    setEmpresas]    = useState([]);
  const [ordenes,     setOrdenes]     = useState([]);
  const [modal,       setModal]       = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [form,        setForm]        = useState({
    empresa_id: "", numero_economico: "", placa: "",
    marca: "", modelo: "", anio: "", capacidad: "", accesible: false,
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState("");

  const [busqueda,       setBusqueda]       = useState("");
  const [filtroEmpresa,  setFiltroEmpresa]  = useState("todos");
  const [filtroAccesible,setFiltroAccesible]= useState("todos");
  const [filtroEstado,   setFiltroEstado]   = useState("todos");
  const [pagina,         setPagina]         = useState(1);
  const [orden,          setOrden]          = useState({ campo: "numero_economico", dir: "asc" });

  const mostrarToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const cargar = async () => {
    const [u, e, o] = await Promise.all([
      api.get("/unidades"),
      api.get("/empresas"),
      api.get("/mantenimiento", { params: { estado: "pendiente" } }).catch(() => ({ data: [] })),
    ]);
    setUnidades(u.data); setEmpresas(e.data); setOrdenes(o.data);
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtroEmpresa, filtroAccesible, filtroEstado, orden]);

  const unidadesConMantenimiento = useMemo(() =>
    new Set(ordenes.filter((o) => ["pendiente","en_proceso"].includes(o.estado)).map((o) => o.unidad_id)),
  [ordenes]);

  const unidadesCriticas = useMemo(() =>
    new Set(ordenes.filter((o) => o.prioridad === "critica" && o.estado !== "completado").map((o) => o.unidad_id)),
  [ordenes]);

  const toggleOrden = (campo) => setOrden((o) =>
    o.campo === campo ? { campo, dir: o.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" }
  );
  const icono = (campo) => orden.campo === campo ? (orden.dir === "asc" ? " ↑" : " ↓") : "";

  const unidadesFiltradas = useMemo(() => {
    const filtradas = unidades.filter((u) => {
      const texto = `${u.numero_economico} ${u.placa} ${u.marca||""} ${u.modelo||""} ${u.empresa||""}`.toLowerCase();
      if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;
      if (filtroEmpresa  !== "todos" && String(u.empresa_id) !== filtroEmpresa) return false;
      if (filtroAccesible === "si"   && !u.accesible) return false;
      if (filtroAccesible === "no"   &&  u.accesible) return false;
      if (filtroEstado === "activo"   && !u.activo) return false;
      if (filtroEstado === "inactivo" &&  u.activo) return false;
      return true;
    });
    return ordenar(filtradas, orden.campo, orden.dir);
  }, [unidades, busqueda, filtroEmpresa, filtroAccesible, filtroEstado, orden]);

  const totalPaginas  = Math.max(1, Math.ceil(unidadesFiltradas.length / POR_PAGINA));
  const unidadesPagina = unidadesFiltradas.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA);
  const hayFiltros    = busqueda || filtroEmpresa !== "todos" || filtroAccesible !== "todos" || filtroEstado !== "todos";

  const crear = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.post("/unidades", form);
      setModal(false);
      setForm({ empresa_id:"", numero_economico:"", placa:"", marca:"", modelo:"", anio:"", capacidad:"", accesible: false });
      await cargar();
      mostrarToast("Unidad creada correctamente");
    } catch (err) { setError(err.response?.data?.error || "Error al crear unidad"); }
    finally { setLoading(false); }
  };

  const guardarEdicion = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.patch(`/unidades/${modalEditar.id}`, {
        numero_economico: modalEditar.numero_economico,
        placa:            modalEditar.placa,
        marca:            modalEditar.marca,
        modelo:           modalEditar.modelo,
        anio:             modalEditar.anio,
        capacidad:        modalEditar.capacidad,
        accesible:        modalEditar.accesible,
      });
      setModalEditar(null);
      await cargar();
      mostrarToast("Unidad actualizada correctamente");
    } catch (err) { setError(err.response?.data?.error || "Error al actualizar unidad"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">{toast}</div>
      )}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-blue-700 hover:underline text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-800">Unidades</h1>
            <span className="text-sm text-gray-400">({unidadesFiltradas.length})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportarCSV(unidadesFiltradas)}
              className="border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
              Exportar CSV
            </button>
            <button onClick={() => setModal(true)}
              className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
              + Nueva unidad
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar por numero, placa, marca, modelo o empresa..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todas las empresas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todos los estados</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </select>
          <select value={filtroAccesible} onChange={(e) => setFiltroAccesible(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todos">Accesibilidad</option>
            <option value="si">Accesibles</option>
            <option value="no">No accesibles</option>
          </select>
          {hayFiltros && (
            <button onClick={() => { setBusqueda(""); setFiltroEmpresa("todos"); setFiltroAccesible("todos"); setFiltroEstado("todos"); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {[["numero_economico","No. Economico"],["placa","Placa"],["marca","Marca / Modelo"],
                  ["empresa","Empresa"],["anio","Anio"],["capacidad","Cap."]].map(([c,l]) => (
                  <th key={c} onClick={() => toggleOrden(c)}
                    className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 select-none">
                    {l}{icono(c)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left">Accesible</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unidadesPagina.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.numero_economico}
                    {unidadesCriticas.has(u.id) && (
                      <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">Critico</span>
                    )}
                    {!unidadesCriticas.has(u.id) && unidadesConMantenimiento.has(u.id) && (
                      <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-medium">Mtto.</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.placa}</td>
                  <td className="px-4 py-3 text-gray-500">{u.marca} {u.modelo}</td>
                  <td className="px-4 py-3 text-gray-500">{u.empresa || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{u.anio || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{u.capacidad || "—"}</td>
                  <td className="px-4 py-3">
                    {u.accesible
                      ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Si</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.activo
                      ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Activa</span>
                      : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-medium">Inactiva</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setError(""); setModalEditar({ ...u }); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!unidadesPagina.length && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  {hayFiltros ? "No se encontraron unidades con esos filtros." : "No hay unidades registradas."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Mostrando {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA, unidadesFiltradas.length)} de {unidadesFiltradas.length}</p>
            <div className="flex gap-1">
              <button disabled={pagina===1} onClick={() => setPagina((p) => p-1)}
                className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Anterior</button>
              {Array.from({length:totalPaginas},(_,i)=>i+1).map((n) => (
                <button key={n} onClick={() => setPagina(n)}
                  className={`px-3 py-1 rounded-lg border transition ${pagina===n?"bg-blue-700 text-white border-blue-700":"hover:bg-gray-50"}`}>
                  {n}
                </button>
              ))}
              <button disabled={pagina===totalPaginas} onClick={() => setPagina((p) => p+1)}
                className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear unidad */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Nueva unidad</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={crear} className="space-y-3">
              <select required value={form.empresa_id} onChange={(e) => setForm({...form, empresa_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Empresa *</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              {[["numero_economico","No. Economico *",true],["placa","Placa *",true],["marca","Marca",false],["modelo","Modelo",false]].map(([f,l,r]) => (
                <input key={f} placeholder={l} required={r} value={form[f]}
                  onChange={(e) => setForm({...form, [f]: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Anio" type="number"
                  min={ANIO_MIN} max={ANIO_MAX}
                  value={form.anio} onChange={(e) => setForm({...form, anio: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Capacidad" type="number" min="1" max="200"
                  value={form.capacidad} onChange={(e) => setForm({...form, capacidad: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.accesible}
                  onChange={(e) => setForm({...form, accesible: e.target.checked})}
                  className="w-4 h-4 accent-blue-700" />
                Unidad accesible para personas con discapacidad
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar unidad */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar unidad</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={guardarEdicion} className="space-y-3">
              {[["numero_economico","No. Economico *",true],["placa","Placa *",true],["marca","Marca",false],["modelo","Modelo",false]].map(([f,l,r]) => (
                <input key={f} placeholder={l} required={r} value={modalEditar[f] || ""}
                  onChange={(e) => setModalEditar({...modalEditar, [f]: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Anio" type="number"
                  min={ANIO_MIN} max={ANIO_MAX}
                  value={modalEditar.anio || ""} onChange={(e) => setModalEditar({...modalEditar, anio: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Capacidad" type="number" min="1" max="200"
                  value={modalEditar.capacidad || ""} onChange={(e) => setModalEditar({...modalEditar, capacidad: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={modalEditar.accesible}
                  onChange={(e) => setModalEditar({...modalEditar, accesible: e.target.checked})}
                  className="w-4 h-4 accent-blue-700" />
                Unidad accesible para personas con discapacidad
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalEditar(null); setError(""); }}
                  className="flex-1 border border-gray-300 rounded-xl py-2 text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
