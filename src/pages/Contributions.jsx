import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Eye,
  FileImage,
  GraduationCap,
  ImagePlus,
  Info,
  RotateCcw,
  Send,
  WalletCards,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
  useSearchParams,
} from 'react-router'

import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import { useUsuario } from '../hooks/useUsuario.js'
import {
  calcularMontoAportacion,
  calcularResumenDeuda,
  CUOTA_MENSUAL_APORTACION,
  ESTADOS_APORTACION,
  FORMATOS_COMPROBANTE_ACEPTADOS,
  listarAportacionesEstudiante,
  registrarAportacionUnMes,
  registrarAportacionVariosMeses,
  validarComprobanteImagen,
} from '../services/estudianteAportacionesService.js'
import {
  notificarError,
  notificarExito,
} from '../services/notificationService.js'
import '../styles/AppLayout.css'
import '../styles/Contributions.css'

/*
 * Identificadores internos de las tres vistas.
 *
 * También se utilizan en el parámetro "vista" de la URL
 * para poder abrir directamente un formulario.
 */
const VISTAS = Object.freeze({
  HISTORIAL: 'historial',
  UN_MES: 'un_mes',
  VARIOS_MESES: 'varios_meses',
})

/*
 * Valor especial del selector de varios meses.
 *
 * Al elegirlo se habilita el campo donde el estudiante
 * puede ingresar una cantidad mayor a doce.
 */
const OPCION_MAS_DE_DOCE =
  'mas_de_12'

const FILTRO_TODOS = 'todos'

const MONTO_UN_MES =
  calcularMontoAportacion(1)

/*
 * Meses utilizados por el formulario individual.
 *
 * El número se conserva porque es el formato aceptado
 * por el servicio de aportaciones.
 */
const MESES = Object.freeze([
  {
    valor: 1,
    nombre: 'Enero',
  },
  {
    valor: 2,
    nombre: 'Febrero',
  },
  {
    valor: 3,
    nombre: 'Marzo',
  },
  {
    valor: 4,
    nombre: 'Abril',
  },
  {
    valor: 5,
    nombre: 'Mayo',
  },
  {
    valor: 6,
    nombre: 'Junio',
  },
  {
    valor: 7,
    nombre: 'Julio',
  },
  {
    valor: 8,
    nombre: 'Agosto',
  },
  {
    valor: 9,
    nombre: 'Septiembre',
  },
  {
    valor: 10,
    nombre: 'Octubre',
  },
  {
    valor: 11,
    nombre: 'Noviembre',
  },
  {
    valor: 12,
    nombre: 'Diciembre',
  },
])

/*
 * Información visual de cada estado.
 *
 * Mantenerla centralizada evita repetir clases, iconos
 * y textos en cada tarjeta del historial.
 */
const INFORMACION_ESTADOS =
  Object.freeze({
    [
      ESTADOS_APORTACION
        .PENDIENTE_APROBACION
    ]: {
      texto: 'Pendiente de aprobación',
      clase:
        'student-contribution-status--pending',
      Icono: Clock3,
    },

    [
      ESTADOS_APORTACION.APROBADA
    ]: {
      texto: 'Aprobada',
      clase:
        'student-contribution-status--approved',
      Icono: CircleCheck,
    },

    [
      ESTADOS_APORTACION
        .REQUIERE_CORRECCION
    ]: {
      texto: 'Requiere corrección',
      clase:
        'student-contribution-status--correction',
      Icono: CircleAlert,
    },
  })

// Obtiene una fecha local sin convertirla previamente a UTC.
function obtenerFechaActual() {
  const fecha = new Date()

  const anio =
    fecha.getFullYear()

  const mes =
    String(
      fecha.getMonth() + 1,
    ).padStart(2, '0')

  const dia =
    String(
      fecha.getDate(),
    ).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

// Crea el estado inicial del formulario de un solo mes.
function crearFormularioUnMes() {
  const fecha = new Date()

  return {
    mesAportacion:
      String(
        fecha.getMonth() + 1,
      ),

    anioAportacion:
      String(
        fecha.getFullYear(),
      ),

    fechaPago:
      obtenerFechaActual(),

    numeroReferencia: '',
    archivo: null,
  }
}

// Crea el estado inicial del formulario de varios meses.
function crearFormularioVariosMeses() {
  return {
    cantidadSeleccionada: '2',
    cantidadPersonalizada: '',
    fechaPago:
      obtenerFechaActual(),
    numeroReferencia: '',
    archivo: null,
  }
}

/*
 * Convierte un monto numérico al formato visual utilizado
 * por el portal, por ejemplo: L 40.00.
 */
function formatearMoneda(valor) {
  const monto = Number(valor)

  if (!Number.isFinite(monto)) {
    return 'L 0.00'
  }

  return (
    `L ${monto.toLocaleString(
      'es-HN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`
  )
}

/*
 * Obtiene el mes, año y texto completo de fecha y hora
 * desde el instante en que fue enviado el comprobante.
 *
 * El distintivo del historial siempre representa la fecha
 * de envío, tanto en pagos individuales como múltiples.
 */
function obtenerPartesFechaEnvio(
  fechaEnvio,
) {
  const fecha =
    new Date(fechaEnvio)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return {
      mes: '---',
      anio: '----',
      fechaHora:
        'Fecha de envío no disponible',
      dateTime: undefined,
    }
  }

  const mes =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        month: 'short',
      },
    )
      .format(fecha)
      .replace('.', '')
      .toUpperCase()

  const anio =
    String(
      fecha.getFullYear(),
    )

  const fechaFormateada =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    ).format(fecha)

  const horaFormateada =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    ).format(fecha)

  return {
    mes,
    anio,
    fechaHora:
      `Subido el ${fechaFormateada} · ${horaFormateada}`,

    dateTime:
      fecha.toISOString(),
  }
}

// Obtiene solamente el año local del envío para los filtros.
function obtenerAnioFechaEnvio(
  fechaEnvio,
) {
  const fecha =
    new Date(fechaEnvio)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return null
  }

  return fecha.getFullYear()
}

// Convierte el tamaño del archivo a una unidad fácil de leer.
function formatearTamanioArchivo(
  tamanioBytes,
) {
  const bytes =
    Number(tamanioBytes)

  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return 'Tamaño no disponible'
  }

  const megabytes =
    bytes / (1024 * 1024)

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`
  }

  const kilobytes =
    bytes / 1024

  return `${kilobytes.toFixed(0)} KB`
}

/*
 * Calcula la cantidad definitiva del formulario múltiple.
 *
 * Entre 2 y 12 toma el valor del selector. Cuando se eligió
 * "Más de 12 meses", toma el valor escrito por el estudiante.
 */
function obtenerCantidadMesesMultiples(
  formulario,
) {
  if (
    formulario
      .cantidadSeleccionada ===
    OPCION_MAS_DE_DOCE
  ) {
    return Number(
      formulario
        .cantidadPersonalizada,
    )
  }

  return Number(
    formulario
      .cantidadSeleccionada,
  )
}

/*
 * Calcula el monto que se mostrará en el campo bloqueado.
 *
 * Mientras la cantidad personalizada esté incompleta,
 * la interfaz muestra L 0.00 sin enviar datos inválidos.
 */
function calcularMontoVisible(
  cantidadMeses,
) {
  if (
    !Number.isInteger(
      cantidadMeses,
    ) ||
    cantidadMeses < 2
  ) {
    return 0
  }

  return calcularMontoAportacion(
    cantidadMeses,
  )
}

/*
 * Selector reutilizable de imágenes.
 *
 * Administra:
 * - Selección manual.
 * - Arrastrar y soltar.
 * - Vista previa local.
 * - Eliminación del archivo.
 */
function SelectorComprobante({
  id,
  archivo,
  error,
  deshabilitado,
  onSeleccionar,
  onQuitar,
}) {
  const [
    arrastrando,
    setArrastrando,
  ] = useState(false)

  const [
    vistaPrevia,
    setVistaPrevia,
  ] = useState('')

  /*
   * La URL temporal existe únicamente mientras el archivo
   * se encuentra seleccionado. Después se libera para evitar
   * conservar memoria innecesariamente.
   */
  useEffect(() => {
    if (
      !archivo ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !==
        'function'
    ) {
      setVistaPrevia('')
      return undefined
    }

    const urlTemporal =
      URL.createObjectURL(
        archivo,
      )

    setVistaPrevia(
      urlTemporal,
    )

    return () => {
      URL.revokeObjectURL(
        urlTemporal,
      )
    }
  }, [archivo])

  function manejarSeleccion(
    evento,
  ) {
    const archivoSeleccionado =
      evento.target.files?.[0]

    /*
     * Limpiar el valor permite seleccionar otra vez
     * el mismo archivo si anteriormente fue removido.
     */
    evento.target.value = ''

    if (archivoSeleccionado) {
      onSeleccionar(
        archivoSeleccionado,
      )
    }
  }

  function manejarArrastre(
    evento,
  ) {
    evento.preventDefault()

    if (!deshabilitado) {
      setArrastrando(true)
    }
  }

  function manejarSalidaArrastre(
    evento,
  ) {
    evento.preventDefault()
    setArrastrando(false)
  }

  function manejarArchivoSoltado(
    evento,
  ) {
    evento.preventDefault()
    setArrastrando(false)

    if (deshabilitado) {
      return
    }

    const archivoSeleccionado =
      evento.dataTransfer
        .files?.[0]

    if (archivoSeleccionado) {
      onSeleccionar(
        archivoSeleccionado,
      )
    }
  }

  const claseZonaCarga = [
    'student-contributions-dropzone',

    arrastrando
      ? 'student-contributions-dropzone--dragging'
      : '',

    error
      ? 'student-contributions-dropzone--invalid'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="student-contributions-upload-field">
      <label htmlFor={id}>
        Sube una imagen del comprobante
      </label>

      <label
        className={claseZonaCarga}
        htmlFor={id}
        onDragEnter={manejarArrastre}
        onDragOver={manejarArrastre}
        onDragLeave={
          manejarSalidaArrastre
        }
        onDrop={
          manejarArchivoSoltado
        }
      >
        <ImagePlus aria-hidden="true" />

        <strong>
          Arrastra el archivo aquí o
          selecciónalo desde tu equipo
        </strong>

        <span className="student-contributions-select-file">
          Seleccionar imagen
        </span>

        <span>
          JPG, JPEG, PNG o WEBP ·
          Máximo 3 MB
        </span>

        <input
          id={id}
          className="student-contributions-file-input"
          type="file"
          accept={
            FORMATOS_COMPROBANTE_ACEPTADOS
          }
          disabled={deshabilitado}
          aria-invalid={
            Boolean(error)
          }
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          onChange={
            manejarSeleccion
          }
        />
      </label>

      {error && (
        <p
          id={`${id}-error`}
          className="student-contributions-field__error"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
          />

          {error}
        </p>
      )}

      {archivo && (
        <div className="student-contributions-file-preview">
          <div className="student-contributions-file-thumbnail">
            {vistaPrevia ? (
              <img
                src={vistaPrevia}
                alt={`Vista previa de ${archivo.name}`}
              />
            ) : (
              <FileImage
                aria-hidden="true"
              />
            )}
          </div>

          <div className="student-contributions-file-copy">
            <strong>
              {archivo.name}
            </strong>

            <span>
              {formatearTamanioArchivo(
                archivo.size,
              )}
              {' · '}
              Imagen
            </span>

            <small>
              <CircleCheck
                aria-hidden="true"
              />

              Archivo listo
            </small>
          </div>

          <button
            className="student-contributions-remove-file"
            type="button"
            disabled={deshabilitado}
            aria-label={`Quitar ${archivo.name}`}
            title="Quitar imagen"
            onClick={onQuitar}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

/*
 * Panel lateral compartido por ambos formularios.
 *
 * Los mensajes pueden cambiar dependiendo del tipo
 * de comprobante que se está registrando.
 */
function InformacionAntesDeEnviar({
  variosMeses,
}) {
  const recomendaciones =
    variosMeses
      ? [
          'Verifica que el comprobante sea legible.',
          'Confirma que la cantidad de meses sea correcta.',
          'La imagen no debe superar los 3 MB.',
          'Verifica que el número de referencia sea correcto.',
        ]
      : [
          'Verifica que el comprobante sea legible.',
          'Selecciona el mes correspondiente al pago.',
          'La imagen no debe superar los 3 MB.',
          'Verifica que el número de referencia sea correcto.',
        ]

  return (
    <aside className="student-contributions-form-aside">
      <section className="student-contributions-checklist">
        <h3>Antes de enviar</h3>

        <ul>
          {recomendaciones.map(
            (recomendacion) => (
              <li key={recomendacion}>
                <CircleCheck
                  aria-hidden="true"
                />

                <span>
                  {recomendacion}
                </span>
              </li>
            ),
          )}
        </ul>
      </section>

      <div className="student-contributions-account-note">
        <Info aria-hidden="true" />

        <span>
          Tu número de cuenta se
          obtiene de la sesión y no
          necesitas ingresarlo.
        </span>
      </div>
    </aside>
  )
}

// Representa un comprobante dentro del historial.
function TarjetaAportacion({
  aportacion,
  onVerDetalle,
}) {
  const {
    mes,
    anio,
    fechaHora,
    dateTime,
  } = obtenerPartesFechaEnvio(
    aportacion.fechaEnvio,
  )

  const informacionEstado =
    INFORMACION_ESTADOS[
      aportacion.estado
    ] ?? {
      texto: 'Estado no disponible',
      clase:
        'student-contribution-status--pending',
      Icono: Info,
    }

  const {
    Icono: IconoEstado,
  } = informacionEstado

  return (
    <article className="student-contribution-card">
      {/*
       * Mes y año en que el comprobante fue enviado.
       * No representa el periodo pagado.
       */}
      <time
        className="student-contribution-date"
        dateTime={dateTime}
        aria-label={fechaHora}
      >
        <strong>{mes}</strong>

        <span>{anio}</span>
      </time>

      <div className="student-contribution-upload">
        <CalendarDays
          aria-hidden="true"
        />

        <span>{fechaHora}</span>
      </div>

      <strong className="student-contribution-amount">
        {formatearMoneda(
          aportacion.monto,
        )}
      </strong>

      {/*
       * El historial muestra la referencia del comprobante
       * en lugar del nombre de la imagen.
       */}
      <div className="student-contribution-reference">
        <small>
          Número de referencia
        </small>

        <strong title={
          aportacion.numeroReferencia
        }>
          {
            aportacion
              .numeroReferencia
          }
        </strong>
      </div>

      <span
        className={
          `student-contribution-status ${informacionEstado.clase}`
        }
      >
        <IconoEstado
          aria-hidden="true"
        />

        {informacionEstado.texto}
      </span>

      <button
        className="student-contribution-view-button"
        type="button"
        aria-label={
          `Ver detalle de la aportación con referencia ${aportacion.numeroReferencia}`
        }
        title="Ver detalle"
        onClick={() =>
          onVerDetalle(
            aportacion,
          )
        }
      >
        <Eye aria-hidden="true" />
      </button>
    </article>
  )
}

function Contributions() {
  const navigate = useNavigate()

  const [
    parametrosBusqueda,
    setParametrosBusqueda,
  ] = useSearchParams()

  const { usuario } =
    useUsuario()

  /*
   * La URL puede solicitar directamente uno de los formularios.
   *
   * Esto se utilizará después desde el botón de un comprobante
   * que requiere corrección.
   */
  const vistaSolicitada =
    parametrosBusqueda.get(
      'vista',
    )

  const vistaInicial =
    vistaSolicitada ===
      VISTAS.UN_MES ||
    vistaSolicitada ===
      VISTAS.VARIOS_MESES
      ? vistaSolicitada
      : VISTAS.HISTORIAL

  const [
    vistaActiva,
    setVistaActiva,
  ] = useState(
    vistaInicial,
  )

  const [
    aportaciones,
    setAportaciones,
  ] = useState([])

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
    filtroAnio,
    setFiltroAnio,
  ] = useState('')

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState(
    FILTRO_TODOS,
  )

  const [
    formularioUnMes,
    setFormularioUnMes,
  ] = useState(
    crearFormularioUnMes,
  )

  const [
    formularioVariosMeses,
    setFormularioVariosMeses,
  ] = useState(
    crearFormularioVariosMeses,
  )

  const [
    errorArchivoUnMes,
    setErrorArchivoUnMes,
  ] = useState('')

  const [
    errorArchivoVarios,
    setErrorArchivoVarios,
  ] = useState('')

  const [
    errorFormularioUnMes,
    setErrorFormularioUnMes,
  ] = useState('')

  const [
    errorFormularioVarios,
    setErrorFormularioVarios,
  ] = useState('')

  /*
   * Guarda el formulario que se está procesando.
   *
   * Su valor también permite bloquear botones y campos
   * para evitar envíos repetidos.
   */
  const [
    formularioEnviando,
    setFormularioEnviando,
  ] = useState(null)

  const referenciaCantidadPersonalizada =
    useRef(null)

  /*
   * Obtiene el historial desde el servicio.
   *
   * En modo simulado será localStorage. Cuando exista
   * el contrato real, la página conservará esta misma llamada.
   */
  useEffect(() => {
    let componenteActivo = true

    async function cargarAportaciones() {
      setCargando(true)
      setErrorCarga('')

      try {
        const historial =
          await listarAportacionesEstudiante()

        if (!componenteActivo) {
          return
        }

        setAportaciones(
          Array.isArray(historial)
            ? historial
            : [],
        )
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        setAportaciones([])

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el historial de aportaciones.',
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarAportaciones()

    return () => {
      componenteActivo = false
    }
  }, [intentoCarga])

  /*
   * Si la URL cambia mientras la página está abierta,
   * actualizamos la pestaña solicitada.
   */
  useEffect(() => {
    if (
      vistaSolicitada ===
        VISTAS.UN_MES ||
      vistaSolicitada ===
        VISTAS.VARIOS_MESES
    ) {
      setVistaActiva(
        vistaSolicitada,
      )
    }
  }, [vistaSolicitada])

  /*
   * Enfoca automáticamente el campo personalizado
   * después de elegir "Más de 12 meses".
   */
  useEffect(() => {
    if (
      formularioVariosMeses
        .cantidadSeleccionada !==
      OPCION_MAS_DE_DOCE
    ) {
      return undefined
    }

    const identificadorAnimacion =
      window.requestAnimationFrame(
        () => {
          referenciaCantidadPersonalizada
            .current
            ?.focus()
        },
      )

    return () => {
      window.cancelAnimationFrame(
        identificadorAnimacion,
      )
    }
  }, [
    formularioVariosMeses
      .cantidadSeleccionada,
  ])

  /*
   * Años disponibles según la fecha real de envío
   * de los comprobantes del historial.
   */
  const aniosDisponibles =
    useMemo(() => {
      const anios =
        aportaciones
          .map(
            (aportacion) =>
              obtenerAnioFechaEnvio(
                aportacion.fechaEnvio,
              ),
          )
          .filter(
            (anio) =>
              Number.isInteger(anio),
          )

      return [
        ...new Set(anios),
      ].sort(
        (anioA, anioB) =>
          anioB - anioA,
      )
    }, [aportaciones])

  /*
   * Selecciona inicialmente el año actual si existe.
   * Después respeta el filtro elegido por el estudiante.
   */
  useEffect(() => {
    setFiltroAnio(
      (filtroActual) => {
        if (
          filtroActual ===
          FILTRO_TODOS
        ) {
          return filtroActual
        }

        if (
          filtroActual &&
          aniosDisponibles.includes(
            Number(filtroActual),
          )
        ) {
          return filtroActual
        }

        const anioActual =
          new Date().getFullYear()

        if (
          aniosDisponibles.includes(
            anioActual,
          )
        ) {
          return String(
            anioActual,
          )
        }

        return aniosDisponibles[0]
          ? String(
              aniosDisponibles[0],
            )
          : FILTRO_TODOS
      },
    )
  }, [aniosDisponibles])

  const hayFiltrosHistorialActivos =
    Boolean(
      filtroAnio && filtroAnio !== FILTRO_TODOS,
    ) || filtroEstado !== FILTRO_TODOS

  // Restablece simultaneamente los dos filtros del historial y permite mostrar todos los registros.
  function limpiarFiltrosHistorial() {
    setFiltroAnio(FILTRO_TODOS)
    setFiltroEstado(FILTRO_TODOS)
  }

  /*
   * Filtra únicamente por:
   * - Año de envío.
   * - Estado de revisión.
   */
  const aportacionesFiltradas =
    useMemo(() => {
      return aportaciones.filter(
        (aportacion) => {
          const anioEnvio =
            obtenerAnioFechaEnvio(
              aportacion.fechaEnvio,
            )

          const coincideAnio =
            filtroAnio ===
              FILTRO_TODOS ||
            !filtroAnio ||
            String(anioEnvio) ===
              filtroAnio

          const coincideEstado =
            filtroEstado ===
              FILTRO_TODOS ||
            aportacion.estado ===
              filtroEstado

          return (
            coincideAnio &&
            coincideEstado
          )
        },
      )
    }, [
      aportaciones,
      filtroAnio,
      filtroEstado,
    ])

  /*
   * Resumen de la deuda del estudiante.
   *
   * El monto nunca se toma como un valor independiente:
   * siempre se deriva de mesesSinPagar × L 20.
   */
  const resumenDeuda =
    useMemo(() => {
      try {
        return {
          ...calcularResumenDeuda(
            usuario
              ?.datosBecario
              ?.mesesSinPagar,
          ),

          disponible: true,
        }
      } catch {
        return {
          mesesPendientes: 0,
          montoPendiente: 0,
          disponible: false,
        }
      }
    }, [
      usuario
        ?.datosBecario
        ?.mesesSinPagar,
    ])

  const cantidadMesesMultiples =
    useMemo(
      () =>
        obtenerCantidadMesesMultiples(
          formularioVariosMeses,
        ),
      [formularioVariosMeses],
    )

  const montoVariosMeses =
    useMemo(
      () =>
        calcularMontoVisible(
          cantidadMesesMultiples,
        ),
      [cantidadMesesMultiples],
    )

  /*
   * Conservamos un grupo pequeño de años alrededor
   * del año actual para el formulario individual.
   */
  const aniosFormulario =
    useMemo(() => {
      const anioActual =
        new Date().getFullYear()

      return [
        anioActual + 1,
        anioActual,
        anioActual - 1,
        anioActual - 2,
      ]
    }, [])

  function cambiarVista(
    nuevaVista,
  ) {
    setVistaActiva(
      nuevaVista,
    )

    setErrorFormularioUnMes('')
    setErrorFormularioVarios('')

    const nuevosParametros =
      new URLSearchParams(
        parametrosBusqueda,
      )

    if (
      nuevaVista ===
      VISTAS.HISTORIAL
    ) {
      nuevosParametros.delete(
        'vista',
      )
    } else {
      nuevosParametros.set(
        'vista',
        nuevaVista,
      )
    }

    setParametrosBusqueda(
      nuevosParametros,
      {
        replace: true,
      },
    )
  }

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  function abrirDetalle(
    aportacion,
  ) {
    const identificador =
      String(
        aportacion?.id ?? '',
      ).trim()

    if (!identificador) {
      return
    }

    navigate(
      `/aportaciones/${
        encodeURIComponent(
          identificador,
        )
      }`,
    )
  }

  /*
   * Valida la imagen inmediatamente.
   *
   * Así el estudiante conoce el error antes de presionar
   * el botón de envío.
   */
  function seleccionarArchivo(
    archivo,
    tipoFormulario,
  ) {
    try {
      validarComprobanteImagen(
        archivo,
      )

      if (
        tipoFormulario ===
        VISTAS.UN_MES
      ) {
        setFormularioUnMes(
          (formularioActual) => ({
            ...formularioActual,
            archivo,
          }),
        )

        setErrorArchivoUnMes('')
        setErrorFormularioUnMes('')
        return
      }

      setFormularioVariosMeses(
        (formularioActual) => ({
          ...formularioActual,
          archivo,
        }),
      )

      setErrorArchivoVarios('')
      setErrorFormularioVarios('')
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'El archivo seleccionado no es válido.'

      if (
        tipoFormulario ===
        VISTAS.UN_MES
      ) {
        setFormularioUnMes(
          (formularioActual) => ({
            ...formularioActual,
            archivo: null,
          }),
        )

        setErrorArchivoUnMes(
          mensaje,
        )
        return
      }

      setFormularioVariosMeses(
        (formularioActual) => ({
          ...formularioActual,
          archivo: null,
        }),
      )

      setErrorArchivoVarios(
        mensaje,
      )
    }
  }

  function quitarArchivoUnMes() {
    setFormularioUnMes(
      (formularioActual) => ({
        ...formularioActual,
        archivo: null,
      }),
    )

    setErrorArchivoUnMes('')
  }

  function quitarArchivoVarios() {
    setFormularioVariosMeses(
      (formularioActual) => ({
        ...formularioActual,
        archivo: null,
      }),
    )

    setErrorArchivoVarios('')
  }

  function cancelarFormularioUnMes() {
    setFormularioUnMes(
      crearFormularioUnMes(),
    )

    setErrorArchivoUnMes('')
    setErrorFormularioUnMes('')

    cambiarVista(
      VISTAS.HISTORIAL,
    )
  }

  function cancelarFormularioVarios() {
    setFormularioVariosMeses(
      crearFormularioVariosMeses(),
    )

    setErrorArchivoVarios('')
    setErrorFormularioVarios('')

    cambiarVista(
      VISTAS.HISTORIAL,
    )
  }

  async function enviarAportacionUnMes(
    evento,
  ) {
    evento.preventDefault()

    setErrorFormularioUnMes('')

    try {
      validarComprobanteImagen(
        formularioUnMes.archivo,
      )
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Selecciona una imagen válida.'

      setErrorArchivoUnMes(
        mensaje,
      )

      setErrorFormularioUnMes(
        mensaje,
      )

      return
    }

    setFormularioEnviando(
      VISTAS.UN_MES,
    )

    try {
      const nuevaAportacion =
        await registrarAportacionUnMes({
          mesAportacion:
            formularioUnMes
              .mesAportacion,

          anioAportacion:
            formularioUnMes
              .anioAportacion,

          fechaPago:
            formularioUnMes
              .fechaPago,

          numeroReferencia:
            formularioUnMes
              .numeroReferencia,

          archivo:
            formularioUnMes.archivo,
        })

      setAportaciones(
        (historialActual) => [
          nuevaAportacion,
          ...historialActual,
        ],
      )

      setFormularioUnMes(
        crearFormularioUnMes(),
      )

      setErrorArchivoUnMes('')
      cambiarVista(
        VISTAS.HISTORIAL,
      )

      notificarExito({
        titulo:
          'Comprobante enviado',
        descripcion:
          'La aportación quedó pendiente de aprobación por ASEBEP.',
        id:
          'aportacion-un-mes-enviada',
      })
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No fue posible enviar el comprobante.'

      setErrorFormularioUnMes(
        mensaje,
      )

      notificarError({
        titulo:
          'No se pudo enviar el comprobante',
        descripcion: mensaje,
        id:
          'error-aportacion-un-mes',
      })
    } finally {
      setFormularioEnviando(
        null,
      )
    }
  }

  async function enviarAportacionVariosMeses(
    evento,
  ) {
    evento.preventDefault()

    setErrorFormularioVarios('')

    /*
     * La opción personalizada debe representar
     * estrictamente una cantidad superior a doce.
     */
    if (
      formularioVariosMeses
        .cantidadSeleccionada ===
        OPCION_MAS_DE_DOCE &&
      (
        !Number.isInteger(
          cantidadMesesMultiples,
        ) ||
        cantidadMesesMultiples <= 12
      )
    ) {
      const mensaje =
        'Ingresa una cantidad entera mayor a 12 meses.'

      setErrorFormularioVarios(
        mensaje,
      )

      referenciaCantidadPersonalizada
        .current
        ?.focus()

      return
    }

    try {
      validarComprobanteImagen(
        formularioVariosMeses
          .archivo,
      )
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Selecciona una imagen válida.'

      setErrorArchivoVarios(
        mensaje,
      )

      setErrorFormularioVarios(
        mensaje,
      )

      return
    }

    setFormularioEnviando(
      VISTAS.VARIOS_MESES,
    )

    try {
      const nuevaAportacion =
        await registrarAportacionVariosMeses({
          cantidadMeses:
            cantidadMesesMultiples,

          fechaPago:
            formularioVariosMeses
              .fechaPago,

          numeroReferencia:
            formularioVariosMeses
              .numeroReferencia,

          archivo:
            formularioVariosMeses
              .archivo,
        })

      /*
       * El comprobante múltiple se agrega como un único
       * registro sin crear una tarjeta por cada mes.
       */
      setAportaciones(
        (historialActual) => [
          nuevaAportacion,
          ...historialActual,
        ],
      )

      setFormularioVariosMeses(
        crearFormularioVariosMeses(),
      )

      setErrorArchivoVarios('')
      cambiarVista(
        VISTAS.HISTORIAL,
      )

      notificarExito({
        titulo:
          'Comprobante enviado',
        descripcion:
          `Se registró un comprobante correspondiente a ${cantidadMesesMultiples} meses.`,

        id:
          'aportacion-varios-meses-enviada',
      })
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No fue posible enviar el comprobante.'

      setErrorFormularioVarios(
        mensaje,
      )

      notificarError({
        titulo:
          'No se pudo enviar el comprobante',
        descripcion: mensaje,
        id:
          'error-aportacion-varios-meses',
      })
    } finally {
      setFormularioEnviando(
        null,
      )
    }
  }

  const enviandoUnMes =
    formularioEnviando ===
    VISTAS.UN_MES

  const enviandoVariosMeses =
    formularioEnviando ===
    VISTAS.VARIOS_MESES

  const textoCantidadPendiente =
    resumenDeuda.mesesPendientes === 1
      ? '1 mes pendiente'
      : `${resumenDeuda.mesesPendientes} meses pendientes`

  return (
    <div className="app-layout">
      {/* Navegación lateral compartida en escritorio. */}
      <AppSidebar />

      <section className="app-content">
        {/* Encabezado actual del área del estudiante. */}
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <GraduationCap
              aria-hidden="true"
            />

            <strong>ASEBEP</strong>
          </div>

          <span className="app-topbar__section">
            Aportaciones
          </span>
        </header>

        <main className="student-contributions-main">
          {/* Presentación general del módulo. */}
          <header className="student-contributions-heading">
            <p>
              Gestión de aportaciones
            </p>

            <h1>Aportaciones</h1>

            <span>
              Sube tus comprobantes mensuales
              y consulta el estado de cada
              aportación.
            </span>
          </header>

          {/*
           * Resumen calculado con mesesSinPagar × L 20.
           * Esta tarjeta no acepta un monto independiente.
           */}
          <section
            className={
              resumenDeuda.disponible &&
              resumenDeuda
                .mesesPendientes === 0
                ? 'student-contributions-debt student-contributions-debt--clear'
                : 'student-contributions-debt'
            }
            aria-labelledby="titulo-deuda-aportaciones"
          >
            <div className="student-contributions-debt__icon">
              {resumenDeuda.disponible &&
              resumenDeuda
                .mesesPendientes === 0 ? (
                <CircleCheck
                  aria-hidden="true"
                />
              ) : (
                <WalletCards
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="student-contributions-debt__content">
              <h2 id="titulo-deuda-aportaciones">
                {resumenDeuda.disponible &&
                resumenDeuda
                  .mesesPendientes === 0
                  ? 'Tus aportaciones están al día'
                  : 'Aportaciones pendientes'}
              </h2>

              <p>
                {resumenDeuda.disponible
                  ? resumenDeuda
                      .mesesPendientes === 0
                    ? 'Actualmente no tienes meses pendientes de pago.'
                    : `El saldo se calcula según los ${textoCantidadPendiente} registrados en tu cuenta.`
                  : 'No fue posible calcular el saldo pendiente con la información disponible.'}
              </p>
            </div>

            <div className="student-contributions-debt__values">
              <span>
                Saldo equivalente
              </span>

              <strong>
                {resumenDeuda.disponible
                  ? formatearMoneda(
                      resumenDeuda
                        .montoPendiente,
                    )
                  : 'No disponible'}
              </strong>

              {resumenDeuda.disponible && (
                <small>
                  {textoCantidadPendiente}
                  {' · '}
                  Cuota mensual de{' '}
                  {formatearMoneda(
                    CUOTA_MENSUAL_APORTACION,
                  )}
                </small>
              )}
            </div>
          </section>

          <section className="student-contributions-panel">
            {/* Navegación interna del módulo. */}
            <div
              className="student-contributions-tabs"
              role="tablist"
              aria-label="Vistas de aportaciones"
            >
              <button
                id="tab-aportaciones-historial"
                className={
                  vistaActiva ===
                  VISTAS.HISTORIAL
                    ? 'student-contributions-tab student-contributions-tab--active'
                    : 'student-contributions-tab'
                }
                type="button"
                role="tab"
                aria-selected={
                  vistaActiva ===
                  VISTAS.HISTORIAL
                }
                aria-controls="panel-aportaciones"
                onClick={() =>
                  cambiarVista(
                    VISTAS.HISTORIAL,
                  )
                }
              >
                Historial de aportaciones

                <span>
                  {aportaciones.length}
                </span>
              </button>

              <button
                id="tab-aportaciones-un-mes"
                className={
                  vistaActiva ===
                  VISTAS.UN_MES
                    ? 'student-contributions-tab student-contributions-tab--active'
                    : 'student-contributions-tab'
                }
                type="button"
                role="tab"
                aria-selected={
                  vistaActiva ===
                  VISTAS.UN_MES
                }
                aria-controls="panel-aportaciones"
                onClick={() =>
                  cambiarVista(
                    VISTAS.UN_MES,
                  )
                }
              >
                Subir comprobante
              </button>

              <button
                id="tab-aportaciones-varios-meses"
                className={
                  vistaActiva ===
                  VISTAS.VARIOS_MESES
                    ? 'student-contributions-tab student-contributions-tab--active'
                    : 'student-contributions-tab'
                }
                type="button"
                role="tab"
                aria-selected={
                  vistaActiva ===
                  VISTAS.VARIOS_MESES
                }
                aria-controls="panel-aportaciones"
                onClick={() =>
                  cambiarVista(
                    VISTAS.VARIOS_MESES,
                  )
                }
              >
                Comprobante de varios meses
              </button>
            </div>

            {/*
             * El contenido cambia completamente entre pestañas.
             * La key reinicia la animación visual de cada vista.
             */}
            <div
              key={vistaActiva}
              id="panel-aportaciones"
              className="student-contributions-view"
              role="tabpanel"
              aria-labelledby={
                `tab-aportaciones-${vistaActiva === VISTAS.HISTORIAL
                  ? 'historial'
                  : vistaActiva === VISTAS.UN_MES
                    ? 'un-mes'
                    : 'varios-meses'
                }`
              }
            >
              {vistaActiva ===
                VISTAS.HISTORIAL && (
                <>
                  {/* Filtros del historial. */}
                  <div className="student-contributions-filters">
                    <div className="student-contributions-field">
                      <label htmlFor="filtro-anio-aportaciones">
                        Año
                      </label>

                      <div className="student-contributions-select">
                        <select
                          id="filtro-anio-aportaciones"
                          value={
                            filtroAnio ||
                            FILTRO_TODOS
                          }
                          onChange={(evento) =>
                            setFiltroAnio(
                              evento
                                .target
                                .value,
                            )
                          }
                        >
                          <option value={FILTRO_TODOS}>
                            Todos
                          </option>

                          {aniosDisponibles.map(
                            (anio) => (
                              <option
                                key={anio}
                                value={anio}
                              >
                                {anio}
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <div className="student-contributions-field">
                      <label htmlFor="filtro-estado-aportaciones">
                        Estado
                      </label>

                      <div className="student-contributions-select">
                        <select
                          id="filtro-estado-aportaciones"
                          value={
                            filtroEstado
                          }
                          onChange={(evento) =>
                            setFiltroEstado(
                              evento
                                .target
                                .value,
                            )
                          }
                        >
                          <option value={FILTRO_TODOS}>
                            Todos
                          </option>

                          <option
                            value={
                              ESTADOS_APORTACION
                                .PENDIENTE_APROBACION
                            }
                          >
                            Pendiente de aprobación
                          </option>

                          <option
                            value={
                              ESTADOS_APORTACION
                                .APROBADA
                            }
                          >
                            Aprobada
                          </option>

                          <option
                            value={
                              ESTADOS_APORTACION
                                .REQUIERE_CORRECCION
                            }
                          >
                            Requiere corrección
                          </option>
                        </select>

                        <ChevronDown
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    {/* Restablece Año y Esatdo */}
                    <button className="student-contributions-clear"
                            type="button"
                            onClick={limpiarFiltrosHistorial}
                            disabled={
                              !hayFiltrosHistorialActivos
                            }
                          >
                            <RotateCcw aria-hidden="true" />
                            <span>Limpiar filtros</span>
                      </button>
                  </div>

                  <section className="student-contributions-history">
                    <header className="student-contributions-history__heading">
                      <div>
                        <h2>
                          Historial de aportaciones
                        </h2>

                        <p>
                          Consulta los comprobantes
                          que has enviado a ASEBEP.
                        </p>
                      </div>

                      {!cargando &&
                        !errorCarga && (
                          <span className="student-contributions-history__count">
                            {
                              aportacionesFiltradas.length
                            }{' '}
                            {aportacionesFiltradas.length ===
                            1
                              ? 'registro'
                              : 'registros'}
                          </span>
                        )}
                    </header>

                    {cargando && (
                      <div
                        className="student-contributions-state"
                        role="status"
                        aria-live="polite"
                      >
                        <Clock3
                          aria-hidden="true"
                        />

                        <h3>
                          Cargando aportaciones
                        </h3>

                        <p>
                          Estamos consultando
                          tu historial de
                          comprobantes.
                        </p>
                      </div>
                    )}

                    {!cargando &&
                      errorCarga && (
                        <div
                          className="student-contributions-state student-contributions-state--error"
                          role="alert"
                        >
                          <CircleAlert
                            aria-hidden="true"
                          />

                          <h3>
                            No fue posible cargar
                            las aportaciones
                          </h3>

                          <p>
                            {errorCarga}
                          </p>

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
                      aportacionesFiltradas.length ===
                        0 && (
                        <div className="student-contributions-state">
                          <WalletCards
                            aria-hidden="true"
                          />

                          <h3>
                            No encontramos
                            aportaciones
                          </h3>

                          <p>
                            {aportaciones.length >
                            0
                              ? 'No existen comprobantes que coincidan con los filtros seleccionados.'
                              : 'Todavía no has enviado comprobantes de aportaciones.'}
                          </p>
                        </div>
                      )}

                    {!cargando &&
                      !errorCarga &&
                      aportacionesFiltradas.length >
                        0 && (
                        <div className="student-contributions-list">
                          {aportacionesFiltradas.map(
                            (aportacion) => (
                              <TarjetaAportacion
                                key={
                                  aportacion.id
                                }
                                aportacion={
                                  aportacion
                                }
                                onVerDetalle={
                                  abrirDetalle
                                }
                              />
                            ),
                          )}
                        </div>
                      )}
                  </section>
                </>
              )}

              {vistaActiva ===
                VISTAS.UN_MES && (
                <section className="student-contributions-form-view">
                  <div className="student-contributions-form-layout">
                    <div className="student-contributions-form-column">
                      <header className="student-contributions-form-heading">
                        <h2>
                          Subir nuevo comprobante
                        </h2>

                        <p>
                          Registra la aportación
                          correspondiente al mes
                          seleccionado.
                        </p>
                      </header>

                      <form
                        className="student-contributions-form"
                        onSubmit={
                          enviarAportacionUnMes
                        }
                      >
                        <div className="student-contributions-form-grid">
                          <div className="student-contributions-field">
                            <label htmlFor="mes-aportacion">
                              Mes de aportación
                            </label>

                            <div className="student-contributions-select">
                              <select
                                id="mes-aportacion"
                                value={
                                  formularioUnMes
                                    .mesAportacion
                                }
                                disabled={
                                  enviandoUnMes
                                }
                                required
                                onChange={(evento) =>
                                  setFormularioUnMes(
                                    (
                                      formularioActual,
                                    ) => ({
                                      ...formularioActual,

                                      mesAportacion:
                                        evento
                                          .target
                                          .value,
                                    }),
                                  )
                                }
                              >
                                {MESES.map(
                                  (mes) => (
                                    <option
                                      key={
                                        mes.valor
                                      }
                                      value={
                                        mes.valor
                                      }
                                    >
                                      {
                                        mes.nombre
                                      }
                                    </option>
                                  ),
                                )}
                              </select>

                              <ChevronDown
                                aria-hidden="true"
                              />
                            </div>
                          </div>

                          <div className="student-contributions-field">
                            <label htmlFor="anio-aportacion">
                              Año
                            </label>

                            <div className="student-contributions-select">
                              <select
                                id="anio-aportacion"
                                value={
                                  formularioUnMes
                                    .anioAportacion
                                }
                                disabled={
                                  enviandoUnMes
                                }
                                required
                                onChange={(evento) =>
                                  setFormularioUnMes(
                                    (
                                      formularioActual,
                                    ) => ({
                                      ...formularioActual,

                                      anioAportacion:
                                        evento
                                          .target
                                          .value,
                                    }),
                                  )
                                }
                              >
                                {aniosFormulario.map(
                                  (anio) => (
                                    <option
                                      key={anio}
                                      value={anio}
                                    >
                                      {anio}
                                    </option>
                                  ),
                                )}
                              </select>

                              <ChevronDown
                                aria-hidden="true"
                              />
                            </div>
                          </div>

                          <div className="student-contributions-field">
                            <label htmlFor="monto-un-mes">
                              Monto pagado
                            </label>

                            <div className="student-contributions-money">
                              <span>
                                L
                              </span>

                              <input
                                id="monto-un-mes"
                                type="text"
                                value={
                                  MONTO_UN_MES.toFixed(
                                    2,
                                  )
                                }
                                readOnly
                                aria-readonly="true"
                                title="Monto calculado automáticamente"
                              />
                            </div>

                            <p className="student-contributions-field__help">
                              El monto corresponde
                              a una cuota mensual.
                            </p>
                          </div>

                          <div className="student-contributions-field">
                            <label htmlFor="fecha-pago-un-mes">
                              Fecha de pago
                            </label>

                            <input
                              id="fecha-pago-un-mes"
                              type="date"
                              value={
                                formularioUnMes
                                  .fechaPago
                              }
                              disabled={
                                enviandoUnMes
                              }
                              required
                              onChange={(evento) =>
                                setFormularioUnMes(
                                  (
                                    formularioActual,
                                  ) => ({
                                    ...formularioActual,

                                    fechaPago:
                                      evento
                                        .target
                                        .value,
                                  }),
                                )
                              }
                            />
                          </div>

                          <div className="student-contributions-field student-contributions-field--full">
                            <label htmlFor="referencia-un-mes">
                              Número de referencia
                              del comprobante
                            </label>

                            <input
                              id="referencia-un-mes"
                              type="text"
                              value={
                                formularioUnMes
                                  .numeroReferencia
                              }
                              placeholder="Ej. 847291"
                              maxLength="80"
                              disabled={
                                enviandoUnMes
                              }
                              required
                              onChange={(evento) =>
                                setFormularioUnMes(
                                  (
                                    formularioActual,
                                  ) => ({
                                    ...formularioActual,

                                    numeroReferencia:
                                      evento
                                        .target
                                        .value,
                                  }),
                                )
                              }
                            />

                            <p className="student-contributions-field__help">
                              Ingresa el número que
                              aparece en tu comprobante
                              de pago.
                            </p>
                          </div>
                        </div>

                        <SelectorComprobante
                          id="comprobante-un-mes"
                          archivo={
                            formularioUnMes
                              .archivo
                          }
                          error={
                            errorArchivoUnMes
                          }
                          deshabilitado={
                            enviandoUnMes
                          }
                          onSeleccionar={(
                            archivo,
                          ) =>
                            seleccionarArchivo(
                              archivo,
                              VISTAS.UN_MES,
                            )
                          }
                          onQuitar={
                            quitarArchivoUnMes
                          }
                        />

                        {errorFormularioUnMes && (
                          <div
                            className="student-contributions-form-error"
                            role="alert"
                          >
                            <CircleAlert
                              aria-hidden="true"
                            />

                            <span>
                              {
                                errorFormularioUnMes
                              }
                            </span>
                          </div>
                        )}

                        <div className="student-contributions-form-actions">
                          <button
                            className="student-contributions-button student-contributions-button--secondary"
                            type="button"
                            disabled={
                              enviandoUnMes
                            }
                            onClick={
                              cancelarFormularioUnMes
                            }
                          >
                            Cancelar
                          </button>

                          <button
                            className="student-contributions-button student-contributions-button--primary"
                            type="submit"
                            disabled={
                              enviandoUnMes
                            }
                          >
                            <Send
                              aria-hidden="true"
                            />

                            {enviandoUnMes
                              ? 'Enviando...'
                              : 'Enviar comprobante'}
                          </button>
                        </div>

                        <p className="student-contributions-submit-note">
                          El comprobante quedará
                          pendiente de aprobación
                          por ASEBEP.
                        </p>
                      </form>
                    </div>

                    <InformacionAntesDeEnviar
                      variosMeses={false}
                    />
                  </div>
                </section>
              )}

              {vistaActiva ===
                VISTAS.VARIOS_MESES && (
                <section className="student-contributions-form-view">
                  <div className="student-contributions-form-layout">
                    <div className="student-contributions-form-column">
                      <header className="student-contributions-form-heading">
                        <h2>
                          Registrar pago de
                          varios meses
                        </h2>

                        <p>
                          Sube un solo comprobante
                          cuando realices el pago
                          de más de un mes.
                        </p>
                      </header>

                      <form
                        className="student-contributions-form"
                        onSubmit={
                          enviarAportacionVariosMeses
                        }
                      >
                        <div className="student-contributions-form-grid">
                          <div className="student-contributions-field">
                            <label htmlFor="cantidad-meses">
                              Cantidad de meses
                              que pagas
                            </label>

                            <div className="student-contributions-select">
                              <select
                                id="cantidad-meses"
                                value={
                                  formularioVariosMeses
                                    .cantidadSeleccionada
                                }
                                disabled={
                                  enviandoVariosMeses
                                }
                                required
                                onChange={(evento) =>
                                  setFormularioVariosMeses(
                                    (
                                      formularioActual,
                                    ) => ({
                                      ...formularioActual,

                                      cantidadSeleccionada:
                                        evento
                                          .target
                                          .value,

                                      cantidadPersonalizada:
                                        evento
                                          .target
                                          .value ===
                                        OPCION_MAS_DE_DOCE
                                          ? formularioActual
                                              .cantidadPersonalizada
                                          : '',
                                    }),
                                  )
                                }
                              >
                                {Array.from(
                                  {
                                    length: 11,
                                  },
                                  (
                                    _elemento,
                                    indice,
                                  ) =>
                                    indice + 2,
                                ).map(
                                  (
                                    cantidad,
                                  ) => (
                                    <option
                                      key={
                                        cantidad
                                      }
                                      value={
                                        cantidad
                                      }
                                    >
                                      {cantidad}{' '}
                                      meses
                                    </option>
                                  ),
                                )}

                                <option
                                  value={
                                    OPCION_MAS_DE_DOCE
                                  }
                                >
                                  Más de 12 meses
                                </option>
                              </select>

                              <ChevronDown
                                aria-hidden="true"
                              />
                            </div>

                            <p className="student-contributions-field__help">
                              El pago múltiple
                              comienza desde dos
                              meses.
                            </p>
                          </div>

                          <div className="student-contributions-field">
                            <label htmlFor="monto-varios-meses">
                              Monto pagado
                            </label>

                            <div className="student-contributions-money">
                              <span>
                                L
                              </span>

                              <input
                                id="monto-varios-meses"
                                type="text"
                                value={
                                  montoVariosMeses.toFixed(
                                    2,
                                  )
                                }
                                readOnly
                                aria-readonly="true"
                                title="Monto calculado automáticamente"
                              />
                            </div>

                            <p className="student-contributions-field__help">
                              Calculado automáticamente:
                              {' '}
                              {Number.isInteger(
                                cantidadMesesMultiples,
                              ) &&
                              cantidadMesesMultiples >
                                0
                                ? `${cantidadMesesMultiples} × ${formatearMoneda(CUOTA_MENSUAL_APORTACION)}`
                                : 'ingresa la cantidad de meses'}
                            </p>
                          </div>

                          {formularioVariosMeses
                            .cantidadSeleccionada ===
                            OPCION_MAS_DE_DOCE && (
                            <div className="student-contributions-field student-contributions-field--full student-contributions-custom-months">
                              <label htmlFor="cantidad-personalizada">
                                Cantidad exacta
                                de meses pagados
                              </label>

                              <input
                                ref={
                                  referenciaCantidadPersonalizada
                                }
                                id="cantidad-personalizada"
                                type="number"
                                min="13"
                                step="1"
                                inputMode="numeric"
                                value={
                                  formularioVariosMeses
                                    .cantidadPersonalizada
                                }
                                placeholder="Ej. 15"
                                disabled={
                                  enviandoVariosMeses
                                }
                                required
                                onChange={(evento) =>
                                  setFormularioVariosMeses(
                                    (
                                      formularioActual,
                                    ) => ({
                                      ...formularioActual,

                                      cantidadPersonalizada:
                                        evento
                                          .target
                                          .value,
                                    }),
                                  )
                                }
                              />

                              <p className="student-contributions-field__help">
                                Ingresa un número
                                entero mayor a 12.
                                El monto se actualizará
                                automáticamente.
                              </p>
                            </div>
                          )}

                          <div className="student-contributions-field">
                            <label htmlFor="fecha-pago-varios">
                              Fecha de pago
                            </label>

                            <input
                              id="fecha-pago-varios"
                              type="date"
                              value={
                                formularioVariosMeses
                                  .fechaPago
                              }
                              disabled={
                                enviandoVariosMeses
                              }
                              required
                              onChange={(evento) =>
                                setFormularioVariosMeses(
                                  (
                                    formularioActual,
                                  ) => ({
                                    ...formularioActual,

                                    fechaPago:
                                      evento
                                        .target
                                        .value,
                                  }),
                                )
                              }
                            />
                          </div>

                          <div className="student-contributions-field">
                            <label htmlFor="referencia-varios">
                              Número de referencia
                              del comprobante
                            </label>

                            <input
                              id="referencia-varios"
                              type="text"
                              value={
                                formularioVariosMeses
                                  .numeroReferencia
                              }
                              placeholder="Ej. 847291"
                              maxLength="80"
                              disabled={
                                enviandoVariosMeses
                              }
                              required
                              onChange={(evento) =>
                                setFormularioVariosMeses(
                                  (
                                    formularioActual,
                                  ) => ({
                                    ...formularioActual,

                                    numeroReferencia:
                                      evento
                                        .target
                                        .value,
                                  }),
                                )
                              }
                            />

                            <p className="student-contributions-field__help">
                              Ingresa el número que
                              aparece en tu comprobante
                              de pago.
                            </p>
                          </div>
                        </div>

                        <SelectorComprobante
                          id="comprobante-varios-meses"
                          archivo={
                            formularioVariosMeses
                              .archivo
                          }
                          error={
                            errorArchivoVarios
                          }
                          deshabilitado={
                            enviandoVariosMeses
                          }
                          onSeleccionar={(
                            archivo,
                          ) =>
                            seleccionarArchivo(
                              archivo,
                              VISTAS.VARIOS_MESES,
                            )
                          }
                          onQuitar={
                            quitarArchivoVarios
                          }
                        />

                        {errorFormularioVarios && (
                          <div
                            className="student-contributions-form-error"
                            role="alert"
                          >
                            <CircleAlert
                              aria-hidden="true"
                            />

                            <span>
                              {
                                errorFormularioVarios
                              }
                            </span>
                          </div>
                        )}

                        <div className="student-contributions-form-actions">
                          <button
                            className="student-contributions-button student-contributions-button--secondary"
                            type="button"
                            disabled={
                              enviandoVariosMeses
                            }
                            onClick={
                              cancelarFormularioVarios
                            }
                          >
                            Cancelar
                          </button>

                          <button
                            className="student-contributions-button student-contributions-button--primary"
                            type="submit"
                            disabled={
                              enviandoVariosMeses
                            }
                          >
                            <Send
                              aria-hidden="true"
                            />

                            {enviandoVariosMeses
                              ? 'Enviando...'
                              : 'Enviar comprobante'}
                          </button>
                        </div>

                        <p className="student-contributions-submit-note">
                          El comprobante quedará
                          pendiente de aprobación
                          por ASEBEP.
                        </p>
                      </form>
                    </div>

                    <InformacionAntesDeEnviar
                      variosMeses
                    />
                  </div>
                </section>
              )}
            </div>
          </section>
        </main>
        <MobileNavigation />
      </section>
    </div>
  )
}

export default Contributions