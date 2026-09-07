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
  useMemo,
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
  TIPOS_APORTACION,
} from '../services/estudianteAportacionesService.js'
import '../styles/AppLayout.css'
import '../styles/ContributionDetail.css'

/* Nombres utilizados para mostrar el periodo individual. */
const MESES = Object.freeze([
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
])

/*
 * Configuración visual y textual de cada estado.
 *
 * Los mensajes cambian automáticamente según el resultado
 * de la revisión realizada por ASEBEP.
 */
const INFORMACION_ESTADOS =
  Object.freeze({
    [
      ESTADOS_APORTACION
        .PENDIENTE_APROBACION
    ]: {
      texto: 'Pendiente de aprobación',

      claseEstado:
        'contribution-detail-status--pending',

      claseValor:
        'contribution-detail-data__value--pending',

      claseAviso:
        'contribution-detail-notice--pending',

      tituloAviso:
        'Comprobante recibido',

      mensajeAviso:
        'La revisión puede tomar un par de días.',

      observacionPredeterminada:
        'Tu aportación fue recibida correctamente y se encuentra en proceso de revisión.',

      IconoEstado: Clock3,
      IconoAviso: Info,
    },

    [
      ESTADOS_APORTACION.APROBADA
    ]: {
      texto: 'Aprobada',

      claseEstado:
        'contribution-detail-status--approved',

      claseValor:
        'contribution-detail-data__value--approved',

      claseAviso:
        'contribution-detail-notice--approved',

      tituloAviso:
        'Aportación aprobada',

      mensajeAviso:
        'Tu comprobante fue revisado y la aportación quedó registrada correctamente.',

      observacionPredeterminada:
        'El comprobante fue revisado y la aportación quedó aprobada.',

      IconoEstado: CircleCheck,
      IconoAviso: CircleCheck,
    },

    [
      ESTADOS_APORTACION
        .REQUIERE_CORRECCION
    ]: {
      texto: 'Requiere corrección',

      claseEstado:
        'contribution-detail-status--correction',

      claseValor:
        'contribution-detail-data__value--correction',

      claseAviso:
        'contribution-detail-notice--correction',

      tituloAviso:
        'Debes enviar un comprobante nuevo',

      mensajeAviso:
        'Corrige lo indicado por ASEBEP y envía un comprobante nuevo. El registro anterior permanecerá en tu historial.',

      observacionPredeterminada:
        'El comprobante necesita una corrección antes de poder ser aprobado.',

      IconoEstado: CircleAlert,
      IconoAviso: CircleAlert,
    },
  })

/*
 * Configuración de respaldo.
 *
 * Normalmente no se utilizará porque el servicio solamente
 * entrega estados reconocidos por el módulo.
 */
const ESTADO_NO_DISPONIBLE =
  Object.freeze({
    texto: 'Estado no disponible',

    claseEstado:
      'contribution-detail-status--pending',

    claseValor:
      'contribution-detail-data__value--pending',

    claseAviso:
      'contribution-detail-notice--pending',

    tituloAviso:
      'Estado pendiente de actualización',

    mensajeAviso:
      'Todavía no existe información disponible sobre la revisión del comprobante.',

    observacionPredeterminada:
      'No hay observaciones disponibles.',

    IconoEstado: Info,
    IconoAviso: Info,
  })

// Convierte un monto al formato utilizado por el portal.
function formatearMoneda(
  valor,
) {
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
 * Convierte una fecha YYYY-MM-DD sin desplazarla
 * por diferencias de zona horaria.
 */
function formatearFechaPago(
  fecha,
) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha,
    )
  ) {
    return 'Fecha no disponible'
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha
    .split('-')
    .map(Number)

  const fechaLocal =
    new Date(
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
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(fechaLocal)
}

/*
 * Convierte el instante del envío a la fecha y hora
 * local del dispositivo del estudiante.
 */
function formatearFechaEnvio(
  fechaEnvio,
) {
  const fecha =
    new Date(fechaEnvio)

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return 'Fecha no disponible'
  }

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

  return (
    `${fechaFormateada} · ` +
    `${horaFormateada}`
  )
}

// Obtiene el nombre del mes asociado con un pago individual.
function obtenerNombreMes(
  numeroMes,
) {
  const indice =
    Number(numeroMes) - 1

  return (
    MESES[indice] ||
    'Mes no disponible'
  )
}

// Agrega la forma singular o plural correspondiente.
function obtenerTextoCantidadMeses(
  cantidad,
) {
  const numero =
    Number(cantidad)

  if (
    !Number.isInteger(numero) ||
    numero < 1
  ) {
    return 'Cantidad no disponible'
  }

  return (
    `${numero} ${
      numero === 1
        ? 'mes'
        : 'meses'
    }`
  )
}

/*
 * Construye el título interno de la tarjeta.
 *
 * Los pagos individuales muestran el periodo elegido.
 * Los pagos múltiples muestran la cantidad total de meses.
 */
function obtenerTituloAportacion(
  aportacion,
) {
  if (
    aportacion.tipo ===
    TIPOS_APORTACION
      .VARIOS_MESES
  ) {
    return (
      `Aportación de ${
        obtenerTextoCantidadMeses(
          aportacion.cantidadMeses,
        )
      }`
    )
  }

  const nombreMes =
    obtenerNombreMes(
      aportacion.mesAportacion,
    )

  const anio =
    aportacion.anioAportacion ||
    'Año no disponible'

  return (
    `Aportación de ${
      nombreMes.toLocaleLowerCase(
        'es',
      )
    } ${anio}`
  )
}

/*
 * Prepara los campos que se mostrarán en la cuadrícula.
 *
 * El comienzo cambia dependiendo de si el comprobante
 * corresponde a un mes o a varios meses.
 */
function construirDatosDetalle({
  aportacion,
  informacionEstado,
}) {
  const esPagoMultiple =
    aportacion.tipo ===
    TIPOS_APORTACION
      .VARIOS_MESES

  const datosPeriodo =
    esPagoMultiple
      ? [
          {
            etiqueta:
              'Tipo de aportación',
            valor:
              'Pago de varios meses',
          },

          {
            etiqueta:
              'Cantidad de meses pagados',
            valor:
              obtenerTextoCantidadMeses(
                aportacion
                  .cantidadMeses,
              ),
          },
        ]
      : [
          {
            etiqueta:
              'Mes de aportación',
            valor:
              obtenerNombreMes(
                aportacion
                  .mesAportacion,
              ),
          },

          {
            etiqueta: 'Año',
            valor:
              aportacion
                .anioAportacion ||
              'No disponible',
          },
        ]

  return [
    ...datosPeriodo,

    {
      etiqueta: 'Monto pagado',
      valor:
        formatearMoneda(
          aportacion.monto,
        ),
    },

    {
      etiqueta: 'Fecha de pago',
      valor:
        formatearFechaPago(
          aportacion.fechaPago,
        ),
    },

    {
      etiqueta:
        'Número de referencia',

      valor:
        aportacion
          .numeroReferencia ||
        'No disponible',
    },

    {
      etiqueta: 'Fecha de envío',
      valor:
        formatearFechaEnvio(
          aportacion.fechaEnvio,
        ),
    },

    {
      etiqueta: 'Número de cuenta',
      valor:
        aportacion.numeroCuenta ||
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
  ]
}

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

  /*
   * Incrementar este valor repite la consulta
   * cuando el estudiante presiona reintentar.
   */
  const [
    intentoCarga,
    setIntentoCarga,
  ] = useState(0)

  /*
   * Busca únicamente una aportación perteneciente
   * a la cuenta autenticada.
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

        /*
         * Un valor null representa un identificador válido
         * que no pertenece al historial del estudiante.
         */
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

  const informacionEstado =
    aportacion
      ? INFORMACION_ESTADOS[
          aportacion.estado
        ] ??
        ESTADO_NO_DISPONIBLE
      : ESTADO_NO_DISPONIBLE

  const tituloAportacion =
    useMemo(
      () =>
        aportacion
          ? obtenerTituloAportacion(
              aportacion,
            )
          : '',
      [aportacion],
    )

  const datosDetalle =
    useMemo(
      () =>
        aportacion
          ? construirDatosDetalle({
              aportacion,
              informacionEstado,
            })
          : [],
      [
        aportacion,
        informacionEstado,
      ],
    )

  /*
   * Si requiere corrección, la nueva aportación abre
   * el formulario apropiado según el tipo original.
   *
   * El registro anterior no se modifica ni se elimina.
   */
  const vistaFormularioCorreccion =
    aportacion?.tipo ===
    TIPOS_APORTACION
      .VARIOS_MESES
      ? TIPOS_APORTACION
          .VARIOS_MESES
      : TIPOS_APORTACION.UN_MES

  function reintentarCarga() {
    setIntentoCarga(
      (intentoActual) =>
        intentoActual + 1,
    )
  }

  const mostrarCorreccion =
    aportacion?.estado ===
    ESTADOS_APORTACION
      .REQUIERE_CORRECCION

  const {
    IconoEstado,
    IconoAviso,
  } = informacionEstado

  return (
    <div className="app-layout">
      {/* Navegación lateral de escritorio. */}
      <AppSidebar />

      <section className="app-content">
        {/* Barra superior del portal personal. */}
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
          {/* Ruta de navegación hacia el historial. */}
          <Link
            className="contribution-detail-back"
            to="/aportaciones"
            >
                <ArrowLeft aria-hidden="true" />
                Volver a aportaciones
            </Link>

          {/* Estado mostrado mientras se consulta el servicio. */}
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

          {/* Estado mostrado si la consulta falla. */}
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

          {/*
           * El servicio devuelve null si el identificador
           * no pertenece a la cuenta autenticada.
           */}
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

          {/* Contenido completo del comprobante encontrado. */}
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
                    registrada y el estado de
                    revisión de tu comprobante.
                  </span>
                </header>

                <article className="contribution-detail-card">
                  {/* Título y estado principal. */}
                  <header className="contribution-detail-card__header">
                    <h2>
                      {tituloAportacion}
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

                  {/* Información registrada por el estudiante. */}
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
                              dato.claseValor
                            }
                          >
                            {dato.valor}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>

                  {/* Observaciones y mensaje correspondiente al estado. */}
                  <section className="contribution-detail-review">
                    <div className="contribution-detail-observations">
                      <h3>
                        <Info
                          aria-hidden="true"
                        />

                        Observaciones de ASEBEP
                      </h3>

                      <p>
                        {aportacion
                          .observacionAsebep ||
                          informacionEstado
                            .observacionPredeterminada}
                      </p>
                    </div>

                    <div
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
                    </div>
                  </section>

                  {/* Acciones disponibles según el estado. */}
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

                    {mostrarCorreccion ? (
                      <Link
                        className="contribution-detail-button contribution-detail-button--correction"
                        to={
                          `/aportaciones?vista=${
                            encodeURIComponent(
                              vistaFormularioCorreccion,
                            )
                          }`
                        }
                      >
                        <Send
                          aria-hidden="true"
                        />

                        Enviar comprobante nuevo
                      </Link>
                    ) : (
                      <Link
                        className="contribution-detail-button contribution-detail-button--primary"
                        to="/aportaciones"
                      >
                        <CircleCheck
                          aria-hidden="true"
                        />

                        Entendido
                      </Link>
                    )}
                  </footer>
                </article>
              </>
            )}
        </main>

        {/* Navegación y menú de perfil para móvil. */}
        <MobileNavigation />
      </section>
    </div>
  )
}

export default ContributionDetail