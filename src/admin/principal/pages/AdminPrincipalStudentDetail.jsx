import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  IdCard,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
  TriangleAlert,
  UserRound,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useParams,
} from 'react-router'

import {
  listarHistorialActividadesPorEstudiante,
} from '../services/adminActividadesService.js'

import {
  ESTADOS_APORTACION,
  listarAportacionesPorEstudiante,
} from '../services/adminAportacionesService.js'

import {
  obtenerEstudiante,
} from '../services/adminEstudiantesService.js'

import '../styles/AdminPrincipalStudentDetail.css'

/*
 * Cada tabla mostrará como máximo cinco registros
 * antes de pasar a la página siguiente.
 */
const REGISTROS_POR_PAGINA = 5

// UTILIDADES GENERALES
function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

function mostrarDato(valor) {
  const texto = prepararTexto(valor)

  return texto || 'No disponible'
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

function formatearLempiras(valor) {
  const numero = prepararCantidad(valor)

  return `L ${new Intl.NumberFormat(
    'es-HN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(numero)}`
}

/*
 * Acepta fechas simples como 2026-09-12 y
 * fechas completas como las que devuelve el backend.
 *
 * Las fechas simples se construyen de forma local para
 * evitar que el navegador cambie el día por la zona horaria.
 */
function formatearFecha(valor) {
  const fechaRecibida = prepararTexto(valor)

  if (!fechaRecibida) {
    return 'Fecha no disponible'
  }

  let fecha

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      fechaRecibida,
    )
  ) {
    const [
      anio,
      mes,
      dia,
    ] = fechaRecibida
      .split('-')
      .map(Number)

    fecha = new Date(
      anio,
      mes - 1,
      dia,
    )

    const fechaValida =
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia

    if (!fechaValida) {
      return 'Fecha no disponible'
    }
  } else {
    fecha = new Date(fechaRecibida)

    if (
      Number.isNaN(
        fecha.getTime(),
      )
    ) {
      return 'Fecha no disponible'
    }
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(fecha)
}

function formatearEstado(estado) {
  const texto =
    prepararTexto(estado)
      .replace(/-/g, ' ')
      .toLocaleLowerCase('es')

  if (!texto) {
    return 'Sin estado'
  }

  return (
    texto.charAt(0).toLocaleUpperCase('es') +
    texto.slice(1)
  )
}

/*
 * Convierte el estado en un nombre seguro para CSS.
 *
 * Por ejemplo:
 * "Asistió" se convierte en "asistio".
 */
function obtenerClaseEstado(estado) {
  const clase =
    prepararTexto(estado)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  return clase || 'sin-estado'
}

function construirPeriodoInicio(
  datosBecario,
) {
  return [
    datosBecario?.periodoInicio,
    datosBecario?.anioInicio,
  ]
    .filter(
      (valor) =>
        valor !== null &&
        valor !== undefined &&
        prepararTexto(valor) !== '',
    )
    .join(' ')
}

function describirMesesPendientes(
  mesesSinPagar,
) {
  const meses =
    prepararCantidad(
      mesesSinPagar,
    )

  if (meses === 0) {
    return 'Sin meses pendientes'
  }

  return meses === 1
    ? '1 mes pendiente'
    : `${meses} meses pendientes`
}

function obtenerMensajeError(
  error,
  mensajePredeterminado,
) {
  if (
    error instanceof Error &&
    prepararTexto(error.message)
  ) {
    return error.message
  }

  return mensajePredeterminado
}

function calcularTotalPaginas(
  totalRegistros,
) {
  return Math.max(
    1,
    Math.ceil(
      totalRegistros /
        REGISTROS_POR_PAGINA,
    ),
  )
}

function obtenerRegistrosPagina(
  registros,
  pagina,
) {
  const indiceInicial =
    (pagina - 1) *
    REGISTROS_POR_PAGINA

  return registros.slice(
    indiceInicial,
    indiceInicial +
      REGISTROS_POR_PAGINA,
  )
}

/*
 * Los registros de aportaciones llegan acompañados
 * por la identidad del estudiante.
 *
 * Esta vista necesita únicamente el objeto
 * "aportacion" definido por el contrato.
 */
function extraerAportaciones(
  registros,
) {
  if (!Array.isArray(registros)) {
    return []
  }

  return registros
    .map(
      (registro) =>
        registro?.aportacion,
    )
    .filter(
      (aportacion) =>
        aportacion &&
        typeof aportacion === 'object',
    )
}

// COMPONENTE DE PAGINACIÓN
function PaginacionRegistros({
  paginaActual,
  totalPaginas,
  totalRegistros,
  onCambiarPagina,
  etiqueta,
}) {
  if (totalRegistros === 0) {
    return null
  }

  const primerRegistro =
    (paginaActual - 1) *
      REGISTROS_POR_PAGINA +
    1

  const ultimoRegistro = Math.min(
    paginaActual *
      REGISTROS_POR_PAGINA,
    totalRegistros,
  )

  const paginas = Array.from(
    {
      length: totalPaginas,
    },
    (_, indice) => indice + 1,
  )

  return (
    <div className="admin-student-detail-pagination">
      <p>
        Mostrando {primerRegistro} a{' '}
        {ultimoRegistro} de{' '}
        {totalRegistros} registros
      </p>

      <nav
        aria-label={`Paginación de ${etiqueta}`}
      >
        <button
          type="button"
          disabled={paginaActual === 1}
          aria-label={`Página anterior de ${etiqueta}`}
          onClick={() =>
            onCambiarPagina(
              paginaActual - 1,
            )
          }
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        {paginas.map((pagina) => (
          <button
            key={pagina}
            type="button"
            className={
              pagina === paginaActual
                ? 'admin-student-detail-pagination__page admin-student-detail-pagination__page--active'
                : 'admin-student-detail-pagination__page'
            }
            aria-current={
              pagina === paginaActual
                ? 'page'
                : undefined
            }
            aria-label={`Página ${pagina} de ${etiqueta}`}
            onClick={() =>
              onCambiarPagina(pagina)
            }
          >
            {pagina}
          </button>
        ))}

        <button
          type="button"
          disabled={
            paginaActual ===
            totalPaginas
          }
          aria-label={`Página siguiente de ${etiqueta}`}
          onClick={() =>
            onCambiarPagina(
              paginaActual + 1,
            )
          }
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>
    </div>
  )
}

// COMPONENTE PRINCIPAL
function AdminPrincipalStudentDetail() {
  const { numeroCuenta } = useParams()
  const location = useLocation()

  /*
   * Cuando se abre al estudiante desde una actividad,
   * conservamos esa actividad como ruta de regreso.
   */
  const actividadOrigenId =
    location.state?.origen ===
      'detalle-actividad'
      ? prepararTexto(
          location.state.actividadId,
        )
      : ''

  const vieneDesdeActividad =
    Boolean(actividadOrigenId)

  const rutaRegreso =
    vieneDesdeActividad
      ? `/admin-principal/actividades/${encodeURIComponent(
          actividadOrigenId,
        )}`
      : '/admin-principal/estudiantes'

  const etiquetaRegreso =
    vieneDesdeActividad
      ? 'Volver a la actividad'
      : 'Volver a estudiantes'

  const etiquetaBreadcrumb =
    vieneDesdeActividad
      ? 'Actividad'
      : 'Estudiantes'

  // INFORMACIÓN GENERAL DEL ESTUDIANTE
  const [
    estudiante,
    setEstudiante,
  ] = useState(null)

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

  // HISTORIAL DE ACTIVIDADES
  const [
    actividades,
    setActividades,
  ] = useState([])

  const [
    errorActividades,
    setErrorActividades,
  ] = useState('')

  const [
    paginaActividades,
    setPaginaActividades,
  ] = useState(1)

  // HISTORIAL DE APORTACIONES
  const [
    aportaciones,
    setAportaciones,
  ] = useState([])

  const [
    errorAportaciones,
    setErrorAportaciones,
  ] = useState('')

  const [
    filtroAportaciones,
    setFiltroAportaciones,
  ] = useState('pendientes')

  const [
    paginaAportaciones,
    setPaginaAportaciones,
  ] = useState(1)

  useEffect(() => {
    let componenteMontado = true

    async function cargarInformacion() {
      setCargando(true)
      setError('')
      setErrorActividades('')
      setErrorAportaciones('')
      setEstudiante(null)
      setActividades([])
      setAportaciones([])

      const [
        resultadoEstudiante,
        resultadoActividades,
        resultadoAportaciones,
      ] = await Promise.allSettled([
        obtenerEstudiante(
          numeroCuenta,
        ),

        listarHistorialActividadesPorEstudiante(
          numeroCuenta,
        ),

        listarAportacionesPorEstudiante(
          numeroCuenta,
        ),
      ])

      if (!componenteMontado) {
        return
      }

      /*
       * La información general es indispensable.
       * Si esta consulta falla, no podemos construir el perfil.
       */
      if (
        resultadoEstudiante.status ===
        'rejected'
      ) {
        setError(
          obtenerMensajeError(
            resultadoEstudiante.reason,
            'No fue posible cargar la información del estudiante.',
          ),
        )
      } else if (
        !resultadoEstudiante.value
      ) {
        setError(
          'No encontramos un estudiante con ese número de cuenta.',
        )
      } else {
        setEstudiante(
          resultadoEstudiante.value,
        )
      }

      /*
       * El historial de actividades puede fallar en modo API, pero siempre se crea la vista del resumen del estudiante.
       */
      if (
        resultadoActividades.status ===
        'fulfilled'
      ) {
        setActividades(
          Array.isArray(
            resultadoActividades.value,
          )
            ? resultadoActividades.value
            : [],
        )
      } else {
        setErrorActividades(
          obtenerMensajeError(
            resultadoActividades.reason,
            'No fue posible cargar el historial de actividades.',
          ),
        )
      }

      /*
       * Las aportaciones se obtienen mediante el listado
       * administrativo y se filtran por número de cuenta.
       */
      if (
        resultadoAportaciones.status ===
        'fulfilled'
      ) {
        setAportaciones(
          extraerAportaciones(
            resultadoAportaciones.value,
          ),
        )
      } else {
        setErrorAportaciones(
          obtenerMensajeError(
            resultadoAportaciones.reason,
            'No fue posible cargar el historial de aportaciones.',
          ),
        )
      }

      setCargando(false)
    }

    cargarInformacion()

    return () => {
      componenteMontado = false
    }
  }, [
    numeroCuenta,
    recarga,
  ])

  // Relaciona cada pestaña visual con el estado exacto.
  const aportacionesMostradas =
    useMemo(() => {
      const estadosPorFiltro = {
        pendientes: ESTADOS_APORTACION.PENDIENTE,
        aprobadas: ESTADOS_APORTACION.APROBADO,
        rechazadas: ESTADOS_APORTACION.RECHAZADO,
      }

      const estadoSeleccionado =
        estadosPorFiltro[
          filtroAportaciones
        ]

      if (!estadoSeleccionado) {
        return []
      }

      return aportaciones.filter(
        (aportacion) =>
          prepararTexto(
            aportacion.estado,
          ).toLocaleLowerCase('es') === estadoSeleccionado.toLocaleLowerCase('es'),
      )
    }, [
      aportaciones,
      filtroAportaciones,
    ])

  // PAGINACIÓN DE ACTIVIDADES
  const totalPaginasActividades =
    useMemo(
      () =>
        calcularTotalPaginas(
          actividades.length,
        ),
      [actividades.length],
    )

  const actividadesPagina =
    useMemo(
      () =>
        obtenerRegistrosPagina(
          actividades,
          paginaActividades,
        ),
      [
        actividades,
        paginaActividades,
      ],
    )

  // PAGINACIÓN DE APORTACIONES
  const totalPaginasAportaciones =
    useMemo(
      () =>
        calcularTotalPaginas(
          aportacionesMostradas.length,
        ),
      [aportacionesMostradas.length],
    )

  const aportacionesPagina =
    useMemo(
      () =>
        obtenerRegistrosPagina(
          aportacionesMostradas,
          paginaAportaciones,
        ),
      [
        aportacionesMostradas,
        paginaAportaciones,
      ],
    )

  /*
   * Si cambia la cantidad de actividades, evitamos dejar
   * seleccionada una página que ya no existe.
   */
  useEffect(() => {
    setPaginaActividades(
      (paginaActual) =>
        Math.min(
          paginaActual,
          totalPaginasActividades,
        ),
    )
  }, [totalPaginasActividades])

  // Cada cambio de pestaña comienza desde la primera página.
  useEffect(() => {
    setPaginaAportaciones(1)
  }, [filtroAportaciones])

  /*
   * También protegemos la página cuando cambia
   * la cantidad de aportaciones disponibles.
   */
  useEffect(() => {
    setPaginaAportaciones(
      (paginaActual) =>
        Math.min(
          paginaActual,
          totalPaginasAportaciones,
        ),
    )
  }, [totalPaginasAportaciones])

  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  // ESTADO DE CARGA GENERAL
  if (cargando) {
    return (
      <div className="admin-student-detail-page">
        <section
          className="admin-student-detail-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-student-detail-state__loader"
            aria-hidden="true"
          />

          <h1>Cargando estudiante</h1>

          <p>
            Estamos preparando la información
            académica y administrativa.
          </p>
        </section>
      </div>
    )
  }

  // ERROR DE LA INFORMACIÓN GENERAL
  if (error || !estudiante) {
    return (
      <div className="admin-student-detail-page">
        <section
          className="admin-student-detail-state admin-student-detail-state--error"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />

          <h1>
            No fue posible mostrar al estudiante
          </h1>

          <p>
            {error ||
              'La información solicitada no está disponible.'}
          </p>

          <div className="admin-student-detail-state__actions">
            <button
              type="button"
              onClick={reintentarCarga}
            >
              Intentar nuevamente
            </button>

            <Link to={rutaRegreso}>
              <ArrowLeft aria-hidden="true" />

              {etiquetaRegreso}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  // INFORMACIÓN NORMALIZADA DEL ESTUDIANTE
  const datosPersonales =
    estudiante.datosPersonales ?? {}

  const datosBecario =
    estudiante.datosBecario ?? {}

  const activo =
    estudiante.credenciales?.activo !==
    false

  const nombreCompleto =
    datosPersonales.nombreCompleto ||
    'Estudiante sin nombre'

  const periodoInicio =
    construirPeriodoInicio(
      datosBecario,
    )

  const horasAcumuladas =
    prepararCantidad(
      datosBecario.horasAcumuladas,
    )

  const horasFaltantes =
    prepararCantidad(
      datosBecario.horasFaltantes,
    )

  const mesesSinPagar =
    prepararCantidad(
      datosBecario.mesesSinPagar,
    )

  const saldoPendiente =
    prepararCantidad(
      estudiante
        .saldoAportacionesPendientes,
    )

  /*
   * El servicio entrega las actividades ordenadas desde
   * la fecha más reciente.
   */
  const ultimaActividad =
    actividades[0] ?? null

  return (
    <div className="admin-student-detail-page">
      {/* NAVEGACIÓN DE REGRESO */}
      <nav
        className="admin-student-detail-breadcrumb"
        aria-label="Ruta de navegación"
      >
        <Link to={rutaRegreso}>
          <ArrowLeft aria-hidden="true" />

          {etiquetaBreadcrumb}
        </Link>

        <span aria-hidden="true">/</span>

        <span>
          {mostrarDato(
            datosPersonales.numeroCuenta,
          )}
        </span>
      </nav>

      {/* ENCABEZADO */}
      <header className="admin-student-detail-heading">
        <div>
          <div className="admin-student-detail-heading__identity">
            <h1>{nombreCompleto}</h1>

            <span
              className={
                activo
                  ? 'admin-student-detail-badge admin-student-detail-badge--active'
                  : 'admin-student-detail-badge admin-student-detail-badge--inactive'
              }
            >
              <CircleCheck aria-hidden="true" />

              {activo
                ? 'Becario activo'
                : 'Becario inactivo'}
            </span>
          </div>

          <p>
            Consulta la información, las horas
            y las aportaciones del estudiante.
          </p>
        </div>

        <Link
          className="admin-student-detail-edit-button"
          to={`/admin-principal/estudiantes/${encodeURIComponent(
            numeroCuenta,
          )}/editar`}
        >
          <Pencil aria-hidden="true" />

          Editar información
        </Link>
      </header>

      <div className="admin-student-detail-layout">
        <div className="admin-student-detail-main">
          {/* INFORMACIÓN PERSONAL */}
          <section
            className="admin-student-detail-card admin-student-detail-personal"
            aria-labelledby="student-personal-title"
          >
            <header className="admin-student-detail-card__header">
              <UserRound aria-hidden="true" />

              <h2 id="student-personal-title">
                Información personal
              </h2>
            </header>

            <dl className="admin-student-personal-grid">
              <div>
                <dt>
                  <IdCard aria-hidden="true" />
                  Número de cuenta
                </dt>

                <dd>
                  {mostrarDato(
                    datosPersonales
                      .numeroCuenta,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  <Phone aria-hidden="true" />
                  Teléfono
                </dt>

                <dd>
                  {mostrarDato(
                    datosPersonales.telefono,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  <GraduationCap aria-hidden="true" />
                  Carrera
                </dt>

                <dd>
                  {mostrarDato(
                    datosPersonales.carrera,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  <CalendarDays aria-hidden="true" />
                  Periodo de inicio
                </dt>

                <dd>
                  {mostrarDato(
                    periodoInicio,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  <Mail aria-hidden="true" />
                  Correo institucional
                </dt>

                <dd>
                  {mostrarDato(
                    datosPersonales
                      .correoInstitucional,
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* PROGRESO DE HORAS */}
          <section
            className="admin-student-detail-card"
            aria-labelledby="student-progress-title"
          >
            <header className="admin-student-detail-card__header">
              <Clock3 aria-hidden="true" />

              <h2 id="student-progress-title">
                Progreso de horas
              </h2>
            </header>

            <div className="admin-student-progress-metrics">
              <article>
                <span>
                  <Clock3 aria-hidden="true" />
                </span>

                <strong>
                  {horasAcumuladas}
                </strong>

                <p>Horas acumuladas</p>
              </article>

              <article>
                <span>
                  <CalendarDays aria-hidden="true" />
                </span>

                <strong>
                  {horasFaltantes}
                </strong>

                <p>Horas faltantes</p>
              </article>

              <article>
                <span>
                  <CircleDollarSign aria-hidden="true" />
                </span>

                <strong>
                  {formatearLempiras(
                    saldoPendiente,
                  )}
                </strong>

                <p>
                  Aportaciones pendientes
                </p>
              </article>
            </div>
          </section>

          {/* HISTORIAL DE ACTIVIDADES */}
          <section
            className="admin-student-detail-card"
            aria-labelledby="student-activities-title"
          >
            <header className="admin-student-detail-card__header">
              <CalendarDays aria-hidden="true" />

              <h2 id="student-activities-title">
                Historial de actividades
              </h2>
            </header>

            {errorActividades ? (
              <div
                className="admin-student-detail-empty admin-student-detail-empty--error"
                role="status"
              >
                <TriangleAlert aria-hidden="true" />

                <p>{errorActividades}</p>
              </div>
            ) : actividades.length === 0 ? (
              <div className="admin-student-detail-empty">
                <CalendarDays aria-hidden="true" />

                <p>
                  No hay actividades registradas.
                </p>
              </div>
            ) : (
              <>
                <div className="admin-student-detail-table-wrapper">
                  <table className="admin-student-detail-table">
                    <caption>
                      Historial de actividades del estudiante
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">
                          Fecha
                        </th>

                        <th scope="col">
                          Actividad
                        </th>

                        <th scope="col">
                          Horas acreditadas
                        </th>

                        <th scope="col">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {actividadesPagina.map(
                        (actividad) => (
                          <tr
                            key={
                              actividad.id ??
                              actividad.actividadId
                            }
                          >
                            <td data-label="Fecha">
                              <time
                                dateTime={
                                  actividad.fecha
                                }
                              >
                                {formatearFecha(
                                  actividad.fecha,
                                )}
                              </time>
                            </td>

                            <td data-label="Actividad">
                              {mostrarDato(
                                actividad.titulo,
                              )}
                            </td>

                            <td data-label="Horas acreditadas">
                              {prepararCantidad(
                                actividad
                                  .horasAcreditadas,
                              )}
                            </td>

                            <td data-label="Estado">
                              <span
                                className={
                                  'admin-student-contribution-status ' +
                                  `admin-student-contribution-status--${obtenerClaseEstado(
                                    actividad.estado,
                                  )}`
                                }
                              >
                                {formatearEstado(
                                  actividad.estado,
                                )}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginacionRegistros
                  paginaActual={
                    paginaActividades
                  }
                  totalPaginas={
                    totalPaginasActividades
                  }
                  totalRegistros={
                    actividades.length
                  }
                  onCambiarPagina={
                    setPaginaActividades
                  }
                  etiqueta="actividades"
                />
              </>
            )}
          </section>

          {/* APORTACIONES */}
          <section
            className="admin-student-detail-card"
            aria-labelledby="student-contributions-title"
          >
            <header className="admin-student-detail-card__header">
              <ReceiptText aria-hidden="true" />

              <h2 id="student-contributions-title">
                Aportaciones
              </h2>
            </header>

            <div
              className="admin-student-contribution-tabs"
              role="tablist"
              aria-label="Filtrar aportaciones por estado"
            >
              {/* APORTACIONES PENDIENTES */}
              <button
                id="student-contributions-pendientes-tab"
                type="button"
                role="tab"
                aria-selected={
                  filtroAportaciones ===
                  'pendientes'
                }
                aria-controls="student-contributions-panel"
                className={
                  filtroAportaciones ===
                    'pendientes'
                    ? 'admin-student-contribution-tab admin-student-contribution-tab--active'
                    : 'admin-student-contribution-tab'
                }
                onClick={() =>
                  setFiltroAportaciones(
                    'pendientes',
                  )
                }
              >
                Pendientes
              </button>

              {/* APORTACIONES APROBADAS */}
              <button
                id="student-contributions-aprobadas-tab"
                type="button"
                role="tab"
                aria-selected={
                  filtroAportaciones ===
                  'aprobadas'
                }
                aria-controls="student-contributions-panel"
                className={
                  filtroAportaciones ===
                    'aprobadas'
                    ? 'admin-student-contribution-tab admin-student-contribution-tab--active'
                    : 'admin-student-contribution-tab'
                }
                onClick={() =>
                  setFiltroAportaciones(
                    'aprobadas',
                  )
                }
              >
                Aprobadas
              </button>

              {/* APORTACIONES RECHAZADAS */}
              <button
                id="student-contributions-rechazadas-tab"
                type="button"
                role="tab"
                aria-selected={
                  filtroAportaciones ===
                  'rechazadas'
                }
                aria-controls="student-contributions-panel"
                className={
                  filtroAportaciones ===
                    'rechazadas'
                    ? 'admin-student-contribution-tab admin-student-contribution-tab--active'
                    : 'admin-student-contribution-tab'
                }
                onClick={() =>
                  setFiltroAportaciones(
                    'rechazadas',
                  )
                }
              >
                Rechazadas
              </button>
            </div>

            <div
              id="student-contributions-panel"
              className="admin-student-contribution-panel"
              role="tabpanel"
              aria-labelledby={`student-contributions-${filtroAportaciones}-tab`}
            >
              {errorAportaciones ? (
                <div
                  className="admin-student-detail-empty admin-student-detail-empty--error"
                  role="alert"
                >
                  <TriangleAlert aria-hidden="true" />

                  <p>
                    {errorAportaciones}
                  </p>
                </div>
              ) : aportacionesMostradas.length ===
                0 ? (
                <div className="admin-student-detail-empty">
                  <ReceiptText aria-hidden="true" />

                  <p>
                    {filtroAportaciones ===
                    'pendientes'
                    ? 'El estudiante no tiene aportaciones pendientes.'
                    : filtroAportaciones ===
                      'aprobadas'
                    ? 'El estudiante no tiene aportaciones aprobadas.'
                    : 'El estudiante no tiene aportaciones rechazadas.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="admin-student-detail-table-wrapper">
                    <table className="admin-student-detail-table admin-student-contributions-table">
                      <caption>
                        Aportaciones del estudiante
                      </caption>

                      <thead>
                        <tr>
                          <th scope="col">
                            Referencia
                          </th>

                          <th scope="col">
                            Descripción
                          </th>

                          <th scope="col">
                            Fecha de envío
                          </th>

                          <th scope="col">
                            Meses aprobados
                          </th>

                          <th scope="col">
                            Estado
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {aportacionesPagina.map(
                          (aportacion) => (
                            <tr
                              key={
                                aportacion.id
                              }
                            >
                              <td data-label="Referencia">
                                {mostrarDato(
                                  aportacion
                                    .num_referencia,
                                )}
                              </td>

                              <td data-label="Descripción">
                                {mostrarDato(
                                  aportacion
                                    .descripcion,
                                )}
                              </td>

                              <td data-label="Fecha de envío">
                                <time
                                  dateTime={
                                    aportacion
                                      .fecha_subida
                                  }
                                >
                                  {formatearFecha(
                                    aportacion
                                      .fecha_subida,
                                  )}
                                </time>
                              </td>

                              <td data-label="Meses aprobados">
                                {prepararCantidad(
                                  aportacion
                                    .meses_aprobados,
                                )}
                              </td>

                              <td data-label="Estado">
                                <span
                                  className={
                                    'admin-student-contribution-status ' +
                                    `admin-student-contribution-status--${obtenerClaseEstado(
                                      aportacion.estado,
                                    )}`
                                  }
                                >
                                  {formatearEstado(
                                    aportacion.estado,
                                  )}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <PaginacionRegistros
                    paginaActual={
                      paginaAportaciones
                    }
                    totalPaginas={
                      totalPaginasAportaciones
                    }
                    totalRegistros={
                      aportacionesMostradas.length
                    }
                    onCambiarPagina={
                      setPaginaAportaciones
                    }
                    etiqueta="aportaciones"
                  />
                </>
              )}
            </div>
          </section>
        </div>

        {/* RESUMEN LATERAL */}
        <aside className="admin-student-detail-sidebar">
          <section
            className="admin-student-detail-card admin-student-summary"
            aria-labelledby="student-summary-title"
          >
            <header className="admin-student-detail-card__header">
              <GraduationCap aria-hidden="true" />

              <h2 id="student-summary-title">
                Resumen
              </h2>
            </header>

            <div className="admin-student-summary__item">
              <span
                className="admin-student-summary__icon admin-student-summary__icon--status"
                aria-hidden="true"
              >
                <CircleCheck />
              </span>

              <div>
                <small>
                  Estado de beca
                </small>

                <strong
                  className={
                    activo
                      ? 'admin-student-summary__value--active'
                      : 'admin-student-summary__value--inactive'
                  }
                >
                  {formatearEstado(
                    datosBecario.estadoBeca ||
                      (activo
                        ? 'activo'
                        : 'inactivo'),
                  )}
                </strong>
              </div>
            </div>

            <div className="admin-student-summary__item">
              <span
                className="admin-student-summary__icon admin-student-summary__icon--contribution"
                aria-hidden="true"
              >
                <CircleDollarSign />
              </span>

              <div>
                <small>
                  Meses sin pagar
                </small>

                <strong>
                  {mesesSinPagar}
                </strong>

                <p>
                  {describirMesesPendientes(
                    mesesSinPagar,
                  )}
                </p>
              </div>
            </div>

            <div className="admin-student-summary__item">
              <span
                className="admin-student-summary__icon admin-student-summary__icon--activity"
                aria-hidden="true"
              >
                <Clock3 />
              </span>

              <div>
                <small>
                  Última actividad
                </small>

                <strong>
                  {ultimaActividad
                    ? formatearFecha(
                        ultimaActividad.fecha,
                      )
                    : errorActividades
                      ? 'No disponible'
                      : 'Sin actividad'}
                </strong>

                {ultimaActividad && (
                  <p>
                    {mostrarDato(
                      ultimaActividad.titulo,
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default AdminPrincipalStudentDetail