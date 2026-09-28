import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  FileText,
  Hash,
  Layers3,
  LoaderCircle,
  UserRound,
  X,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router'

import {
  notificarError,
  notificarExito,
} from '../../../services/notificationService.js'

import {
  AportacionAdminError,
  ESTADOS_APORTACION,
  obtenerAportacion,
  revisarAportacion,
} from '../services/adminAportacionesService.js'

import '../styles/AdminPrincipalContributionsDetail.css'

const ACCIONES_REVISION =
  Object.freeze({
    APROBAR: 'aprobar',
    RECHAZAR: 'rechazar',
  })

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
 * Obtiene el nombre relacionado con
 * la cuenta de la aportación.
 */
function obtenerNombreEstudiante(
  registro,
) {
  return (
    prepararTexto(
      registro?.estudiante
        ?.nombre_completo,
    ) ||
    'Estudiante sin nombre'
  )
}

/*
 * Obtiene las dos primeras iniciales
 * utilizadas dentro del avatar.
 */
function obtenerIniciales(nombre) {
  const palabras =
    prepararTexto(nombre)
      .split(/\s+/)
      .filter(Boolean)

  if (palabras.length === 0) {
    return 'ES'
  }

  return palabras
    .slice(0, 2)
    .map(
      (palabra) =>
        palabra
          .charAt(0)
          .toUpperCase(),
    )
    .join('')
}

/*
 * Presenta fecha_subida sin provocar
 * cambios por zona horaria.
 */
function formatearFecha(fecha) {
  const fechaCalendario =
    prepararTexto(fecha)
      .split(/[T\s]/)[0]

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fechaCalendario,
    )
  ) {
    return 'Fecha no disponible'
  }

  const [
    anio,
    mes,
    dia,
  ] = fechaCalendario.split('-')

  return `${dia}/${mes}/${anio}`
}

/*
 * Extrae únicamente el nombre del archivo.
 *
 * La ruta completa es interna del servidor
 * y no debe mostrarse como enlace.
 */
function obtenerNombreArchivo(rutaPdf) {
  const ruta =
    prepararTexto(rutaPdf)

  if (!ruta) {
    return 'Archivo no disponible'
  }

  const partes =
    ruta.split(/[\\/]/)

  return (
    partes.at(-1) ||
    'Archivo no disponible'
  )
}

/*
 * Devuelve el texto, icono y clase visual
 * correspondientes al estado del backend.
 */
function obtenerPresentacionEstado(
  estado,
) {
  if (
    estado ===
    ESTADOS_APORTACION.APROBADO
  ) {
    return {
      texto: 'Aprobada',
      clase: 'aprobada',
      Icono: CheckCircle2,
    }
  }

  if (
    estado ===
    ESTADOS_APORTACION.RECHAZADO
  ) {
    return {
      texto: 'Rechazada',
      clase: 'rechazada',
      Icono: CircleX,
    }
  }

  return {
    texto: 'Pendiente',
    clase: 'pendiente',
    Icono: Clock3,
  }
}

function AdminPrincipalContributionDetail() {
  const { aportacionId } = useParams()

  const [
    registro,
    setRegistro,
  ] = useState(null)

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    mensajeError,
    setMensajeError,
  ] = useState('')

  const [
    numeroRecarga,
    setNumeroRecarga,
  ] = useState(0)

  const [
    dialogoAbierto,
    setDialogoAbierto,
  ] = useState(false)

  /*
   * Conservamos la acción elegida durante
   * la animación de cierre del diálogo.
   */
  const [
    accionPendiente,
    setAccionPendiente,
  ] = useState(null)

  const [
    mesesAprobados,
    setMesesAprobados,
  ] = useState('')

  const [
    procesandoRevision,
    setProcesandoRevision,
  ] = useState(false)

  /*
   * Carga la aportación seleccionada.
   *
   * El servicio utiliza el listado porque el backend
   * todavía no dispone de un GET individual.
   */
  useEffect(
    () => {
      let componenteMontado = true

      async function cargarDetalle() {
        setCargando(true)
        setMensajeError('')

        try {
          const registroObtenido =
            await obtenerAportacion(
              aportacionId,
            )

          if (!componenteMontado) {
            return
          }

          if (!registroObtenido) {
            setRegistro(null)

            setMensajeError(
              'No encontramos la aportación solicitada.',
            )

            return
          }

          setRegistro(
            registroObtenido,
          )
        } catch (error) {
          if (!componenteMontado) {
            return
          }

          setRegistro(null)

          setMensajeError(
            error instanceof
            AportacionAdminError
              ? error.message
              : 'No fue posible cargar el detalle de la aportación.',
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
    },
    [
      aportacionId,
      numeroRecarga,
    ],
  )

  function reintentarCarga() {
    setNumeroRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  /*
   * Abre la confirmación correspondiente.
   *
   * Las acciones solamente están disponibles
   * mientras el estado sea Pendiente.
   */
  function abrirConfirmacion(accion) {
    if (
      !registro ||
      procesandoRevision ||
      registro.aportacion.estado !==
        ESTADOS_APORTACION.PENDIENTE
    ) {
      return
    }

    setAccionPendiente(accion)
    setMesesAprobados('')
    setDialogoAbierto(true)
  }

  /*
   * Impide cerrar el diálogo mientras
   * se está enviando una decisión.
   */
  function manejarCambioDialogo(
    abierto,
  ) {
    if (
      procesandoRevision &&
      !abierto
    ) {
      return
    }

    setDialogoAbierto(abierto)
  }

  const esAprobacion =
    accionPendiente ===
    ACCIONES_REVISION.APROBAR

  const cantidadMeses =
    Number(mesesAprobados)

  const mesesValidos =
    mesesAprobados !== '' &&
    Number.isInteger(cantidadMeses) &&
    cantidadMeses > 0

  const confirmacionDeshabilitada =
    procesandoRevision ||
    (
      esAprobacion &&
      !mesesValidos
    )

  /*
   * Envía el cuerpo exacto aceptado
   * por RevisionAportacionInput.
   */
  async function confirmarRevision(
    evento,
  ) {
    /*
     * Radix cerraría el diálogo inmediatamente.
     * Lo mantenemos abierto hasta recibir una respuesta.
     */
    evento.preventDefault()

    if (
      !registro ||
      confirmacionDeshabilitada
    ) {
      return
    }

    const estado =
      esAprobacion
        ? ESTADOS_APORTACION.APROBADO
        : ESTADOS_APORTACION.RECHAZADO

    const revision = {
      estado,

      meses_aprobados:
        esAprobacion
          ? cantidadMeses
          : 0,
    }

    setProcesandoRevision(true)

    try {
      const resultado =
        await revisarAportacion(
          registro.aportacion.id,
          revision,
        )

      notificarExito({
        id:
          'revision-aportacion-exitosa',

        titulo:
          esAprobacion
            ? 'Aportación aprobada'
            : 'Aportación rechazada',

        descripcion:
          resultado.mensaje,
      })

      setDialogoAbierto(false)

      /*
       * Consultamos nuevamente el servicio para que
       * la pantalla refleje el estado almacenado.
       */
      setNumeroRecarga(
        (valorActual) =>
          valorActual + 1,
      )
    } catch (error) {
      notificarError({
        id:
          'error-revision-aportacion',

        titulo:
          'No se pudo guardar la decisión',

        descripcion:
          error instanceof
          AportacionAdminError
            ? error.message
            : 'Ocurrió un error al revisar la aportación.',
      })
    } finally {
      setProcesandoRevision(false)
    }
  }

  // Estado de carga inicial
  if (cargando) {
    return (
      <section className="admin-contribution-detail-page">
        <div className="admin-contribution-detail-state">
          <LoaderCircle
            className="admin-contribution-detail-state__loader"
            aria-hidden="true"
          />

          <h1>
            Cargando aportación
          </h1>

          <p>
            Estamos consultando la
            información seleccionada.
          </p>
        </div>
      </section>
    )
  }

  // Error o aportación inexistente.
  if (
    mensajeError ||
    !registro
  ) {
    return (
      <section className="admin-contribution-detail-page">
        <div className="admin-contribution-detail-state admin-contribution-detail-state--error">
          <CircleX aria-hidden="true" />

          <h1>
            No pudimos abrir la aportación
          </h1>

          <p>
            {mensajeError ||
              'La aportación solicitada no está disponible.'}
          </p>

          <div className="admin-contribution-detail-state__actions">
            <button
              type="button"
              onClick={reintentarCarga}
            >
              Reintentar
            </button>

            <Link to="/admin-principal/aportaciones">
              Volver al listado
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const { aportacion } = registro

  const nombreEstudiante =
    obtenerNombreEstudiante(
      registro,
    )

  const estado =
    obtenerPresentacionEstado(
      aportacion.estado,
    )

  const IconoEstado =
    estado.Icono

  const aportacionPendiente =
    aportacion.estado ===
    ESTADOS_APORTACION.PENDIENTE

  const aportacionAprobada =
    aportacion.estado ===
    ESTADOS_APORTACION.APROBADO

  return (
    <section className="admin-contribution-detail-page">
      {/* Regreso al listado administrativo. */}
      <Link
        className="admin-contribution-detail-back"
        to="/admin-principal/aportaciones"
      >
        <ArrowLeft aria-hidden="true" />

        Volver a aportaciones
      </Link>

      {/* Encabezado de la página. */}
      <header className="admin-contribution-detail-heading">
        <div>
          <p className="admin-contribution-detail-heading__eyebrow">
            Gestión de aportaciones
          </p>

          <h1>
            Detalle de aportación
          </h1>

          <p>
            Revisa la información enviada
            por el estudiante antes de tomar
            una decisión.
          </p>
        </div>
      </header>

      {/* Información general y comprobante. */}
      <div className="admin-contribution-detail-overview">
        <article className="admin-contribution-detail-card">
          <header className="admin-contribution-detail-card__header">
            <div>
              <p>
                Información recibida
              </p>

              <h2>
                {
                  aportacion
                    .num_referencia
                }
              </h2>
            </div>

            <span
              className={
                `admin-contribution-status admin-contribution-status--${estado.clase}`
              }
            >
              <IconoEstado
                aria-hidden="true"
              />

              {estado.texto}
            </span>
          </header>

          {/* Identidad obtenida mediante num_cuenta. */}
          <div className="admin-contribution-detail-student">
            <span
              className="admin-contribution-detail-student__avatar"
              aria-hidden="true"
            >
              {obtenerIniciales(
                nombreEstudiante,
              )}
            </span>

            <div>
              <strong>
                {nombreEstudiante}
              </strong>

              <small>
                N.º{' '}
                {
                  aportacion
                    .num_cuenta
                }
              </small>
            </div>
          </div>

          {/* Descripción proporcionada por el estudiante. */}
          <section className="admin-contribution-detail-description">
            <h3>Descripción</h3>

            <p>
              {
                aportacion.descripcion ||
                'El estudiante no agregó una descripción.'
              }
            </p>
          </section>

          {/* Campos disponibles en AportacionResponse. */}
          <dl className="admin-contribution-detail-facts">
            <div className="admin-contribution-detail-fact">
              <span
                className="admin-contribution-detail-fact__icon"
                aria-hidden="true"
              >
                <UserRound />
              </span>

              <div>
                <dt>Número de cuenta</dt>

                <dd>
                  {
                    aportacion
                      .num_cuenta
                  }
                </dd>
              </div>
            </div>

            <div className="admin-contribution-detail-fact">
              <span
                className="admin-contribution-detail-fact__icon"
                aria-hidden="true"
              >
                <Hash />
              </span>

              <div>
                <dt>
                  Número de referencia
                </dt>

                <dd>
                  {
                    aportacion
                      .num_referencia
                  }
                </dd>
              </div>
            </div>

            <div className="admin-contribution-detail-fact">
              <span
                className="admin-contribution-detail-fact__icon"
                aria-hidden="true"
              >
                <CalendarDays />
              </span>

              <div>
                <dt>Fecha de envío</dt>

                <dd>
                  {formatearFecha(
                    aportacion
                      .fecha_subida,
                  )}
                </dd>
              </div>
            </div>

            <div className="admin-contribution-detail-fact">
              <span
                className="admin-contribution-detail-fact__icon"
                aria-hidden="true"
              >
                <Clock3 />
              </span>

              <div>
                <dt>Estado actual</dt>

                <dd>{estado.texto}</dd>
              </div>
            </div>

            {aportacionAprobada &&
              aportacion
                .meses_aprobados > 0 && (
                <div className="admin-contribution-detail-fact">
                  <span
                    className="admin-contribution-detail-fact__icon"
                    aria-hidden="true"
                  >
                    <Layers3 />
                  </span>

                  <div>
                    <dt>
                      Meses aprobados
                    </dt>

                    <dd>
                      {
                        aportacion
                          .meses_aprobados
                      }
                    </dd>
                  </div>
                </div>
              )}
          </dl>
        </article>

        {/* Área reservada para el PDF. */}
        <aside className="admin-contribution-detail-card admin-contribution-detail-file">
          <header>
            <FileText aria-hidden="true" />

            <div>
              <p>Comprobante</p>

              <h2>
                Archivo PDF
              </h2>
            </div>
          </header>

          <div className="admin-contribution-detail-file__unavailable">
            <FileText aria-hidden="true" />

            <h3>
              Comprobante no disponible
              temporalmente
            </h3>

            <p>
              El backend todavía no ofrece
              una ruta para visualizar o
              descargar este archivo.
            </p>
          </div>

          <div className="admin-contribution-detail-file__name">
            <span>
              Nombre registrado
            </span>

            <strong>
              {obtenerNombreArchivo(
                aportacion.ruta_pdf,
              )}
            </strong>
          </div>
        </aside>
      </div>

      {/* Decisión administrativa. */}
      <section className="admin-contribution-detail-decision">
        <div className="admin-contribution-detail-decision__copy">
          <p>Revisión administrativa</p>

          <h2>
            {aportacionPendiente
              ? 'Selecciona una decisión'
              : 'Esta aportación ya fue revisada'}
          </h2>

          <span>
            {aportacionPendiente
              ? 'La aprobación o el rechazo serán definitivos.'
              : `El comprobante fue marcado como ${estado.texto.toLowerCase()}.`}
          </span>
        </div>

        {aportacionPendiente ? (
          <div className="admin-contribution-detail-decision__actions">
            <button
              className="admin-contribution-detail-button admin-contribution-detail-button--approve"
              type="button"
              disabled={
                procesandoRevision
              }
              onClick={() =>
                abrirConfirmacion(
                  ACCIONES_REVISION.APROBAR,
                )
              }
            >
              <CheckCircle2
                aria-hidden="true"
              />

              Aprobar
            </button>

            <button
              className="admin-contribution-detail-button admin-contribution-detail-button--reject"
              type="button"
              disabled={
                procesandoRevision
              }
              onClick={() =>
                abrirConfirmacion(
                  ACCIONES_REVISION.RECHAZAR,
                )
              }
            >
              <CircleX
                aria-hidden="true"
              />

              Rechazar
            </button>
          </div>
        ) : (
          <span
            className={
              `admin-contribution-status admin-contribution-status--${estado.clase}`
            }
          >
            <IconoEstado
              aria-hidden="true"
            />

            Decisión final
          </span>
        )}
      </section>

      {/* Confirmación de aprobación o rechazo. */}
      <AlertDialog.Root
        open={dialogoAbierto}
        onOpenChange={
          manejarCambioDialogo
        }
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-contribution-review-overlay" />

          <AlertDialog.Content className="admin-contribution-review-dialog">
            {/* Permite cerrar la modal desde la esquina superior derecha. */}
            <AlertDialog.Cancel asChild>
                <button className="admin-contribution-review-dialog__close"
                        type="button"
                        disabled={procesandoRevision}
                        aria-label="Cerrar confirmación"
                >
                    <X aria-hidden="true" />
                </button>
            </AlertDialog.Cancel>
            
            <div
              className={
                esAprobacion
                  ? 'admin-contribution-review-dialog__icon admin-contribution-review-dialog__icon--approve'
                  : 'admin-contribution-review-dialog__icon admin-contribution-review-dialog__icon--reject'
              }
            >
              {esAprobacion ? (
                <CheckCircle2
                  aria-hidden="true"
                />
              ) : (
                <CircleX
                  aria-hidden="true"
                />
              )}
            </div>

            <AlertDialog.Title className="admin-contribution-review-dialog__title">
              {esAprobacion
                ? 'Aprobar aportación'
                : 'Rechazar aportación'}
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-contribution-review-dialog__description">
              {esAprobacion
                ? 'Indica cuántos meses cubre el comprobante. Después de aprobarlo, la decisión será definitiva.'
                : 'El comprobante será marcado como rechazado. Esta decisión será definitiva.'}
            </AlertDialog.Description>

            {esAprobacion && (
              <label className="admin-contribution-review-dialog__field">
                <span>
                  Meses que serán aprobados
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={mesesAprobados}
                  disabled={
                    procesandoRevision
                  }
                  aria-invalid={
                    mesesAprobados !== '' &&
                    !mesesValidos
                  }
                  placeholder="Ejemplo: 2"
                  onChange={(evento) =>
                    setMesesAprobados(
                      evento.target.value,
                    )
                  }
                />

                <small>
                  Debe ser un número entero
                  mayor que cero.
                </small>
              </label>
            )}

            <div className="admin-contribution-review-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-contribution-review-dialog__cancel"
                  type="button"
                  disabled={
                    procesandoRevision
                  }
                >
                  Cancelar
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  className={
                    esAprobacion
                      ? 'admin-contribution-review-dialog__confirm admin-contribution-review-dialog__confirm--approve'
                      : 'admin-contribution-review-dialog__confirm admin-contribution-review-dialog__confirm--reject'
                  }
                  type="button"
                  disabled={
                    confirmacionDeshabilitada
                  }
                  onClick={
                    confirmarRevision
                  }
                >
                  {procesandoRevision && (
                    <LoaderCircle
                      className="admin-contribution-review-dialog__loader"
                      aria-hidden="true"
                    />
                  )}

                  {procesandoRevision
                    ? 'Guardando...'
                    : esAprobacion
                      ? 'Confirmar aprobación'
                      : 'Confirmar rechazo'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}

export default AdminPrincipalContributionDetail