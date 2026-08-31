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
    UsersRound,
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
    limpiarNotificaciones,
    notificarError,
    notificarExito,
    notificarInformacion,
    solicitarConfirmacion,
} from '../../../services/notificationService.js'

import '../styles/AdminPrincipalStudents.css'

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

    if (!Number.isFinite(numero) || numero < 0) {
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

    if (!Number.isFinite(numero) || numero < 0) {
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
        estadoSeleccionado,
        setEstadoSeleccionado,
    ] = useState('todos')

    /*
    * Guarda el estudiante que esta siendo actualizado.
    * Esto impide repetir una operacion mientras el servicio
    * esta operando todavia procesando la solicitud anterior.
    */
   const [
    estudianteProcesando,
    setEstudianteProcesando,
   ] = useState('')

   /*
   * La vista consume unicamente las funciones publicas del servicio.
   * Con la API, la pagina no necesita saber el origen real de los datos.
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
  - La busqueda considera nombre, numero de cuenta, carrera
  - y correos sin alterar el arreglo original.
  */

  const estudiantesFiltrados = useMemo(() => {
    const textoBuscado = normalizarBusqueda(busqueda)

    return estudiantes.filter(
        (estudiante) => {
            if (estudiante.eliminado === true) {
                return false
            }

            const datosPersonales = estudiante.datosPersonales ?? {}

            const activo = estudiante.credenciales ?.activo !== false

            const coincideBusqueda = !textoBuscado ||
            [
                datosPersonales.nombreCompleto,
                datosPersonales.numeroCuenta,
                datosPersonales.carrera,
                datosPersonales.correoPersonal,
                datosPersonales.correoInstitucional,
            ].some((campo) =>
                normalizarBusqueda(
                    campo,
                ).includes(textoBuscado),
            )

            const coincideEstado = estadoSeleccionado === 'todos' ||
            (
                estadoSeleccionado === 'activos' && activo
            ) ||
            (
                estadoSeleccionado === 'inactivos' && !activo
            )

            return (
                coincideBusqueda && coincideEstado
            )
        },
    )
  }, [
    estudiantes,
    busqueda,
    estadoSeleccionado,
  ])

  const existenEstudiantes = estudiantes.length > 0
  const existenResultados = estudiantesFiltrados.length > 0

  function reintentarCarga() {
    setRecarga(
        (valorActual) =>
            valorActual + 1,
    )
  }

  function mostrarRegistroPendiente() {
    notificarInformacion({
        id: 'registrar-estudiante-pendiente',
        titulo: 'Registro disponible próximamente',
        descripcion: 'La función para añadir nuevos estudiantes estará disponible proximamente.',
    })
  }

  function mostrarEdicionPendiente(
    estudiante,
  ) {
    const nombre = estudiante.datosPersonales
        ?.nombreCompleto || 'este estudiante'
    
    notificarInformacion({
        id: 'editar-estudiante-pendiente',
        titulo: 'Edición disponible próximamente',
        descripcion: `La información de ${nombre} podrá editarse en los avances venideros.`,
    })
  }

  async function procesarCambioEstado(
    estudiante,
    nuevoEstado,
    idConfirmacion,
  ) {
    limpiarNotificaciones(
        idConfirmacion,
    )

    setEstudianteProcesando(
        estudiante.id,
    )

    try {
        const estudianteActualizado =
            await cambiarEstadoEstudiante(
                estudiante.id,
                nuevoEstado,
            )

            /*
            * Sustituimos unicamente el registro actualizado.
            * No es necesario volver a consultar todo el listado.
            */
           setEstudiantes(
            (estudiantesActuales) =>
                estudiantesActuales.map(
                    (estudianteActual) =>
                        estudianteActual.id === estudianteActualizado.id
                        ? estudianteActualizado
                        : estudianteActual,
                ),
           )

           notificarExito({
            id: `estado-estudiante-${estudiante.id}`,
            titulo: nuevoEstado
                ? 'Estudiante activado'
                : 'Estudiante desactivado',
            descripcion: nuevoEstado
                ? 'El estudiante vuelve a estar activo dentro del sistema.'
                : 'El estudiante fue desactivado correctamente.',
           })
    } catch (errorActualizacion) {
        notificarError({
            id: `error-estado-estudiante-${estudiante.id}`,
            titulo: 'No fue posible cambiar el estado',
            descripcion: errorActualizacion instanceof Error
                ? errorActualizacion.message
                : 'Ocurrió un error inesperado.',
        })
    } finally {
        setEstudianteProcesando('')
    }
  }

  function solicitarCambioEstado(
    estudiante,
  ) {
    const activo = estudiante.credenciales ?.activo !== false
    const nombre = estudiante.datosPersonales ?.nombreCompleto || 'el estudiante seleccionado'
    const idConfirmacion = `confirmar-estado-estudiante-${estudiante.id}`

    limpiarNotificaciones(
        idConfirmacion,
    )

    solicitarConfirmacion({
        id: idConfirmacion,
        titulo: activo
            ? 'Desactivar estudiante'
            : 'Activar estudiante',
        descripcion: activo
            ? `${nombre} quedará marcado como estudiante inactivo.`
            : `${nombre} volverá a estar activo dentro del sistema.`,
        textoConfirmar: activo
            ? 'Desactivar'
            : 'Activar',
        textoCancelar: 'Cancelar',
        alConfirmar: () => procesarCambioEstado(
            estudiante,
            !activo,
            idConfirmacion,
        ),
    })
  }

  function mostrarEliminacionPendiente(
    estudiante,
  ) {
    const nombre = estudiante.datosPersonales
        ?.nombreCompleto || 'el estudiante seleccionado'

    notificarInformacion({
        id: `eliminar-estudiante-pendiente-${estudiante.id}`,
        titulo: 'Eliminación disponible próximamente',
        descripcion: `La opción para eliminar a ${nombre} estará disponible en un próximo avance.`,
    })
  }

  return (
    <div className="admin-students-page">
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
            <div className="admin-students-heading__summary">
                <UsersRound aria-hidden="true" />

                <div>
                    <strong>
                        {estudiantes.length}
                    </strong>

                    <span>
                        {estudiantes.length === 1
                            ? 'estudiante registrado'
                            : 'estudiantes registrados'}
                    </span>
                </div>
            </div>

            <button className="admin-students-add-button" type="button" onClick={mostrarRegistroPendiente}>
                <Plus aria-hidden="true" />
                Añadir estudiante
            </button>
        </div>
      </header>

      {!cargando && !error && (
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

          <label className="admin-students-filter">
            <span>Estado</span>

            <select
              value={estadoSeleccionado}
              onChange={(evento) =>
                setEstadoSeleccionado(
                  evento.target.value,
                )
              }
            >
              <option value="todos">
                Todos los estudiantes
              </option>

              <option value="activos">
                Activos
              </option>

              <option value="inactivos">
                Inactivos
              </option>
            </select>
          </label>
        </section>
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
            className="admin-students-list"
            aria-labelledby="admin-students-list-title"
            aria-busy={
              Boolean(estudianteProcesando)
            }
          >
            <header className="admin-students-list__header">
              <div>
                <p>Listado</p>

                <h2 id="admin-students-list-title">
                  Estudiantes becarios
                </h2>
              </div>

              <span>
                {estudiantesFiltrados.length}{' '}
                {estudiantesFiltrados.length ===
                1
                  ? 'resultado'
                  : 'resultados'}
              </span>
            </header>

            {!existenResultados ? (
              <div className="admin-students-no-results">
                <Search aria-hidden="true" />

                <h3>
                  No encontramos resultados
                </h3>

                <p>
                  Cambia la búsqueda o el estado
                  seleccionado.
                </p>
              </div>
            ) : (
              <div className="admin-students-table-wrapper">
                <table className="admin-students-table">
                  <caption>
                    Listado administrativo de
                    estudiantes becarios
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
                          <tr
                            key={estudiante.id}
                          >
                            <th scope="row">
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

                            <td>
                              <span className="admin-student-career">
                                {datosPersonales
                                  .carrera ||
                                  'Carrera no disponible'}
                              </span>
                            </td>

                            <td>
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

                            <td>
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

                            <td>
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

                            <td>
                              <div className="admin-student-actions">
                                <Link
                                  to={
                                    '/admin-principal/estudiantes/' +
                                    encodeURIComponent(
                                      numeroCuenta,
                                    )
                                  }
                                  title="Ver estudiante"
                                  aria-label={`Ver información de ${nombreCompleto}`}
                                >
                                  <Eye aria-hidden="true" />
                                </Link>

                                <button
                                  type="button"
                                  title="Editar estudiante"
                                  aria-label={`Editar información de ${nombreCompleto}`}
                                  disabled={procesando}
                                  onClick={() =>
                                    mostrarEdicionPendiente(
                                      estudiante,
                                    )
                                  }
                                >
                                  <Pencil aria-hidden="true" />
                                </button>

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
                                  <Power aria-hidden="true" />
                                </button>

                                <button
                                  className="admin-student-actions__delete"
                                  type="button"
                                  title="Eliminar estudiante"
                                  aria-label={`Eliminar a ${nombreCompleto}`}
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
    </div>
  )
}

export default AdminPrincipalStudents