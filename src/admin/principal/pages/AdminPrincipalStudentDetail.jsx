import {
  ArrowLeft,
  CalendarDays,
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
  obtenerEstudiante,
} from '../services/adminEstudiantesService.js'

import '../styles/AdminPrincipalStudentDetail.css'

// UTILIDADES DE PRESENTACIÓN
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
  const numero =
    prepararCantidad(valor)

  return `L ${new Intl.NumberFormat(
    'es-HN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(numero)}`
}

function formatearFecha(fecha) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return 'Fecha no disponible'
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha.split('-').map(Number)

  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia,
  )

  if (
    fechaLocal.getFullYear() !== anio ||
    fechaLocal.getMonth() !== mes - 1 ||
    fechaLocal.getDate() !== dia
  ) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(fechaLocal)
}

function formatearEstado(estado) {
  const texto =
    prepararTexto(estado)
      .replace(/-/g, ' ')
      .toLowerCase()

  if (!texto) {
    return 'Sin estado'
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
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

// COMPONENTE PRINCIPAL
function AdminPrincipalStudentDetail() {
  const { numeroCuenta } = useParams()
  const location = useLocation()

  /*
   * La vista de actividad enviará este estado al abrir el
   * detalle del estudiante:
   *
   * {
   *   origen: 'detalle-actividad',
   *   actividadId: 'actividad-001'
   * }
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

  const [
    filtroAportaciones,
    setFiltroAportaciones,
  ] = useState('historial')

  /*
   * El número de cuenta proviene de la URL.
   * El servicio localiza al estudiante sin que la vista
   * necesite acceder directamente al mock o al backend.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiante() {
      setCargando(true)
      setError('')
      setEstudiante(null)

      try {
        const estudianteObtenido =
          await obtenerEstudiante(
            numeroCuenta,
          )

        if (!componenteMontado) {
          return
        }

        if (!estudianteObtenido) {
          setError(
            'No encontramos un estudiante con ese número de cuenta.',
          )

          return
        }

        setEstudiante(
          estudianteObtenido,
        )
      } catch (errorCarga) {
        if (!componenteMontado) {
          return
        }

        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : 'No fue posible cargar la información del estudiante.',
        )
      } finally {
        if (componenteMontado) {
          setCargando(false)
        }
      }
    }

    cargarEstudiante()

    return () => {
      componenteMontado = false
    }
  }, [
    numeroCuenta,
    recarga,
  ])

  /*
   * La pestaña Historial muestra todas las aportaciones.
   * La pestaña Pendientes conserva solamente las que todavía
   * no han sido confirmadas.
   */
  const aportacionesMostradas =
    useMemo(() => {
      const aportaciones =
        Array.isArray(
          estudiante?.aportaciones,
        )
          ? estudiante.aportaciones
          : []

      if (
        filtroAportaciones ===
        'pendientes'
      ) {
        return aportaciones.filter(
          (aportacion) =>
            aportacion.estado ===
            'pendiente',
        )
      }

      return aportaciones
    }, [
      estudiante,
      filtroAportaciones,
    ])

  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  // ESTADO DE CARGA
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

  // ESTADO DE ERROR
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

            {/*
             * Incluso si la carga falla, conservamos el origen
             * para que el administrador pueda volver a la
             * actividad desde donde abrió al estudiante.
             */}
            <Link to={rutaRegreso}>
              <ArrowLeft aria-hidden="true" />
              {etiquetaRegreso}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  //  INFORMACIÓN NORMALIZADA DEL ESTUDIANTE
  const datosPersonales =
    estudiante.datosPersonales ?? {}

  const datosBecario =
    estudiante.datosBecario ?? {}

  const actividadesRecientes =
    Array.isArray(
      estudiante.actividadesRecientes,
    )
      ? estudiante.actividadesRecientes
      : []

  /*
   * Se corrige el acceso anterior a "crendenciales".
   * La propiedad correcta del contrato interno es
   * "credenciales".
   */
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
   * El servicio ordena las actividades desde la más reciente.
   * Por eso el primer elemento representa la última actividad.
   */
  const ultimaActividad =
    actividadesRecientes[0] ?? null

  return (
    <div className="admin-student-detail-page">
      {/* NAVEGACIÓN DE REGRESO*/}
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

        <Link className="admin-student-detail-edit-button"
        to={`/admin-principal/estudiantes/${encodeURIComponent(
          numeroCuenta,
        )}/editar`
          }
        >
        <Pencil aria-hidden="true" />
        Editar información
      </Link>
      
      </header>

      <div className="admin-student-detail-layout">
        <div className="admin-student-detail-main">
          {/* INFORMACIÓN PERSONAL*/}
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

          {/* ACTIVIDADES RECIENTES */}
          <section
            className="admin-student-detail-card"
            aria-labelledby="student-activities-title"
          >
            <header className="admin-student-detail-card__header">
              <CalendarDays aria-hidden="true" />

              <h2 id="student-activities-title">
                Actividades recientes
              </h2>
            </header>

            {actividadesRecientes.length ===
              0 ? (
              <div className="admin-student-detail-empty">
                <CalendarDays aria-hidden="true" />

                <p>
                  No hay actividades registradas.
                </p>
              </div>
            ) : (
              <div className="admin-student-detail-table-wrapper">
                <table className="admin-student-detail-table">
                  <caption>
                    Actividades recientes del estudiante
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
                        Horas
                      </th>

                      <th scope="col">
                        Registrado por
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {actividadesRecientes.map(
                      (actividad) => (
                        <tr key={actividad.id}>
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

                          <td data-label="Horas">
                            {prepararCantidad(
                              actividad
                                .horasAcreditadas,
                            )}
                          </td>

                          <td data-label="Registrado por">
                            {mostrarDato(
                              actividad
                                .registradoPor,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
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
              aria-label="Filtrar aportaciones"
            >
              <button
                id="student-contributions-history-tab"
                type="button"
                role="tab"
                aria-selected={
                  filtroAportaciones ===
                  'historial'
                }
                aria-controls="student-contributions-panel"
                className={
                  filtroAportaciones ===
                    'historial'
                    ? 'admin-student-contribution-tab admin-student-contribution-tab--active'
                    : 'admin-student-contribution-tab'
                }
                onClick={() =>
                  setFiltroAportaciones(
                    'historial',
                  )
                }
              >
                Historial
              </button>

              <button
                id="student-contributions-pending-tab"
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
            </div>

            <div
              id="student-contributions-panel"
              className="admin-student-contribution-panel"
              role="tabpanel"
              aria-labelledby={
                filtroAportaciones ===
                  'historial'
                  ? 'student-contributions-history-tab'
                  : 'student-contributions-pending-tab'
              }
            >
              {aportacionesMostradas.length ===
                0 ? (
                <div className="admin-student-detail-empty">
                  <ReceiptText aria-hidden="true" />

                  <p>
                    {filtroAportaciones ===
                    'pendientes'
                      ? 'El estudiante no tiene aportaciones pendientes.'
                      : 'No hay aportaciones registradas.'}
                  </p>
                </div>
              ) : (
                <div className="admin-student-detail-table-wrapper">
                  <table className="admin-student-detail-table admin-student-contributions-table">
                    <caption>
                      Aportaciones del estudiante
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">
                          Periodo
                        </th>

                        <th scope="col">
                          Monto
                        </th>

                        <th scope="col">
                          Fecha de pago
                        </th>

                        <th scope="col">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {aportacionesMostradas.map(
                        (aportacion) => (
                          <tr
                            key={aportacion.id}
                          >
                            <td data-label="Periodo">
                              {mostrarDato(
                                aportacion.periodo,
                              )}
                            </td>

                            <td data-label="Monto">
                              {formatearLempiras(
                                aportacion.monto,
                              )}
                            </td>

                            <td data-label="Fecha de pago">
                              {aportacion.fechaPago
                                ? formatearFecha(
                                    aportacion
                                      .fechaPago,
                                  )
                                : 'Pendiente'}
                            </td>

                            <td data-label="Estado">
                              <span
                                className={
                                  'admin-student-contribution-status ' +
                                  `admin-student-contribution-status--${aportacion.estado}`
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