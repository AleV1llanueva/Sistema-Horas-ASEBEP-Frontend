import {
    ArrowLeft,
    Award,
    CalendarDays,
    CheckCircle2,
    Clock3,
    GraduationCap,
    Info,
    MapPin,
    RotateCcw,
    UsersRound,
} from 'lucide-react'

import {
    useEffect,
    useState,
} from 'react'

import {
    Link,
    useNavigate,
    useParams,
} from 'react-router'

import ActivityConfirmationDialog from '../components/ActivityConfirmationDialog.jsx'
import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import {
    cancelarInscripcionActividad,
    inscribirEstudianteEnActividad,
    obtenerActividadEstudiante,
    obtenerRestriccionCancelacionActividad,
} from '../services/estudianteActividadesService.js'
import {
    notificarError,
    notificarExito,
} from '../services/notificationService.js'
import '../styles/AppLayout.css'
import '../styles/ActivityDetail.css'

const ACCIONES = Object.freeze({
    inscripcion: 'inscripcion',
    cancelacion: 'cancelacion',
})

const ESTADOS_DISPONIBLES = Object.freeze([
    'programada',
    'en-curso'
])

// Convierte un estado a una forma consistente.
function normalizarEstado(valor) {
    return String(valor ?? '')
        .trim()
        .toLocaleLowerCase('es')
}

// Devuelve la fecha local actual en formato YYYY-MM-DD.
function obtenerFechaHoy() {
    const fechaActual = new Date()
    const anio = fechaActual.getFullYear()
    const mes = String(
        fechaActual.getMonth() + 1,
    ).padStart(2, '0')

    const dia = String(
        fechaActual.getDate(),
    ).padStart(2, '0')

    return `${anio}-${mes}-${dia}`
}

/*
* Convierte una fecha YYYY-MM-DD en un objeto Date local.
* Tambien comprueba que el día y el mes realmente existan.
*/
function crearFechaLocal(fecha) {
    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return null
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

    const esValida =
        fechaLocal.getFullYear() === anio &&
        fechaLocal.getMonth() === mes - 1 &&
        fechaLocal.getDate() === dia

    return esValida
        ? fechaLocal
        : null
}

// Prepara la fecha completa y su version resumida para las distintas areas del detalle.
function obtenerInformacionFecha(fecha) {
    const fechaLocal = crearFechaLocal(fecha)

    if (!fechaLocal) {
        return {
            dia: '--',
            mes: '---',
            fechaCompleta: 'Fecha pendiente',
        }
    }

    const dia = new Intl.DateTimeFormat(
        'es-HN',
        {
            day: '2-digit',
        },
    ).format(fechaLocal)

    const mes = new Intl.DateTimeFormat(
        'es-HN',
        {
            month: 'short',
        },
    )
        .format(fechaLocal)
        .replace('.', '')
        .toUpperCase()

    const fechaCompleta = new Intl.DateTimeFormat(
        'es-HN',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        },
    ).format(fechaLocal)

    return {
        dia,
        mes,
        fechaCompleta,
    }
}

// Convierte una hora de 24 horas al formato habitual de Honduras.
function formatearHora(hora) {
    if (
        typeof hora !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            hora,
        )
    ) {
        return ''
    }

    const [
        horas,
        minutos,
    ] = hora.split(':').map(Number)

    const fechaHora = new Date()

    fechaHora.setHours(
        horas, minutos,
        0, 0,
    )

    return new Intl.DateTimeFormat(
        'es-HN',
        {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        },
    ).format(fechaHora)
}

// Construye el intervalo de tiempo completo.
function obtenerHorario(actividad) {
    const horaInicio = formatearHora(
        actividad?.horaInicio,
    )

    const horaFinalizacion = formatearHora(
        actividad?.horaFinalizacion,
    )

    if (
        !horaInicio || !horaFinalizacion
    ) {
        return 'Horario pendiente'
    }

    return (
        `${horaInicio} - ` +
        `${horaFinalizacion}`
    )
}

function obtenerTextoHoras(cantidad) {
    const horas = Math.max(
        0,
        Number(cantidad) || 0,
    )

    return `${horas} ${
        horas === 1 ? 'hora': 'horas'
    }`
}

// Calcula el porcentaje de cupos todavia disponibles. El valor siempre permanece entre 0 y 100
function obtenerPorcentajeCupos(
  cuposDisponibles,
  cuposTotales,
) {
  if (
    !Number.isInteger(cuposTotales) ||
    cuposTotales <= 0 ||
    !Number.isInteger(
      cuposDisponibles,
    )
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (
          cuposDisponibles /
          cuposTotales
        ) * 100,
      ),
    ),
  )
}

// Define el texto y el color del estado mostrado junto al título.
function obtenerPresentacionEstado({
  esHistorial,
  esAsistenciaIncompleta,
  estaInscrito,
  puedeInscribirse,
  actividad,
}) {
  if (esHistorial) {
    return {
      texto: 'Actividad completada',
      clase:
        'activity-detail-status--completed',
    }
  }

  /*
   * Esta situación tiene prioridad sobre el estado
   * general de la inscripción.
   */
  if (esAsistenciaIncompleta) {
    return {
      texto: 'Asistencia incompleta',
      clase:
        'activity-detail-status--closed',
    }
  }

  if (estaInscrito) {
    return {
      texto: 'Inscripción confirmada',
      clase:
        'activity-detail-status--registered',
    }
  }

  if (puedeInscribirse) {
    return {
      texto: 'Inscripciones abiertas',
      clase:
        'activity-detail-status--open',
    }
  }

  if (
    actividad.cuposDisponibles === 0
  ) {
    return {
      texto: 'Cupos agotados',
      clase:
        'activity-detail-status--closed',
    }
  }

  if (
    actividad.fecha &&
    actividad.fecha < obtenerFechaHoy()
  ) {
    return {
      texto: 'Actividad finalizada',
      clase:
        'activity-detail-status--closed',
    }
  }

  return {
    texto: 'Inscripción no disponible',
    clase:
      'activity-detail-status--closed',
  }
}

// Estado reutilizable para carga, error o actividad inexistente.
function ActivityDetailState({
    tipo = 'informacion',
    titulo,
    descripcion,
    onReintentar,
}) {
    return (
    <section
      className={
        tipo === 'error'
          ? 'activity-detail-state activity-detail-state--error'
          : 'activity-detail-state'
      }
      role={
        tipo === 'error'
          ? 'alert'
          : 'status'
      }
      aria-live="polite"
    >
      {tipo === 'error' ? (
        <RotateCcw aria-hidden="true" />
      ) : (
        <CalendarDays aria-hidden="true" />
      )}

      <h1>{titulo}</h1>

      <p>{descripcion}</p>

      {typeof onReintentar ===
        'function' && (
        <button
          type="button"
          onClick={onReintentar}
        >
          <RotateCcw aria-hidden="true" />

          Intentar nuevamente
        </button>
      )}

      {tipo === 'no-encontrada' && (
        <Link to="/actividades">
          Volver a actividades
        </Link>
      )}
    </section>
  )
}

function ActivityDetail() {
  const { actividadId } =
    useParams()

  const navigate = useNavigate()

  const [
    actividad,
    setActividad,
  ] = useState(null)

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    errorCarga,
    setErrorCarga,
  ] = useState('')

  const [
    intentoCarga,
    setIntentoCarga,
  ] = useState(0)

  // Conserva la hora actual utilizada para evaluar el limite de cancelacion en la interfaz.
  const [
    instanteActual,
    setInstanteActual,
  ] = useState(
    () => new Date(),
  )

  /*
  * La visibilidad se controla por separado de la accion.
   */
  const [
    dialogoAbierto,
    setDialogoAbierto,
  ] = useState(false)

  const [
    accionPendiente,
    setAccionPendiente,
  ] = useState(
    ACCIONES.inscripcion,
  )

  const [
    procesando,
    setProcesando,
  ] = useState(false)

  /*
   * Consulta el detalle usando el identificador incluido en la URL.
   * El servicio decide si obtiene los datos desde mocks o desde la API.
   */
  useEffect(() => {
    let componenteActivo = true

    async function cargarActividad() {
      setCargando(true)
      setErrorCarga('')
      setActividad(null)

      try {
        const resultado =
          await obtenerActividadEstudiante(
            actividadId,
          )

        if (!componenteActivo) {
          return
        }

        setActividad(resultado)
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible consultar la actividad.',
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarActividad()

    return () => {
      componenteActivo = false
    }
  }, [
    actividadId,
    intentoCarga,
  ])

  // Mientras exista una inscripcion pendiente, actualizamos el reloj de la pantalla cada segundo.
  useEffect(() => {
    const asistenciaConfirmada =
      normalizarEstado(
        actividad?.estadoAsistencia,
      ) === 'asistió'

      if (
        !actividad ||
        actividad.inscrito !== true ||
        asistenciaConfirmada
      ) {
        return undefined
      }

      let intervaloHorario = null

      function actualizarHorario() {
        const ahora = new Date()

        setInstanteActual(ahora)

        // Cuando la cancelacion ya esta restringida
        const restriccion =
          obtenerRestriccionCancelacionActividad(
            actividad,
            ahora,
          )

        if (
          restriccion &&
          intervaloHorario !== null
        ) {
          window.clearInterval(
            intervaloHorario,
          )

          intervaloHorario = null
        }
      }

      // Actualizamos inmediatamente porque la actividad pudo tardar algunos segundos en cargar.
      actualizarHorario()

      if (
        !obtenerRestriccionCancelacionActividad(
          actividad,
          new Date(),
        )
      ) {
        intervaloHorario =
          window.setInterval(
            actualizarHorario,
            1000,
          )
      }

      // Los navegadores pueden pasar pausar intervalos cuando la pestaña permanece en segundo plano.
      function actualizarAlRegresar() {
        if (
          document.visibilityState === 'visible'
        ) {
          actualizarHorario()
        }
      }

      window.addEventListener(
        'focus',
        actualizarHorario,
      )

      document.addEventListener(
        'visibilitychange',
        actualizarAlRegresar,
      )

      return() => {
        if (intervaloHorario !== null) {
          window.clearInterval(
            intervaloHorario,
          )
        }

        window.removeEventListener(
          'focus',
          actualizarHorario,
        )

        document.removeEventListener(
          'visibilitychange',
          actualizarAlRegresar,
        )
      }
  }, [actividad])

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  // Conservamos la ultima accion seleccionada cuando el dialogo se cierra.
  function abrirDialogoConfirmacion(
    accion,
  ) {
    setAccionPendiente(accion)
    setDialogoAbierto(true)
  }

  function cerrarDialogoConfirmacion() {
    if (procesando) {
      return
    }

    setDialogoAbierto(false)
  }

  /*
   * Ejecuta la acción seleccionada y utiliza Sonner
   * solamente para informar su resultado.
   */
  async function confirmarAccion() {
    if (
      !actividad ||
      procesando
    ) {
      return
    }

    setProcesando(true)

    try {
      if (
        accionPendiente ===
        ACCIONES.inscripcion
      ) {
        await inscribirEstudianteEnActividad(
          actividad.id,
        )

        notificarExito({
          id:
            `actividad-inscrita-${actividad.id}`,
          titulo:
            'Inscripción confirmada',
          descripcion:
            `Te inscribiste correctamente en “${actividad.titulo}”.`,
        })
      } else {
        await cancelarInscripcionActividad(
          actividad.id,
        )

        notificarExito({
          id:
            `inscripcion-cancelada-${actividad.id}`,
          titulo:
            'Inscripción cancelada',
          descripcion:
            `Cancelaste tu inscripción en “${actividad.titulo}”.`,
        })
      }

      /*
       * Cerramos el diálogo antes de regresar al listado.
       * La notificación permanece visible porque Sonner
       * está configurado en el nivel principal de la aplicación.
       */
      setDialogoAbierto(false)
      setProcesando(false)

      navigate(
        '/actividades',
        {
          replace: true,
        },
      )
    } catch (error) {
      setProcesando(false)

      notificarError({
        id:
          `error-actividad-${actividad.id}`,
        titulo:
          'No fue posible completar la acción',
        descripcion:
          error instanceof Error
            ? error.message
            : 'Inténtalo nuevamente.',
      })
    }
  }

  // La situacion se calcula en el servicio utilizado las marcaciones individuales en entrada y salida.
  const situacionAsistencia =
    actividad?.situacionAsistencia ??
    'sin-inscripcion'
  
  // Una actividad pertenece al historial solamente cuando se registraron entrada y salida.
  const esHistorial =
    situacionAsistencia === 'asistio'
  
  const esAsistenciaIncompleta =
    situacionAsistencia === 'incompleta'

  const estaInscrito =
    actividad?.inscrito === true

  const cuposTotales =
    Number.isInteger(
      actividad?.cuposTotales,
    )
      ? actividad.cuposTotales
      : 0

  const cuposDisponibles =
    Number.isInteger(
      actividad?.cuposDisponibles,
    )
      ? actividad.cuposDisponibles
      : 0

  /*
   * Estas validaciones reflejan las mismas reglas
   * utilizadas por el servicio antes de inscribir.
   */
  const fechaValida =
    Boolean(
      crearFechaLocal(
        actividad?.fecha,
      ),
    )

  const fechaVigente =
    fechaValida &&
    actividad.fecha >=
      obtenerFechaHoy()

  const estadoPermitido =
    ESTADOS_DISPONIBLES.includes(
      normalizarEstado(
        actividad?.estado,
      ),
    )

  const puedeInscribirse =
    Boolean(actividad) &&
    !estaInscrito &&
    !esHistorial &&
    actividad.activa === true &&
    actividad.eliminada !== true &&
    fechaVigente &&
    estadoPermitido &&
    cuposDisponibles > 0

    /*
    * Una asistencia incompleta ya no puede cancelarse.
    * Debe permanecer disponible para la revision posterior del administrador.
    */
  const restriccionCancelacion =
    Boolean(actividad) &&
    estaInscrito &&
    !esHistorial &&
    !esAsistenciaIncompleta
      ? obtenerRestriccionCancelacionActividad(
        actividad,
        instanteActual,
      )
    : ''

  const puedeCancelar =
      Boolean(actividad) &&
      estaInscrito &&
      !esHistorial &&
      !esAsistenciaIncompleta &&
      !restriccionCancelacion

  const cancelacionBloqueada =
      Boolean(actividad) &&
      estaInscrito &&
      !esHistorial &&
      !esAsistenciaIncompleta &&
      Boolean(restriccionCancelacion)

  const informacionFecha =
    obtenerInformacionFecha(
      actividad?.fecha,
    )

  const horario =
    obtenerHorario(actividad)

  const horasMostradas =
    esHistorial
      ? actividad?.horasRegistradas ??
        actividad?.horasAcreditables
      : actividad?.horasAcreditables

  const porcentajeCupos =
    obtenerPorcentajeCupos(
      cuposDisponibles,
      cuposTotales,
    )

  const presentacionEstado =
    actividad
      ? obtenerPresentacionEstado({
          esHistorial,
          esAsistenciaIncompleta,
          estaInscrito,
          puedeInscribirse,
          actividad,
        })
      : null

  const esCancelacion =
    accionPendiente ===
    ACCIONES.cancelacion

  const descripcionConfirmacion =
    esCancelacion
      ? `¿Deseas cancelar tu inscripción en “${actividad?.titulo}”? El cupo volverá a estar disponible para otro estudiante.`
      : `¿Deseas confirmar tu inscripción en “${actividad?.titulo}”? La actividad aparecerá en tus próximas actividades.`

  return (
    <div className="app-layout">
      {/* Navegación principal del portal del estudiante. */}
      <AppSidebar />

      <section className="app-content">
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <GraduationCap
              aria-hidden="true"
            />

            <strong>ASEBEP</strong>
          </div>

          <span className="app-topbar__section">
            Actividades
          </span>
        </header>

        <main className="activity-detail-main">
          {/* Regreso directo al listado principal de actividades. */}
          <Link
            className="activity-detail-back"
            to="/actividades"
          >
            <ArrowLeft aria-hidden="true" />

            Volver a actividades
          </Link>

          {cargando && (
            <ActivityDetailState
              titulo="Cargando actividad"
              descripcion="Estamos consultando la información del detalle."
            />
          )}

          {!cargando &&
            errorCarga && (
              <ActivityDetailState
                tipo="error"
                titulo="No fue posible cargar la actividad"
                descripcion={errorCarga}
                onReintentar={
                  reintentarCarga
                }
              />
            )}

          {!cargando &&
            !errorCarga &&
            !actividad && (
              <ActivityDetailState
                tipo="no-encontrada"
                titulo="Actividad no encontrada"
                descripcion="La actividad solicitada no existe o ya no se encuentra disponible."
              />
            )}

          {!cargando &&
            !errorCarga &&
            actividad && (
              <div className="activity-detail-entry">
                {/* Título y estado actual de la actividad. */}
                <header className="activity-detail-heading">
                  <p>
                    Detalle de actividad
                  </p>

                  <div className="activity-detail-heading__row">
                    <h1>
                      {actividad.titulo ||
                        'Actividad sin título'}
                    </h1>

                    <span
                      className={
                        `activity-detail-status ` +
                        `${presentacionEstado.clase}`
                      }
                    >
                      {
                        presentacionEstado.texto
                      }
                    </span>
                  </div>
                </header>

                <div className="activity-detail-layout">
                  {/* Información publicada por el administrador. */}
                  <section
                    className="activity-detail-information"
                    aria-labelledby="titulo-sobre-actividad"
                  >
                    <div className="activity-detail-description">
                      <h2 id="titulo-sobre-actividad">
                        Sobre la actividad
                      </h2>

                      <p>
                        {actividad.descripcion ||
                          'No existe una descripción disponible para esta actividad.'}
                      </p>
                    </div>

                    <div className="activity-detail-data">
                      <article className="activity-detail-data__item">
                        <span aria-hidden="true">
                          <CalendarDays />
                        </span>

                        <div>
                          <h3>
                            Fecha y hora
                          </h3>

                          <p>
                            {
                              informacionFecha.fechaCompleta
                            }
                          </p>

                          <p>{horario}</p>
                        </div>
                      </article>

                      <article className="activity-detail-data__item">
                        <span aria-hidden="true">
                          <MapPin />
                        </span>

                        <div>
                          <h3>Lugar</h3>

                          <p>
                            {actividad.lugar ||
                              'Lugar pendiente'}
                          </p>
                        </div>
                      </article>

                      <article className="activity-detail-data__item">
                        <span aria-hidden="true">
                          <Award />
                        </span>

                        <div>
                          <h3>
                            Horas acreditables
                          </h3>

                          <p>
                            {obtenerTextoHoras(
                              horasMostradas,
                            )}
                          </p>
                        </div>
                      </article>

                      {esHistorial && (
                        <article className="activity-detail-data__item">
                          <span aria-hidden="true">
                            <CheckCircle2 />
                          </span>

                          <div>
                            <h3>
                              Asistencia
                            </h3>

                            <p>
                              Asistencia confirmada
                            </p>
                          </div>
                        </article>
                      )}
                    </div>
                  </section>

                  {/* Panel lateral de inscripción o resumen histórico. */}
                  <aside className="activity-detail-summary">
                    {esHistorial ? (
                      <>
                        <div className="activity-detail-history">
                          <span
                            className="activity-detail-history__icon"
                            aria-hidden="true"
                          >
                            <CheckCircle2 />
                          </span>

                          <h2>
                            Actividad completada
                          </h2>

                          <strong>
                            {obtenerTextoHoras(
                              horasMostradas,
                            )}
                          </strong>

                          <p>
                            acreditadas a tu historial
                          </p>
                        </div>

                        <div className="activity-detail-history__information">
                          <Info aria-hidden="true" />

                          <p>
                            Tu asistencia fue confirmada. Esta vista es únicamente informativa.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2>Inscripción</h2>

                        <div className="activity-detail-capacity">
                          <UsersRound
                            aria-hidden="true"
                          />

                          <strong>
                            {cuposDisponibles}
                          </strong>

                          <div>
                            <b>
                              cupos disponibles
                            </b>

                            <span>
                              {cuposTotales > 0
                                ? `de ${cuposTotales} cupos totales`
                                : 'Cupo total pendiente'}
                            </span>
                          </div>
                        </div>

                        <div
                          className="activity-detail-progress"
                          role="progressbar"
                          aria-label={`Cupos disponibles para ${actividad.titulo}`}
                          aria-valuemin="0"
                          aria-valuemax={Math.max(
                            cuposTotales,
                            1,
                          )}
                          aria-valuenow={
                            cuposDisponibles
                          }
                        >
                          <span
                            style={{
                              width:
                                `${porcentajeCupos}%`,
                            }}
                          />
                        </div>

                        <div className="activity-detail-metrics">
                          <div>
                            <CalendarDays
                              aria-hidden="true"
                            />

                            <span>Fecha</span>

                            <strong>
                              {
                                informacionFecha.dia
                              }{' '}
                              {
                                informacionFecha.mes
                              }
                            </strong>
                          </div>

                          <div>
                            <Clock3
                              aria-hidden="true"
                            />

                            <span>Horario</span>

                            <strong>
                              {horario}
                            </strong>
                          </div>

                          <div>
                            <Award
                              aria-hidden="true"
                            />

                            <span>Horas</span>

                            <strong>
                              {Math.max(
                                0,
                                Number(
                                  actividad.horasAcreditables,
                                ) || 0,
                              )}
                            </strong>
                          </div>
                        </div>

                        {puedeInscribirse && (
                          <button
                            className="activity-detail-action activity-detail-action--enroll"
                            type="button"
                            onClick={() =>
                              abrirDialogoConfirmacion(
                                ACCIONES.inscripcion,
                              )
                            }
                          >
                            Inscribirme en la actividad
                          </button>
                        )}

                        {puedeCancelar && (
                          <button
                            className="activity-detail-action activity-detail-action--cancel"
                            type="button"
                            onClick={() =>
                              abrirDialogoConfirmacion(
                                ACCIONES.cancelacion,
                              )
                            }
                          >
                            Cancelar mi inscripción
                          </button>
                        )}

                        {!puedeInscribirse &&
                          !puedeCancelar && (
                            <button
                              className="activity-detail-action"
                              type="button"
                              disabled
                            >
                              {esAsistenciaIncompleta
                                ? 'Asistencia incompleta'
                                : cancelacionBloqueada
                                  ? 'Cancelación no disponible'
                                  : 'Inscripción no disponible'}
                            </button>
                          )}

                        <div className="activity-detail-notice">
                          <Info aria-hidden="true" />

                          <p>
                            {esAsistenciaIncompleta &&
                              'No se confirmó tu estadía completa porque registraste la entrada, pero no la salida. Debes entregar un comprobante de tu participación por WhatsApp, correo o personalmente para que el administrador revise y confirme tu asistencia.'}

                            {!esAsistenciaIncompleta &&
                              puedeInscribirse &&
                              'Al inscribirte, la actividad aparecerá en la pestaña Mis próximas actividades.'}

                            {!esAsistenciaIncompleta &&
                              puedeCancelar &&
                              'Puedes cancelar tu inscripción hasta 2 horas antes del inicio de la actividad.'}

                            {!esAsistenciaIncompleta &&
                              cancelacionBloqueada &&
                              restriccionCancelacion}

                            {!esAsistenciaIncompleta &&
                              !puedeInscribirse &&
                              !puedeCancelar &&
                              !cancelacionBloqueada &&
                              'En este momento no es posible inscribirse en esta actividad.'}
                          </p>
                        </div>
                      </>
                    )}
                  </aside>
                </div>
              </div>
            )}
        </main>

        {/* Navegación inferior utilizada en dispositivos móviles. */}
        <MobileNavigation />
      </section>

      {/* Confirmación persistente para inscripción y cancelación. */}
      <ActivityConfirmationDialog
        abierto={dialogoAbierto}
        variante={
          esCancelacion
            ? 'cancelacion'
            : 'inscripcion'
        }
        descripcion={
          descripcionConfirmacion
        }
        procesando={procesando}
        onConfirmar={
          confirmarAccion
        }
        onCancelar={cerrarDialogoConfirmacion}
      />
    </div>
  )
}

export default ActivityDetail