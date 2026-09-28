import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  RotateCcw,
  ScanLine,
  Search,
  X,
} from 'lucide-react'
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import {
  interpretarCodigoQrAsistencia,
  listarActividadesDisponibles,
  listarHistorialActividades,
  listarProximasActividadesInscritas,
  obtenerDisponibilidadMarcacionActividad,
  registrarAsistenciaPorQr,
} from '../services/estudianteActividadesService.js'
import {
  notificarError,
  notificarExito,
} from '../services/notificationService.js'
import '../styles/AppLayout.css'
import '../styles/Activities.css'

/*
 * Identificadores internos de las vistas.
 * Se añadió 'enCurso' para separar lo que está pasando ahorita.
 */
const VISTAS = Object.freeze({
  disponibles: 'disponibles',
  enCurso: 'enCurso',
  proximas: 'proximas',
  historial: 'historial',
})

/*
 * Tipos de marcación aceptados por el servicio.
 */
const TIPOS_MARCACION = Object.freeze({
  entrada: 'entrada',
  salida: 'salida',
})

/*
 * Estados utilizados por el cuadro del lector QR.
 */
const ESTADOS_LECTOR = Object.freeze({
  iniciando: 'iniciando',
  escaneando: 'escaneando',
  procesando: 'procesando',
  error: 'error',
  exito: 'exito',
})

const ID_CONTENEDOR_LECTOR =
  'student-attendance-qr-reader'

// Información visual correspondiente a cada pestaña.
const INFORMACION_VISTAS =
  Object.freeze({
    [VISTAS.disponibles]: {
      nombre: 'Actividades disponibles',
      descripcion: 'Consulta las actividades publicadas por ASEBEP.',
      mensajeVacio: 'No hay actividades disponibles en este momento.',
    },

    [VISTAS.enCurso]: {
      nombre: 'En curso',
      descripcion: 'Actividades que se están llevando a cabo en este momento.',
      mensajeVacio: 'No tienes actividades en curso actualmente.',
    },

    [VISTAS.proximas]: {
      nombre: 'Mis próximas actividades',
      descripcion: 'Revisa tus actividades inscritas futuras.',
      mensajeVacio: 'Todavía no estás inscrito en una actividad futura.',
    },

    [VISTAS.historial]: {
      nombre: 'Historial',
      descripcion: 'Consulta las actividades pasadas y completadas.',
      mensajeVacio: 'Todavía no tienes actividades en el historial.',
    },
  })

const INFORMACION_MARCACIONES =
  Object.freeze({
    [TIPOS_MARCACION.entrada]: {
      nombre: 'entrada',
      etiqueta: 'Marcar entrada',
      etiquetaRegistrada: 'Entrada registrada',
      tituloLector: 'Escanear QR de entrada',
      instruccion: 'Apunta la cámara al QR de entrada mostrado por el administrador.',
      Icono: LogIn,
    },

    [TIPOS_MARCACION.salida]: {
      nombre: 'salida',
      etiqueta: 'Marcar salida',
      etiquetaRegistrada: 'Salida registrada',
      tituloLector: 'Escanear QR de salida',
      instruccion: 'Apunta la cámara al QR de salida mostrado por el administrador.',
      Icono: LogOut,
    },
  })

function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es')
}

/*
 * FUNCIÓN NUEVA: Clasifica temporalmente una actividad
 * verificando con precisión su fecha y rango de horas.
 */
function clasificarActividadTemporalmente(actividad, ahora = new Date()) {
  if (!actividad.fecha) return 'futura'

  const horaInicio = actividad.horaInicio || '00:00'
  const horaFin = actividad.horaFinalizacion || '23:59'

  const inicio = new Date(`${actividad.fecha}T${horaInicio}`)
  const fin = new Date(`${actividad.fecha}T${horaFin}`)

  if (ahora > fin) return 'pasada'
  if (ahora >= inicio && ahora <= fin) return 'en-curso'
  return 'futura'
}

function obtenerPartesFecha(fecha) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha,
    )
  ) {
    return {
      dia: '--',
      mes: '---',
      fechaCompleta:
        'Fecha pendiente',
    }
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha
    .split('-')
    .map(Number)

  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia,
  )

  const fechaValida =
    fechaLocal.getFullYear() ===
    anio &&
    fechaLocal.getMonth() ===
    mes - 1 &&
    fechaLocal.getDate() === dia

  if (!fechaValida) {
    return {
      dia: '--',
      mes: '---',
      fechaCompleta:
        'Fecha pendiente',
    }
  }

  const mesCorto =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        month: 'short',
      },
    )
      .format(fechaLocal)
      .replace('.', '')
      .toUpperCase()

  const fechaCompleta =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    ).format(fechaLocal)

  return {
    dia: String(dia).padStart(
      2,
      '0',
    ),
    mes: mesCorto,
    fechaCompleta,
  }
}

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
  ] = hora
    .split(':')
    .map(Number)

  const fechaHora = new Date()

  fechaHora.setHours(
    horas,
    minutos,
    0,
    0,
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

function obtenerHorario(actividad) {
  const horaInicio =
    formatearHora(
      actividad.horaInicio,
    )

  const horaFinalizacion =
    formatearHora(
      actividad.horaFinalizacion,
    )

  if (
    !horaInicio ||
    !horaFinalizacion
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

  return `${horas} ${horas === 1
      ? 'hora'
      : 'horas'
    }`
}

function obtenerPorcentajeCupos(
  actividad,
) {
  const cuposTotales = Number(
    actividad.cuposTotales,
  )

  const cuposDisponibles = Number(
    actividad.cuposDisponibles,
  )

  if (
    !Number.isFinite(
      cuposTotales,
    ) ||
    cuposTotales <= 0 ||
    !Number.isFinite(
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

function formatearInstanteMarcacion(
  valor,
) {
  const instante = new Date(valor)

  if (
    !Number.isFinite(
      instante.getTime(),
    )
  ) {
    return 'Hora registrada'
  }

  const hora =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    ).format(instante)

  return `Registrada a las ${hora}`
}

function obtenerTiempoRestante(
  expiraEn,
  ahora,
) {
  const expiracion =
    Date.parse(expiraEn)

  if (
    !Number.isFinite(expiracion) ||
    !(ahora instanceof Date)
  ) {
    return ''
  }

  const milisegundosRestantes =
    expiracion -
    ahora.getTime()

  if (
    milisegundosRestantes <= 0
  ) {
    return ''
  }

  const segundosTotales =
    Math.ceil(
      milisegundosRestantes /
      1000,
    )

  const minutos =
    Math.floor(
      segundosTotales / 60,
    )

  const segundos =
    segundosTotales % 60

  return `${String(minutos).padStart(
    2,
    '0',
  )
    }:${String(segundos).padStart(
      2,
      '0',
    )
    } restantes`
}

function obtenerDetalleMarcacion({
  actividad,
  tipo,
  disponibilidad,
  ahora,
}) {
  const esEntrada =
    tipo ===
    TIPOS_MARCACION.entrada

  const registrada = esEntrada
    ? actividad.entradaRegistrada ===
    true
    : actividad.salidaRegistrada ===
    true

  if (registrada) {
    return formatearInstanteMarcacion(
      esEntrada
        ? actividad
          .entradaRegistradaEn
        : actividad
          .salidaRegistradaEn,
    )
  }

  if (
    disponibilidad.disponible
  ) {
    const tiempoRestante =
      obtenerTiempoRestante(
        disponibilidad.expiraEn,
        ahora,
      )

    return tiempoRestante
      ? `QR disponible · ${tiempoRestante}`
      : disponibilidad.mensaje
  }

  return disponibilidad.mensaje
}

function obtenerMensajeErrorCamara(
  error,
) {
  const mensajeTecnico =
    String(
      error?.message ??
      error ??
      '',
    ).toLocaleLowerCase('es')

  if (
    mensajeTecnico.includes(
      'notallowed',
    ) ||
    mensajeTecnico.includes(
      'permission',
    ) ||
    mensajeTecnico.includes(
      'denied',
    )
  ) {
    return 'Debes permitir el acceso a la cámara para escanear el código QR.'
  }

  if (
    mensajeTecnico.includes(
      'notfound',
    ) ||
    mensajeTecnico.includes(
      'devicesnotfound',
    )
  ) {
    return 'No encontramos una cámara disponible en este dispositivo.'
  }

  if (
    mensajeTecnico.includes(
      'notreadable',
    ) ||
    mensajeTecnico.includes(
      'trackstart',
    )
  ) {
    return 'La cámara está siendo utilizada por otra aplicación. Ciérrala e inténtalo nuevamente.'
  }

  if (
    typeof window !== 'undefined' &&
    !window.isSecureContext
  ) {
    return 'El navegador solamente permite utilizar la cámara desde una conexión HTTPS o desde localhost.'
  }

  return 'No fue posible iniciar la cámara. Revisa sus permisos e inténtalo nuevamente.'
}

async function detenerInstanciaLector(
  lector,
) {
  if (!lector) {
    return
  }

  try {
    if (lector.isScanning) {
      await lector.stop()
    }
  } catch {
  }

  try {
    lector.clear()
  } catch {
  }
}

function AttendanceButton({
  actividad,
  tipo,
  disponibilidad,
  ahora,
  onMarcarAsistencia,
}) {
  const informacion =
    INFORMACION_MARCACIONES[tipo]

  const esEntrada =
    tipo ===
    TIPOS_MARCACION.entrada

  const registrada = esEntrada
    ? actividad.entradaRegistrada ===
    true
    : actividad.salidaRegistrada ===
    true

  const detalle =
    obtenerDetalleMarcacion({
      actividad,
      tipo,
      disponibilidad,
      ahora,
    })

  const Icono = registrada
    ? CheckCircle2
    : informacion.Icono

  const etiqueta = registrada
    ? informacion
      .etiquetaRegistrada
    : informacion.etiqueta

  const clases = [
    'student-attendance-button',

    disponibilidad.disponible
      ? 'student-attendance-button--available'
      : '',

    registrada
      ? 'student-attendance-button--registered'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={clases}
      type="button"
      disabled={
        !disponibilidad.disponible
      }
      title={detalle}
      aria-label={
        `${etiqueta} en ${actividad.titulo}. ${detalle}`
      }
      onClick={() =>
        onMarcarAsistencia(
          actividad,
          tipo,
        )
      }
    >
      <span className="student-attendance-button__icon">
        <Icono aria-hidden="true" />
      </span>

      <span className="student-attendance-button__content">
        <strong>{etiqueta}</strong>

        <small>{detalle}</small>
      </span>
    </button>
  )
}

function ActivityCard({
  actividad,
  vista,
  ahora,
  onVerActividad,
  onMarcarAsistencia,
}) {
  const {
    dia,
    mes,
    fechaCompleta,
  } = obtenerPartesFecha(
    actividad.fecha,
  )

  const esHistorial =
    vista === VISTAS.historial

  // Determina si debemos mostrar los botones de marcación
  const permiteMarcacion =
    vista === VISTAS.proximas || vista === VISTAS.enCurso

  const horasMostradas =
    esHistorial
      ? actividad
        .horasRegistradas ??
      actividad
        .horasAcreditables
      : actividad
        .horasAcreditables

  const cuposTotales =
    Number.isInteger(
      actividad.cuposTotales,
    )
      ? actividad.cuposTotales
      : 0

  const cuposDisponibles =
    Number.isInteger(
      actividad.cuposDisponibles,
    )
      ? actividad
        .cuposDisponibles
      : 0

  const disponibilidadEntrada =
    permiteMarcacion
      ? obtenerDisponibilidadMarcacionActividad(
        actividad,
        TIPOS_MARCACION.entrada,
        ahora,
      )
      : null

  const disponibilidadSalida =
    permiteMarcacion
      ? obtenerDisponibilidadMarcacionActividad(
        actividad,
        TIPOS_MARCACION.salida,
        ahora,
      )
      : null

  const claseTarjeta = permiteMarcacion
    ? 'student-activity-card student-activity-card--attendance'
    : 'student-activity-card'

  return (
    <article className={claseTarjeta}>
      <time
        className="student-activity-date"
        dateTime={actividad.fecha}
        aria-label={fechaCompleta}
      >
        <strong>{dia}</strong>
        <span>{mes}</span>
      </time>

      <div className="student-activity-card__content">
        <h3>{actividad.titulo}</h3>

        <p>
          {actividad.descripcion ||
            'Descripción no disponible.'}
        </p>
      </div>

      <div className="student-activity-card__schedule">
        <span>
          <Clock3 aria-hidden="true" />
          {obtenerHorario(
            actividad,
          )}
        </span>

        <span>
          <MapPin aria-hidden="true" />
          {actividad.lugar ||
            'Lugar pendiente'}
        </span>
      </div>

      <div className="student-activity-card__summary">
        <strong>
          {obtenerTextoHoras(
            horasMostradas,
          )}
        </strong>

        {esHistorial ? (
          <span className="student-activity-attendance">
            Actividad pasada
          </span>
        ) : (
          <>
            <span>
              {cuposDisponibles} de{' '}
              {cuposTotales} cupos
              disponibles
            </span>

            <div
              className="student-activity-capacity"
              role="progressbar"
              aria-label={
                `Cupos disponibles para ${actividad.titulo}`
              }
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
                    `${obtenerPorcentajeCupos(
                      actividad,
                    )}%`,
                }}
              />
            </div>
          </>
        )}
      </div>

      {permiteMarcacion && (
        <div className="student-activity-card__attendance">
          <AttendanceButton
            actividad={actividad}
            tipo={
              TIPOS_MARCACION.entrada
            }
            disponibilidad={
              disponibilidadEntrada
            }
            ahora={ahora}
            onMarcarAsistencia={
              onMarcarAsistencia
            }
          />

          <AttendanceButton
            actividad={actividad}
            tipo={
              TIPOS_MARCACION.salida
            }
            disponibilidad={
              disponibilidadSalida
            }
            ahora={ahora}
            onMarcarAsistencia={
              onMarcarAsistencia
            }
          />
        </div>
      )}

      <button
        className="student-activity-card__view"
        type="button"
        aria-label={
          `Ver actividad: ${actividad.titulo}`
        }
        title="Ver actividad"
        onClick={() =>
          onVerActividad(
            actividad,
          )
        }
      >
        <Eye aria-hidden="true" />
      </button>
    </article>
  )
}

function AttendanceQrReaderDialog({
  seleccion,
  onCerrar,
  onMarcacionRegistrada,
}) {
  const [
    estadoLector,
    setEstadoLector,
  ] = useState(
    ESTADOS_LECTOR.iniciando,
  )

  const [
    mensajeLector,
    setMensajeLector,
  ] = useState('')

  const [
    resultadoMarcacion,
    setResultadoMarcacion,
  ] = useState(null)

  const [
    intentoInicio,
    setIntentoInicio,
  ] = useState(0)

  const lectorRef = useRef(null)

  const lecturaProcesadaRef =
    useRef(false)

  const informacion =
    INFORMACION_MARCACIONES[
    seleccion.tipo
    ]

  const procesando =
    estadoLector ===
    ESTADOS_LECTOR.procesando

  useEffect(() => {
    let efectoCancelado = false

    lecturaProcesadaRef.current = false

    const contenedorLector =
      document.getElementById(
        ID_CONTENEDOR_LECTOR,
      )

    if (!contenedorLector) {
      const fotogramaMontaje =
        window.requestAnimationFrame(
          () => {
            if (!efectoCancelado) {
              setIntentoInicio(
                (intentoActual) =>
                  intentoActual + 1,
              )
            }
          },
        )

      return () => {
        efectoCancelado = true

        window.cancelAnimationFrame(
          fotogramaMontaje,
        )
      }
    }

    const lector =
      new Html5Qrcode(
        ID_CONTENEDOR_LECTOR,
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats
              .QR_CODE,
          ],
          verbose: false,
        },
      )

    lectorRef.current = lector

    async function procesarCodigoQr(
      contenidoQr,
    ) {
      if (
        efectoCancelado ||
        lecturaProcesadaRef.current
      ) {
        return
      }

      lecturaProcesadaRef.current =
        true

      try {
        if (
          lector.getState() ===
          Html5QrcodeScannerState
            .SCANNING
        ) {
          lector.pause(true)
        }
      } catch {
      }

      setEstadoLector(
        ESTADOS_LECTOR.procesando,
      )

      setMensajeLector(
        'Estamos verificando el código QR.',
      )

      try {
        const datosQr =
          interpretarCodigoQrAsistencia(
            contenidoQr,
            seleccion.tipo,
          )

        const resultado =
          await registrarAsistenciaPorQr({
            tipo: datosQr.tipo,
            token: datosQr.token,
          })

        if (efectoCancelado) {
          return
        }

        await detenerInstanciaLector(
          lector,
        )

        if (
          lectorRef.current ===
          lector
        ) {
          lectorRef.current = null
        }

        setResultadoMarcacion(
          resultado,
        )

        setMensajeLector(
          resultado.mensaje,
        )

        setEstadoLector(
          ESTADOS_LECTOR.exito,
        )

        onMarcacionRegistrada(
          resultado,
        )

        notificarExito({
          titulo:
            seleccion.tipo ===
              TIPOS_MARCACION.entrada
              ? 'Entrada registrada'
              : 'Salida registrada',

          descripcion:
            resultado.mensaje,

          id:
            `asistencia-${seleccion.tipo}-exitosa`,
        })
      } catch (error) {
        if (efectoCancelado) {
          return
        }

        const mensaje =
          error instanceof Error
            ? error.message
            : 'No fue posible registrar la asistencia.'

        setMensajeLector(mensaje)

        setEstadoLector(
          ESTADOS_LECTOR.error,
        )

        notificarError({
          titulo:
            'No pudimos registrar la asistencia',

          descripcion: mensaje,

          id:
            `asistencia-${seleccion.tipo}-error`,
        })
      }
    }

    async function iniciarCamara() {
      setEstadoLector(
        ESTADOS_LECTOR.iniciando,
      )

      setMensajeLector(
        'Solicitando acceso a la cámara.',
      )

      try {
        await lector.start(
          {
            facingMode: 'environment',
          },
          {
            fps: 10,
            qrbox: (
              anchoDisponible,
              altoDisponible,
            ) => {
              const lado = Math.floor(
                Math.min(
                  anchoDisponible,
                  altoDisponible,
                ) * 0.72,
              )

              return {
                width: lado,
                height: lado,
              }
            },

            aspectRatio: 1,
            disableFlip: false,
          },

          (contenidoQr) => {
            void procesarCodigoQr(
              contenidoQr,
            )
          },
          () => { },
        )

        if (efectoCancelado) {
          await detenerInstanciaLector(
            lector,
          )

          return
        }

        if (
          !lecturaProcesadaRef.current
        ) {
          setEstadoLector(
            ESTADOS_LECTOR.escaneando,
          )

          setMensajeLector(
            informacion.instruccion,
          )
        }
      } catch (error) {
        if (efectoCancelado) {
          return
        }

        setMensajeLector(
          obtenerMensajeErrorCamara(
            error,
          ),
        )

        setEstadoLector(
          ESTADOS_LECTOR.error,
        )
      }
    }

    void iniciarCamara()

    return () => {
      efectoCancelado = true

      if (
        lectorRef.current ===
        lector
      ) {
        lectorRef.current = null
      }

      void detenerInstanciaLector(
        lector,
      )
    }
  }, [
    informacion.instruccion,
    intentoInicio,
    onMarcacionRegistrada,
    seleccion,
  ])

  async function reintentarLectura() {
    const lector =
      lectorRef.current

    if (lector) {
      try {
        if (
          lector.getState() ===
          Html5QrcodeScannerState
            .PAUSED
        ) {
          lecturaProcesadaRef.current =
            false

          lector.resume()

          setMensajeLector(
            informacion.instruccion,
          )

          setEstadoLector(
            ESTADOS_LECTOR.escaneando,
          )

          return
        }
      } catch {
      }

      lectorRef.current = null

      await detenerInstanciaLector(
        lector,
      )
    }

    lecturaProcesadaRef.current =
      false

    setResultadoMarcacion(null)

    setMensajeLector(
      'Solicitando acceso a la cámara.',
    )

    setEstadoLector(
      ESTADOS_LECTOR.iniciando,
    )

    setIntentoInicio(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  function manejarCierre() {
    if (procesando) {
      return
    }

    onCerrar()
  }

  function manejarCambioApertura(
    abierto,
  ) {
    if (!abierto) {
      manejarCierre()
    }
  }

  function manejarEscape(evento) {
    if (procesando) {
      evento.preventDefault()
    }
  }

  const IconoEncabezado =
    estadoLector ===
      ESTADOS_LECTOR.exito
      ? CheckCircle2
      : ScanLine

  return (
    <AlertDialog.Root
      open
      onOpenChange={
        manejarCambioApertura
      }
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="student-qr-dialog__overlay" />

        <AlertDialog.Content
          className="student-qr-dialog__content"
          aria-busy={procesando}
          onEscapeKeyDown={
            manejarEscape
          }
        >
          <header className="student-qr-dialog__header">
            <span
              className={
                estadoLector ===
                  ESTADOS_LECTOR.exito
                  ? 'student-qr-dialog__icon student-qr-dialog__icon--success'
                  : 'student-qr-dialog__icon'
              }
            >
              <IconoEncabezado
                aria-hidden="true"
              />
            </span>

            <div>
              <AlertDialog.Title className="student-qr-dialog__title">
                {informacion.tituloLector}
              </AlertDialog.Title>

              <AlertDialog.Description className="student-qr-dialog__description">
                {seleccion.actividad.titulo}
              </AlertDialog.Description>
            </div>

            <button
              className="student-qr-dialog__close"
              type="button"
              aria-label="Cerrar lector QR"
              title="Cerrar"
              disabled={procesando}
              onClick={manejarCierre}
            >
              <X aria-hidden="true" />
            </button>
          </header>

          {estadoLector !==
            ESTADOS_LECTOR.exito && (
              <div className="student-qr-reader">
                <div
                  id={
                    ID_CONTENEDOR_LECTOR
                  }
                  className="student-qr-reader__camera"
                />

                {estadoLector ===
                  ESTADOS_LECTOR.iniciando && (
                    <div className="student-qr-reader__loading">
                      <LoaderCircle
                        aria-hidden="true"
                      />

                      <span>
                        Iniciando cámara
                      </span>
                    </div>
                  )}
              </div>
            )}

          <div
            className={
              `student-qr-dialog__status student-qr-dialog__status--${estadoLector}`
            }
            role={
              estadoLector ===
                ESTADOS_LECTOR.error
                ? 'alert'
                : 'status'
            }
            aria-live="polite"
          >
            {estadoLector ===
              ESTADOS_LECTOR.procesando && (
                <LoaderCircle
                  className="student-qr-dialog__spinner"
                  aria-hidden="true"
                />
              )}

            {estadoLector ===
              ESTADOS_LECTOR.exito && (
                <CheckCircle2
                  aria-hidden="true"
                />
              )}

            <div>
              <strong>
                {estadoLector ===
                  ESTADOS_LECTOR.iniciando &&
                  'Preparando el lector'}

                {estadoLector ===
                  ESTADOS_LECTOR.escaneando &&
                  'Cámara lista'}

                {estadoLector ===
                  ESTADOS_LECTOR.procesando &&
                  'Verificando asistencia'}

                {estadoLector ===
                  ESTADOS_LECTOR.error &&
                  'No fue posible continuar'}

                {estadoLector ===
                  ESTADOS_LECTOR.exito &&
                  (
                    seleccion.tipo ===
                      TIPOS_MARCACION.entrada
                      ? 'Entrada registrada'
                      : 'Salida registrada'
                  )}
              </strong>

              <p>{mensajeLector}</p>

              {estadoLector ===
                ESTADOS_LECTOR.exito && (
                  <small>
                    {
                      resultadoMarcacion
                        ?.actividadTitulo ??
                      seleccion.actividad
                        .titulo
                    }
                  </small>
                )}
            </div>
          </div>

          <footer className="student-qr-dialog__actions">
            {estadoLector ===
              ESTADOS_LECTOR.error && (
                <button
                  className="student-qr-dialog__button student-qr-dialog__button--primary"
                  type="button"
                  onClick={
                    reintentarLectura
                  }
                >
                  <RotateCcw
                    aria-hidden="true"
                  />

                  Intentar nuevamente
                </button>
              )}

            <button
              className={
                estadoLector ===
                  ESTADOS_LECTOR.exito
                  ? 'student-qr-dialog__button student-qr-dialog__button--primary'
                  : 'student-qr-dialog__button student-qr-dialog__button--secondary'
              }
              type="button"
              disabled={procesando}
              onClick={manejarCierre}
            >
              {estadoLector ===
                ESTADOS_LECTOR.exito
                ? 'Volver a actividades'
                : 'Cerrar'}
            </button>
          </footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function Activities() {
  const navigate = useNavigate()

  const [
    vistaActiva,
    setVistaActiva,
  ] = useState(
    VISTAS.disponibles,
  )

  const [
    busqueda,
    setBusqueda,
  ] = useState('')

  const [
    actividades,
    setActividades,
  ] = useState({
    [VISTAS.disponibles]: [],
    [VISTAS.enCurso]: [],
    [VISTAS.proximas]: [],
    [VISTAS.historial]: [],
  })

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

  const [
    instanteActual,
    setInstanteActual,
  ] = useState(
    () => new Date(),
  )

  const [
    seleccionMarcacion,
    setSeleccionMarcacion,
  ] = useState(null)

  useEffect(() => {
    let componenteActivo = true

    async function cargarActividades() {
      setCargando(true)
      setErrorCarga('')

      try {
        const [
          disponibles,
          proximas,
          historial,
        ] = await Promise.all([
          listarActividadesDisponibles(),
          listarProximasActividadesInscritas(),
          listarHistorialActividades(),
        ])

        if (!componenteActivo) {
          return
        }

        const ahora = new Date()

        // 1. Disponibles (Ignoramos las pasadas para limpiar el listado)
        const disponiblesFiltradas = (Array.isArray(disponibles) ? disponibles : [])
          .filter(act => clasificarActividadTemporalmente(act, ahora) !== 'pasada')

        // 2. Procesamos Próximas para separar "En Curso", "Futuras" y "Pasadas"
        const proximasValidas = Array.isArray(proximas) ? proximas : []
        const misEnCurso = []
        const misProximas = []
        const misPasadas = []

        proximasValidas.forEach(act => {
          const estado = clasificarActividadTemporalmente(act, ahora)
          if (estado === 'en-curso') misEnCurso.push(act)
          else if (estado === 'futura') misProximas.push(act)
          else misPasadas.push(act)
        })

        // 3. Unificamos el historial: original + las pasadas que estaban atoradas en próximas
        const historialValido = Array.isArray(historial) ? historial : []
        const historialUnificadoMap = new Map()

        historialValido.forEach(act => historialUnificadoMap.set(act.id || act.inscripcionId, act))
        misPasadas.forEach(act => historialUnificadoMap.set(act.id || act.inscripcionId, act))

        const historialFinal = Array.from(historialUnificadoMap.values()).sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T${a.horaInicio || '00:00'}`)
          const fechaB = new Date(`${b.fecha}T${b.horaInicio || '00:00'}`)
          return fechaB - fechaA // Descendente (más reciente primero)
        })

        setActividades({
          [VISTAS.disponibles]: disponiblesFiltradas,
          [VISTAS.enCurso]: misEnCurso,
          [VISTAS.proximas]: misProximas,
          [VISTAS.historial]: historialFinal,
        })
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        setActividades({
          [VISTAS.disponibles]: [],
          [VISTAS.enCurso]: [],
          [VISTAS.proximas]: [],
          [VISTAS.historial]: [],
        })

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las actividades.',
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    void cargarActividades()

    return () => {
      componenteActivo = false
    }
  }, [intentoCarga])

  useEffect(() => {
    if (
      vistaActiva !== VISTAS.proximas &&
      vistaActiva !== VISTAS.enCurso
    ) {
      return undefined
    }

    const intervalo =
      window.setInterval(
        () => {
          setInstanteActual(
            new Date(),
          )
        },
        1000,
      )

    return () => {
      window.clearInterval(
        intervalo,
      )
    }
  }, [vistaActiva])

  const informacionVista =
    INFORMACION_VISTAS[
    vistaActiva
    ]

  const actividadesFiltradas =
    useMemo(() => {
      const actividadesVista =
        actividades[
        vistaActiva
        ] ?? []

      const termino =
        normalizarBusqueda(
          busqueda,
        )

      if (!termino) {
        return actividadesVista
      }

      return actividadesVista.filter(
        (actividad) => {
          const contenido = [
            actividad.titulo,
            actividad.descripcion,
            actividad.lugar,
          ]
            .map(
              normalizarBusqueda,
            )
            .join(' ')

          return contenido.includes(
            termino,
          )
        },
      )
    }, [
      actividades,
      busqueda,
      vistaActiva,
    ])

  const actualizarDespuesMarcacion =
    useCallback(() => {
      setIntentoCarga(
        (intentoActual) =>
          intentoActual + 1,
      )
    }, [])

  function cambiarVista(
    nuevaVista,
  ) {
    setVistaActiva(
      nuevaVista,
    )

    setBusqueda('')

    if (
      nuevaVista === VISTAS.proximas ||
      nuevaVista === VISTAS.enCurso
    ) {
      setInstanteActual(
        new Date(),
      )
    }
  }

  function limpiarFiltrosActividades() {
    setBusqueda('')
  }

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  function abrirDetalleActividad(
    actividad,
  ) {
    const identificador =
      String(
        actividad?.id ?? '',
      ).trim()

    if (!identificador) {
      return
    }

    navigate(
      `/actividades/${encodeURIComponent(
        identificador,
      )
      }`,
    )
  }

  function abrirLectorAsistencia(
    actividad,
    tipo,
  ) {
    const disponibilidad =
      obtenerDisponibilidadMarcacionActividad(
        actividad,
        tipo,
        new Date(),
      )

    if (
      !disponibilidad.disponible
    ) {
      notificarError({
        titulo:
          'Marcación no disponible',

        descripcion:
          disponibilidad.mensaje,

        id:
          `marcacion-${tipo}-no-disponible`,
      })

      setInstanteActual(
        new Date(),
      )

      return
    }

    setSeleccionMarcacion({
      actividad,
      tipo,
    })
  }

  function cerrarLectorAsistencia() {
    setSeleccionMarcacion(null)
  }

  return (
    <div className="app-layout">
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

        <main className="student-activities-main">
          <header className="student-activities-heading">
            <p>
              Oportunidades de participación
            </p>

            <h1>Actividades</h1>

            <span>
              Consulta las actividades
              publicadas por ASEBEP y
              encuentra oportunidades para
              completar tus horas.
            </span>
          </header>

          <section className="student-activities-panel">
            {/* Contenedor responsivo para las pestañas (Scroll Horizontal) */}
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px', marginBottom: '8px' }}>
              <div
                className="student-activities-tabs"
                role="tablist"
                aria-label="Vistas de actividades"
                style={{ display: 'flex', whiteSpace: 'nowrap', minWidth: 'max-content' }}
              >
                {Object.entries(
                  INFORMACION_VISTAS,
                ).map(
                  ([
                    identificador,
                    informacion,
                  ]) => (
                    <button
                      key={
                        identificador
                      }
                      id={
                        `tab-${identificador}`
                      }
                      type="button"
                      role="tab"
                      aria-selected={
                        vistaActiva ===
                        identificador
                      }
                      aria-controls="panel-actividades"
                      className={
                        vistaActiva ===
                          identificador
                          ? 'student-activities-tab student-activities-tab--active'
                          : 'student-activities-tab'
                      }
                      onClick={() =>
                        cambiarVista(
                          identificador,
                        )
                      }
                    >
                      {informacion.nombre}

                      <span>
                        {
                          actividades[
                            identificador
                          ].length
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="student-activities-search">
              <div className="student-activities-search__field">
                <Search
                  aria-hidden="true"
                />

                <label
                  className="sr-only"
                  htmlFor="buscar-actividad"
                >
                  Buscar actividad
                </label>

                <input
                  id="buscar-actividad"
                  type="search"
                  value={busqueda}
                  placeholder="Buscar por nombre o lugar"
                  onChange={(evento) =>
                    setBusqueda(
                      evento.target.value,
                    )
                  }
                />
              </div>

              <button
                className="student-activities-clear"
                type="button"
                onClick={
                  limpiarFiltrosActividades
                }
                disabled={!busqueda}
              >
                <RotateCcw
                  aria-hidden="true"
                />

                <span>
                  Limpiar filtros
                </span>
              </button>
            </div>

            <div
              key={vistaActiva}
              id="panel-actividades"
              role="tabpanel"
              aria-labelledby={
                `tab-${vistaActiva}`
              }
              className="student-activities-results"
            >
              <header className="student-activities-results__heading">
                <div>
                  <h2>
                    {
                      informacionVista
                        .nombre
                    }
                  </h2>

                  <p>
                    {
                      informacionVista
                        .descripcion
                    }
                  </p>
                </div>

                {!cargando &&
                  !errorCarga && (
                    <span>
                      {
                        actividadesFiltradas
                          .length
                      }{' '}
                      {
                        actividadesFiltradas
                          .length === 1
                          ? 'actividad'
                          : 'actividades'
                      }
                    </span>
                  )}
              </header>

              {cargando && (
                <div
                  className="student-activities-state"
                  role="status"
                  aria-live="polite"
                >
                  <CalendarDays
                    aria-hidden="true"
                  />

                  <h3>
                    Cargando actividades
                  </h3>

                  <p>
                    Estamos consultando la
                    información disponible.
                  </p>
                </div>
              )}

              {!cargando &&
                errorCarga && (
                  <div
                    className="student-activities-state student-activities-state--error"
                    role="alert"
                  >
                    <CalendarDays
                      aria-hidden="true"
                    />

                    <h3>
                      No fue posible cargar
                      las actividades
                    </h3>

                    <p>{errorCarga}</p>

                    <button
                      type="button"
                      onClick={
                        reintentarCarga
                      }
                    >
                      <RotateCcw
                        aria-hidden="true"
                      />

                      Intentar nuevamente
                    </button>
                  </div>
                )}

              {!cargando &&
                !errorCarga &&
                actividadesFiltradas
                  .length === 0 && (
                  <div className="student-activities-state">
                    <CalendarDays
                      aria-hidden="true"
                    />

                    <h3>
                      No encontramos
                      actividades
                    </h3>

                    <p>
                      {busqueda.trim()
                        ? 'No existen resultados que coincidan con tu búsqueda.'
                        : informacionVista
                          .mensajeVacio}
                    </p>
                  </div>
                )}

              {!cargando &&
                !errorCarga &&
                actividadesFiltradas
                  .length > 0 && (
                  <div className="student-activities-list">
                    {actividadesFiltradas.map(
                      (actividad) => (
                        <ActivityCard
                          key={
                            actividad
                              .inscripcionId ??
                            actividad.id
                          }
                          actividad={
                            actividad
                          }
                          vista={
                            vistaActiva
                          }
                          ahora={
                            instanteActual
                          }
                          onVerActividad={
                            abrirDetalleActividad
                          }
                          onMarcarAsistencia={
                            abrirLectorAsistencia
                          }
                        />
                      ),
                    )}
                  </div>
                )}
            </div>
          </section>
        </main>

        <MobileNavigation />
      </section>

      {seleccionMarcacion && (
        <AttendanceQrReaderDialog
          seleccion={
            seleccionMarcacion
          }
          onCerrar={
            cerrarLectorAsistencia
          }
          onMarcacionRegistrada={
            actualizarDespuesMarcacion
          }
        />
      )}
    </div>
  )
}

export default Activities
