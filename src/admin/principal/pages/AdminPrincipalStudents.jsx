import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  LoaderCircle,
  MailWarning,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  UserCheck,
  UsersRound,
  UserX,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router'

import AdminPagination from '../../shared/components/AdminPagination.jsx'

import {
  asignarCorreoInstitucional,
  cambiarEstadoEstudiante,
  contarEstudiantesPorEstado,
  listarEstudiantesPaginados,
  listarEstudiantesSinCorreo,
} from '../services/adminEstudiantesService.js'

import {
  notificarError,
  notificarExito,
  notificarInformacion,
} from '../../../services/notificationService.js'

import '../styles/AdminPrincipalStudents.css'

/*
 * Cada pestaña define el estado de los estudiantes
 * que se mostrará dentro del listado.
 */
const PESTANAS_ESTUDIANTES = [
  {
    id: 'activos',
    titulo: 'Estudiantes activos',
    tituloListado: 'Estudiantes activos',
    activo: true,
    icono: UserCheck,
  },
  {
    id: 'inactivos',
    titulo: 'Estudiantes inactivos',
    tituloListado: 'Estudiantes inactivos',
    activo: false,
    icono: UserX,
  },
]

/*
 * Con más de mil usuarios registrados, el listado se muestra
 * por páginas para no renderizar todas las filas a la vez.
 */
const ESTUDIANTES_POR_PAGINA = 10

/*
 * A partir de esta cantidad, la sección de correos pendientes
 * se muestra colapsada para no empujar el listado principal.
 */
const LIMITE_CORREOS_VISIBLES = 4

/*
 * Convierte el texto de búsqueda a una forma consistente.
 * Esto permite encontrar nombres aunque se escriban sin tildes.
 */
function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function obtenerIniciales(nombreCompleto) {
  const palabras = normalizarBusqueda(
    nombreCompleto,
  )
    .split(/\s+/)
    .filter(Boolean)

  if (palabras.length === 0) {
    return 'ES'
  }

  return palabras
    .slice(0, 2)
    .map((palabra) =>
      palabra.charAt(0).toUpperCase(),
    )
    .join('')
}

function formatearLempiras(valor) {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return 'L 0.00'
  }

  return `L ${new Intl.NumberFormat(
    'es-HN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(numero)}`
}

function prepararCantidad(valor) {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return 0
  }

  return numero
}

function describirMesesPendientes(
  mesesSinPagar,
) {
  const meses = prepararCantidad(
    mesesSinPagar,
  )

  if (meses === 0) {
    return 'Sin meses pendientes'
  }

  return meses === 1
    ? '1 mes pendiente'
    : `${meses} meses pendientes`
}

function AdminPrincipalStudents() {
  const [
    estudiantes,
    setEstudiantes,
  ] = useState([])

  /*
   * Totales que devuelve el backend para la página consultada.
   */
  const [
    totalEstudiantes,
    setTotalEstudiantes,
  ] = useState(0)

  const [
    totalPaginas,
    setTotalPaginas,
  ] = useState(1)

  const [
    cantidadesPorPestana,
    setCantidadesPorPestana,
  ] = useState({
    activos: 0,
    inactivos: 0,
  })

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    recarga,
    setRecarga,
  ] = useState(0)

  const [
    busqueda,
    setBusqueda,
  ] = useState('')

  /*
   * La búsqueda remota se retrasa 300 ms para no
   * consultar al servidor por cada letra escrita.
   */
  const [
    busquedaAplicada,
    setBusquedaAplicada,
  ] = useState('')

  useEffect(() => {
    const temporizador = window.setTimeout(
      () => {
        setBusquedaAplicada(
          busqueda.trim(),
        )
      },
      300,
    )

    return () => {
      window.clearTimeout(temporizador)
    }
  }, [busqueda])

  const [
    pestanaActiva,
    setPestanaActiva,
  ] = useState('activos')

  const [
    paginaActual,
    setPaginaActual,
  ] = useState(1)

  /*
   * La acción pendiente conserva al estudiante seleccionado
   * mientras se muestra y se cierra el diálogo.
   */
  const [
    accionPendiente,
    setAccionPendiente,
  ] = useState(null)

  const [
    dialogoAccionAbierto,
    setDialogoAccionAbierto,
  ] = useState(false)

  /*
   * Guarda el estudiante que está siendo actualizado.
   * Esto evita repetir una operación antes de que termine.
   */
  const [
    estudianteProcesando,
    setEstudianteProcesando,
  ] = useState('')

  /*
   * Sección independiente para los becarios que todavía
   * no tienen correo institucional asignado. Tiene su propio
   * estado para que un fallo no oculte el listado principal.
   */
  const [
    estudiantesSinCorreo,
    setEstudiantesSinCorreo,
  ] = useState([])

  const [
    cargandoSinCorreo,
    setCargandoSinCorreo,
  ] = useState(true)

  const [
    errorSinCorreo,
    setErrorSinCorreo,
  ] = useState('')

  const [
    recargaSinCorreo,
    setRecargaSinCorreo,
  ] = useState(0)

  const [
    busquedaSinCorreo,
    setBusquedaSinCorreo,
  ] = useState('')

  const [
    correosExpandidos,
    setCorreosExpandidos,
  ] = useState(false)

  /*
   * Diálogo para asignar el correo institucional a un becario
   * que todavía no lo tiene.
   */
  const [
    correoEnEdicion,
    setCorreoEnEdicion,
  ] = useState(null)

  const [
    dialogoCorreoAbierto,
    setDialogoCorreoAbierto,
  ] = useState(false)

  const [
    cuentaProcesandoCorreo,
    setCuentaProcesandoCorreo,
  ] = useState('')

  /*
   * Configuración de la pestaña seleccionada. Se declara antes
   * del efecto porque forma parte de sus dependencias.
   */
  const configuracionPestana =
    PESTANAS_ESTUDIANTES.find(
      (pestana) =>
        pestana.id === pestanaActiva,
    ) ?? PESTANAS_ESTUDIANTES[0]

  /*
   * La vista solamente consume las funciones públicas
   * del servicio y no necesita conocer el origen de los datos.
   * La búsqueda, el filtro por estado, el orden y el conteo
   * se resuelven en el servidor.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiantes() {
      setCargando(true)
      setError('')

      try {
        const paginaObtenida =
          await listarEstudiantesPaginados({
            pagina: paginaActual,
            limite: ESTUDIANTES_POR_PAGINA,
            busqueda: busquedaAplicada,
            activo:
              configuracionPestana.activo,
          })

        if (!componenteMontado) {
          return
        }

        setEstudiantes(paginaObtenida.elementos)
        setTotalEstudiantes(paginaObtenida.total)
        setTotalPaginas(
          paginaObtenida.totalPaginas,
        )
      } catch (errorCarga) {
        if (!componenteMontado) {
          return
        }

        console.log(
          'Error de estudiantes: ',
          errorCarga,
        )

        setEstudiantes([])
        setTotalEstudiantes(0)
        setTotalPaginas(1)

        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : 'No fue posible cargar los estudiantes.',
        )
      } finally {
        if (componenteMontado) {
          setCargando(false)
        }
      }
    }

    cargarEstudiantes()

    return () => {
      componenteMontado = false
    }
  }, [
    recarga,
    paginaActual,
    busquedaAplicada,
    configuracionPestana.activo,
  ])

  /*
   * Los contadores de las pestañas no dependen de la búsqueda
   * ni de la página actual, por eso se consultan por separado.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarCantidades() {
      try {
        const cantidades =
          await contarEstudiantesPorEstado()

        if (componenteMontado) {
          setCantidadesPorPestana(
            cantidades,
          )
        }
      } catch (errorConteo) {
        console.log(
          'Error al contar estudiantes: ',
          errorConteo,
        )
      }
    }

    cargarCantidades()

    return () => {
      componenteMontado = false
    }
  }, [recarga])

  /*
   * Carga los usuarios sin correo institucional mediante
   * el endpoint dedicado, sin mezclarse con el listado general.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiantesSinCorreo() {
      setCargandoSinCorreo(true)
      setErrorSinCorreo('')

      try {
        const estudiantesObtenidos =
          await listarEstudiantesSinCorreo()

        if (!componenteMontado) {
          return
        }

        setEstudiantesSinCorreo(
          Array.isArray(
            estudiantesObtenidos,
          )
            ? estudiantesObtenidos
            : [],
        )
      } catch (errorCarga) {
        if (!componenteMontado) {
          return
        }

        console.log(
          'Error de estudiantes sin correo: ',
          errorCarga,
        )

        setEstudiantesSinCorreo([])

        setErrorSinCorreo(
          errorCarga instanceof Error
            ? errorCarga.message
            : 'No fue posible cargar los estudiantes sin correo.',
        )
      } finally {
        if (componenteMontado) {
          setCargandoSinCorreo(false)
        }
      }
    }

    cargarEstudiantesSinCorreo()

    return () => {
      componenteMontado = false
    }
  }, [recargaSinCorreo])

  /*
   * El backend ya devuelve únicamente la página, el estado
   * y la búsqueda solicitados, por lo que el listado se usa tal cual.
   */
  const estudiantesPagina = estudiantes

  const existenEstudiantes =
    totalEstudiantes > 0

  const existenResultados =
    estudiantesPagina.length > 0

  /*
   * Al cambiar de pestaña o de búsqueda regresamos al inicio
   * para no quedar en una página que ya no existe.
   */
  useEffect(() => {
    setPaginaActual(1)
  }, [pestanaActiva, busquedaAplicada])

  /*
   * Si la página solicitada quedó fuera de rango (por ejemplo
   * al desactivar al último estudiante de la última página),
   * regresamos a la última página disponible.
   */
  useEffect(() => {
    if (
      !cargando &&
      !error &&
      paginaActual > totalPaginas
    ) {
      setPaginaActual(totalPaginas)
    }
  }, [
    cargando,
    error,
    paginaActual,
    totalPaginas,
  ])

  const primerEstudianteMostrado =
    existenResultados
      ? (paginaActual - 1) *
        ESTUDIANTES_POR_PAGINA +
        1
      : 0

  const ultimoEstudianteMostrado =
    Math.min(
      paginaActual *
        ESTUDIANTES_POR_PAGINA,
      totalEstudiantes,
    )

  const hayFiltrosAplicados =
    Boolean(busqueda.trim())

  const accionEsActivacion =
    accionPendiente?.nuevoEstado === true

  const estudiantesSinCorreoFiltrados =
    useMemo(() => {
      const textoBuscado =
        normalizarBusqueda(busquedaSinCorreo)

      if (!textoBuscado) {
        return estudiantesSinCorreo
      }

      return estudiantesSinCorreo.filter(
        (estudiante) => {
          const datosPersonales =
            estudiante.datosPersonales ?? {}

          return [
            datosPersonales.nombreCompleto,
            datosPersonales.numeroCuenta,
            datosPersonales.carrera,
            datosPersonales.correoPersonal,
            datosPersonales.telefono,
          ].some((campo) =>
            normalizarBusqueda(
              campo,
            ).includes(textoBuscado),
          )
        },
      )
    }, [
      estudiantesSinCorreo,
      busquedaSinCorreo,
    ])

  /*
   * Abre el diálogo de asignación de correo con el estudiante
   * seleccionado y un valor inicial sugerido.
   */
  function abrirDialogoCorreo(estudiante) {
    const numeroCuenta =
      estudiante?.datosPersonales
        ?.numeroCuenta

    if (!numeroCuenta || cuentaProcesandoCorreo) {
      return
    }

    setCorreoEnEdicion({
      estudiante,
      correo: '',
      error: '',
    })

    setDialogoCorreoAbierto(true)
  }

  function cerrarDialogoCorreo() {
    if (cuentaProcesandoCorreo) {
      return
    }

    setDialogoCorreoAbierto(false)
  }

  async function confirmarAsignacionCorreo() {
    const estudiante =
      correoEnEdicion?.estudiante

    const numeroCuenta =
      estudiante?.datosPersonales
        ?.numeroCuenta

    if (!numeroCuenta || cuentaProcesandoCorreo) {
      return
    }

    const correo =
      correoEnEdicion.correo.trim()

    if (!correo) {
      setCorreoEnEdicion(
        (actual) => ({
          ...actual,
          error:
            'El correo institucional es obligatorio.',
        }),
      )

      return
    }

    setCuentaProcesandoCorreo(numeroCuenta)

    try {
      await asignarCorreoInstitucional(
        numeroCuenta,
        correo,
      )

      /*
       * El registro deja de pertenecer a esta sección,
       * y también aparece en el listado principal.
       */
      setEstudiantesSinCorreo(
        (actuales) =>
          actuales.filter(
            (actual) =>
              actual.datosPersonales
                ?.numeroCuenta !==
              numeroCuenta,
          ),
      )

      setCantidadesPorPestana(
        (actuales) => ({
          activos: actuales.activos + 1,
          inactivos: actuales.inactivos,
        }),
      )

      setDialogoCorreoAbierto(false)

      notificarExito({
        id: `correo-asignado-${numeroCuenta}`,
        titulo: 'Correo institucional asignado',
        descripcion:
          'El estudiante ya puede iniciar sesión con su correo institucional.',
      })

      setRecarga((valorActual) => valorActual + 1)
    } catch (errorAsignacion) {
      setCorreoEnEdicion(
        (actual) => ({
          ...actual,
          error:
            errorAsignacion instanceof Error
              ? errorAsignacion.message
              : 'Ocurrió un error inesperado.',
        }),
      )
    } finally {
      setCuentaProcesandoCorreo('')
    }
  }

  function reintentarCargaSinCorreo() {
    setRecargaSinCorreo(
      (valorActual) =>
        valorActual + 1,
    )
  }

  /*
   * La sección de correos pendientes se recorta para que
   * no desplace el listado principal fuera de la vista.
   */
  const correosRequierenRecorte =
    estudiantesSinCorreoFiltrados.length >
    LIMITE_CORREOS_VISIBLES

  const correosVisibles =
    correosRequierenRecorte &&
      !correosExpandidos
      ? estudiantesSinCorreoFiltrados.slice(
        0,
        LIMITE_CORREOS_VISIBLES,
      )
      : estudiantesSinCorreoFiltrados

  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  function seleccionarPestana(
    identificador,
  ) {
    setPestanaActiva(identificador)
  }

  function limpiarFiltros() {
    setBusqueda('')
  }

  /*
   * Abre la confirmación utilizando el mismo comportamiento
   * empleado para las actividades.
   */
  function solicitarCambioEstado(
    estudiante,
  ) {
    if (
      !estudiante?.id ||
      estudianteProcesando
    ) {
      return
    }

    const activo =
      estudiante.credenciales
        ?.activo !== false

    setAccionPendiente({
      estudiante,
      nuevoEstado: !activo,
    })

    setDialogoAccionAbierto(true)
  }

  function cerrarDialogoAccion() {
    if (estudianteProcesando) {
      return
    }

    /*
     * La acción se conserva durante el cierre para que
     * el contenido no cambie antes de terminar la animación.
     */
    setDialogoAccionAbierto(false)
  }

  /*
   * Cambia el estado y reemplaza solamente al estudiante
   * actualizado dentro del listado.
   */
  async function confirmarCambioEstado() {
    if (
      !accionPendiente?.estudiante?.id ||
      estudianteProcesando
    ) {
      return
    }

    const estudianteSeleccionado =
      accionPendiente.estudiante

    const nuevoEstado =
      accionPendiente.nuevoEstado

    setEstudianteProcesando(
      estudianteSeleccionado.id,
    )

    try {
      await cambiarEstadoEstudiante(
        estudianteSeleccionado.id,
        nuevoEstado,
      )

      setDialogoAccionAbierto(false)

      notificarExito({
        id:
          `estado-estudiante-${estudianteSeleccionado.id}`,
        titulo: nuevoEstado
          ? 'Estudiante activado'
          : 'Estudiante desactivado',
        descripcion: nuevoEstado
          ? 'El estudiante vuelve a estar activo dentro del sistema.'
          : 'El estudiante fue desactivado correctamente.',
      })

      /*
       * El estudiante puede dejar de pertenecer a la página o
       * a la pestaña actual, y los contadores cambian.
       */
      setRecarga((valorActual) => valorActual + 1)
    } catch (errorActualizacion) {
      notificarError({
        id:
          `error-estado-estudiante-${estudianteSeleccionado.id}`,
        titulo:
          'No fue posible cambiar el estado',
        descripcion:
          errorActualizacion instanceof Error
            ? errorActualizacion.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setEstudianteProcesando('')
    }
  }

  /*
   * El backend todavía no permite eliminar estudiantes.
   * El botón se conserva preparado mientras llega el contrato.
   */
  function mostrarEliminacionPendiente(
    estudiante,
  ) {
    const nombre =
      estudiante.datosPersonales
        ?.nombreCompleto ||
      'el estudiante seleccionado'

    notificarInformacion({
      id:
        `eliminar-estudiante-pendiente-${estudiante.id}`,
      titulo:
        'Eliminación disponible próximamente',
      descripcion:
        `La opción para eliminar a ${nombre} todavía no está disponible en el backend.`,
    })
  }

  return (
    <div className="admin-students-page">
      {/* Encabezado principal de la vista. */}
      <header className="admin-students-heading">
        <div>
          <p className="admin-students-heading__eyebrow">
            Gestión de estudiantes
          </p>

          <h1>Estudiantes</h1>

          <p>
            Consulta la información académica,
            las horas y el estado de los
            estudiantes becarios.
          </p>
        </div>

        <div className="admin-students-heading__actions">
          {/* Muestra el total general de estudiantes registrados. */}
          <div className="admin-students-heading__summary">
            <UsersRound aria-hidden="true" />

            <div>
              <strong>
                {totalEstudiantes}
              </strong>

              <span>
                {totalEstudiantes === 1
                  ? 'Estudiante registrado'
                  : 'Estudiantes registrados'}
              </span>
            </div>
          </div>

          {/* Permite registrar un estudiante nuevo. */}
          <Link
            className="admin-students-add-button"
            to="/admin-principal/estudiantes/crear"
          >
            <Plus aria-hidden="true" />

            Añadir estudiante
          </Link>
        </div>
      </header>

      {/*
        * Sección separada de los becarios que aún no tienen
        * correo institucional asignado (/usuarios/sin-correo).
        * Se ubica antes del listado porque requiere acción
        * y no debería quedar al final de una tabla extensa.
        */}
      <section
        className="admin-students-missing-email"
        aria-labelledby="admin-students-missing-email-title"
      >
        <header className="admin-students-missing-email__header">
          <div className="admin-students-missing-email__heading">
            <span
              className="admin-students-missing-email__icon"
              aria-hidden="true"
            >
              <MailWarning />
            </span>

            <div>
              <p>Correos pendientes</p>

              <h2 id="admin-students-missing-email-title">
                Estudiantes sin correo institucional
              </h2>

              <span>
                Becarios registrados a los que
                todavía no se les ha asignado un
                correo institucional.
              </span>
            </div>
          </div>

          <div className="admin-students-missing-email__actions">
            <span className="admin-students-missing-email__count">
              {cargandoSinCorreo
                ? '…'
                : estudiantesSinCorreo.length}
            </span>

            <button
              className="admin-students-missing-email__refresh"
              type="button"
              disabled={cargandoSinCorreo}
              onClick={reintentarCargaSinCorreo}
            >
              <RefreshCw
                className={
                  cargandoSinCorreo
                    ? 'admin-students-missing-email__refresh-icon'
                    : undefined
                }
                aria-hidden="true"
              />

              Actualizar
            </button>
          </div>
        </header>

        {cargandoSinCorreo && (
          <div
            className="admin-students-missing-email__state"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              className="admin-students-state__loader"
              aria-hidden="true"
            />

            <p>
              Buscando estudiantes sin correo…
            </p>
          </div>
        )}

        {!cargandoSinCorreo && errorSinCorreo && (
          <div
            className="admin-students-missing-email__state admin-students-missing-email__state--error"
            role="alert"
          >
            <TriangleAlert aria-hidden="true" />

            <p>{errorSinCorreo}</p>

            <button
              type="button"
              onClick={reintentarCargaSinCorreo}
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {!cargandoSinCorreo &&
          !errorSinCorreo &&
          estudiantesSinCorreo.length === 0 && (
            <div className="admin-students-missing-email__state">
              <MailWarning aria-hidden="true" />

              <p>
                Todos los estudiantes
                registrados tienen correo
                institucional asignado.
              </p>
            </div>
          )}

        {!cargandoSinCorreo &&
          !errorSinCorreo &&
          estudiantesSinCorreo.length > 0 && (
            <>
              <div className="admin-students-missing-email__toolbar">
                <label className="admin-students-search">
                  <span>
                    Buscar en esta sección
                  </span>

                  <div className="admin-students-search__control">
                    <Search aria-hidden="true" />

                    <input
                      type="search"
                      value={busquedaSinCorreo}
                      placeholder="Buscar por nombre, cuenta o carrera"
                      onChange={(evento) =>
                        setBusquedaSinCorreo(
                          evento.target.value,
                        )
                      }
                    />
                  </div>
                </label>
              </div>

              {estudiantesSinCorreoFiltrados.length === 0 ? (
                <div className="admin-students-missing-email__state">
                  <Search aria-hidden="true" />

                  <p>
                    No encontramos estudiantes
                    sin correo con esa
                    búsqueda.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setBusquedaSinCorreo('')
                    }
                  >
                    <X aria-hidden="true" />
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <ul className="admin-students-missing-email__grid">
                  {correosVisibles.map(
                    (estudiante) => {
                      const datosPersonales =
                        estudiante
                          .datosPersonales ?? {}

                      const numeroCuenta =
                        datosPersonales
                          .numeroCuenta

                      const nombreCompleto =
                        datosPersonales
                          .nombreCompleto ||
                        'Estudiante sin nombre'

                      const activo =
                        estudiante.credenciales
                          ?.activo !== false

                      return (
                        <li
                          key={
                            estudiante.id ??
                            numeroCuenta
                          }
                          className="admin-students-missing-email__card"
                        >
                          <div className="admin-students-missing-email__card-head">
                            <div className="admin-student-identity">
                              <span
                                className="admin-student-identity__avatar"
                                aria-hidden="true"
                              >
                                {obtenerIniciales(
                                  nombreCompleto,
                                )}
                              </span>

                              <div>
                                <strong>
                                  {nombreCompleto}
                                </strong>

                                <small>
                                  N.º{' '}
                                  {numeroCuenta ||
                                    'Sin cuenta'}
                                </small>
                              </div>
                            </div>

                            <span
                              className={
                                activo
                                  ? 'admin-student-status admin-student-status--active'
                                  : 'admin-student-status admin-student-status--inactive'
                              }
                            >
                              {activo
                                ? 'Activo'
                                : 'Inactivo'}
                            </span>
                          </div>

                          <dl className="admin-students-missing-email__details">
                            <div>
                              <dt>Carrera</dt>

                              <dd>
                                {datosPersonales
                                  .carrera ||
                                  'Carrera no disponible'}
                              </dd>
                            </div>

                            <div>
                              <dt>Teléfono</dt>

                              <dd>
                                {datosPersonales
                                  .telefono ||
                                  'Sin teléfono'}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Correo personal
                              </dt>

                              <dd>
                                {datosPersonales
                                  .correoPersonal ||
                                  'Sin correo personal'}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Correo institucional
                              </dt>

                              <dd className="admin-students-missing-email__missing-email">
                                No asignado
                              </dd>
                            </div>
                          </dl>

                          <div className="admin-students-missing-email__card-actions">
                            <button
                              className="admin-students-missing-email__assign"
                              type="button"
                              disabled={
                                cuentaProcesandoCorreo ===
                                numeroCuenta
                              }
                              aria-label={
                                `Asignar correo institucional a ${nombreCompleto}`
                              }
                              onClick={() =>
                                abrirDialogoCorreo(
                                  estudiante,
                                )
                              }
                            >
                              {cuentaProcesandoCorreo ===
                                numeroCuenta ? (
                                <LoaderCircle
                                  className="admin-student-actions__loader"
                                  aria-hidden="true"
                                />
                              ) : (
                                <MailWarning aria-hidden="true" />
                              )}

                              Asignar correo
                            </button>
                          </div>
                        </li>
                      )
                    },
                  )}
                </ul>
              )}

              {correosRequierenRecorte && (
                <button
                  className="admin-students-missing-email__toggle"
                  type="button"
                  aria-expanded={correosExpandidos}
                  onClick={() =>
                    setCorreosExpandidos(
                      (expandido) => !expandido,
                    )
                  }
                >
                  {correosExpandidos
                    ? 'Mostrar menos'
                    : `Mostrar los ${estudiantesSinCorreoFiltrados.length - LIMITE_CORREOS_VISIBLES} restantes`}

                  {correosExpandidos ? (
                    <ChevronLeft
                      className="admin-students-missing-email__toggle-icon"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="admin-students-missing-email__toggle-icon"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )}
            </>
          )}
      </section>

      {!cargando && !error && (
        <>
          {/* Menú para cambiar entre activos e inactivos. */}
          <div
            className="admin-students-tabs"
            role="tablist"
            aria-label="Clasificación de estudiantes"
          >
            {PESTANAS_ESTUDIANTES.map(
              (pestana) => {
                const IconoPestana =
                  pestana.icono

                const seleccionada =
                  pestanaActiva ===
                  pestana.id

                return (
                  <button
                    key={pestana.id}
                    id={
                      `admin-students-tab-${pestana.id}`
                    }
                    className={
                      seleccionada
                        ? 'admin-students-tab admin-students-tab--active'
                        : 'admin-students-tab'
                    }
                    type="button"
                    role="tab"
                    aria-selected={
                      seleccionada
                    }
                    aria-controls="admin-students-tab-panel"
                    onClick={() =>
                      seleccionarPestana(
                        pestana.id,
                      )
                    }
                  >
                    <IconoPestana
                      aria-hidden="true"
                    />

                    <span>
                      {pestana.titulo}
                    </span>

                    <small>
                      {
                        cantidadesPorPestana[
                        pestana.id
                        ]
                      }
                    </small>
                  </button>
                )
              },
            )}
          </div>

          {/* La búsqueda trabaja sobre la pestaña seleccionada. */}
          <section
            className="admin-students-toolbar"
            aria-label="Filtros de estudiantes"
          >
            <label className="admin-students-search">
              <span>Buscar estudiante</span>

              <div className="admin-students-search__control">
                <Search aria-hidden="true" />

                <input
                  type="search"
                  value={busqueda}
                  placeholder="Buscar por nombre, cuenta o carrera"
                  onChange={(evento) =>
                    setBusqueda(
                      evento.target.value,
                    )
                  }
                />
              </div>
            </label>

            <button
              className="admin-students-clear-button"
              type="button"
              disabled={
                !hayFiltrosAplicados
              }
              onClick={limpiarFiltros}
            >
              <X aria-hidden="true" />
              Limpiar filtros
            </button>
          </section>
        </>
      )}

      {cargando && (
        <section
          className="admin-students-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-students-state__loader"
            aria-hidden="true"
          />

          <h2>Cargando estudiantes</h2>

          <p>
            Estamos preparando la información
            de los estudiantes becarios.
          </p>
        </section>
      )}

      {!cargando && error && (
        <section
          className="admin-students-state admin-students-state--error"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />

          <h2>
            No fue posible cargar los estudiantes
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={reintentarCarga}
          >
            Intentar nuevamente
          </button>
        </section>
      )}

      {!cargando &&
        !error &&
        !existenEstudiantes && (
          <section className="admin-students-state">
            <GraduationCap aria-hidden="true" />

            <h2>
              No hay estudiantes registrados
            </h2>

            <p>
              Los estudiantes disponibles
              aparecerán en este espacio.
            </p>
          </section>
        )}

      {!cargando &&
        !error &&
        existenEstudiantes && (
          <section
            /*
             * La key vuelve a montar el panel cuando cambia
             * la pestaña y permite repetir la animación.
             */
            key={pestanaActiva}
            id="admin-students-tab-panel"
            className="admin-students-list"
            role="tabpanel"
            aria-labelledby={
              `admin-students-tab-${pestanaActiva}`
            }
            aria-busy={
              Boolean(estudianteProcesando)
            }
          >
            <header className="admin-students-list__header">
              <div>
                <p>Listado</p>

                <h2 id="admin-students-list-title">
                  {
                    configuracionPestana
                      .tituloListado
                  }
                </h2>
              </div>

              <span>
                {totalEstudiantes}{' '}
                {totalEstudiantes === 1
                  ? 'resultado'
                  : 'resultados'}
              </span>
            </header>

            {!existenResultados ? (
              <div className="admin-students-no-results">
                <Search aria-hidden="true" />

                <h3>
                  {hayFiltrosAplicados
                    ? 'No encontramos resultados'
                    : 'No hay estudiantes en esta sección'}
                </h3>

                <p>
                  {hayFiltrosAplicados
                    ? 'Cambia la búsqueda o limpia los filtros aplicados.'
                    : 'Los estudiantes aparecerán aquí cuando tengan este estado.'}
                </p>

                {hayFiltrosAplicados && (
                  <button
                    className="admin-students-no-results__clear"
                    type="button"
                    onClick={limpiarFiltros}
                  >
                    <X aria-hidden="true" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="admin-students-table-wrapper">
                  <table className="admin-students-table">
                    <caption>{
                      configuracionPestana
                        .tituloListado
                    }
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">
                          Estudiante
                        </th>

                        <th scope="col">
                          Carrera
                        </th>

                        <th scope="col">
                          Progreso de horas
                        </th>

                        <th scope="col">
                          Aportaciones pendientes
                        </th>

                        <th scope="col">
                          Estado
                        </th>

                        <th scope="col">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {estudiantesPagina.map(
                        (estudiante) => {
                          const datosPersonales =
                            estudiante
                              .datosPersonales ?? {}

                          const datosBecario =
                            estudiante
                              .datosBecario ?? {}

                          const activo =
                            estudiante
                              .credenciales
                              ?.activo !== false

                          const procesando =
                            estudianteProcesando ===
                            estudiante.id

                          const numeroCuenta =
                            datosPersonales
                              .numeroCuenta

                          const nombreCompleto =
                            datosPersonales
                              .nombreCompleto ||
                            'Estudiante sin nombre'

                          return (
                            <tr key={estudiante.id}>
                              <th scope="row" data-label="Estudiante">
                                <div className="admin-student-identity">
                                  <span
                                    className="admin-student-identity__avatar"
                                    aria-hidden="true"
                                  >
                                    {obtenerIniciales(
                                      nombreCompleto,
                                    )}
                                  </span>

                                  <div>
                                    <strong>
                                      {nombreCompleto}
                                    </strong>

                                    <small>
                                      N.º{' '}
                                      {numeroCuenta ||
                                        'Sin cuenta'}
                                    </small>
                                  </div>
                                </div>
                              </th>

                              <td data-label="Carrera">
                                <span className="admin-student-career">
                                  {datosPersonales
                                    .carrera ||
                                    'Carrera no disponible'}
                                </span>
                              </td>

                              <td data-label="Progreso de horas">
                                <div className="admin-student-hours">
                                  <strong>
                                    {prepararCantidad(
                                      datosBecario
                                        .horasAcumuladas,
                                    )}{' '}
                                    acumuladas
                                  </strong>

                                  <small>
                                    {prepararCantidad(
                                      datosBecario
                                        .horasFaltantes,
                                    )}{' '}
                                    faltantes
                                  </small>
                                </div>
                              </td>

                              <td data-label="Aportaciones">
                                <div className="admin-student-contributions">
                                  <strong>
                                    {formatearLempiras(
                                      estudiante
                                        .saldoAportacionesPendientes,
                                    )}
                                  </strong>

                                  <small>
                                    {describirMesesPendientes(
                                      datosBecario
                                        .mesesSinPagar,
                                    )}
                                  </small>
                                </div>
                              </td>

                              <td data-label="Estado">
                                <span
                                  className={
                                    activo
                                      ? 'admin-student-status admin-student-status--active'
                                      : 'admin-student-status admin-student-status--inactive'
                                  }
                                >
                                  {activo
                                    ? 'Activo'
                                    : 'Inactivo'}
                                </span>
                              </td>

                              <td data-label="Acciones">
                                <div className="admin-student-actions">
                                  <Link
                                    to={
                                      '/admin-principal/estudiantes/' +
                                      encodeURIComponent(
                                        numeroCuenta,
                                      )
                                    }
                                    title="Ver estudiante"
                                    aria-label={
                                      `Ver información de ${nombreCompleto}`
                                    }
                                  >
                                    <Eye aria-hidden="true" />
                                  </Link>

                                  <Link to={'/admin-principal/estudiantes/' +
                                    encodeURIComponent(
                                      numeroCuenta,
                                    ) +
                                    '/editar'
                                  }
                                    title="Editar estudiante"
                                    aria-label={
                                      `Editar información de ${nombreCompleto}`
                                    }
                                  >
                                    <Pencil aria-hidden="true" />
                                  </Link>

                                  <button
                                    type="button"
                                    title={
                                      activo
                                        ? 'Desactivar estudiante'
                                        : 'Activar estudiante'
                                    }
                                    aria-label={
                                      activo
                                        ? `Desactivar a ${nombreCompleto}`
                                        : `Activar a ${nombreCompleto}`
                                    }
                                    disabled={procesando}
                                    onClick={() =>
                                      solicitarCambioEstado(
                                        estudiante,
                                      )
                                    }
                                  >
                                    {procesando ? (
                                      <LoaderCircle
                                        className="admin-student-actions__loader"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Power aria-hidden="true" />
                                    )}
                                  </button>

                                  <button
                                    className="admin-student-actions__delete"
                                    type="button"
                                    title="Eliminar estudiante"
                                    aria-label={
                                      `Eliminar a ${nombreCompleto}`
                                    }
                                    disabled={procesando}
                                    onClick={() =>
                                      mostrarEliminacionPendiente(
                                        estudiante,
                                      )
                                    }
                                  >
                                    <Trash2 aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="admin-students-pagination">
                    <p>
                      Mostrando{' '}
                      {primerEstudianteMostrado} a{' '}
                      {ultimoEstudianteMostrado} de{' '}
                      {totalEstudiantes}{' '}
                      {totalEstudiantes === 1
                        ? 'estudiante'
                        : 'estudiantes'}
                    </p>

                    <AdminPagination
                      paginaActual={paginaActual}
                      totalPaginas={totalPaginas}
                      cambiarPagina={setPaginaActual}
                      etiqueta="Paginación de estudiantes"
                    />
                  </div>
                )}
              </>
            )}
          </section>
        )
      }

      {/* Diálogo para asignar el correo institucional pendiente. */}
      <AlertDialog.Root
        open={dialogoCorreoAbierto}
        onOpenChange={(abierto) => {
          if (!cuentaProcesandoCorreo) {
            setDialogoCorreoAbierto(abierto)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-student-confirm-dialog__overlay" />

          <AlertDialog.Content className="admin-student-confirm-dialog__content">
            <div className="admin-student-confirm-dialog__icon admin-student-confirm-dialog__icon--activate">
              <MailWarning aria-hidden="true" />
            </div>

            <AlertDialog.Title className="admin-student-confirm-dialog__title">
              Asignar correo institucional
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-student-confirm-dialog__description">
              El correo debe pertenecer al dominio
              institucional. Se guardará en
              minúsculas y sin espacios.
            </AlertDialog.Description>

            <p className="admin-student-confirm-dialog__student">
              {
                correoEnEdicion?.estudiante
                  ?.datosPersonales
                  ?.nombreCompleto
              }{' '}
            </p>

            <label className="admin-students-missing-email__field">
              <span>Correo institucional</span>

              <input
                type="email"
                value={correoEnEdicion?.correo ?? ''}
                placeholder="usuario@unah.hn"
                autoComplete="off"
                spellCheck="false"
                disabled={
                  Boolean(cuentaProcesandoCorreo)
                }
                onChange={(evento) =>
                  setCorreoEnEdicion(
                    (actual) =>
                      actual && {
                        ...actual,
                        correo:
                          evento.target.value,
                        error: '',
                      },
                  )
                }
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault()
                    confirmarAsignacionCorreo()
                  }
                }}
              />
            </label>

            {correoEnEdicion?.error && (
              <p
                className="admin-students-missing-email__field-error"
                role="alert"
              >
                {correoEnEdicion.error}
              </p>
            )}

            <div className="admin-student-confirm-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-student-confirm-dialog__cancel"
                  type="button"
                  disabled={
                    Boolean(cuentaProcesandoCorreo)
                  }
                  onClick={cerrarDialogoCorreo}
                >
                  Cancelar
                </button>
              </AlertDialog.Cancel>

              <button
                className="admin-student-confirm-dialog__confirm admin-student-confirm-dialog__confirm--activate"
                type="button"
                disabled={
                  Boolean(cuentaProcesandoCorreo)
                }
                onClick={confirmarAsignacionCorreo}
              >
                {cuentaProcesandoCorreo ? (
                  <LoaderCircle
                    className="admin-student-confirm-dialog__loader"
                    aria-hidden="true"
                  />
                ) : (
                  <MailWarning aria-hidden="true" />
                )}

                {cuentaProcesandoCorreo
                  ? 'Guardando...'
                  : 'Asignar correo'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Confirmación para activar o desactivar al estudiante. */}
      <AlertDialog.Root
        open={dialogoAccionAbierto}
        onOpenChange={(abierto) => {
          if (!estudianteProcesando) {
            setDialogoAccionAbierto(
              abierto,
            )
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-student-confirm-dialog__overlay" />

          <AlertDialog.Content className="admin-student-confirm-dialog__content">
            <div
              className={
                accionEsActivacion
                  ? 'admin-student-confirm-dialog__icon admin-student-confirm-dialog__icon--activate'
                  : 'admin-student-confirm-dialog__icon admin-student-confirm-dialog__icon--deactivate'
              }
            >
              <Power aria-hidden="true" />
            </div>

            <AlertDialog.Title className="admin-student-confirm-dialog__title">
              {accionEsActivacion
                ? 'Activar estudiante'
                : 'Desactivar estudiante'}
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-student-confirm-dialog__description">
              {accionEsActivacion
                ? 'El estudiante volverá a estar activo dentro del sistema.'
                : 'El estudiante dejará de tener acceso, pero su cuenta y toda su información permanecerán guardadas.'}
            </AlertDialog.Description>

            <p className="admin-student-confirm-dialog__student">
              {
                accionPendiente
                  ?.estudiante
                  ?.datosPersonales
                  ?.nombreCompleto
              }
            </p>

            <div className="admin-student-confirm-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-student-confirm-dialog__cancel"
                  type="button"
                  disabled={
                    Boolean(
                      estudianteProcesando,
                    )
                  }
                  onClick={
                    cerrarDialogoAccion
                  }
                >
                  Cancelar
                </button>
              </AlertDialog.Cancel>

              <button
                className={
                  accionEsActivacion
                    ? 'admin-student-confirm-dialog__confirm admin-student-confirm-dialog__confirm--activate'
                    : 'admin-student-confirm-dialog__confirm admin-student-confirm-dialog__confirm--deactivate'
                }
                type="button"
                disabled={
                  Boolean(
                    estudianteProcesando,
                  )
                }
                onClick={
                  confirmarCambioEstado
                }
              >
                {estudianteProcesando ? (
                  <LoaderCircle
                    className="admin-student-confirm-dialog__loader"
                    aria-hidden="true"
                  />
                ) : (
                  <Power aria-hidden="true" />
                )}

                {estudianteProcesando
                  ? 'Procesando...'
                  : accionEsActivacion
                    ? 'Activar estudiante'
                    : 'Desactivar estudiante'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div >
  )
}

export default AdminPrincipalStudents
