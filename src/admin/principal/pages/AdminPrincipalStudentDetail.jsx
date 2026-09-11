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
  useParams,
} from 'react-router'

import {
  obtenerEstudiante,
} from '../services/adminEstudiantesService.js'

import {
  notificarInformacion,
} from '../../../services/notificationService.js'

import '../styles/AdminPrincipalStudentDetail.css'

function mostrarDato(valor) {
  const texto = String(valor ?? '').trim()

  return texto || 'No disponible'
}

function prepararCantidad(valor) {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) || numero < 0
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

function formatearFecha(fecha) {
  if (
    typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
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
      year: 'numeric'
    },
  ).format(fechaLocal)
}

function formatearEstado(estado) {
  const texto = String(estado ?? '')
    .trim()
    .replace(/-/g, ' ')
    .toLowerCase()

  if (!texto) {
    return 'Sin estado'
  }

  return (
    texto.charAt(0).toUpperCase() + texto.slice(1)
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
        valor !== null && valor !== undefined &&
        String(valor).trim() !== '',
    )
    .join(' ')
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

function AdminPrincipalStudentDetail() {
  const { numeroCuenta } = useParams()

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
  * El numero de cuenta proviene de la URL.
  * El servicio puede localizar al estudiante por ese
  * valor sin que la vista acceda directamente al mock.
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

  /* El historial muestra todas las aportaciones.
  - La segunda pestaña conserva unicamente las pendientes.
  */
  const aportacionesMostradas =
    useMemo(() => {
      const aportaciones = Array.isArray(
        estudiante?.aportaciones,
      )
        ? estudiante.aportaciones
        : []

      if (
        filtroAportaciones === 'pendientes'
      ) {
        return aportaciones.filter(
          (aportacion) =>
            aportacion.estado === 'pendiente',
        )
      }

      return aportaciones
    }, [
      estudiante,
      filtroAportaciones,
    ])

  function reintentarCarga() {
    setRecarga(
      (valorActual) => valorActual + 1,
    )
  }

  function mostrarEdicionPendiente() {
    const nombre = estudiante?.datosPersonales
      ?.nombreCompleto || 'este estudiante'

    notificarInformacion({
      id: `editar-detalle-estudiante-${estudiante?.id}`,
      titulo: 'Edición disponible próximamente',
      descripcion: `La información de ${nombre} podrá editarse en un siguiente avance.`,
    })
  }

  if (cargando) {
    return (
      <div className="admin-student-detail-page">
        <section className="admin-student-detail-state" role="status" aria-live="polite">
          <LoaderCircle className="admin-student-detail-state__loader" aria-hidden="true" />

          <h1>Cargando estudiante</h1>

          <p>
            Estamos preparando la información
            académica y administrativa.
          </p>
        </section>
      </div>
    )
  }

  if (error || !estudiante) {
    return (
      <div className="admin-student-detail-page">
        <section className="admin-student-detail-state admin-student-detail-state--error" role="alert">
          <TriangleAlert aria-hidden="true" />

          <h1>
            No fue posible mostrar al estudiante
          </h1>

          <p>
            {error || 'La información solicitada no está disponible.'}
          </p>

          <div className="admin-student-detail-state__actions">
            <button type="button" onClick={reintentarCarga} >
              Intentar nuevamente
            </button>

            <Link to="/admin-principal/estudiantes">
              <ArrowLeft aria-hidden="true" />
              Volver a estudiantes
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const datosPersonales = estudiante.datosPersonales ?? {}
  const datosBecario = estudiante.datosBecario ?? {}
  const actividadesRecientes = Array.isArray(
    estudiante.actividadesRecientes,
  )
    ? estudiante.actividadesRecientes
    : []

  const activo = estudiante.crendenciales?.activo !== false
  const nombreCompleto = datosPersonales.nombreCompleto || 'Estudiante sin nombre'

  const periodoInicio = construirPeriodoInicio(
    datosBecario,
  )

  const horasAcumuladas = prepararCantidad(
    datosBecario.horasAcumuladas,
  )

  const horasFaltantes = prepararCantidad(
    datosBecario.horasFaltantes,
  )

  const mesesSinPagar = prepararCantidad(
    datosBecario.mesesSinPagar,
  )

  const saldoPendiente = prepararCantidad(
    estudiante.saldoAportacionesPendientes,
  )

  /*
  * El servicio ordena las actividades desde la mas
  * reciente, por eso el primer elemento representa la ultima actividad registrada.
  */

  const ultimaActividad = actividadesRecientes[0] ?? null

  return (
    <div className="admin-student-detail-page">
      <nav
        className="admin-student-detail-breadcrumb"
        aria-label="Ruta de navegación"
      >
        <Link to="/admin-principal/estudiantes">
          <ArrowLeft aria-hidden="true" />
          Estudiantes
        </Link>

        <span aria-hidden="true">/</span>

        <span>
          {mostrarDato(
            datosPersonales.numeroCuenta,
          )}
        </span>
      </nav>

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

        <button
          className="admin-student-detail-edit-button"
          type="button"
          onClick={mostrarEdicionPendiente}
        >
          <Pencil aria-hidden="true" />
          Editar información
        </button>
      </header>

      <div className="admin-student-detail-layout">
        <div className="admin-student-detail-main">
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
                  {mostrarDato(periodoInicio)}
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
                          <td>
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

                          <td>
                            {mostrarDato(
                              actividad.titulo,
                            )}
                          </td>

                          <td>
                            {prepararCantidad(
                              actividad
                                .horasAcreditadas,
                            )}
                          </td>

                          <td>
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
                            <td>
                              {mostrarDato(
                                aportacion.periodo,
                              )}
                            </td>

                            <td>
                              {formatearLempiras(
                                aportacion.monto,
                              )}
                            </td>

                            <td>
                              {aportacion.fechaPago
                                ? formatearFecha(
                                  aportacion
                                    .fechaPago,
                                )
                                : 'Pendiente'}
                            </td>

                            <td>
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
                <small>Estado de beca</small>

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
                <small>Meses sin pagar</small>

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
                <small>Última actividad</small>

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
