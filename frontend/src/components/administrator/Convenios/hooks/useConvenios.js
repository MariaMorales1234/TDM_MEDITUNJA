import { useEffect, useMemo, useState } from "react";
import { apiRequest, mensajeError } from "../../../../auth/api.js";
import { useAdminAuth } from "../../../../auth/useAdminAuth.js";

const catalogoVacio = { eps: [], ips: [], categorias: [], servicios: [] };
const normalizar = (valor = "") => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es").replace(/\beps\b/g, "").replace(/[^a-z0-9]/g, "");
const mismaEps = (a, b) => normalizar(a) !== "" && normalizar(a) === normalizar(b);

export function useConvenios() {
  const { token } = useAdminAuth();
  const [catalogo, setCatalogo] = useState(catalogoVacio);
  const [convenios, setConvenios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [epsId, setEpsId] = useState("");
  const [ipsId, setIpsId] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [convenioEditandoId, setConvenioEditandoId] = useState("");
  const [notificacion, setNotificacion] = useState("");
  const epsDisponibles = catalogo.eps;
  const ipsCatalogo = catalogo.ips;
  const { categorias, servicios } = catalogo;

  useEffect(() => {
    let activo = true;
    apiRequest("/admin/convenios", { headers: { Authorization: `Bearer ${token}` } })
      .then((respuesta) => {
        if (!activo) return;
        const epsInicial = respuesta.catalogo.eps[0];
        const ipsInicial = respuesta.catalogo.ips.find(({ eps }) =>
          eps.some((nombre) => mismaEps(nombre, epsInicial?.nombre))
        );
        const convenioInicial = respuesta.data.find((convenio) =>
          convenio.ipsId === ipsInicial?.id && mismaEps(convenio.epsNombre, epsInicial?.nombre)
        );
        setConvenios(respuesta.data);
        setCatalogo(respuesta.catalogo);
        setEpsId(epsInicial?.id || "");
        setIpsId(ipsInicial?.id || "");
        setServiciosSeleccionados(convenioInicial?.serviciosSeleccionados || ipsInicial?.servicios || []);
      })
      .catch((error) => { if (activo) setNotificacion(mensajeError(error)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [token]);

  const epsActual = useMemo(() => epsDisponibles.find((eps) => eps.id === epsId) || null,
    [epsDisponibles, epsId]);
  const ipsDisponibles = useMemo(() => ipsCatalogo.filter(({ eps }) =>
    eps.some((nombre) => mismaEps(nombre, epsActual?.nombre))
  ), [ipsCatalogo, epsActual]);
  const ipsActual = useMemo(() => ipsDisponibles.find((ips) => ips.id === ipsId) || null,
    [ipsDisponibles, ipsId]);
  const convenioActual = useMemo(() => {
    if (convenioEditandoId) return convenios.find(({ id }) => id === convenioEditandoId) || null;
    return convenios.find((convenio) => convenio.ipsId === ipsId &&
      mismaEps(convenio.epsNombre, epsActual?.nombre)) || null;
  }, [convenios, convenioEditandoId, epsActual, ipsId]);
  const serviciosFiltrados = useMemo(() => {
    const serviciosIps = ipsActual?.servicios || [];
    return servicios.filter((servicio) => serviciosIps.includes(servicio.id) &&
      (categoriaFiltro === "todas" || servicio.categoria === categoriaFiltro));
  }, [categoriaFiltro, ipsActual, servicios]);

  const handleCambiarEps = (valor) => {
    const id = valor?.target ? valor.target.value : valor;
    const nuevaEps = epsDisponibles.find((eps) => eps.id === id);
    if (!nuevaEps) return;
    const nuevaIps = ipsCatalogo.find((ips) => ips.eps.some((nombre) => mismaEps(nombre, nuevaEps.nombre)));
    const convenio = convenios.find((item) => item.ipsId === nuevaIps?.id && mismaEps(item.epsNombre, nuevaEps.nombre));
    setEpsId(id);
    setIpsId(nuevaIps?.id || "");
    setServiciosSeleccionados(convenio?.serviciosSeleccionados || nuevaIps?.servicios || []);
    setConvenioEditandoId("");
    setCategoriaFiltro("todas");
  };

  const handleCambiarIps = (valor) => {
    const id = valor?.target ? valor.target.value : valor;
    const nuevaIps = ipsDisponibles.find((ips) => ips.id === id);
    if (!nuevaIps) return;
    const convenio = convenios.find((item) => item.ipsId === id && mismaEps(item.epsNombre, epsActual?.nombre));
    setIpsId(id);
    setServiciosSeleccionados(convenio?.serviciosSeleccionados || nuevaIps.servicios || []);
    setConvenioEditandoId(convenio?.id || "");
    setCategoriaFiltro("todas");
  };

  const handleEditarConvenio = (convenio) => {
    const eps = epsDisponibles.find((opcion) => mismaEps(opcion.nombre, convenio.epsNombre));
    if (!eps) return;
    setEpsId(eps.id);
    setIpsId(convenio.ipsId);
    setServiciosSeleccionados([...convenio.serviciosSeleccionados]);
    setConvenioEditandoId(convenio.id);
    setCategoriaFiltro("todas");
    setNotificacion(`Editando el convenio con ${convenio.ipsNombre}.`);
    document.getElementById("formulario-convenio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleToggleServicio = (id) => setServiciosSeleccionados((actuales) =>
    actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id]
  );
  const handleSeleccionarTodosCategoria = () => setServiciosSeleccionados((actuales) =>
    [...new Set([...actuales, ...serviciosFiltrados.map(({ id }) => id)])]
  );
  const handleDeseleccionarCategoria = () => {
    const visibles = new Set(serviciosFiltrados.map(({ id }) => id));
    setServiciosSeleccionados((actuales) => actuales.filter((id) => !visibles.has(id)));
  };
  const handleRestablecer = () => {
    setServiciosSeleccionados(convenioActual?.serviciosSeleccionados || ipsActual?.servicios || []);
    setCategoriaFiltro("todas");
    setNotificacion("");
  };
  const handleCancelarEdicion = () => {
    setConvenioEditandoId("");
    setServiciosSeleccionados(convenioActual?.serviciosSeleccionados || ipsActual?.servicios || []);
    setNotificacion("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!serviciosSeleccionados.length || !epsActual || !ipsActual) {
      setNotificacion("Selecciona al menos un servicio válido para el convenio.");
      return;
    }
    const destino = convenioActual;
    const payload = {
      epsId: epsActual.id,
      epsNombre: epsActual.nombre,
      epsSede: epsActual.sede,
      epsDireccion: epsActual.direccion,
      ipsId: ipsActual.id,
      ipsNombre: ipsActual.nombre,
      ipsSede: ipsActual.sede,
      ipsDireccion: ipsActual.direccion,
      serviciosSeleccionados: [...serviciosSeleccionados],
      clausulaTransporte: true
    };
    try {
      if (destino) {
        const respuesta = await apiRequest(`/admin/convenios/${encodeURIComponent(destino.id)}`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
        });
        setConvenios((actuales) => actuales.map((item) => item.id === destino.id ? respuesta.data : item));
        setNotificacion(`Convenio actualizado para ${ipsActual.nombre}.`);
        setConvenioEditandoId(respuesta.data.id);
      } else {
        const respuesta = await apiRequest("/admin/convenios", {
          method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
        });
        setConvenios((actuales) => [respuesta.data, ...actuales]);
        setNotificacion(`Convenio creado para ${ipsActual.nombre}.`);
        setConvenioEditandoId(respuesta.data.id);
      }
    } catch (error) {
      setNotificacion(mensajeError(error));
    }
  };

  const handleEliminarConvenio = async (id) => {
    if (!window.confirm("¿Seguro que deseas desactivar este convenio?")) return;
    try {
      await apiRequest(`/admin/convenios/${encodeURIComponent(id)}/desactivar`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      setConvenios((actuales) => actuales.map((item) => item.id === id
        ? { ...item, estado: "Inactivo", clausulaTransporte: true } : item));
      setNotificacion("Convenio desactivado.");
      if (convenioEditandoId === id) setConvenioEditandoId("");
    } catch (error) {
      setNotificacion(mensajeError(error));
    }
  };

  return {
    convenios, epsId, epsDisponibles, handleCambiarEps, epsActual, ipsId, handleCambiarIps,
    ipsActual, ipsDisponibles, categorias, categoriaFiltro, setCategoriaFiltro,
    serviciosSeleccionados, serviciosFiltrados, convenioEditando: Boolean(convenioEditandoId),
    convenioEditandoId, notificacion, cargando, handleToggleServicio,
    handleSeleccionarTodosCategoria, handleDeseleccionarCategoria, handleRestablecer,
    handleCancelarEdicion, handleEditarConvenio, handleSubmit, handleEliminarConvenio
  };
}
