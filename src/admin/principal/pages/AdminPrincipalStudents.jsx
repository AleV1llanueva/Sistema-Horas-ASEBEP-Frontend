import * as AlertDialog from '@radix-ui/react-alert-dialog'

import {
  Eye,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
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

import {
  cambiarEstadoEstudiante,
  listarEstudiantes,
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

  const [
    pestanaActiva,
    setPestanaActiva,
  ] = useState('activos')

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
   * La vista solamente consume las funciones públicas
   * del servicio y no necesita conocer el origen de los datos.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiantes() {
      setCargando(true)
      setError('')

      try {
        const estudiantesObtenidos =
          await listarEstudiantes()

        if (!componenteMontado) {
          return
        }

        setEstudiantes(
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
          'Error de estudiantes: ',
          errorCarga,
        )

        setEstudiantes([])

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
  }, [recarga])

  /*
   * Los estudiantes eliminados no deben regresar
   * al listado normal de activos o inactivos.
   */
  const estudiantesDisponibles =
    useMemo(
      () =>
        estudiantes.filter(
          (estudiante) =>
            estudiante.eliminado !== true,
        ),
      [estudiantes],
    )

  /*
   * Los contadores no dependen de la búsqueda.
   * Siempre muestran la cantidad real de cada pestaña.
   */
  const cantidadesPorPestana =
    useMemo(
      () => ({
        activos:
          estudiantesDisponibles.filter(
            (estudiante) =>
              estudiante.credenciales
                ?.activo !== false,
          ).length,

        inactivos:
          estudiantesDisponibles.filter(
            (estudiante) =>
              estudiante.credenciales
                ?.activo === false,
          ).length,
      }),
      [estudiantesDisponibles],
    )

  const configuracionPestana =
    PESTANAS_ESTUDIANTES.find(
      (pestana) =>
        pestana.id === pestanaActiva,
    ) ?? PESTANAS_ESTUDIANTES[0]

  /*
   * Primero se seleccionan los estudiantes del estado
   * correspondiente y después se aplica la búsqueda.
   */
  const estudiantesPestana =
    useMemo(
      () =>
        estudiantesDisponibles.filter(
          (estudiante) => {
            const activo =
              estudiante.credenciales
                ?.activo !== false

            return (
              activo ===
              configuracionPestana.activo
            )
          },
        ),
      [
        estudiantesDisponibles,
        configuracionPestana,
      ],
    )

  const estudiantesFiltrados =
    useMemo(() => {
      const textoBuscado =
        normalizarBusqueda(busqueda)

      if (!textoBuscado) {
        return estudiantesPestana
      }

      return estudiantesPestana.filter(
        (estudiante) => {
          const datosPersonales =
            estudiante.datosPersonales ?? {}

          const credenciales =
            estudiante.credenciales ?? {}

          return [
            datosPersonales.nombreCompleto,
            datosPersonales.numeroCuenta,
            datosPersonales.carrera,
            datosPersonales.correoPersonal,
            datosPersonales
              .correoInstitucional,
            credenciales.rol,
          ].some((campo) =>
            normalizarBusqueda(
              campo,
            ).includes(textoBuscado),
          )
        },
      )
    }, [
      estudiantesPestana,
      busqueda,
    ])

  const existenEstudiantes =
    estudiantesDisponibles.length > 0

  const existenResultados =
    estudiantesFiltrados.length > 0

  const hayFiltrosAplicados =
    Boolean(busqueda.trim())

  const accionEsActivacion =
    accionPendiente?.nuevoEstado === true

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
      const estudianteActualizado =
        await cambiarEstadoEstudiante(
          estudianteSeleccionado.id,
          nuevoEstado,
        )

      setEstudiantes(
        (estudiantesActuales) =>
          estudiantesActuales.map(
            (estudianteActual) =>
              estudianteActual.id ===
              estudianteActualizado.id
                ? estudianteActualizado
                : estudianteActual,
          ),
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
                {estudiantesDisponibles.length}
              </strong>

              <span>
                {estudiantesDisponibles.length === 1
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
                {estudiantesFiltrados.length}{' '}
                {estudiantesFiltrados.length === 1
                  ? 'resultado'
                  : 'resultados'}
              </span>
            </header>

            {!existenResultados ? (
              <div className="admin-students-no-results">
                <Search aria-hidden="true" />

                <h3>
                  {estudiantesPestana.length === 0
                    ? 'No hay estudiantes en esta sección'
                    : 'No encontramos resultados'}
                </h3>

                <p>
                  {estudiantesPestana.length === 0
                    ? 'Los estudiantes aparecerán aquí cuando tengan este estado.'
                    : 'Cambia la búsqueda o limpia los filtros aplicados.'}
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
              <div className="admin-students-table-wrapper">
                <table className="admin-students-table">
                  <caption>
                    {
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
                    {estudiantesFiltrados.map(
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
            )}
          </section>
        )}

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
    </div>
  )
}

export default AdminPrincipalStudents