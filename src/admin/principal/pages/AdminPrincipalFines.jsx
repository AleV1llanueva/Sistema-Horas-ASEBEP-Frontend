import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Clock3,
  Download,
  Gavel,
  LoaderCircle,
  Plus,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  notificarError,
  notificarExito,
} from '../../../services/notificationService.js'

import {
  ESTADOS_MULTA,
  MultaAdminError,
  descargarComprobanteMulta,
  listarActividades,
  listarInscritosActividad,
  listarMultas,
  registrarMulta,
  revisarComprobanteMulta,
} from '../services/adminMultasService.js'

import '../styles/AdminPrincipalFines.css'

const PESTANAS_MULTAS = Object.freeze([
  {
    id: ESTADOS_MULTA.PENDIENTE,
    slug: 'pendientes',
    titulo: 'Por revisar',
    icono: Clock3,
  },
  {
    id: ESTADOS_MULTA.APROBADO,
    slug: 'pagadas',
    titulo: 'Pagadas',
    icono: CheckCircle2,
  },
  {
    id: ESTADOS_MULTA.RECHAZADO,
    slug: 'rechazadas',
    titulo: 'Rechazadas',
    icono: CircleX,
  },
])

const ACCIONES = Object.freeze({
  APROBAR: 'aprobar',
  RECHAZAR: 'rechazar',
})

const MONTO_PREDETERMINADO = 100

function obtenerMensajeError(error, respaldo) {
  return error instanceof Error
    ? error.message
    : respaldo
}

function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function prepararTexto(valor) {
  if (valor === null || valor === undefined) {
    return ''
  }

  return String(valor).trim()
}

function formatearLempiras(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero < 0) {
    return 'L 0.00'
  }

  return `L ${new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero)}`
}

function formatearFecha(valor) {
  const texto = prepararTexto(valor)

  if (!texto) {
    return 'Sin fecha'
  }

  const fecha = new Date(texto)

  if (Number.isNaN(fecha.getTime())) {
    return texto
  }

  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha)
}

function obtenerIniciales(nombre) {
  const palabras = normalizarBusqueda(nombre)
    .split(/\s+/)
    .filter(Boolean)

  if (palabras.length === 0) {
    return 'ES'
  }

  return palabras
    .slice(0, 2)
    .map((palabra) =>
      palabra.charAt(0).toUpperCase(),
    )
    .join('')
}

function AdminPrincipalFines() {
  const [multas, setMultas] = useState([])

  const [cargando, setCargando] = useState(true)

  const [mensajeError, setMensajeError] =
    useState('')

  const [intentoCarga, setIntentoCarga] =
    useState(0)

  const [pestanaActiva, setPestanaActiva] =
    useState(ESTADOS_MULTA.PENDIENTE)

  const [busqueda, setBusqueda] = useState('')

  const [accionPendiente, setAccionPendiente] =
    useState(null)

  const [dialogoAbierto, setDialogoAbierto] =
    useState(false)

  const [
    comprobanteProcesando,
    setComprobanteProcesando,
  ] = useState(null)

  const [
    comprobanteDescargando,
    setComprobanteDescargando,
  ] = useState(null)

  /*
   * Estado del diálogo para registrar una multa nueva.
   * El administrador elige la actividad, luego al estudiante
   * y por último el motivo y el monto.
   */
  const [registroAbierto, setRegistroAbierto] =
    useState(false)

  const [actividades, setActividades] = useState([])

  const [actividadesCargando, setActividadesCargando] =
    useState(false)

  const [actividadesError, setActividadesError] =
    useState('')

  const [actividadSeleccionada, setActividadSeleccionada] =
    useState('')

  const [inscritos, setInscritos] = useState([])

  const [inscritosCargando, setInscritosCargando] =
    useState(false)

  const [inscritosError, setInscritosError] =
    useState('')

  const [cuentaSeleccionada, setCuentaSeleccionada] =
    useState('')

  const [motivoMulta, setMotivoMulta] = useState('')

  const [montoMulta, setMontoMulta] = useState(
    String(MONTO_PREDETERMINADO),
  )

  const [registrando, setRegistrando] = useState(false)

  useEffect(() => {
    let componenteActivo = true

    async function cargarMultas() {
      setCargando(true)
      setMensajeError('')

      try {
        const obtenidas = await listarMultas()

        if (componenteActivo) {
          setMultas(obtenidas)
        }
      } catch (error) {
        if (!componenteActivo) {
          return
        }

        console.log('Error al cargar multas: ', error)

        setMultas([])

        setMensajeError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las multas.',
        )

        notificarError({
          id: 'error-carga-multas-admin',
          titulo: 'No fue posible cargar las multas',
          descripcion:
            error instanceof Error
              ? error.message
              : 'Ocurrió un error inesperado.',
        })
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarMultas()

    return () => {
      componenteActivo = false
    }
  }, [intentoCarga])

  const cantidadesPorPestana = useMemo(() => {
    const conteo = {
      [ESTADOS_MULTA.PENDIENTE]: 0,
      [ESTADOS_MULTA.APROBADO]: 0,
      [ESTADOS_MULTA.RECHAZADO]: 0,
    }

    multas.forEach((multa) => {
      conteo[multa.estado] += 1
    })

    return conteo
  }, [multas])

  const multasFiltradas = useMemo(() => {
    const termino = normalizarBusqueda(busqueda)

    return multas
      .filter((multa) => multa.estado === pestanaActiva)
      .filter((multa) => {
        if (!termino) {
          return true
        }

        return [
          multa.nombreEstudiante,
          multa.numCuenta,
          multa.motivo,
          multa.tituloActividad,
          multa.ultimoComprobante?.numReferencia,
        ].some((campo) =>
          normalizarBusqueda(campo).includes(
            termino,
          ),
        )
      })
  }, [multas, pestanaActiva, busqueda])

  const hayFiltrosAplicados = Boolean(busqueda.trim())

  function reintentarCarga() {
    setIntentoCarga(
      (intentoAnterior) => intentoAnterior + 1,
    )
  }

  function limpiarBusqueda() {
    setBusqueda('')
  }

  function abrirConfirmacion(multa, accion) {
    if (
      !multa?.ultimoComprobante?.id ||
      comprobanteProcesando
    ) {
      return
    }

    setAccionPendiente({ multa, accion })
    setDialogoAbierto(true)
  }

  function cerrarConfirmacion() {
    if (comprobanteProcesando) {
      return
    }

    setDialogoAbierto(false)
  }

  async function confirmarRevision() {
    const comprobante =
      accionPendiente?.multa?.ultimoComprobante

    if (!comprobante?.id || comprobanteProcesando) {
      return
    }

    const esAprobacion =
      accionPendiente.accion === ACCIONES.APROBAR

    setComprobanteProcesando(comprobante.id)

    try {
      await revisarComprobanteMulta(
        comprobante.id,
        esAprobacion
          ? ESTADOS_MULTA.APROBADO
          : ESTADOS_MULTA.RECHAZADO,
      )

      setDialogoAbierto(false)

      notificarExito({
        id: `multa-revisada-${comprobante.id}`,
        titulo: esAprobacion
          ? 'Pago aprobado'
          : 'Pago rechazado',
        descripcion: esAprobacion
          ? 'La multa quedó marcada como pagada.'
          : 'El comprobante fue rechazado.',
      })

      reintentarCarga()
    } catch (error) {
      notificarError({
        id: `error-revisar-multa-${comprobante.id}`,
        titulo: 'No fue posible revisar el pago',
        descripcion:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setComprobanteProcesando(null)
    }
  }

  async function descargarComprobante(comprobante) {
    if (
      !comprobante?.id ||
      comprobanteDescargando
    ) {
      return
    }

    setComprobanteDescargando(comprobante.id)

    try {
      const { archivo, nombre } =
        await descargarComprobanteMulta(
          comprobante.id,
        )

      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')

      enlace.href = url
      enlace.download = nombre
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)
    } catch (error) {
      notificarError({
        id: `error-descarga-multa-${comprobante.id}`,
        titulo:
          'No fue posible descargar el comprobante',
        descripcion:
          error instanceof MultaAdminError
            ? error.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setComprobanteDescargando(null)
    }
  }

  const accionEsAprobacion =
    accionPendiente?.accion === ACCIONES.APROBAR

  async function cargarActividades() {
    setActividadesCargando(true)
    setActividadesError('')

    try {
      setActividades(await listarActividades())
    } catch (error) {
      setActividades([])

      setActividadesError(
        obtenerMensajeError(
          error,
          'No fue posible cargar las actividades.',
        ),
      )
    } finally {
      setActividadesCargando(false)
    }
  }

  async function cargarInscritos(actividadId) {
    if (!actividadId) {
      setInscritos([])
      setInscritosError('')
      return
    }

    setInscritosCargando(true)
    setInscritosError('')

    try {
      const resultado =
        await listarInscritosActividad(actividadId)

      setInscritos(resultado.inscritos)
    } catch (error) {
      setInscritos([])

      setInscritosError(
        obtenerMensajeError(
          error,
          'No fue posible cargar los inscritos.',
        ),
      )
    } finally {
      setInscritosCargando(false)
    }
  }

  function limpiarFormularioMulta() {
    setActividadSeleccionada('')
    setInscritos([])
    setInscritosError('')
    setCuentaSeleccionada('')
    setMotivoMulta('')
    setMontoMulta(String(MONTO_PREDETERMINADO))
  }

  function abrirRegistro() {
    limpiarFormularioMulta()
    setRegistroAbierto(true)
    cargarActividades()
  }

  function cerrarRegistro() {
    if (registrando) {
      return
    }

    setRegistroAbierto(false)
    limpiarFormularioMulta()
  }

  function seleccionarActividad(evento) {
    const valor = evento.target.value

    setActividadSeleccionada(valor)
    setCuentaSeleccionada('')
    setInscritos([])
    setInscritosError('')

    if (valor) {
      cargarInscritos(valor)
    }
  }

  async function guardarMulta(evento) {
    evento.preventDefault()

    if (registrando) {
      return
    }

    if (!actividadSeleccionada) {
      notificarError({
        id: 'multa-sin-actividad',
        titulo: 'Selecciona una actividad',
        descripcion:
          'La multa debe estar asociada a la actividad en la que ocurrió la falta.',
      })

      return
    }

    if (!cuentaSeleccionada) {
      notificarError({
        id: 'multa-sin-estudiante',
        titulo: 'Selecciona un estudiante',
        descripcion:
          'Elige al estudiante inscrito que recibirá la multa.',
      })

      return
    }

    setRegistrando(true)

    try {
      await registrarMulta({
        numCuenta: cuentaSeleccionada,
        actividadId: Number(actividadSeleccionada),
        motivo: motivoMulta,
        monto: montoMulta,
      })

      setRegistroAbierto(false)
      limpiarFormularioMulta()

      notificarExito({
        id: 'multa-registrada',
        titulo: 'Multa registrada',
        descripcion:
          'El estudiante ya puede ver la multa y subir su comprobante de pago.',
      })

      setPestanaActiva(ESTADOS_MULTA.PENDIENTE)
      reintentarCarga()
    } catch (error) {
      notificarError({
        id: 'error-registrar-multa',
        titulo: 'No fue posible registrar la multa',
        descripcion: obtenerMensajeError(
          error,
          'Ocurrió un error inesperado.',
        ),
      })

      /*
       * Si el backend rechaza por multa duplicada, se refresca
       * la lista de inscritos para reflejar el estado real.
       */
      if (error instanceof MultaAdminError) {
        cargarInscritos(actividadSeleccionada)
      }
    } finally {
      setRegistrando(false)
    }
  }

  const inscritoSeleccionado = inscritos.find(
    (inscrito) =>
      inscrito.numCuenta === cuentaSeleccionada,
  )

  const puedeGuardarMulta =
    Boolean(actividadSeleccionada) &&
    Boolean(cuentaSeleccionada) &&
    Boolean(motivoMulta.trim()) &&
    Number(montoMulta) > 0 &&
    !registrando

  return (
    <section className="admin-fines-page">
      <header className="admin-fines-heading">
        <div>
          <p className="admin-fines-heading__eyebrow">
            Gestión de multas
          </p>

          <h1>Multas</h1>

          <p>
            Revisa los comprobantes de pago enviados por los
            estudiantes y confirma las multas pendientes.
          </p>
        </div>

        <div className="admin-fines-heading__summary">
          <Gavel aria-hidden="true" />

          <div>
            <strong>{multas.length}</strong>

            <span>
              {multas.length === 1
                ? 'Multa registrada'
                : 'Multas registradas'}
            </span>
          </div>
        </div>

        <button
          className="admin-fines-heading__action"
          type="button"
          onClick={abrirRegistro}
        >
          <Plus aria-hidden="true" />
          Registrar multa
        </button>
      </header>

      {!cargando && !mensajeError && (
        <>
          <div
            className="admin-fines-tabs"
            role="tablist"
            aria-label="Clasificación de multas"
          >
            {PESTANAS_MULTAS.map((pestana) => {
              const Icono = pestana.icono
              const seleccionada =
                pestanaActiva === pestana.id

              return (
                <button
                  key={pestana.id}
                  type="button"
                  role="tab"
                  aria-selected={seleccionada}
                  className={
                    seleccionada
                      ? 'admin-fines-tab admin-fines-tab--active'
                      : 'admin-fines-tab'
                  }
                  onClick={() =>
                    setPestanaActiva(pestana.id)
                  }
                >
                  <Icono aria-hidden="true" />

                  <span>{pestana.titulo}</span>

                  <small>
                    {cantidadesPorPestana[pestana.id]}
                  </small>
                </button>
              )
            })}
          </div>

          <section
            className="admin-fines-toolbar"
            aria-label="Filtros de multas"
          >
            <label className="admin-fines-search">
              <span>Buscar multa</span>

              <div className="admin-fines-search__control">
                <Search aria-hidden="true" />

                <input
                  type="search"
                  value={busqueda}
                  placeholder="Buscar por estudiante, cuenta o motivo"
                  onChange={(evento) =>
                    setBusqueda(evento.target.value)
                  }
                />
              </div>
            </label>

            <button
              className="admin-fines-clear-button"
              type="button"
              disabled={!hayFiltrosAplicados}
              onClick={limpiarBusqueda}
            >
              <X aria-hidden="true" />
              Limpiar búsqueda
            </button>
          </section>
        </>
      )}

      {cargando && (
        <section
          className="admin-fines-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-fines-state__loader"
            aria-hidden="true"
          />

          <h2>Cargando multas</h2>

          <p>
            Estamos consultando las multas registradas en el sistema.
          </p>
        </section>
      )}

      {!cargando && mensajeError && (
        <section
          className="admin-fines-state admin-fines-state--error"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />

          <h2>No fue posible cargar las multas</h2>

          <p>{mensajeError}</p>

          <button type="button" onClick={reintentarCarga}>
            Intentar nuevamente
          </button>
        </section>
      )}

      {!cargando &&
        !mensajeError &&
        multasFiltradas.length === 0 && (
          <section className="admin-fines-state">
            <Gavel aria-hidden="true" />

            <h2>
              {hayFiltrosAplicados
                ? 'No encontramos resultados'
                : 'No hay multas en esta sección'}
            </h2>

            <p>
              {hayFiltrosAplicados
                ? 'Cambia la búsqueda o límpiala para ver todas las multas.'
                : 'Las multas aparecerán aquí cuando los administradores las registren.'}
            </p>

            {hayFiltrosAplicados && (
              <button
                type="button"
                onClick={limpiarBusqueda}
              >
                <X aria-hidden="true" />
                Limpiar búsqueda
              </button>
            )}
          </section>
        )}

      {!cargando &&
        !mensajeError &&
        multasFiltradas.length > 0 && (
          <section
            className="admin-fines-list"
            aria-label="Listado de multas"
          >
            <header className="admin-fines-list__header">
              <div>
                <p>Listado</p>

                <h2>
                  {
                    PESTANAS_MULTAS.find(
                      (pestana) =>
                        pestana.id === pestanaActiva,
                    )?.titulo
                  }
                </h2>
              </div>

              <span>
                {multasFiltradas.length}{' '}
                {multasFiltradas.length === 1
                  ? 'resultado'
                  : 'resultados'}
              </span>
            </header>

            <div className="admin-fines-table-wrapper">
              <table className="admin-fines-table">
                <caption>
                  Multas {pestanaActiva.toLowerCase()}s
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Estudiante</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Monto</th>
                    <th scope="col">Registrada</th>
                    <th scope="col">Comprobante</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {multasFiltradas.map((multa) => {
                    const comprobante =
                      multa.ultimoComprobante

                    const nombre =
                      multa.nombreEstudiante ||
                      'Estudiante sin nombre'

                    const descargando =
                      comprobanteDescargando ===
                      comprobante?.id

                    return (
                      <tr key={multa.id}>
                        <th scope="row" data-label="Estudiante">
                          <div className="admin-fine-identity">
                            <span
                              className="admin-fine-identity__avatar"
                              aria-hidden="true"
                            >
                              {obtenerIniciales(nombre)}
                            </span>

                            <div>
                              <strong>{nombre}</strong>

                              <small>
                                N.º {multa.numCuenta}
                              </small>
                            </div>
                          </div>
                        </th>

                        <td data-label="Motivo">
                          <div className="admin-fine-motivo">
                            <span>{multa.motivo}</span>

                            <small>
                              {multa.tituloActividad ||
                                `Actividad #${multa.actividadId}`}
                            </small>
                          </div>
                        </td>

                        <td data-label="Monto">
                          <strong className="admin-fine-monto">
                            {formatearLempiras(multa.monto)}
                          </strong>
                        </td>

                        <td data-label="Registrada">
                          <span className="admin-fine-fecha">
                            {formatearFecha(multa.fechaMulta)}
                          </span>
                        </td>

                        <td data-label="Comprobante">
                          {comprobante ? (
                            <div className="admin-fine-comprobante">
                              <span>
                                {comprobante.numReferencia}
                              </span>

                              <small>
                                {formatearFecha(
                                  comprobante.fechaSolicitud,
                                )}
                              </small>
                            </div>
                          ) : (
                            <span className="admin-fine-sin-comprobante">
                              <AlertTriangle aria-hidden="true" />
                              Sin comprobante
                            </span>
                          )}
                        </td>

                        <td data-label="Acciones">
                          <div className="admin-fine-actions">
                            {comprobante && (
                              <button
                                type="button"
                                title="Descargar comprobante"
                                aria-label={
                                  `Descargar comprobante de ${nombre}`
                                }
                                disabled={descargando}
                                onClick={() =>
                                  descargarComprobante(
                                    comprobante,
                                  )
                                }
                              >
                                {descargando ? (
                                  <LoaderCircle
                                    className="admin-fine-actions__loader"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Download aria-hidden="true" />
                                )}
                              </button>
                            )}

                            {multa.estado ===
                              ESTADOS_MULTA.PENDIENTE &&
                              comprobante && (
                                <>
                                  <button
                                    className="admin-fine-actions__approve"
                                    type="button"
                                    title="Aprobar pago"
                                    aria-label={
                                      `Aprobar pago de ${nombre}`
                                    }
                                    disabled={
                                      Boolean(
                                        comprobanteProcesando,
                                      )
                                    }
                                    onClick={() =>
                                      abrirConfirmacion(
                                        multa,
                                        ACCIONES.APROBAR,
                                      )
                                    }
                                  >
                                    <CheckCircle2 aria-hidden="true" />
                                  </button>

                                  <button
                                    className="admin-fine-actions__reject"
                                    type="button"
                                    title="Rechazar pago"
                                    aria-label={
                                      `Rechazar pago de ${nombre}`
                                    }
                                    disabled={
                                      Boolean(
                                        comprobanteProcesando,
                                      )
                                    }
                                    onClick={() =>
                                      abrirConfirmacion(
                                        multa,
                                        ACCIONES.RECHAZAR,
                                      )
                                    }
                                  >
                                    <CircleX aria-hidden="true" />
                                  </button>
                                </>
                              )}

                            {!comprobante && (
                              <span className="admin-fine-actions__hint">
                                Sin acciones
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      {/* Confirmación de aprobación o rechazo. */}
      <AlertDialog.Root
        open={dialogoAbierto}
        onOpenChange={(abierto) => {
          if (!comprobanteProcesando) {
            setDialogoAbierto(abierto)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-fine-dialog__overlay" />

          <AlertDialog.Content className="admin-fine-dialog__content">
            <div
              className={
                accionEsAprobacion
                  ? 'admin-fine-dialog__icon admin-fine-dialog__icon--approve'
                  : 'admin-fine-dialog__icon admin-fine-dialog__icon--reject'
              }
            >
              {accionEsAprobacion ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleX aria-hidden="true" />
              )}
            </div>

            <AlertDialog.Title className="admin-fine-dialog__title">
              {accionEsAprobacion
                ? 'Aprobar pago de multa'
                : 'Rechazar pago de multa'}
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-fine-dialog__description">
              {accionEsAprobacion
                ? 'La multa quedará marcada como pagada. Esta acción no se puede deshacer.'
                : 'El comprobante quedará rechazado y la multa seguirá pendiente.'}
            </AlertDialog.Description>

            <div className="admin-fine-dialog__detail">
              <strong>
                {accionPendiente?.multa?.motivo}
              </strong>

              <span>
                {accionPendiente?.multa?.nombreEstudiante ||
                  accionPendiente?.multa?.numCuenta}
              </span>
            </div>

            <div className="admin-fine-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-fine-dialog__cancel"
                  type="button"
                  disabled={Boolean(comprobanteProcesando)}
                  onClick={cerrarConfirmacion}
                >
                  Cancelar
                </button>
              </AlertDialog.Cancel>

              <button
                className={
                  accionEsAprobacion
                    ? 'admin-fine-dialog__confirm admin-fine-dialog__confirm--approve'
                    : 'admin-fine-dialog__confirm admin-fine-dialog__confirm--reject'
                }
                type="button"
                disabled={Boolean(comprobanteProcesando)}
                onClick={confirmarRevision}
              >
                {comprobanteProcesando ? (
                  <LoaderCircle
                    className="admin-fine-dialog__loader"
                    aria-hidden="true"
                  />
                ) : accionEsAprobacion ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <CircleX aria-hidden="true" />
                )}

                {comprobanteProcesando
                  ? 'Guardando...'
                  : accionEsAprobacion
                    ? 'Aprobar pago'
                    : 'Rechazar pago'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Alta de una multa: la genera el administrador, nunca el sistema. */}
      <AlertDialog.Root
        open={registroAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) {
            cerrarRegistro()
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-fine-dialog__overlay" />

          <AlertDialog.Content className="admin-fine-dialog__content admin-fine-dialog__content--wide">
            <div className="admin-fine-dialog__icon admin-fine-dialog__icon--neutral">
              <Gavel aria-hidden="true" />
            </div>

            <AlertDialog.Title className="admin-fine-dialog__title">
              Registrar multa
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-fine-dialog__description">
              La multa se asocia a una actividad y solo puede
              aplicarse a estudiantes inscritos en ella. El
              estudiante deberá subir el comprobante de pago.
            </AlertDialog.Description>

            <form
              className="admin-fine-form"
              onSubmit={guardarMulta}
            >
              <label className="admin-fine-form__field">
                <span>Actividad</span>

                <select
                  value={actividadSeleccionada}
                  disabled={
                    actividadesCargando || registrando
                  }
                  onChange={seleccionarActividad}
                >
                  <option value="">
                    {actividadesCargando
                      ? 'Cargando actividades...'
                      : 'Selecciona una actividad'}
                  </option>

                  {actividades.map((actividad) => (
                    <option
                      key={actividad.id}
                      value={String(actividad.id)}
                    >
                      {actividad.titulo}
                      {actividad.fecha
                        ? ` · ${formatearFecha(actividad.fecha)}`
                        : ''}
                    </option>
                  ))}
                </select>

                {actividadesError && (
                  <small className="admin-fine-form__hint admin-fine-form__hint--error">
                    {actividadesError}
                  </small>
                )}
              </label>

              {actividadSeleccionada && (
                <div className="admin-fine-form__field">
                  <span>Estudiante inscrito</span>

                  {inscritosCargando && (
                    <p
                      className="admin-fine-form__hint"
                      role="status"
                    >
                      <LoaderCircle
                        className="admin-fine-dialog__loader"
                        aria-hidden="true"
                      />
                      Cargando inscritos...
                    </p>
                  )}

                  {!inscritosCargando && inscritosError && (
                    <p className="admin-fine-form__hint admin-fine-form__hint--error">
                      {inscritosError}
                    </p>
                  )}

                  {!inscritosCargando &&
                    !inscritosError &&
                    inscritos.length === 0 && (
                      <p className="admin-fine-form__hint">
                        Esta actividad no tiene estudiantes
                        inscritos, por lo que no se puede
                        registrar una multa.
                      </p>
                    )}

                  {!inscritosCargando &&
                    inscritos.length > 0 && (
                      <div
                        className="admin-fine-form__list"
                        role="radiogroup"
                        aria-label="Estudiantes inscritos"
                      >
                        {inscritos.map((inscrito) => {
                          const nombre =
                            inscrito.nombreEstudiante ||
                            `N.º ${inscrito.numCuenta}`

                          return (
                            <label
                              key={inscrito.numCuenta}
                              className={
                                inscrito.multaRegistrada
                                  ? 'admin-fine-form__option admin-fine-form__option--disabled'
                                  : cuentaSeleccionada ===
                                      inscrito.numCuenta
                                    ? 'admin-fine-form__option admin-fine-form__option--selected'
                                    : 'admin-fine-form__option'
                              }
                            >
                              <input
                                type="radio"
                                name="inscrito-multa"
                                value={inscrito.numCuenta}
                                checked={
                                  cuentaSeleccionada ===
                                  inscrito.numCuenta
                                }
                                disabled={
                                  inscrito.multaRegistrada ||
                                  registrando
                                }
                                onChange={() =>
                                  setCuentaSeleccionada(
                                    inscrito.numCuenta,
                                  )
                                }
                              />

                              <span className="admin-fine-form__option-body">
                                <strong>{nombre}</strong>

                                <small>
                                  N.º {inscrito.numCuenta} ·{' '}
                                  {inscrito.estado}
                                </small>
                              </span>

                              {inscrito.multaRegistrada && (
                                <span className="admin-fine-form__badge">
                                  Ya multado
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                </div>
              )}

              <label className="admin-fine-form__field">
                <span>Motivo</span>

                <textarea
                  rows={3}
                  maxLength={255}
                  value={motivoMulta}
                  disabled={registrando}
                  placeholder="Describe la falta cometida"
                  onChange={(evento) =>
                    setMotivoMulta(evento.target.value)
                  }
                />
              </label>

              <label className="admin-fine-form__field admin-fine-form__field--short">
                <span>Monto (L)</span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={montoMulta}
                  disabled={registrando}
                  onChange={(evento) =>
                    setMontoMulta(evento.target.value)
                  }
                />
              </label>

              <p className="admin-fine-form__summary">
                {inscritoSeleccionado
                  ? `Se aplicará una multa de ${formatearLempiras(
                      Number(montoMulta) || 0,
                    )} a ${
                      inscritoSeleccionado.nombreEstudiante ||
                      inscritoSeleccionado.numCuenta
                    }.`
                  : 'Selecciona la actividad y el estudiante para continuar.'}
              </p>

              <div className="admin-fine-dialog__actions">
                <AlertDialog.Cancel asChild>
                  <button
                    className="admin-fine-dialog__cancel"
                    type="button"
                    disabled={registrando}
                    onClick={cerrarRegistro}
                  >
                    Cancelar
                  </button>
                </AlertDialog.Cancel>

                <button
                  className="admin-fine-dialog__confirm admin-fine-dialog__confirm--approve"
                  type="submit"
                  disabled={!puedeGuardarMulta}
                >
                  {registrando ? (
                    <LoaderCircle
                      className="admin-fine-dialog__loader"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}

                  {registrando
                    ? 'Registrando...'
                    : 'Registrar multa'}
                </button>
              </div>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}

export default AdminPrincipalFines
