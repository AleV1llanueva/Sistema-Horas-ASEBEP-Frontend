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
 * Identificadores internos de las tres vistas.
 *
 * Estos valores relacionan cada pestaña con su colección
 * de actividades y evitan repetir cadenas en el componente.
 */
const VISTAS = Object.freeze({
  disponibles: 'disponibles',
  proximas: 'proximas',
  historial: 'historial',
})

/*
 * Tipos de marcación aceptados por el servicio.
 *
 * Se mantienen en minúsculas porque también forman parte
 * de las rutas generadas por los códigos QR.
 */
const TIPOS_MARCACION = Object.freeze({
  entrada: 'entrada',
  salida: 'salida',
})

/*
 * Estados utilizados por el cuadro del lector QR.
 *
 * Cada estado controla qué mensaje, icono y acciones
 * debe mostrar el diálogo.
 */
const ESTADOS_LECTOR = Object.freeze({
  iniciando: 'iniciando',
  escaneando: 'escaneando',
  procesando: 'procesando',
  error: 'error',
  exito: 'exito',
})

/*
 * Identificador del elemento en el que html5-qrcode
 * insertará el video generado por la cámara.
 */
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

    [VISTAS.proximas]: {
      nombre: 'Mis próximas actividades',
      descripcion: 'Revisa tus actividades inscritas y registra tu entrada y salida.',
      mensajeVacio: 'Todavía no estás inscrito en una próxima actividad.',
    },

    [VISTAS.historial]: {
      nombre: 'Historial',
      descripcion: 'Consulta las actividades en las que tu asistencia fue confirmada.',
      mensajeVacio: 'Todavía no tienes actividades completadas en el historial.',
    },
  })

/*
 * Información utilizada por los botones y el lector
 * para cada tipo de marcación.
 */
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

/*
 * Prepara los textos utilizados en el buscador.
 *
 * La conversión a minúsculas permite encontrar resultados
 * sin importar cómo se escribió originalmente el texto.
 */
function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es')
}

/*
 * Convierte una fecha YYYY-MM-DD en los valores
 * necesarios para la tarjeta.
 */
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

  /*
   * Comprobamos que la fecha exista.
   * Esto evita aceptar valores como 2026-02-31.
   */
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

/*
 * Construye el intervalo mostrado en cada tarjeta.
 *
 * Si falta alguna de las dos horas, evitamos
 * presentar información incompleta.
 */
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

/*
 * Agrega la forma singular o plural correspondiente
 * a la cantidad de horas acreditables.
 */
function obtenerTextoHoras(cantidad) {
  const horas = Math.max(
    0,
    Number(cantidad) || 0,
  )

  return `${horas} ${
    horas === 1
      ? 'hora'
      : 'horas'
  }`
}

// Calcula el porcentaje utilizado en la barra de cupos.
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

/*
 * Convierte la fecha de una marcación en un texto
 * breve para la tarjeta.
 */
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

/*
 * Construye el tiempo restante del QR.
 *
 * El cálculo utiliza el reloj del navegador para que
 * la cuenta disminuya sin volver a consultar el servicio.
 */
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

  return `${
    String(minutos).padStart(
      2,
      '0',
    )
  }:${
    String(segundos).padStart(
      2,
      '0',
    )
  } restantes`
}

/*
 * Obtiene el mensaje que debe aparecer debajo
 * del nombre de cada botón de asistencia.
 */
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

/*
 * Traduce los errores técnicos de acceso a cámara
 * a mensajes comprensibles para el estudiante.
 */
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

/*
 * Detiene una instancia del lector y limpia los elementos
 * creados por html5-qrcode.
 *
 * Los errores se ignoran intencionalmente porque el lector
 * también puede encontrarse detenido o haber sido limpiado.
 */
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
    // La cámara ya se encontraba detenida.
  }

  try {
    lector.clear()
  } catch {
    // El contenedor ya se encontraba limpio.
  }
}

/*
 * Botón reutilizable para entrada y salida.
 *
 * El servicio decide si el botón está disponible.
 * De esta manera la interfaz respeta la habilitación
 * realizada por el administrador.
 */
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

/*
 * Tarjeta reutilizable para las tres vistas.
 *
 * Los controles de asistencia aparecen únicamente
 * dentro de "Mis próximas actividades".
 */
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

  const esProxima =
    vista === VISTAS.proximas

  /*
   * En el historial tienen prioridad las horas
   * realmente registradas.
   */
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

  /*
   * La disponibilidad se obtiene desde el servicio.
   *
   * El reloj recibido como propiedad permite que un QR
   * venza visualmente sin recargar la página.
   */
  const disponibilidadEntrada =
    esProxima
      ? obtenerDisponibilidadMarcacionActividad(
          actividad,
          TIPOS_MARCACION.entrada,
          ahora,
        )
      : null

  const disponibilidadSalida =
    esProxima
      ? obtenerDisponibilidadMarcacionActividad(
          actividad,
          TIPOS_MARCACION.salida,
          ahora,
        )
      : null

  const claseTarjeta = esProxima
    ? 'student-activity-card student-activity-card--attendance'
    : 'student-activity-card'

  return (
    <article className={claseTarjeta}>
      {/* Fecha resumida de la actividad. */}
      <time
        className="student-activity-date"
        dateTime={actividad.fecha}
        aria-label={fechaCompleta}
      >
        <strong>{dia}</strong>

        <span>{mes}</span>
      </time>

      {/* Información principal publicada por el administrador. */}
      <div className="student-activity-card__content">
        <h3>{actividad.titulo}</h3>

        <p>
          {actividad.descripcion ||
            'Descripción no disponible.'}
        </p>
      </div>

      {/* Horario y lugar de realización. */}
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

      {/* Horas, cupos o estado de asistencia. */}
      <div className="student-activity-card__summary">
        <strong>
          {obtenerTextoHoras(
            horasMostradas,
          )}
        </strong>

        {esHistorial ? (
          <span className="student-activity-attendance">
            Asistencia confirmada
          </span>
        ) : (
          <>
            <span>
              {cuposDisponibles} de{' '}
              {cuposTotales} cupos
              disponibles
            </span>

            {/*
             * Barra accesible que representa los cupos
             * todavía disponibles en la actividad.
             */}
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

      {/*
       * Marcaciones disponibles únicamente para
       * las actividades inscritas.
       */}
      {esProxima && (
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

      {/* Abre la vista completa de la actividad seleccionada. */}
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

/*
 * Cuadro encargado de iniciar la cámara,
 * leer el código QR y registrar la asistencia.
 */
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

  /*
   * Este contador permite crear una instancia nueva
   * cuando el acceso inicial a la cámara falla.
   */
  const [
    intentoInicio,
    setIntentoInicio,
  ] = useState(0)

  const lectorRef = useRef(null)

  /*
   * Evita que varios fotogramas del mismo QR ejecuten
   * el registro más de una vez.
   */
  const lecturaProcesadaRef =
    useRef(false)

  const informacion =
    INFORMACION_MARCACIONES[
      seleccion.tipo
    ]

  const procesando =
    estadoLector ===
    ESTADOS_LECTOR.procesando

  /*
   * Inicia el lector cuando se abre el cuadro.
   *
   * También se ejecuta cuando el usuario solicita
   * volver a intentar el acceso a la cámara.
   */
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

    /*
     * Procesa únicamente la primera lectura válida
     * entregada por la cámara.
     */
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

      /*
       * Pausamos la cámara mientras el servicio
       * comprueba el token y registra la asistencia.
       */
      try {
        if (
          lector.getState() ===
          Html5QrcodeScannerState
            .SCANNING
        ) {
          lector.pause(true)
        }
      } catch {
        // El bloqueo lógico evita igualmente una lectura duplicada.
      }

      setEstadoLector(
        ESTADOS_LECTOR.procesando,
      )

      setMensajeLector(
        'Estamos verificando el código QR.',
      )

      try {
        /*
         * Primero comprobamos que el enlace pertenezca
         * al tipo de botón elegido.
         */
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

        /*
         * La cámara deja de ser necesaria después
         * de completar correctamente el registro.
         */
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

            /*
             * El área de lectura conserva una forma cuadrada
             * y se adapta al tamaño disponible.
             */
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

          /*
           * No mostramos un error por cada fotograma
           * en el que todavía no se encuentre un QR.
           */
          () => {},
        )

        if (efectoCancelado) {
          await detenerInstanciaLector(
            lector,
          )

          return
        }

        /*
         * Evita reemplazar el estado "procesando"
         * si el QR fue reconocido inmediatamente.
         */
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

    /*
     * Al cerrar el cuadro o abandonar la página
     * detenemos la cámara y limpiamos el lector.
     */
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

  /*
   * Si el lector quedó pausado por un QR inválido,
   * reutilizamos la misma cámara.
   *
   * Si la cámara nunca inició, se crea una instancia nueva.
   */
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
        // Se creará una instancia nueva del lector.
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

  /*
   * Durante el registro evitamos cerrar el cuadro
   * para que el estudiante reciba el resultado final.
   */
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
          {/* Encabezado e identidad del lector. */}
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

          {/*
           * html5-qrcode insertará aquí el video.
           * Se oculta después de completar la marcación.
           */}
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

          {/* Mensajes correspondientes al estado del lector. */}
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

          {/* Acciones disponibles según el resultado. */}
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

  /*
   * La pantalla inicia mostrando las actividades
   * disponibles para el estudiante.
   */
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

  /*
   * Cada vista mantiene su propia colección.
   * Esto evita volver a consultar el servicio
   * cada vez que el estudiante cambia de pestaña.
   */
  const [
    actividades,
    setActividades,
  ] = useState({
    [VISTAS.disponibles]: [],
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

  /*
   * Incrementar este valor permite repetir la consulta
   * después de una marcación o un error de carga.
   */
  const [
    intentoCarga,
    setIntentoCarga,
  ] = useState(0)

  // Mantiene actualizada la vigencia visual de los QR.
  const [
    instanteActual,
    setInstanteActual,
  ] = useState(
    () => new Date(),
  )

  /*
   * Contiene la actividad y el tipo de marcación
   * correspondientes al lector abierto.
   */
  const [
    seleccionMarcacion,
    setSeleccionMarcacion,
  ] = useState(null)

  // Consultamos las tres colecciones desde el servicio.
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

        /*
         * Evita actualizar el estado si el usuario abandona
         * la página antes de completar las consultas.
         */
        if (!componenteActivo) {
          return
        }

        setActividades({
          [VISTAS.disponibles]:
            Array.isArray(
              disponibles,
            )
              ? disponibles
              : [],

          [VISTAS.proximas]:
            Array.isArray(
              proximas,
            )
              ? proximas
              : [],

          [VISTAS.historial]:
            Array.isArray(
              historial,
            )
              ? historial
              : [],
        })
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        /*
         * Si ocurre un error, limpiamos todas las colecciones
         * para no conservar información anterior como válida.
         */
        setActividades({
          [VISTAS.disponibles]: [],
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

  /*
   * Actualiza el reloj una vez por segundo solamente
   * dentro de "Mis próximas actividades".
   */
  useEffect(() => {
    if (
      vistaActiva !==
      VISTAS.proximas
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

  /*
   * El buscador trabaja solamente con la colección
   * perteneciente a la pestaña seleccionada.
   *
   * Se permite buscar por título, descripción y lugar.
   */
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

  /*
   * Después de una marcación volvemos a consultar
   * próximas actividades e historial.
   */
  const actualizarDespuesMarcacion =
    useCallback(() => {
      setIntentoCarga(
        (intentoActual) =>
          intentoActual + 1,
      )
    }, [])

  // Limpia la búsqueda al cambiar de pestaña.
  function cambiarVista(
    nuevaVista,
  ) {
    setVistaActiva(
      nuevaVista,
    )

    setBusqueda('')

    if (
      nuevaVista ===
      VISTAS.proximas
    ) {
      setInstanteActual(
        new Date(),
      )
    }
  }

  // Restablece el buscador de la pestaña activa.
  function limpiarFiltrosActividades() {
    setBusqueda('')
  }

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  /*
   * Abre el detalle correspondiente a la actividad
   * seleccionada mediante su identificador.
   */
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
      `/actividades/${
        encodeURIComponent(
          identificador,
        )
      }`,
    )
  }

  /*
   * Comprueba nuevamente la disponibilidad justo
   * antes de abrir la cámara.
   *
   * Esta segunda comprobación cubre el caso en que
   * el QR vence entre el último render y el clic.
   */
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
      {/* Navegación lateral compartida del portal. */}
      <AppSidebar />

      <section className="app-content">
        {/* Encabezado superior compartido. */}
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
          {/* Presentación general del módulo. */}
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
            {/*
             * Navegación interna del módulo.
             * No cambia la URL porque las tres vistas
             * pertenecen a la misma página.
             */}
            <div
              className="student-activities-tabs"
              role="tablist"
              aria-label="Vistas de actividades"
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

            <div className="student-activities-search">
              {/* Campo compartido por las tres vistas. */}
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

              {/* Restablece el único filtro de actividades. */}
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

            {/*
             * Contenedor accesible asociado con
             * la pestaña seleccionada.
             */}
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

              {/* Estado mostrado durante la consulta. */}
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

              {/* Estado mostrado si el servicio falla. */}
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

              {/*
               * Estado vacío. El mensaje cambia dependiendo
               * de si no existen actividades o si la búsqueda
               * actual no encontró coincidencias.
               */}
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

              {/* Listado correspondiente a la pestaña activa. */}
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

        {/* Navegación inferior para dispositivos móviles. */}
        <MobileNavigation />
      </section>

      {/*
       * El lector se monta solamente cuando existe
       * una actividad y un tipo de marcación seleccionados.
       *
       * Al desmontarse, su efecto detiene automáticamente
       * la cámara del dispositivo.
       */}
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