import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Eye,
  FileText,
  GraduationCap,
  Info,
  RotateCcw,
  Send,
  UploadCloud,
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

import {
  useUsuario,
} from '../hooks/useUsuario.js'

import {
  calcularResumenDeuda,
  CUOTA_MENSUAL_APORTACION,
  ESTADOS_APORTACION,
  FORMATOS_COMPROBANTE_ACEPTADOS,
  listarAportacionesEstudiante,
  registrarAportacionEstudiante,
  validarComprobantePdf,
} from '../services/estudianteAportacionesService.js'

import {
  notificarError,
  notificarExito,
} from '../services/notificationService.js'

import '../styles/AppLayout.css'
import '../styles/Contributions.css'

/* =========================================================
 * CONFIGURACIÓN GENERAL
 * ======================================================= */

/*
 * El módulo ahora dispone solamente de dos vistas:
 *
 * - Historial de aportaciones.
 * - Formulario para enviar una aportación.
 */
const VISTAS =
  Object.freeze({
    HISTORIAL: 'historial',
    ENVIAR: 'enviar',
  })

const FILTRO_TODOS =
  'todos'

/*
 * Permite detectar cambios realizados por el administrador
 * desde otra pestaña durante las pruebas con localStorage.
 */
const CLAVE_APORTACIONES_COMPARTIDAS =
  'asebep_aportaciones_simuladas_v1'

/*
 * Configuración visual de los estados exactos
 * definidos actualmente por el backend.
 */
const INFORMACION_ESTADOS =
  Object.freeze({
    [
      ESTADOS_APORTACION
        .PENDIENTE
    ]: {
      texto: 'Pendiente',
      clase:
        'student-contribution-status--pending',
      Icono: Clock3,
    },

    [
      ESTADOS_APORTACION
        .APROBADO
    ]: {
      texto: 'Aprobada',
      clase:
        'student-contribution-status--approved',
      Icono: CircleCheck,
    },

    [
      ESTADOS_APORTACION
        .RECHAZADO
    ]: {
      texto: 'Rechazada',
      clase:
        'student-contribution-status--correction',
      Icono: CircleAlert,
    },
  })

/* =========================================================
 * FUNCIONES GENERALES
 * ======================================================= */

function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

/*
 * Crea el estado limpio del formulario.
 */
function crearFormularioInicial() {
  return {
    numeroReferencia: '',
    descripcion: '',
    archivo: null,
  }
}

/*
 * Crea el estado limpio de los errores.
 */
function crearErroresIniciales() {
  return {
    numeroReferencia: '',
    descripcion: '',
    archivo: '',
  }
}

/*
 * Acepta temporalmente los parámetros antiguos de la URL.
 *
 * Si otra vista todavía dirige a:
 * ?vista=un_mes o ?vista=varios_meses
 *
 * ambos valores abrirán el único formulario nuevo.
 */
function normalizarVista(valor) {
  if (
    valor === VISTAS.ENVIAR ||
    valor === 'un_mes' ||
    valor === 'varios_meses'
  ) {
    return VISTAS.ENVIAR
  }

  return VISTAS.HISTORIAL
}

/*
 * Convierte una cantidad numérica al formato monetario
 * utilizado por el portal.
 */
function formatearMoneda(valor) {
  const monto = Number(valor)

  if (!Number.isFinite(monto)) {
    return 'No disponible'
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
 * Devuelve el año de una fecha válida.
 */
function obtenerAnioFecha(valor) {
  const fecha =
    new Date(valor)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return null
  }

  return fecha.getFullYear()
}

/*
 * Prepara las partes visuales de fecha y hora
 * utilizadas dentro de cada tarjeta.
 */
function obtenerPartesFecha(valor) {
  const fecha =
    new Date(valor)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return {
      mes: '---',
      anio: '----',
      fechaHora:
        'Fecha no disponible',
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
      .toLocaleUpperCase('es')

  const fechaHora =
    new Intl.DateTimeFormat(
      'es-HN',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(fecha)

  return {
    mes,
    anio:
      String(
        fecha.getFullYear(),
      ),

    fechaHora,

    dateTime:
      fecha.toISOString(),
  }
}

/*
 * Convierte el tamaño del PDF a una unidad
 * fácil de interpretar.
 */
function formatearTamanioArchivo(
  cantidadBytes,
) {
  const bytes =
    Number(cantidadBytes)

  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return 'Tamaño no disponible'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kilobytes =
    bytes / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return (
    `${(
      kilobytes / 1024
    ).toFixed(1)} MB`
  )
}

/*
 * Muestra la cantidad acreditada únicamente
 * cuando la aportación fue aprobada.
 */
function obtenerTextoMesesAprobados(
  aportacion,
) {
  if (
    aportacion.estado !==
    ESTADOS_APORTACION.APROBADO
  ) {
    return 'Sin acreditar'
  }

  const meses =
    Number(
      aportacion.meses_aprobados,
    )

  if (
    !Number.isInteger(meses) ||
    meses <= 0
  ) {
    return 'Sin acreditar'
  }

  return (
    meses === 1
      ? '1 mes aprobado'
      : `${meses} meses aprobados`
  )
}

/* =========================================================
 * SELECTOR DEL COMPROBANTE PDF
 * ======================================================= */

function SelectorComprobantePdf({
  archivo,
  error,
  deshabilitado,
  onSeleccionar,
  onQuitar,
  onError,
}) {
  const referenciaInput =
    useRef(null)

  const [
    arrastrando,
    setArrastrando,
  ] = useState(false)

  /*
   * Valida el archivo antes de entregarlo
   * al formulario principal.
   */
  function procesarArchivo(
    archivoSeleccionado,
  ) {
    if (!archivoSeleccionado) {
      return
    }

    try {
      validarComprobantePdf(
        archivoSeleccionado,
      )

      onError('')
      onSeleccionar(
        archivoSeleccionado,
      )
    } catch (errorValidacion) {
      const mensaje =
        errorValidacion instanceof Error
          ? errorValidacion.message
          : 'El archivo seleccionado no es válido.'

      onSeleccionar(null)
      onError(mensaje)
    }
  }

  function manejarCambioArchivo(
    evento,
  ) {
    const archivoSeleccionado =
      evento.target.files?.[0]

    procesarArchivo(
      archivoSeleccionado,
    )
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

    procesarArchivo(
      archivoSeleccionado,
    )
  }

  function quitarArchivo() {
    if (deshabilitado) {
      return
    }

    if (referenciaInput.current) {
      referenciaInput.current.value =
        ''
    }

    onError('')
    onQuitar()
  }

  const clasesZonaCarga = [
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
      <label htmlFor="comprobante-aportacion">
        Comprobante PDF
      </label>

      {!archivo && (
        <label
          className={clasesZonaCarga}
          htmlFor="comprobante-aportacion"
          onDragEnter={manejarArrastre}
          onDragOver={manejarArrastre}
          onDragLeave={
            manejarSalidaArrastre
          }
          onDrop={
            manejarArchivoSoltado
          }
        >
          <UploadCloud
            aria-hidden="true"
          />

          <strong>
            Arrastra el comprobante
            aquí o selecciónalo
          </strong>

          <span>
            El archivo debe estar en
            formato PDF.
          </span>

          <span className="student-contributions-select-file">
            Seleccionar PDF
          </span>

          <input
            ref={referenciaInput}
            id="comprobante-aportacion"
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
                ? 'error-comprobante-aportacion'
                : 'ayuda-comprobante-aportacion'
            }
            onChange={
              manejarCambioArchivo
            }
          />
        </label>
      )}

      {!archivo && !error && (
        <p
          id="ayuda-comprobante-aportacion"
          className="student-contributions-field__help"
        >
          Solo se aceptan
          comprobantes con extensión PDF.
        </p>
      )}

      {error && (
        <p
          id="error-comprobante-aportacion"
          className="student-contributions-field__error"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
          />

          <span>{error}</span>
        </p>
      )}

      {archivo && (
        <div className="student-contributions-file-preview">
          <div className="student-contributions-file-thumbnail">
            <FileText
              aria-hidden="true"
            />
          </div>

          <div className="student-contributions-file-copy">
            <strong title={archivo.name}>
              {archivo.name}
            </strong>

            <span>
              {
                formatearTamanioArchivo(
                  archivo.size,
                )
              }
            </span>

            <small>
              <CircleCheck
                aria-hidden="true"
              />

              PDF listo para enviar
            </small>
          </div>

          <button
            className="student-contributions-remove-file"
            type="button"
            disabled={deshabilitado}
            aria-label={
              `Quitar ${archivo.name}`
            }
            title="Quitar archivo"
            onClick={quitarArchivo}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================================
 * INFORMACIÓN LATERAL
 * ======================================================= */

function InformacionAntesDeEnviar() {
  const recomendaciones = [
    'Verifica que el número de referencia sea correcto.',
    'Describe brevemente a qué corresponde el comprobante.',
    'Confirma que el comprobante sea legible y esté en formato PDF.',
    'Los meses serán determinados por el administrador durante la revisión.',
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
          obtiene automáticamente de
          la sesión y no se envía como
          un campo editable.
        </span>
      </div>
    </aside>
  )
}

/* =========================================================
 * TARJETA DEL HISTORIAL
 * ======================================================= */

function TarjetaAportacion({
  aportacion,
  onVerDetalle,
}) {
  const {
    mes,
    anio,
    fechaHora,
    dateTime,
  } = obtenerPartesFecha(
    aportacion.fecha_subida,
  )

  const informacionEstado =
    INFORMACION_ESTADOS[
      aportacion.estado
    ] ?? {
      texto:
        'Estado no disponible',

      clase:
        'student-contribution-status--pending',

      Icono: Info,
    }

  const {
    Icono: IconoEstado,
  } = informacionEstado

  return (
    <article className="student-contribution-card">
      {/* Fecha real en que se envió el comprobante. */}
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

      {/* Los meses aparecen solamente después de aprobar. */}
      <strong className="student-contribution-amount">
        {
          obtenerTextoMesesAprobados(
            aportacion,
          )
        }
      </strong>

      <div className="student-contribution-reference">
        <small>
          Número de referencia
        </small>

        <strong
          title={
            aportacion
              .num_referencia
          }
        >
          {
            aportacion
              .num_referencia
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
          `Ver detalle de la aportación con referencia ${aportacion.num_referencia}`
        }
        title="Ver detalle"
        onClick={() =>
          onVerDetalle(
            aportacion.id,
          )
        }
      >
        <Eye aria-hidden="true" />
      </button>
    </article>
  )
}

/* =========================================================
 * COMPONENTE PRINCIPAL
 * ======================================================= */

function Contributions() {
  const navigate =
    useNavigate()

  const [
    parametrosBusqueda,
    setParametrosBusqueda,
  ] = useSearchParams()

  const {
    usuario,
    cargarUsuario,
  } = useUsuario()

  const vistaSolicitada =
    parametrosBusqueda.get(
      'vista',
    )

  const [
    vistaActiva,
    setVistaActiva,
  ] = useState(
    () =>
      normalizarVista(
        vistaSolicitada,
      ),
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
  ] = useState(
    FILTRO_TODOS,
  )

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState(
    FILTRO_TODOS,
  )

  const [
    formulario,
    setFormulario,
  ] = useState(
    crearFormularioInicial,
  )

  const [
    erroresFormulario,
    setErroresFormulario,
  ] = useState(
    crearErroresIniciales,
  )

  const [
    errorGeneral,
    setErrorGeneral,
  ] = useState('')

  const [
    enviando,
    setEnviando,
  ] = useState(false)

  /*
   * Carga el historial desde localStorage o desde
   * GET /becario/aportaciones.
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

  useEffect(() => {
    cargarUsuario()
      .catch(() => undefined)
  }, [
    cargarUsuario,
    intentoCarga,
  ])

  /*
   * Mantiene sincronizada la pestaña con la URL.
   */
  useEffect(() => {
    setVistaActiva(
      normalizarVista(
        vistaSolicitada,
      ),
    )
  }, [vistaSolicitada])

  /*
   * Vuelve a consultar cuando el usuario regresa a la
   * pestaña o el administrador modifica localStorage
   * desde otra pestaña del navegador.
   */
  useEffect(() => {
    function actualizarAlEnfocar() {
      setIntentoCarga(
        (intentoActual) =>
          intentoActual + 1,
      )
    }

    function actualizarPorAlmacenamiento(
      evento,
    ) {
      if (
        evento.key ===
          CLAVE_APORTACIONES_COMPARTIDAS ||
        evento.key === null
      ) {
        setIntentoCarga(
          (intentoActual) =>
            intentoActual + 1,
        )
      }
    }

    window.addEventListener(
      'focus',
      actualizarAlEnfocar,
    )

    window.addEventListener(
      'storage',
      actualizarPorAlmacenamiento,
    )

    return () => {
      window.removeEventListener(
        'focus',
        actualizarAlEnfocar,
      )

      window.removeEventListener(
        'storage',
        actualizarPorAlmacenamiento,
      )
    }
  }, [])

  /*
   * Cambia la vista y actualiza el parámetro
   * correspondiente de la URL.
   */
  function cambiarVista(
    nuevaVista,
  ) {
    const vista =
      normalizarVista(
        nuevaVista,
      )

    const nuevosParametros =
      new URLSearchParams(
        parametrosBusqueda,
      )

    if (
      vista ===
      VISTAS.HISTORIAL
    ) {
      nuevosParametros.delete(
        'vista',
      )
    } else {
      nuevosParametros.set(
        'vista',
        VISTAS.ENVIAR,
      )
    }

    setParametrosBusqueda(
      nuevosParametros,
      {
        replace: true,
      },
    )

    setVistaActiva(vista)
  }

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  /*
   * Obtiene los años disponibles desde fecha_subida.
   */
  const aniosDisponibles =
    useMemo(() => {
      const anios =
        aportaciones
          .map(
            (aportacion) =>
              obtenerAnioFecha(
                aportacion
                  .fecha_subida,
              ),
          )
          .filter(
            (anio) =>
              Number.isInteger(anio),
          )

      return [
        ...new Set(anios),
      ].sort(
        (primerAnio, segundoAnio) =>
          segundoAnio - primerAnio,
      )
    }, [aportaciones])

  const hayFiltrosActivos =
    filtroAnio !==
      FILTRO_TODOS ||
    filtroEstado !==
      FILTRO_TODOS

  /*
   * Filtra por año de envío y estado.
   */
  const aportacionesFiltradas =
    useMemo(() => {
      return aportaciones.filter(
        (aportacion) => {
          const anio =
            obtenerAnioFecha(
              aportacion
                .fecha_subida,
            )

          const coincideAnio =
            filtroAnio ===
              FILTRO_TODOS ||
            String(anio) ===
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

  function limpiarFiltros() {
    setFiltroAnio(
      FILTRO_TODOS,
    )

    setFiltroEstado(
      FILTRO_TODOS,
    )
  }

  /*
   * Calcula el saldo visual desde los datos
   * generales del becario.
   */
  const resumenDeuda =
    useMemo(() => {
      const mesesSinPagar =
        usuario
          ?.datosBecario
          ?.mesesSinPagar ??
        usuario
          ?.datos_becario
          ?.meses_sin_pagar

      try {
        return {
          ...calcularResumenDeuda(
            mesesSinPagar,
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
    }, [usuario])

  const textoCantidadPendiente =
    resumenDeuda
      .mesesPendientes === 1
      ? '1 mes pendiente'
      : `${resumenDeuda.mesesPendientes} meses pendientes`

  /*
   * Actualiza los campos de texto.
   */
  function manejarCambioCampo(
    evento,
  ) {
    const {
      name,
      value,
    } = evento.target

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [name]: value,
      }),
    )

    setErroresFormulario(
      (erroresActuales) => ({
        ...erroresActuales,
        [name]: '',
      }),
    )

    setErrorGeneral('')
  }

  function seleccionarArchivo(
    archivo,
  ) {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        archivo,
      }),
    )

    setErrorGeneral('')
  }

  function establecerErrorArchivo(
    mensaje,
  ) {
    setErroresFormulario(
      (erroresActuales) => ({
        ...erroresActuales,
        archivo: mensaje,
      }),
    )
  }

  function quitarArchivo() {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        archivo: null,
      }),
    )

    establecerErrorArchivo('')
  }

  /*
   * Limpia el formulario y regresa al historial.
   */
  function cancelarFormulario() {
    if (enviando) {
      return
    }

    setFormulario(
      crearFormularioInicial(),
    )

    setErroresFormulario(
      crearErroresIniciales(),
    )

    setErrorGeneral('')

    cambiarVista(
      VISTAS.HISTORIAL,
    )
  }

  /*
   * Valida los tres únicos campos aceptados
   * por POST /aportaciones.
   */
  function validarFormulario() {
    const nuevosErrores =
      crearErroresIniciales()

    const numeroReferencia =
      prepararTexto(
        formulario
          .numeroReferencia,
      )

    const descripcion =
      prepararTexto(
        formulario.descripcion,
      )

    if (!numeroReferencia) {
      nuevosErrores
        .numeroReferencia =
        'Ingresa el número de referencia.'
    }

    if (!descripcion) {
      nuevosErrores.descripcion =
        'Escribe una descripción para la aportación.'
    }

    try {
      validarComprobantePdf(
        formulario.archivo,
      )
    } catch (error) {
      nuevosErrores.archivo =
        error instanceof Error
          ? error.message
          : 'Selecciona un comprobante PDF válido.'
    }

    setErroresFormulario(
      nuevosErrores,
    )

    return (
      !nuevosErrores
        .numeroReferencia &&
      !nuevosErrores.descripcion &&
      !nuevosErrores.archivo
    )
  }

  /*
   * Envía exclusivamente:
   *
   * - num_referencia
   * - descripcion
   * - archivo_pdf
   */
  async function enviarAportacion(
    evento,
  ) {
    evento.preventDefault()

    if (
      enviando ||
      !validarFormulario()
    ) {
      return
    }

    setEnviando(true)
    setErrorGeneral('')

    try {
      const nuevaAportacion =
        await registrarAportacionEstudiante({
          numeroReferencia:
            formulario
              .numeroReferencia,

          descripcion:
            formulario.descripcion,

          archivo:
            formulario.archivo,
        })

      setAportaciones(
        (historialActual) => [
          nuevaAportacion,

          ...historialActual.filter(
            (aportacion) =>
              aportacion.id !==
              nuevaAportacion.id,
          ),
        ],
      )

      setFormulario(
        crearFormularioInicial(),
      )

      setErroresFormulario(
        crearErroresIniciales(),
      )

      cambiarVista(
        VISTAS.HISTORIAL,
      )

      notificarExito({
        titulo:
          'Comprobante enviado',

        descripcion:
          'La aportación quedó pendiente de revisión por ASEBEP.',

        id:
          'aportacion-enviada',
      })
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No fue posible enviar el comprobante.'

      setErrorGeneral(mensaje)

      notificarError({
        titulo:
          'No se pudo enviar el comprobante',

        descripcion: mensaje,

        id:
          'error-aportacion-enviada',
      })
    } finally {
      setEnviando(false)
    }
  }

  function abrirDetalle(
    aportacionId,
  ) {
    navigate(
      `/aportaciones/${aportacionId}`,
    )
  }

  return (
    <div className="app-layout">
      {/* Navegación lateral de escritorio. */}
      <AppSidebar />

      <section className="app-content">
        {/* Barra superior del portal estudiantil. */}
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
          {/* Presentación principal del módulo. */}
          <header className="student-contributions-heading">
            <p>
              Gestión de aportaciones
            </p>

            <h1>Aportaciones</h1>

            <span>
              Envía tu comprobante en
              formato PDF y consulta el
              estado de revisión de cada
              aportación.
            </span>
          </header>

          {/* Resumen informativo del saldo pendiente. */}
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
                    : `Tu cuenta registra ${textoCantidadPendiente}.`
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
                  {
                    formatearMoneda(
                      CUOTA_MENSUAL_APORTACION,
                    )
                  }
                </small>
              )}
            </div>
          </section>

          <section className="student-contributions-panel">
            {/* Navegación interna con solo dos opciones. */}
            <div
              className="student-contributions-tabs student-contributions-tabs--two"
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
                id="tab-aportaciones-enviar"
                className={
                  vistaActiva ===
                  VISTAS.ENVIAR
                    ? 'student-contributions-tab student-contributions-tab--active'
                    : 'student-contributions-tab'
                }
                type="button"
                role="tab"
                aria-selected={
                  vistaActiva ===
                  VISTAS.ENVIAR
                }
                aria-controls="panel-aportaciones"
                onClick={() =>
                  cambiarVista(
                    VISTAS.ENVIAR,
                  )
                }
              >
                Enviar aportación
              </button>
            </div>

            <div
              key={vistaActiva}
              id="panel-aportaciones"
              className="student-contributions-view"
              role="tabpanel"
              aria-labelledby={
                vistaActiva ===
                VISTAS.HISTORIAL
                  ? 'tab-aportaciones-historial'
                  : 'tab-aportaciones-enviar'
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
                          value={filtroAnio}
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
                                .PENDIENTE
                            }
                          >
                            Pendientes
                          </option>

                          <option
                            value={
                              ESTADOS_APORTACION
                                .APROBADO
                            }
                          >
                            Aprobadas
                          </option>

                          <option
                            value={
                              ESTADOS_APORTACION
                                .RECHAZADO
                            }
                          >
                            Rechazadas
                          </option>
                        </select>

                        <ChevronDown
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <button
                      className="student-contributions-clear"
                      type="button"
                      disabled={
                        !hayFiltrosActivos
                      }
                      onClick={
                        limpiarFiltros
                      }
                    >
                      <RotateCcw
                        aria-hidden="true"
                      />

                      Limpiar filtros
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

                            {
                              aportacionesFiltradas.length ===
                              1
                                ? 'registro'
                                : 'registros'
                            }
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
                VISTAS.ENVIAR && (
                <section className="student-contributions-form-view">
                  <div className="student-contributions-form-layout">
                    <div className="student-contributions-form-column">
                      <header className="student-contributions-form-heading">
                        <h2>
                          Enviar aportación
                        </h2>

                        <p>
                          Completa los datos
                          definidos y adjunta el comprobante
                          en formato PDF.
                        </p>
                      </header>

                      <form
                        className="student-contributions-form"
                        noValidate
                        onSubmit={
                          enviarAportacion
                        }
                      >
                        <div className="student-contributions-form-grid">
                          <div
                            className={
                              erroresFormulario
                                .numeroReferencia
                                ? 'student-contributions-field student-contributions-field--full student-contributions-field--invalid'
                                : 'student-contributions-field student-contributions-field--full'
                            }
                          >
                            <label htmlFor="numero-referencia-aportacion">
                              Número de referencia
                            </label>

                            <input
                              id="numero-referencia-aportacion"
                              name="numeroReferencia"
                              type="text"
                              value={
                                formulario
                                  .numeroReferencia
                              }
                              disabled={enviando}
                              autoComplete="off"
                              aria-invalid={
                                Boolean(
                                  erroresFormulario
                                    .numeroReferencia,
                                )
                              }
                              aria-describedby={
                                erroresFormulario
                                  .numeroReferencia
                                  ? 'error-numero-referencia-aportacion'
                                  : 'ayuda-numero-referencia-aportacion'
                              }
                              placeholder="Ejemplo: AP-2026-0004"
                              onChange={
                                manejarCambioCampo
                              }
                            />

                            {erroresFormulario
                              .numeroReferencia ? (
                              <p
                                id="error-numero-referencia-aportacion"
                                className="student-contributions-field__error"
                                role="alert"
                              >
                                <CircleAlert
                                  aria-hidden="true"
                                />

                                <span>
                                  {
                                    erroresFormulario
                                      .numeroReferencia
                                  }
                                </span>
                              </p>
                            ) : (
                              <p
                                id="ayuda-numero-referencia-aportacion"
                                className="student-contributions-field__help"
                              >
                                Debe coincidir con
                                la referencia visible
                                en el comprobante.
                              </p>
                            )}
                          </div>

                          <div
                            className={
                              erroresFormulario
                                .descripcion
                                ? 'student-contributions-field student-contributions-field--full student-contributions-field--invalid'
                                : 'student-contributions-field student-contributions-field--full'
                            }
                          >
                            <label htmlFor="descripcion-aportacion">
                              Descripción
                            </label>

                            <textarea
                              id="descripcion-aportacion"
                              className="student-contributions-textarea"
                              name="descripcion"
                              rows="5"
                              value={
                                formulario
                                  .descripcion
                              }
                              disabled={enviando}
                              aria-invalid={
                                Boolean(
                                  erroresFormulario
                                    .descripcion,
                                )
                              }
                              aria-describedby={
                                erroresFormulario
                                  .descripcion
                                  ? 'error-descripcion-aportacion'
                                  : 'ayuda-descripcion-aportacion'
                              }
                              placeholder="Describe brevemente a qué corresponde el comprobante."
                              onChange={
                                manejarCambioCampo
                              }
                            />

                            {erroresFormulario
                              .descripcion ? (
                              <p
                                id="error-descripcion-aportacion"
                                className="student-contributions-field__error"
                                role="alert"
                              >
                                <CircleAlert
                                  aria-hidden="true"
                                />

                                <span>
                                  {
                                    erroresFormulario
                                      .descripcion
                                  }
                                </span>
                              </p>
                            ) : (
                              <p
                                id="ayuda-descripcion-aportacion"
                                className="student-contributions-field__help"
                              >
                                No es necesario indicar
                                la cantidad de meses pagados;
                                el administrador lo
                                establecera conforme al monto que aparezca
                                en el comprobante.
                              </p>
                            )}
                          </div>

                          <div className="student-contributions-field--full">
                            <SelectorComprobantePdf
                              archivo={
                                formulario.archivo
                              }
                              error={
                                erroresFormulario
                                  .archivo
                              }
                              deshabilitado={
                                enviando
                              }
                              onSeleccionar={
                                seleccionarArchivo
                              }
                              onQuitar={
                                quitarArchivo
                              }
                              onError={
                                establecerErrorArchivo
                              }
                            />
                          </div>
                        </div>

                        {errorGeneral && (
                          <div
                            className="student-contributions-form-error"
                            role="alert"
                          >
                            <CircleAlert
                              aria-hidden="true"
                            />

                            <span>
                              {errorGeneral}
                            </span>
                          </div>
                        )}

                        <div className="student-contributions-form-actions">
                          <button
                            className="student-contributions-button student-contributions-button--secondary"
                            type="button"
                            disabled={enviando}
                            onClick={
                              cancelarFormulario
                            }
                          >
                            Cancelar
                          </button>

                          <button
                            className="student-contributions-button student-contributions-button--primary"
                            type="submit"
                            disabled={enviando}
                          >
                            {enviando ? (
                              <Clock3
                                aria-hidden="true"
                              />
                            ) : (
                              <Send
                                aria-hidden="true"
                              />
                            )}

                            {enviando
                              ? 'Enviando...'
                              : 'Enviar aportación'}
                          </button>
                        </div>

                        <p className="student-contributions-submit-note">
                          La aportación quedará
                          pendiente hasta que un
                          administrador la revise.
                        </p>
                      </form>
                    </div>

                    <InformacionAntesDeEnviar />
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