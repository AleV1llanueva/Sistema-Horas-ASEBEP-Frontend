import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock3,
  GraduationCap,
  Info,
  RotateCcw,
  Send,
  WalletCards,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router'

import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'

import {
  ESTADOS_APORTACION,
  obtenerAportacionEstudiante,
} from '../services/estudianteAportacionesService.js'

import '../styles/AppLayout.css'
import '../styles/ContributionDetail.css'

/* CONFIGURACIÓN GENERAL */
/*
 * Permite actualizar el detalle cuando el administrador
 * revisa una aportación desde otra pestaña del navegador.
 */
const CLAVE_APORTACIONES_COMPARTIDAS =
  'asebep_aportaciones_simuladas_v1'

const INFORMACION_ESTADOS =
  Object.freeze({
    [
      ESTADOS_APORTACION.PENDIENTE
    ]: {
      texto: 'Pendiente',

      claseEstado: 'contribution-detail-status--pending',
      claseValor: 'contribution-detail-data__value--pending',
      claseAviso: 'contribution-detail-notice--pending',
      tituloAviso: 'Comprobante recibido',
      mensajeAviso: 'La aportación se encuentra pendiente de revisión. Los meses se acreditarán únicamente si el administrador la aprueba.',
      IconoEstado: Clock3,
      IconoAviso: Info,
    },

    [
      ESTADOS_APORTACION.APROBADO
    ]: {
      texto: 'Aprobada',
      claseEstado: 'contribution-detail-status--approved',
      claseValor: 'contribution-detail-data__value--approved',
      claseAviso: 'contribution-detail-notice--approved',
      tituloAviso: 'Aportación aprobada',
      mensajeAviso: 'El comprobante fue revisado y los meses aprobados quedaron acreditados en tu cuenta.',
      IconoEstado: CircleCheck,
      IconoAviso: CircleCheck,
    },

    [
      ESTADOS_APORTACION.RECHAZADO
    ]: {
      texto: 'Rechazada',
      claseEstado: 'contribution-detail-status--correction',
      claseValor: 'contribution-detail-data__value--correction',
      claseAviso: 'contribution-detail-notice--correction',
      tituloAviso: 'Aportación rechazada',
      mensajeAviso: 'Este comprobante no fue aprobado. Para realizar otro intento debes registrar una aportación nueva.',
      IconoEstado: CircleAlert,
      IconoAviso: CircleAlert,
    },
  })

/*
 * Configuración de respaldo.
 *
 * Normalmente no se utiliza porque el servicio valida
 * todos los estados recibidos desde el backend.
 */
const ESTADO_NO_DISPONIBLE =
  Object.freeze({
    texto: 'Estado no disponible',
    claseEstado: 'contribution-detail-status--pending',
    claseValor: 'contribution-detail-data__value--pending',
    claseAviso: 'contribution-detail-notice--pending',
    tituloAviso: 'Estado no disponible',
    mensajeAviso: 'Todavía no existe información disponible sobre la revisión del comprobante.',
    IconoEstado: Info,
    IconoAviso: Info,
  })

// FUNCIONES GENERALES
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
 * Convierte fecha_subida al formato utilizado
 * en el portal del estudiante.
 */
function formatearFechaSubida(valor) {
  const fecha =
    new Date(valor)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      dateStyle: 'long',
      timeStyle: 'short',
    },
  ).format(fecha)
}

/*
 * Muestra los meses según el estado de revisión.
 * Una aportación pendiente o rechazada no acredita meses.
 */
function obtenerTextoMesesAprobados(
  aportacion,
) {
  if (
    aportacion.estado ===
    ESTADOS_APORTACION.PENDIENTE
  ) {
    return 'Pendiente de revisión'
  }

  if (
    aportacion.estado ===
    ESTADOS_APORTACION.RECHAZADO
  ) {
    return '0 meses acreditados'
  }

  const meses =
    Number(
      aportacion.meses_aprobados,
    )

  if (
    !Number.isInteger(meses) ||
    meses <= 0
  ) {
    return 'Sin meses acreditados'
  }

  return (
    meses === 1
      ? '1 mes acreditado'
      : `${meses} meses acreditados`
  )
}

/*
 * Construye exclusivamente los campos disponibles
 * dentro de AportacionResponse.
 */
function construirDatosDetalle({
  aportacion,
  informacionEstado,
}) {
  return [
    {
      etiqueta:
        'Número de referencia',

      valor:
        prepararTexto(
          aportacion
            .num_referencia,
        ) ||
        'No disponible',
    },

    {
      etiqueta: 'Descripción',

      valor:
        prepararTexto(
          aportacion.descripcion,
        ) ||
        'Sin descripción',
    },

    {
      etiqueta: 'Fecha de envío',

      valor:
        formatearFechaSubida(
          aportacion
            .fecha_subida,
        ),
    },

    {
      etiqueta: 'Número de cuenta',

      valor:
        prepararTexto(
          aportacion.num_cuenta,
        ) ||
        'No disponible',
    },

    {
      etiqueta: 'Estado',

      valor:
        informacionEstado.texto,

      claseValor:
        informacionEstado
          .claseValor,
    },

    {
      etiqueta:
        'Meses aprobados',

      valor:
        obtenerTextoMesesAprobados(
          aportacion,
        ),

      claseValor:
        informacionEstado
          .claseValor,
    },
  ]
}

// COMPONENTE PRINCIPAL
function ContributionDetail() {
  const {
    aportacionId,
  } = useParams()

  const [
    aportacion,
    setAportacion,
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

  /*
   * Obtiene una aportación perteneciente exclusivamente
   * al estudiante autenticado.
   */
  useEffect(() => {
    let componenteActivo = true

    async function cargarAportacion() {
      setCargando(true)
      setErrorCarga('')
      setAportacion(null)

      try {
        const resultado =
          await obtenerAportacionEstudiante(
            aportacionId,
          )

        if (!componenteActivo) {
          return
        }

        setAportacion(
          resultado ?? null,
        )
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible consultar la aportación.',
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarAportacion()

    return () => {
      componenteActivo = false
    }
  }, [
    aportacionId,
    intentoCarga,
  ])

  /*
   * Actualiza la aportación cuando el estudiante vuelve
   * a la pestaña o el administrador modifica localStorage.
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

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  const informacionEstado =
    aportacion
      ? INFORMACION_ESTADOS[
          aportacion.estado
        ] ??
        ESTADO_NO_DISPONIBLE
      : ESTADO_NO_DISPONIBLE

  const datosDetalle =
    aportacion
      ? construirDatosDetalle({
          aportacion,
          informacionEstado,
        })
      : []

  const aportacionRechazada =
    aportacion?.estado ===
    ESTADOS_APORTACION.RECHAZADO

  const {
    IconoEstado,
    IconoAviso,
  } = informacionEstado

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

        <main className="contribution-detail-main">
          {/* Regreso al historial. */}
          <Link
            className="contribution-detail-back"
            to="/aportaciones"
          >
            <ArrowLeft
              aria-hidden="true"
            />

            Volver a aportaciones
          </Link>

          {/* Estado de carga. */}
          {cargando && (
            <section
              className="contribution-detail-state"
              role="status"
              aria-live="polite"
            >
              <Clock3
                aria-hidden="true"
              />

              <h1>
                Cargando aportación
              </h1>

              <p>
                Estamos consultando la
                información del comprobante.
              </p>
            </section>
          )}

          {/* Error de comunicación o validación. */}
          {!cargando &&
            errorCarga && (
              <section
                className="contribution-detail-state contribution-detail-state--error"
                role="alert"
              >
                <CircleAlert
                  aria-hidden="true"
                />

                <h1>
                  No fue posible cargar
                  la aportación
                </h1>

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
              </section>
            )}

          {/* Registro inexistente o perteneciente a otra cuenta. */}
          {!cargando &&
            !errorCarga &&
            !aportacion && (
              <section className="contribution-detail-state">
                <WalletCards
                  aria-hidden="true"
                />

                <h1>
                  Aportación no encontrada
                </h1>

                <p>
                  El comprobante solicitado
                  no existe o no pertenece
                  a tu cuenta.
                </p>

                <Link to="/aportaciones">
                  <ArrowLeft
                    aria-hidden="true"
                  />

                  Volver al historial
                </Link>
              </section>
            )}

          {/* Detalle completo de la aportación. */}
          {!cargando &&
            !errorCarga &&
            aportacion && (
              <>
                <header className="contribution-detail-heading">
                  <p>
                    Gestión de aportaciones
                  </p>

                  <h1>
                    Detalle de aportación
                  </h1>

                  <span>
                    Consulta la información
                    enviada y el resultado de
                    la revisión realizada por
                    ASEBEP.
                  </span>
                </header>

                <article className="contribution-detail-card">
                  {/* Referencia y estado principal. */}
                  <header className="contribution-detail-card__header">
                    <h2>
                      Aportación{' '}
                      {
                        aportacion
                          .num_referencia
                      }
                    </h2>

                    <span
                      className={
                        `contribution-detail-status ${informacionEstado.claseEstado}`
                      }
                    >
                      <IconoEstado
                        aria-hidden="true"
                      />

                      {
                        informacionEstado
                          .texto
                      }
                    </span>
                  </header>

                  {/* Campos exactos del contrato. */}
                  <dl className="contribution-detail-data">
                    {datosDetalle.map(
                      (dato) => (
                        <div
                          className="contribution-detail-data__item"
                          key={dato.etiqueta}
                        >
                          <dt>
                            {dato.etiqueta}
                          </dt>

                          <dd
                            className={
                              dato.claseValor ||
                              undefined
                            }
                          >
                            {dato.valor}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>

                  <section className="contribution-detail-review">
                    {/* Mensaje correspondiente al estado. */}
                    <aside
                      className={
                        `contribution-detail-notice ${informacionEstado.claseAviso}`
                      }
                    >
                      <IconoAviso
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {
                            informacionEstado
                              .tituloAviso
                          }
                        </strong>

                        <p>
                          {
                            informacionEstado
                              .mensajeAviso
                          }
                        </p>
                      </div>
                    </aside>
                  </section>

                  {/* Acciones permitidas para el estudiante. */}
                  <footer className="contribution-detail-actions">
                    <Link
                      className="contribution-detail-button contribution-detail-button--secondary"
                      to="/aportaciones"
                    >
                      <ArrowLeft
                        aria-hidden="true"
                      />

                      Volver al historial
                    </Link>

                    {aportacionRechazada && (
                      <Link
                        className="contribution-detail-button contribution-detail-button--correction"
                        to="/aportaciones?vista=enviar"
                      >
                        <Send
                          aria-hidden="true"
                        />

                        Enviar nueva aportación
                      </Link>
                    )}
                  </footer>
                </article>
              </>
            )}
        </main>

        <MobileNavigation />
      </section>
    </div>
  )
}

export default ContributionDetail