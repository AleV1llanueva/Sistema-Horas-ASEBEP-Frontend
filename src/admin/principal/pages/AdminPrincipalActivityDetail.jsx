import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  TriangleAlert,
  UserRound,
  UsersRound,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router'

import {
  listarAsistenciasActividad,
  obtenerActividad,
  registrarEntradaManualActividad,
  registrarSalidaManualActividad,
} from '../services/adminActividadesService.js'

import {
  listarEstudiantes,
} from '../services/adminEstudiantesService.js'

import {
  notificarError,
  notificarExito,
} from '../../../services/notificationService.js'

import '../styles/AdminPrincipalActivityDetail.css'

const TIPOS_MARCACION = Object.freeze({
  entrada: 'entrada',
  salida: 'salida',
})

// Convierte un valor desconocido en una cadena limpia.
function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

// Evita mostrar cantidades negativas o valores inválidos.
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

// Presenta la fecha sin provocar cambios por zona horaria.
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

  const fechaValida =
    fechaLocal.getFullYear() === anio &&
    fechaLocal.getMonth() === mes - 1 &&
    fechaLocal.getDate() === dia

  if (!fechaValida) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  ).format(fechaLocal)
}

// Convierte una hora de 24 horas a un formato legible.
function formatearHora(hora) {
  const coincidencia =
    /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
      prepararTexto(hora),
    )

  if (!coincidencia) {
    return 'Hora no disponible'
  }

  const fechaHora = new Date(
    2000,
    0,
    1,
    Number(coincidencia[1]),
    Number(coincidencia[2]),
  )

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(fechaHora)
}

function formatearHorario(
  horaInicio,
  horaFinalizacion,
) {
  return (
    `${formatearHora(horaInicio)} – ` +
    formatearHora(horaFinalizacion)
  )
}

function formatearEstadoActividad(
  estado,
) {
  const estadoNormalizado =
    prepararTexto(estado)
      .toLowerCase()
      .replace(/\s+/g, '-')

  const nombres = {
    programada: 'Programada',
    'en-curso': 'En curso',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }

  return (
    nombres[estadoNormalizado] ??
    'Sin estado'
  )
}

function formatearHoras(cantidad) {
  const horas =
    prepararCantidad(cantidad)

  return horas === 1
    ? '1 hora'
    : `${horas} horas`
}

// Obtiene las iniciales utilizadas en los avatares.
function obtenerIniciales(nombre) {
  const palabras =
    prepararTexto(nombre)
      .split(/\s+/)
      .filter(Boolean)

  if (palabras.length === 0) {
    return 'ES'
  }

  const primeraInicial =
    palabras[0]?.charAt(0) ?? ''

  const ultimaInicial =
    palabras.length > 1
      ? palabras[
          palabras.length - 1
        ]?.charAt(0) ?? ''
      : ''

  return (
    primeraInicial + ultimaInicial
  ).toUpperCase()
}

/*
 * Une cada asistencia con la información administrativa
 * del estudiante que posee el mismo número de cuenta.
 */
function relacionarAsistenciasConEstudiantes(
  asistencias,
  estudiantes,
) {
  const estudiantesPorCuenta =
    new Map(
      estudiantes.map(
        (estudiante) => [
          prepararTexto(
            estudiante?.datosPersonales
              ?.numeroCuenta,
          ),
          estudiante,
        ],
      ),
    )

  return asistencias
    .map((asistencia) => ({
      asistencia,

      estudiante:
        estudiantesPorCuenta.get(
          prepararTexto(
            asistencia.numeroCuenta,
          ),
        ) ?? null,
    }))
    .sort((registroA, registroB) => {
      const nombreA =
        prepararTexto(
          registroA.estudiante
            ?.datosPersonales
            ?.nombreCompleto,
        )

      const nombreB =
        prepararTexto(
          registroB.estudiante
            ?.datosPersonales
            ?.nombreCompleto,
        )

      return nombreA.localeCompare(
        nombreB,
        'es',
      )
    })
}

/*
 * Devuelve la presentación correspondiente al estado
 * actual de la marcación.
 */
function obtenerEstadoAsistencia(
  asistencia,
) {
  if (asistencia.checkOut) {
    return {
      clase:
        'admin-activity-detail-attendance admin-activity-detail-attendance--completed',

      texto:
        'Horas acreditadas',
    }
  }

  if (asistencia.checkIn) {
    return {
      clase:
        'admin-activity-detail-attendance admin-activity-detail-attendance--entry',

      texto:
        'Entrada registrada',
    }
  }

  return {
    clase:
      'admin-activity-detail-attendance admin-activity-detail-attendance--pending',

    texto:
      'Sin entrada',
  }
}

function AdminPrincipalActivityDetail() {
  const { actividadId } = useParams()

  // Permite abrir la edicion conservando la actividad actual.
  const navigate = useNavigate()

  const [
    actividad,
    setActividad,
  ] = useState(null)

  const [
    asistencias,
    setAsistencias,
  ] = useState([])

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
    dialogoAbierto,
    setDialogoAbierto,
  ] = useState(false)

  const [
    accionPendiente,
    setAccionPendiente,
  ] = useState(null)

  const [
    procesandoMarcacion,
    setProcesandoMarcacion,
  ] = useState('')

  /*
   * La actividad, sus asistencias y los estudiantes se
   * consultan al mismo tiempo para reducir la espera.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarDetalle() {
      setCargando(true)
      setError('')

      try {
        const [
          actividadObtenida,
          asistenciasObtenidas,
          estudiantesObtenidos,
        ] = await Promise.all([
          obtenerActividad(
            actividadId,
          ),

          listarAsistenciasActividad(
            actividadId,
          ),

          listarEstudiantes(),
        ])

        if (!componenteMontado) {
          return
        }

        if (!actividadObtenida) {
          setActividad(null)

          setError(
            'No encontramos la actividad solicitada.',
          )

          return
        }

        setActividad(
          actividadObtenida,
        )

        setAsistencias(
          Array.isArray(
            asistenciasObtenidas,
          )
            ? asistenciasObtenidas
            : [],
        )

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

        setActividad(null)

        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : 'No fue posible cargar el detalle de la actividad.',
        )
      } finally {
        if (componenteMontado) {
          setCargando(false)
        }
      }
    }

    cargarDetalle()

    return () => {
      componenteMontado = false
    }
  }, [
    actividadId,
    recarga,
  ])

  const estudiantesInscritos =
    useMemo(
      () =>
        relacionarAsistenciasConEstudiantes(
          asistencias,
          estudiantes,
        ),
      [
        asistencias,
        estudiantes,
      ],
    )

  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  // Abre el formulario correspondiente a esta actividad.
  function abrirEdicionActividad() {
    navigate(
        `/admin-principal/actividades/${encodeURIComponent(
            actividadId,
        )}/editar`,
    )
  }
  /*
   * Conservamos la acción elegida aunque el diálogo se cierre.
   * Así su contenido no cambia durante la animación de salida.
   */
  function manejarCambioDialogo(
    abierto,
  ) {
    if (
      procesandoMarcacion &&
      !abierto
    ) {
      return
    }

    setDialogoAbierto(abierto)
  }

  function abrirConfirmacion(
    tipo,
    registro,
  ) {
    if (
      !registro?.asistencia ||
      procesandoMarcacion
    ) {
      return
    }

    setAccionPendiente({
      tipo,
      ...registro,
    })

    setDialogoAbierto(true)
  }

  /*
   * Después de una respuesta correcta actualizamos la fila
   * con el comportamiento conocido del backend.
   */
  function actualizarAsistenciaLocal(
    tipo,
    numeroCuenta,
  ) {
    setAsistencias(
      (asistenciasActuales) =>
        asistenciasActuales.map(
          (asistencia) => {
            if (
              asistencia.numeroCuenta !==
              numeroCuenta
            ) {
              return asistencia
            }

            if (
              tipo ===
              TIPOS_MARCACION.entrada
            ) {
              return {
                ...asistencia,
                checkIn: true,
                estado: 'Asistió',
              }
            }

            return {
              ...asistencia,
              checkOut: true,

              horasRegistradas:
                actividad
                  ?.horasAcreditables ??
                asistencia
                  .horasRegistradas,

              estado: 'Asistió',
            }
          },
        ),
    )
  }

  async function confirmarMarcacion(
    evento,
  ) {
    evento.preventDefault()

    if (
      !accionPendiente ||
      !actividad?.id ||
      procesandoMarcacion
    ) {
      return
    }

    const {
      tipo,
      asistencia,
      estudiante,
    } = accionPendiente

    const numeroCuenta =
      asistencia.numeroCuenta

    const identificadorProceso =
      `${tipo}:${numeroCuenta}`

    const nombreEstudiante =
      estudiante?.datosPersonales
        ?.nombreCompleto ||
      numeroCuenta

    setProcesandoMarcacion(
      identificadorProceso,
    )

    try {
      const respuesta =
        tipo ===
        TIPOS_MARCACION.entrada
          ? await registrarEntradaManualActividad(
              actividad.id,
              numeroCuenta,
            )
          : await registrarSalidaManualActividad(
              actividad.id,
              numeroCuenta,
            )

      actualizarAsistenciaLocal(
        tipo,
        numeroCuenta,
      )

      setDialogoAbierto(false)

      notificarExito({
        id:
          `marcacion-${tipo}-${actividad.id}-${numeroCuenta}`,

        titulo:
          tipo ===
          TIPOS_MARCACION.entrada
            ? 'Entrada registrada'
            : 'Salida registrada',

        descripcion:
          prepararTexto(
            respuesta?.mensaje,
          ) ||
          (tipo ===
          TIPOS_MARCACION.entrada
            ? `Se registró la entrada de ${nombreEstudiante}.`
            : `Se registró la salida y se acreditaron las horas de ${nombreEstudiante}.`),
      })
    } catch (errorMarcacion) {
      notificarError({
        id:
          `error-marcacion-${tipo}-${actividad.id}-${numeroCuenta}`,

        titulo:
          'No fue posible registrar la marcación',

        descripcion:
          errorMarcacion instanceof Error
            ? errorMarcacion.message
            : 'Ocurrió un error inesperado al registrar la asistencia.',
      })
    } finally {
      setProcesandoMarcacion('')
    }
  }

  if (cargando) {
    return (
      <div className="admin-activity-detail-page">
        <section
          className="admin-activity-detail-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-activity-detail-state__loader"
            aria-hidden="true"
          />

          <h1>Cargando actividad</h1>

          <p>
            Estamos preparando la información
            y la lista de estudiantes inscritos.
          </p>
        </section>
      </div>
    )
  }

  if (error || !actividad) {
    return (
      <div className="admin-activity-detail-page">
        <section
          className="admin-activity-detail-state admin-activity-detail-state--error"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />

          <h1>
            No fue posible mostrar la actividad
          </h1>

          <p>
            {error ||
              'La información solicitada no está disponible.'}
          </p>

          <div className="admin-activity-detail-state__actions">
            <button
              type="button"
              onClick={reintentarCarga}
            >
              Intentar nuevamente
            </button>

            <Link to="/admin-principal/actividades">
              <ArrowLeft aria-hidden="true" />
              Volver a actividades
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const cuposTotales =
    prepararCantidad(
      actividad.cuposTotales,
    )

  const cuposDisponibles =
    Math.min(
      cuposTotales,

      prepararCantidad(
        actividad.cuposDisponibles,
      ),
    )

  const cantidadInscritos =
    estudiantesInscritos.length

  const porcentajeOcupacion =
    cuposTotales > 0
      ? Math.min(
          100,

          Math.round(
            (
              cantidadInscritos /
              cuposTotales
            ) * 100,
          ),
        )
      : 0

  const existenCupos =
    cuposDisponibles > 0

  const estadoNormalizado =
    prepararTexto(
      actividad.estado,
    )
      .toLowerCase()
      .replace(/\s+/g, '-')

  const nombreEstado =
    formatearEstadoActividad(
      estadoNormalizado,
    )

  const actividadEsEditable = [
    'programada',
    'en-curso',
  ].includes(
    estadoNormalizado,
  )

  const horasAcreditables =
    prepararCantidad(
      actividad.horasAcreditables,
    )

  const procesando =
    Boolean(procesandoMarcacion)

  const estudianteDialogo =
    accionPendiente?.estudiante
      ?.datosPersonales ?? {}

  const asistenciaDialogo =
    accionPendiente?.asistencia

  const nombreEstudianteDialogo =
    estudianteDialogo.nombreCompleto ||
    asistenciaDialogo?.numeroCuenta ||
    'Estudiante'

  const numeroCuentaDialogo =
    asistenciaDialogo?.numeroCuenta ||
    'Sin número de cuenta'

  const dialogoEsEntrada =
    accionPendiente?.tipo ===
    TIPOS_MARCACION.entrada

  return (
    <div className="admin-activity-detail-page">
      <Link
        className="admin-activity-detail-back"
        to="/admin-principal/actividades"
      >
        <ArrowLeft aria-hidden="true" />
        Volver a actividades
      </Link>

      <header className="admin-activity-detail-heading">
        <div className="admin-activity-detail-heading__copy">
          <p className="admin-activity-detail-heading__eyebrow">
            Gestión de actividades
          </p>

          <h1>Detalle de actividad</h1>

          <p>
            Consulta la información publicada
            y el estado actual de la actividad.
          </p>
        </div>

        {actividadEsEditable && (
          <button
            className="admin-activity-detail-edit-button"
            type="button"
            onClick={
              abrirEdicionActividad
            }
          >
            <Pencil aria-hidden="true" />
            Editar actividad
          </button>
        )}
      </header>

      <div className="admin-activity-detail-overview">
        <section
          className="admin-activity-detail-card admin-activity-detail-information"
          aria-labelledby="activity-information-title"
        >
          <div className="admin-activity-detail-information__heading">
            <h2 id="activity-information-title">
              {actividad.titulo}
            </h2>

            <div className="admin-activity-detail-badges">
              <span
                className={
                  'admin-activity-detail-badge ' +
                  `admin-activity-detail-badge--${estadoNormalizado}`
                }
              >
                {nombreEstado}
              </span>
              {/* El estado de los cupos solo es necesario mientras la actividad está programada. */}
              {estadoNormalizado ===
                'programada' && (
                  <span
                    className={
                      existenCupos
                        ? 'admin-activity-detail-badge admin-activity-detail-badge--available'
                        : 'admin-activity-detail-badge admin-activity-detail-badge--full'
                    }
                    >
                      {existenCupos
                        ? 'Cupos disponibles'
                        : 'Sin cupos'}
                    </span>
                )}
            </div>
          </div>

          <div className="admin-activity-detail-description">
            <h3>
              Descripción de la actividad
            </h3>

            <p>
              {prepararTexto(
                actividad.descripcion,
              ) ||
                'Esta actividad no tiene una descripción disponible.'}
            </p>
          </div>

          <dl className="admin-activity-detail-facts">
            <div className="admin-activity-detail-fact">
              <span className="admin-activity-detail-fact__icon">
                <CalendarDays aria-hidden="true" />
              </span>

              <div>
                <dt>Fecha</dt>

                <dd>
                  <time dateTime={actividad.fecha}>
                    {formatearFecha(
                      actividad.fecha,
                    )}
                  </time>
                </dd>
              </div>
            </div>

            <div className="admin-activity-detail-fact">
              <span className="admin-activity-detail-fact__icon">
                <Clock3 aria-hidden="true" />
              </span>

              <div>
                <dt>Horario</dt>

                <dd>
                  {formatearHorario(
                    actividad.horaInicio,
                    actividad.horaFinalizacion,
                  )}
                </dd>
              </div>
            </div>

            <div className="admin-activity-detail-fact">
              <span className="admin-activity-detail-fact__icon">
                <MapPin aria-hidden="true" />
              </span>

              <div>
                <dt>Lugar</dt>

                <dd>
                  {prepararTexto(
                    actividad.lugar,
                  ) ||
                    'Lugar no disponible'}
                </dd>
              </div>
            </div>

            <div className="admin-activity-detail-fact">
              <span className="admin-activity-detail-fact__icon">
                <Clock3 aria-hidden="true" />
              </span>

              <div>
                <dt>
                  Horas acreditables
                </dt>

                <dd>
                  {formatearHoras(
                    horasAcreditables,
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <aside
          className="admin-activity-detail-card admin-activity-detail-summary"
          aria-labelledby="activity-summary-title"
        >
          <h2 id="activity-summary-title">
            Resumen de inscripciones
          </h2>

          <div className="admin-activity-detail-summary__count">
            <strong>
              {cantidadInscritos}
            </strong>

            <span>
              {cantidadInscritos === 1
                ? 'estudiante inscrito'
                : 'estudiantes inscritos'}
            </span>
          </div>

          <p className="admin-activity-detail-summary__availability">
            <strong>
              {cuposDisponibles}
            </strong>{' '}
            {cuposDisponibles === 1
              ? 'cupo disponible'
              : 'cupos disponibles'}{' '}
            de{' '}
            <strong>
              {cuposTotales}
            </strong>{' '}
            {cuposTotales === 1
              ? 'cupo total'
              : 'cupos totales'}
          </p>

          <div
            className="admin-activity-detail-progress"
            role="progressbar"
            aria-label="Ocupación de la actividad"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              porcentajeOcupacion
            }
          >
            <span
              style={{
                '--admin-activity-progress':
                  `${porcentajeOcupacion}%`,
              }}
            />
          </div>

          <dl className="admin-activity-detail-summary__metrics">
            <div className="admin-activity-detail-summary__metric">
              <UsersRound aria-hidden="true" />

              <dt>Cupos totales</dt>

              <dd>{cuposTotales}</dd>
            </div>

            <div className="admin-activity-detail-summary__metric">
              <UserRound aria-hidden="true" />

              <dt>Inscritos</dt>

              <dd>
                {cantidadInscritos}
              </dd>
            </div>

            <div className="admin-activity-detail-summary__metric">
              <GraduationCap aria-hidden="true" />

              <dt>Disponibles</dt>

              <dd>
                {cuposDisponibles}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <section
        className="admin-activity-detail-card admin-activity-detail-students"
        aria-labelledby="activity-students-title"
      >
        <div className="admin-activity-detail-students__heading">
          <h2 id="activity-students-title">
            Estudiantes inscritos
          </h2>

          <span>
            {cantidadInscritos}{' '}
            {cantidadInscritos === 1
              ? 'estudiante'
              : 'estudiantes'}
          </span>
        </div>

        {estudiantesInscritos.length ===
          0 ? (
          <div className="admin-activity-detail-empty">
            <UsersRound aria-hidden="true" />

            <h3>
              No hay estudiantes inscritos
            </h3>

            <p>
              La lista se actualizará cuando
              existan inscripciones para esta
              actividad.
            </p>
          </div>
        ) : (
          <div className="admin-activity-detail-table-wrapper">
            <table className="admin-activity-detail-table">
              <caption>
                Estudiantes inscritos en la actividad
              </caption>

              <thead>
                <tr>
                  <th scope="col">
                    Estudiante
                  </th>

                  <th scope="col">
                    Número de cuenta
                  </th>

                  <th scope="col">
                    Carrera
                  </th>

                  <th scope="col">
                    Asistencia
                  </th>

                  <th scope="col">
                    Horas
                  </th>

                  <th scope="col">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {estudiantesInscritos.map(
                  ({
                    asistencia,
                    estudiante,
                  }) => {
                    const datosPersonales =
                      estudiante
                        ?.datosPersonales ??
                      {}

                    const numeroCuenta =
                      asistencia
                        .numeroCuenta

                    const nombreCompleto =
                      datosPersonales
                        .nombreCompleto ||
                      'Estudiante sin información'

                    const carrera =
                      datosPersonales
                        .carrera ||
                      'Carrera no disponible'

                    const estadoAsistencia =
                      obtenerEstadoAsistencia(
                        asistencia,
                      )

                    const entradaRegistrada =
                      asistencia.checkIn ===
                      true

                    const salidaRegistrada =
                      asistencia.checkOut ===
                      true

                    const identificadorEntrada =
                      `${TIPOS_MARCACION.entrada}:${numeroCuenta}`

                    const identificadorSalida =
                      `${TIPOS_MARCACION.salida}:${numeroCuenta}`

                    const procesandoEntrada =
                      procesandoMarcacion ===
                      identificadorEntrada

                    const procesandoSalida =
                      procesandoMarcacion ===
                      identificadorSalida

                    return (
                      <tr key={asistencia.id}>
                        <td data-label="Estudiante">
                          <div className="admin-activity-detail-student">
                            <span
                              className="admin-activity-detail-student__avatar"
                              aria-hidden="true"
                            >
                              {obtenerIniciales(
                                nombreCompleto,
                              )}
                            </span>
                            <div className="admin-activity-detail-student__identity">
                                <strong>
                                    {nombreCompleto}
                                </strong>
                            </div>
                          </div>
                        </td>

                        <td data-label="Número de cuenta">
                          <span className="admin-activity-detail-table__account">
                            {numeroCuenta}
                          </span>
                        </td>

                        <td data-label="Carrera">
                          <span className="admin-activity-detail-table__career">
                            {carrera}
                          </span>
                        </td>

                        <td data-label="Asistencia">
                          <span
                            className={
                              estadoAsistencia.clase
                            }
                          >
                            {salidaRegistrada ? (
                              <CheckCircle2
                                aria-hidden="true"
                              />
                            ) : entradaRegistrada ? (
                              <LogIn
                                aria-hidden="true"
                              />
                            ) : (
                              <Clock3
                                aria-hidden="true"
                              />
                            )}

                            {
                              estadoAsistencia.texto
                            }
                          </span>
                        </td>

                        <td data-label="Horas">
                          {formatearHoras(
                            asistencia
                              .horasRegistradas,
                          )}
                        </td>

                        <td data-label="Acciones">
                          <div className="admin-activity-detail-actions">
                            <Link
                              className="admin-activity-detail-action admin-activity-detail-action--view"
                              to={
                                `/admin-principal/estudiantes/` +
                                encodeURIComponent(
                                  numeroCuenta,
                                )
                              }
                              state={{
                                origen:
                                  'detalle-actividad',

                                actividadId:
                                  actividad.id,
                              }}
                              aria-label={
                                `Ver información de ${nombreCompleto}`
                              }
                            >
                              <Eye aria-hidden="true" />
                            </Link>

                            <button
                              className={
                                entradaRegistrada
                                  ? 'admin-activity-detail-action admin-activity-detail-action--completed'
                                  : 'admin-activity-detail-action admin-activity-detail-action--entry'
                              }
                              type="button"
                              disabled={
                                entradaRegistrada ||
                                procesando
                              }
                              onClick={() =>
                                abrirConfirmacion(
                                  TIPOS_MARCACION.entrada,
                                  {
                                    asistencia,
                                    estudiante,
                                  },
                                )
                              }
                            >
                              {procesandoEntrada ? (
                                <LoaderCircle
                                  className="admin-activity-detail-action__loader"
                                  aria-hidden="true"
                                />
                              ) : entradaRegistrada ? (
                                <CheckCircle2
                                  aria-hidden="true"
                                />
                              ) : (
                                <LogIn
                                  aria-hidden="true"
                                />
                              )}

                              {entradaRegistrada
                                ? 'Entrada lista'
                                : 'Marcar entrada'}
                            </button>

                            <button
                              className={
                                salidaRegistrada
                                  ? 'admin-activity-detail-action admin-activity-detail-action--completed'
                                  : 'admin-activity-detail-action admin-activity-detail-action--exit'
                              }
                              type="button"
                              disabled={
                                !entradaRegistrada ||
                                salidaRegistrada ||
                                procesando
                              }
                              title={
                                !entradaRegistrada
                                  ? 'Primero debes registrar la entrada'
                                  : undefined
                              }
                              onClick={() =>
                                abrirConfirmacion(
                                  TIPOS_MARCACION.salida,
                                  {
                                    asistencia,
                                    estudiante,
                                  },
                                )
                              }
                            >
                              {procesandoSalida ? (
                                <LoaderCircle
                                  className="admin-activity-detail-action__loader"
                                  aria-hidden="true"
                                />
                              ) : salidaRegistrada ? (
                                <CheckCircle2
                                  aria-hidden="true"
                                />
                              ) : (
                                <LogOut
                                  aria-hidden="true"
                                />
                              )}

                              {salidaRegistrada
                                ? 'Salida lista'
                                : 'Marcar salida'}
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

      <AlertDialog.Root
        open={dialogoAbierto}
        onOpenChange={
          manejarCambioDialogo
        }
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-activity-detail-dialog__overlay" />

          <AlertDialog.Content className="admin-activity-detail-dialog__content">
            <div
              className={
                dialogoEsEntrada
                  ? 'admin-activity-detail-dialog__icon admin-activity-detail-dialog__icon--entry'
                  : 'admin-activity-detail-dialog__icon admin-activity-detail-dialog__icon--exit'
              }
            >
              {dialogoEsEntrada ? (
                <LogIn aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
            </div>

            <AlertDialog.Title>
              {dialogoEsEntrada
                ? 'Confirmar entrada'
                : 'Confirmar salida'}
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-activity-detail-dialog__description">
              {dialogoEsEntrada
                ? 'Se registrará manualmente la entrada del estudiante a esta actividad.'
                : `Se registrará la salida y se acreditarán automáticamente ${formatearHoras(
                    horasAcreditables,
                  )}.`}
            </AlertDialog.Description>

            <div className="admin-activity-detail-dialog__student">
              <span aria-hidden="true">
                {obtenerIniciales(
                  nombreEstudianteDialogo,
                )}
              </span>

              <div>
                <strong>
                  {nombreEstudianteDialogo}
                </strong>

                <small>
                  {numeroCuentaDialogo}
                </small>
              </div>
            </div>

            <div className="admin-activity-detail-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-activity-detail-dialog__cancel"
                  type="button"
                  disabled={procesando}
                >
                  Cancelar
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  className={
                    dialogoEsEntrada
                      ? 'admin-activity-detail-dialog__confirm'
                      : 'admin-activity-detail-dialog__confirm admin-activity-detail-dialog__confirm--exit'
                  }
                  type="button"
                  disabled={procesando}
                  onClick={
                    confirmarMarcacion
                  }
                >
                  {procesando ? (
                    <LoaderCircle
                      className="admin-activity-detail-action__loader"
                      aria-hidden="true"
                    />
                  ) : dialogoEsEntrada ? (
                    <LogIn aria-hidden="true" />
                  ) : (
                    <LogOut aria-hidden="true" />
                  )}

                  {procesando
                    ? 'Registrando...'
                    : dialogoEsEntrada
                      ? 'Registrar entrada'
                      : 'Registrar salida'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

export default AdminPrincipalActivityDetail