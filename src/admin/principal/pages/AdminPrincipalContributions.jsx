import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Eye,
  Search,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  notificarError,
} from '../../../services/notificationService.js'

import {
  AportacionAdminError,
  ESTADOS_APORTACION,
  listarAportaciones,
} from '../services/adminAportacionesService.js'

import '../styles/AdminPrincipalContributions.css'

/*
 * Cantidad máxima de aportaciones
 * mostradas en cada página.
 */
const APORTACIONES_POR_PAGINA = 4

/*
 * Configuración de las pestañas.
 *
 * id utiliza exactamente el estado recibido
 * desde el backend.
 *
 * slug se utiliza únicamente para identificadores
 * HTML y clases visuales.
 */
const PESTANAS_APORTACIONES =
  Object.freeze([
    {
      id:
        ESTADOS_APORTACION.PENDIENTE,

      slug: 'pendientes',
      titulo: 'Pendientes',

      tituloListado:
        'Aportaciones pendientes',

      icono: Clock3,
    },

    {
      id:
        ESTADOS_APORTACION.APROBADO,

      slug: 'aprobadas',
      titulo: 'Aprobadas',

      tituloListado:
        'Aportaciones aprobadas',

      icono: CheckCircle2,
    },

    {
      id:
        ESTADOS_APORTACION.RECHAZADO,

      slug: 'rechazadas',
      titulo: 'Rechazadas',

      tituloListado:
        'Aportaciones rechazadas',

      icono: CircleX,
    },
  ])

/*
 * Prepara un texto para realizar búsquedas.
 *
 * Permite encontrar nombres con o sin tildes
 * y no distingue mayúsculas de minúsculas.
 */
function normalizarBusqueda(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
}

/*
 * Obtiene las dos primeras iniciales
 * del nombre del estudiante.
 */
function obtenerIniciales(
  nombreCompleto,
) {
  const palabras =
    normalizarBusqueda(nombreCompleto)
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
 * Obtiene el nombre relacionado
 * con una aportación.
 */
function obtenerNombreEstudiante(
  registro,
) {
  const nombre =
    String(
      registro?.estudiante
        ?.nombre_completo ?? '',
    ).trim()

  return (
    nombre ||
    'Estudiante sin nombre'
  )
}

/*
 * Convierte fecha_subida al formato
 * visual DD/MM/YYYY.
 *
 * Se utiliza únicamente la parte de calendario
 * para evitar cambios de día por zona horaria.
 */
function formatearFecha(fecha) {
  const fechaCalendario =
    String(fecha ?? '')
      .trim()
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
 * Convierte los estados del backend
 * en etiquetas adecuadas para la interfaz.
 */
function obtenerTextoEstado(estado) {
  const textos = {
    [ESTADOS_APORTACION.PENDIENTE]:
      'Pendiente',

    [ESTADOS_APORTACION.APROBADO]:
      'Aprobada',

    [ESTADOS_APORTACION.RECHAZADO]:
      'Rechazada',
  }

  return (
    textos[estado] ||
    'Sin estado'
  )
}

/*
 * Obtiene el icono correspondiente
 * al estado de la aportación.
 */
function obtenerIconoEstado(estado) {
  if (
    estado ===
    ESTADOS_APORTACION.APROBADO
  ) {
    return CheckCircle2
  }

  if (
    estado ===
    ESTADOS_APORTACION.RECHAZADO
  ) {
    return CircleX
  }

  return Clock3
}

/*
 * Obtiene el modificador que ya existe
 * dentro del archivo CSS.
 */
function obtenerClaseVisualEstado(
  estado,
) {
  if (
    estado ===
    ESTADOS_APORTACION.APROBADO
  ) {
    return 'aprobada'
  }

  if (
    estado ===
    ESTADOS_APORTACION.RECHAZADO
  ) {
    return 'rechazada'
  }

  return 'pendiente'
}

function AdminPrincipalContributions() {
  const navigate = useNavigate()

  const [
    aportaciones,
    setAportaciones,
  ] = useState([])

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    mensajeError,
    setMensajeError,
  ] = useState('')

  /*
   * Esta clave permite repetir la consulta
   * cuando el usuario presiona Reintentar.
   */
  const [
    intentoCarga,
    setIntentoCarga,
  ] = useState(0)

  const [
    pestanaActiva,
    setPestanaActiva,
  ] = useState(
    ESTADOS_APORTACION.PENDIENTE,
  )

  const [
    busqueda,
    setBusqueda,
  ] = useState('')

  const [
    paginaActual,
    setPaginaActual,
  ] = useState(1)

  /*
   * Consulta el servicio al cargar la pantalla.
   *
   * El servicio decide si debe utilizar el usuario
   * mock o el backend real.
   */
  useEffect(
    () => {
      let vistaActiva = true

      async function cargarAportaciones() {
        setCargando(true)
        setMensajeError('')
        setAportaciones([])

        try {
          const registros =
            await listarAportaciones()

          if (!vistaActiva) {
            return
          }

          setAportaciones(registros)
        } catch (error) {
          if (!vistaActiva) {
            return
          }

          const mensaje =
            error instanceof
            AportacionAdminError
              ? error.message
              : 'No fue posible cargar las aportaciones.'

          setMensajeError(mensaje)

          notificarError({
            id:
              'error-carga-aportaciones-admin',

            titulo:
              'No se pudieron cargar las aportaciones',

            descripcion: mensaje,
          })
        } finally {
          if (vistaActiva) {
            setCargando(false)
          }
        }
      }

      cargarAportaciones()

      /*
       * Evita actualizar el estado cuando
       * la página ya fue desmontada.
       */
      return () => {
        vistaActiva = false
      }
    },
    [intentoCarga],
  )

  /*
   * Cuenta todos los registros de cada estado.
   *
   * Las cantidades no cambian cuando el usuario
   * escribe dentro del filtro.
   */
  const cantidadesPorPestana =
    useMemo(
      () =>
        aportaciones.reduce(
          (cantidades, registro) => {
            const estado =
              registro.aportacion.estado

            cantidades[estado] =
              (
                cantidades[estado] ?? 0
              ) + 1

            return cantidades
          },
          {
            [ESTADOS_APORTACION.PENDIENTE]:
              0,

            [ESTADOS_APORTACION.APROBADO]:
              0,

            [ESTADOS_APORTACION.RECHAZADO]:
              0,
          },
        ),
      [aportaciones],
    )

  /*
   * Obtiene la configuración visual
   * correspondiente a la pestaña actual.
   */
  const configuracionPestana =
    PESTANAS_APORTACIONES.find(
      (pestana) =>
        pestana.id === pestanaActiva,
    ) ?? PESTANAS_APORTACIONES[0]

  /*
   * Primero selecciona las aportaciones
   * pertenecientes a la pestaña activa.
   */
  const aportacionesPestana =
    useMemo(
      () =>
        aportaciones.filter(
          (registro) =>
            registro.aportacion.estado ===
            pestanaActiva,
        ),
      [
        aportaciones,
        pestanaActiva,
      ],
    )

  /*
   * El único filtro permitido consulta
   * el nombre y el número de cuenta.
   */
  const aportacionesFiltradas =
    useMemo(
      () => {
        const textoBuscado =
          normalizarBusqueda(busqueda)

        if (!textoBuscado) {
          return aportacionesPestana
        }

        return aportacionesPestana.filter(
          (registro) => {
            const nombre =
              normalizarBusqueda(
                obtenerNombreEstudiante(
                  registro,
                ),
              )

            const numeroCuenta =
              normalizarBusqueda(
                registro
                  .aportacion
                  .num_cuenta,
              )

            return (
              nombre.includes(
                textoBuscado,
              ) ||
              numeroCuenta.includes(
                textoBuscado,
              )
            )
          },
        )
      },
      [
        aportacionesPestana,
        busqueda,
      ],
    )

  const hayFiltroAplicado =
    busqueda.trim().length > 0

  const existenResultados =
    aportacionesFiltradas.length > 0

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      aportacionesFiltradas.length /
        APORTACIONES_POR_PAGINA,
    ),
  )

  /*
   * Evita conservar una página que dejó
   * de existir después de cambiar el filtro.
   */
  useEffect(
    () => {
      setPaginaActual(
        (paginaAnterior) =>
          Math.min(
            paginaAnterior,
            totalPaginas,
          ),
      )
    },
    [totalPaginas],
  )

  /*
   * Obtiene únicamente los registros
   * correspondientes a la página actual.
   */
  const aportacionesPagina =
    useMemo(
      () => {
        const indiceInicial =
          (
            paginaActual - 1
          ) *
          APORTACIONES_POR_PAGINA

        return aportacionesFiltradas.slice(
          indiceInicial,
          indiceInicial +
            APORTACIONES_POR_PAGINA,
        )
      },
      [
        aportacionesFiltradas,
        paginaActual,
      ],
    )

  /*
   * Construye los botones numéricos
   * de la paginación.
   */
  const paginasDisponibles =
    useMemo(
      () =>
        Array.from(
          {
            length: totalPaginas,
          },
          (_, indice) => indice + 1,
        ),
      [totalPaginas],
    )

  const totalResultados =
    aportacionesFiltradas.length

  const primerResultado =
    totalResultados === 0
      ? 0
      : (
          paginaActual - 1
        ) *
          APORTACIONES_POR_PAGINA +
        1

  const ultimoResultado =
    Math.min(
      paginaActual *
        APORTACIONES_POR_PAGINA,
      totalResultados,
    )

  /*
   * Cambia la pestaña y regresa
   * a la primera página.
   */
  function seleccionarPestana(
    nuevaPestana,
  ) {
    setPestanaActiva(nuevaPestana)
    setPaginaActual(1)
  }

  /*
   * Actualiza la búsqueda y reinicia
   * la paginación.
   */
  function actualizarBusqueda(evento) {
    setBusqueda(evento.target.value)
    setPaginaActual(1)
  }

  function limpiarFiltro() {
    setBusqueda('')
    setPaginaActual(1)
  }

  /*
   * Ejecuta nuevamente la consulta
   * después de un error.
   */
  function reintentarCarga() {
    setIntentoCarga(
      (intentoAnterior) =>
        intentoAnterior + 1,
    )
  }

  // Abre el detalle utilizando el identificador numerico entregado por el backend.
  function abrirDetalleAportacion(
    registro,
  ) {
    const aportacionId =
      Number(
        registro?.aportacion?.id,
      )

    if (!Number.isInteger(aportacionId || aportacionId <= 0)) {
      notificarError({
        id: 'error-abrir-aportacion',
        titulo: 'No se puede abrir la aportación',
        descripcion: 'La aportación seleccionada no tiene un identificador válido.',
      })

      return
    }

    navigate(
      `/admin-principal/aportaciones/${encodeURIComponent(
        aportacionId,
      )}`,
    )
  }

  return (
    <section className="admin-contributions-page">
      {/* Encabezado principal del módulo. */}
      <header className="admin-contributions-heading">
        <div>
          <p className="admin-contributions-heading__eyebrow">
            Gestión de aportaciones
          </p>

          <h1>Aportaciones</h1>

          <p>
            Revisa los comprobantes
            enviados por los estudiantes.
          </p>
        </div>
      </header>

      {/* Menú de estados basado en la vista de Actividades. */}
      <div
        className="admin-contributions-tabs"
        role="tablist"
        aria-label="Clasificación de aportaciones"
      >
        {PESTANAS_APORTACIONES.map(
          (pestana) => {
            const IconoPestana =
              pestana.icono

            const seleccionada =
              pestanaActiva ===
              pestana.id

            return (
              <button
                key={pestana.id}
                id={
                  `admin-contributions-tab-${pestana.slug}`
                }
                className={
                  seleccionada
                    ? 'admin-contributions-tab admin-contributions-tab--active'
                    : 'admin-contributions-tab'
                }
                type="button"
                role="tab"
                aria-selected={
                  seleccionada
                }
                aria-controls="admin-contributions-tab-panel"
                onClick={() =>
                  seleccionarPestana(
                    pestana.id,
                  )
                }
              >
                <IconoPestana
                  aria-hidden="true"
                />

                <span>
                  {pestana.titulo}
                </span>

                <small>
                  {
                    cantidadesPorPestana[
                      pestana.id
                    ]
                  }
                </small>
              </button>
            )
          },
        )}
      </div>

      {/* Único filtro permitido para este listado. */}
      <section
        className="admin-contributions-toolbar"
        aria-label="Filtros de aportaciones"
      >
        <label className="admin-contributions-search">
          <span>
            Buscar aportación
          </span>

          <div className="admin-contributions-search__control">
            <Search aria-hidden="true" />

            <input
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre o número de cuenta"
              disabled={
                cargando ||
                Boolean(mensajeError)
              }
              onChange={
                actualizarBusqueda
              }
            />
          </div>
        </label>

        <button
          className="admin-contributions-clear-button"
          type="button"
          disabled={
            !hayFiltroAplicado ||
            cargando ||
            Boolean(mensajeError)
          }
          onClick={limpiarFiltro}
        >
          <X aria-hidden="true" />

          Limpiar filtros
        </button>
      </section>

      {/* Listado correspondiente a la pestaña seleccionada. */}
      <section
        key={pestanaActiva}
        id="admin-contributions-tab-panel"
        className="admin-contributions-list"
        role="tabpanel"
        aria-labelledby={
          `admin-contributions-tab-${configuracionPestana.slug}`
        }
      >
        <header className="admin-contributions-list__header">
          <div>
            <p>Listado</p>

            <h2 id="admin-contributions-list-title">
              {
                configuracionPestana
                  .tituloListado
              }
            </h2>
          </div>

          <span>
            {cargando
              ? 'Cargando...'
              : `${totalResultados} ${
                  totalResultados === 1
                    ? 'resultado'
                    : 'resultados'
                }`}
          </span>
        </header>

        {/* Estado mostrado mientras se consulta el servicio. */}
        {cargando && (
          <div className="admin-contributions-no-results">
            <Clock3 aria-hidden="true" />

            <h3>
              Cargando aportaciones
            </h3>

            <p>
              Estamos consultando la
              información disponible.
            </p>
          </div>
        )}

        {/* Estado mostrado cuando la consulta falla. */}
        {!cargando && mensajeError && (
          <div className="admin-contributions-no-results">
            <CircleX aria-hidden="true" />

            <h3>
              No se pudieron cargar las
              aportaciones
            </h3>

            <p>{mensajeError}</p>

            <button
              className="admin-contributions-no-results__clear"
              type="button"
              onClick={reintentarCarga}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado vacío o búsqueda sin coincidencias. */}
        {!cargando &&
          !mensajeError &&
          !existenResultados && (
            <div className="admin-contributions-no-results">
              <Search aria-hidden="true" />

              <h3>
                {aportacionesPestana.length ===
                0
                  ? 'No hay aportaciones en esta sección'
                  : 'No encontramos resultados'}
              </h3>

              <p>
                {aportacionesPestana.length ===
                0
                  ? 'Las aportaciones aparecerán aquí cuando alcancen este estado.'
                  : 'Cambia la búsqueda o limpia el filtro aplicado.'}
              </p>

              {hayFiltroAplicado && (
                <button
                  className="admin-contributions-no-results__clear"
                  type="button"
                  onClick={limpiarFiltro}
                >
                  <X aria-hidden="true" />

                  Limpiar filtros
                </button>
              )}
            </div>
          )}

        {/* Tabla de aportaciones disponibles. */}
        {!cargando &&
          !mensajeError &&
          existenResultados && (
            <div className="admin-contributions-table-wrapper">
              <table className="admin-contributions-table">
                <caption>
                  {
                    configuracionPestana
                      .tituloListado
                  }
                </caption>

                <thead>
                  <tr>
                    <th scope="col">
                      Estudiante
                    </th>

                    <th scope="col">
                      Referencia
                    </th>

                    <th scope="col">
                      Fecha de envío
                    </th>

                    <th scope="col">
                      Descripción
                    </th>

                    <th scope="col">
                      Estado
                    </th>

                    <th scope="col">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {aportacionesPagina.map(
                    (registro) => {
                      const {
                        aportacion,
                      } = registro

                      const nombreEstudiante =
                        obtenerNombreEstudiante(
                          registro,
                        )

                      const IconoEstado =
                        obtenerIconoEstado(
                          aportacion.estado,
                        )

                      const claseEstado =
                        obtenerClaseVisualEstado(
                          aportacion.estado,
                        )

                      return (
                        <tr
                          key={
                            aportacion.id
                          }
                        >
                          <th
                            scope="row"
                            data-label="Estudiante"
                          >
                            {/* Nombre y cuenta obtenidos mediante num_cuenta. */}
                            <div className="admin-contribution-identity">
                              <span
                                className="admin-contribution-identity__avatar"
                                aria-hidden="true"
                              >
                                {obtenerIniciales(
                                  nombreEstudiante,
                                )}
                              </span>

                              <div>
                                <strong>
                                  {
                                    nombreEstudiante
                                  }
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
                          </th>

                          <td data-label="Referencia">
                            <span className="admin-contribution-reference">
                              {
                                aportacion
                                  .num_referencia
                              }
                            </span>
                          </td>

                          <td data-label="Fecha de envío">
                            {formatearFecha(
                              aportacion
                                .fecha_subida,
                            )}
                          </td>

                          <td data-label="Descripción">
                            <span className="admin-contribution-description">
                              {
                                aportacion
                                  .descripcion ||
                                'Sin descripción'
                              }
                            </span>
                          </td>

                          <td data-label="Estado">
                            <span
                              className={
                                `admin-contribution-status admin-contribution-status--${claseEstado}`
                              }
                            >
                              <IconoEstado
                                aria-hidden="true"
                              />

                              {obtenerTextoEstado(
                                aportacion.estado,
                              )}
                            </span>
                          </td>

                          <td data-label="Acciones">
                            <div className="admin-contribution-actions">
                              <button
                                type="button"
                                title="Ver aportación"
                                aria-label={
                                  `Ver aportación de ${nombreEstudiante}`
                                }
                                onClick={() =>
                                  abrirDetalleAportacion(
                                    registro,
                                  )
                                }
                              >
                                <Eye
                                  aria-hidden="true"
                                />
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

        {/* Resumen y controles de paginación. */}
        {!cargando &&
          !mensajeError &&
          existenResultados && (
            <footer className="admin-contributions-pagination">
              <p>
                Mostrando{' '}
                {primerResultado} a{' '}
                {ultimoResultado} de{' '}
                {totalResultados}{' '}
                {totalResultados === 1
                  ? 'resultado'
                  : 'resultados'}
              </p>

              <nav aria-label="Paginación de aportaciones">
                <button
                  type="button"
                  title="Página anterior"
                  aria-label="Ir a la página anterior"
                  disabled={
                    paginaActual === 1
                  }
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.max(
                          1,
                          pagina - 1,
                        ),
                    )
                  }
                >
                  <ChevronLeft
                    aria-hidden="true"
                  />
                </button>

                {paginasDisponibles.map(
                  (pagina) => (
                    <button
                      key={pagina}
                      className={
                        pagina ===
                        paginaActual
                          ? 'admin-contributions-pagination__page admin-contributions-pagination__page--active'
                          : 'admin-contributions-pagination__page'
                      }
                      type="button"
                      aria-label={
                        `Ir a la página ${pagina}`
                      }
                      aria-current={
                        pagina ===
                        paginaActual
                          ? 'page'
                          : undefined
                      }
                      onClick={() =>
                        setPaginaActual(
                          pagina,
                        )
                      }
                    >
                      {pagina}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  title="Página siguiente"
                  aria-label="Ir a la página siguiente"
                  disabled={
                    paginaActual ===
                    totalPaginas
                  }
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.min(
                          totalPaginas,
                          pagina + 1,
                        ),
                    )
                  }
                >
                  <ChevronRight
                    aria-hidden="true"
                  />
                </button>
              </nav>
            </footer>
          )}
      </section>
    </section>
  )
}

export default AdminPrincipalContributions