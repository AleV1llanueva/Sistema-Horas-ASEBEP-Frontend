import {
    Archive, CalendarDays, Eye, History, LoaderCircle, Pencil, Plus, Power, Search,
    Trash2, TriangleAlert,
} from 'lucide-react'
import {
    useEffect, useMemo, useState,
} from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
    listarActividades,
} from '../services/adminActividadesService.js'
import '../styles/AdminPrincipalActivities.css'

const ESTADOS_VIGENTES = [
    'programada',
    'en-curso',
]

function normalizarBusqueda(valor) {
    return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatearFecha(fecha) {
    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return 'Sin fecha'
    }

    const [
        anio, mes, dia,
    ] = fecha.split('-').map(Number)

    const fechaLocal = new Date(
        anio,
        mes - 1,
        dia,
    )

    if (
        fechaLocal.getFullYear() !== anio || fechaLocal.getMonth() !== mes - 1 ||
        fechaLocal.getDate() !== dia
    ) {
        return 'Sin fecha'
    }

    return new Intl.DateTimeFormat(
        'es-HN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(fechaLocal)
}

function formatearEstado(estado) {
    const estadoNormalizado = String(estado ?? '')
    .trim()
    .toLowerCase()

    const nombres = {
        programada: 'Programada',
        'en-curso': 'En curso',
    }

    return (
        nombres[estadoNormalizado] ?? 'Sin estado'
    )
}

function AdminPrincipalActivities() {
    const [
        actividades, setActividades,
    ] = useState([])

    const [ cargando, setCargando,
    ] = useState(true)

    const [ error, setError,
    ] = useState('')

    const [ recarga, setRecarga,
    ] = useState(0)

    const [ busqueda, setBusqueda,
    ] = useState('')

    const [ estadoSeleccionado, setEstadoSeleccionado,
    ] = useState('todos')

    const [
        visibilidadSeleccionada, setVisibilidadSeleccionada,
    ] = useState('activas')

    /*
    * Carga las actividades simuladas al ingresar y cuando el administrador solicita reitentar.
    */
   useEffect(() => {
    let componenteMontado = true

    async function cargarActividades() {
        setCargando(true)
        setError('')

        try {
            const actividadesObtenidas = await listarActividades()

            if (!componenteMontado) {
                return
            }

            setActividades(
                Array.isArray(
                    actividadesObtenidas,
                )
                    ? actividadesObtenidas
                    : [],
            )
        } catch (errorCarga) {
            if (!componenteMontado) {
                return
            }

            setActividades([])

            setError(
                errorCarga instanceof Error
                    ? errorCarga.message
                    : 'No fue posible cargar las actividades.',
            )
        } finally {
            if (componenteMontado) {
                setCargando(false)
            }
        }
    }

    cargarActividades()

    return () => {
        componenteMontado = false
    }
   }, [recarga])

   /* Mantiene fuera del listado las actividades
   finalizadas, canceladas y elimindas */
   const actividadesVigentes =
   useMemo(
    () =>
        actividades.filter(
            (actividad) =>
                ESTADOS_VIGENTES.includes(
                    actividad.estado,
                ) && actividad.eliminada !== true,
        ),
        [actividades],
   )

   /* Aplica busqueda, estado y visibilidad sin modificar
   el arreglo original recibido desde el servicio. */
   const actividadesFiltradas = useMemo(() => {
    const textoBuscado = normalizarBusqueda(busqueda)

    return actividadesVigentes.filter(
        (actividad) => {
            const coincideBusqueda = !textoBuscado || normalizarBusqueda(
                actividad.titulo,
            ).includes(textoBuscado) || normalizarBusqueda(
                actividad.lugar,
            ).includes(textoBuscado)

            const coincideEstado = estadoSeleccionado === 'todos' || actividad.estado === estadoSeleccionado

            const actividadActiva = actividad.activa !== false
            const coincideVisibilidad = visibilidadSeleccionada ===
            'activas'
            ? actividadActiva
            : !actividadActiva

            return (coincideBusqueda && coincideEstado && coincideVisibilidad)
        },
    )
   }, [
    actividadesVigentes,
    busqueda,
    estadoSeleccionado,
    visibilidadSeleccionada,
   ])

   const existenActividades = actividadesVigentes.length > 0
   const existenResultados = actividadesFiltradas.length > 0

   function mostrarFuncionPendiente(
    nombreFuncion,
   ) {
    toast.info(`${nombreFuncion} estará disponible próximamente`,

    )
   }

   function reintentarCarga() {
    setRecarga(
        (valorActual) =>
            valorActual + 1,
    )
   }

   return (
    <div className="admin-activities-page">
      <header className="admin-activities-heading">
        <div>
          <p className="admin-activities-heading__eyebrow">
            Gestión de actividades
          </p>

          <h1>Actividades</h1>

          <p>
            Administra las actividades vigentes
            y controla cuáles estarán disponibles
            para los estudiantes.
          </p>
        </div>

        <div className="admin-activities-heading__actions">
          <button
            className="admin-activities-history-button"
            type="button"
            onClick={() =>
              mostrarFuncionPendiente(
                'El historial de actividades',
              )
            }
          >
            <History aria-hidden="true" />
            Historial
          </button>

          <Link
            className="admin-activities-create-button"
            to="/admin-principal/actividades/crear"
          >
            <Plus aria-hidden="true" />
            Crear actividad
          </Link>
        </div>
      </header>

      {!cargando && !error && (
        <section
          className="admin-activities-toolbar"
          aria-label="Filtros de actividades"
        >
          <label className="admin-activities-search">
            <span>Buscar actividad</span>

            <div className="admin-activities-search__control">
              <Search aria-hidden="true" />

              <input
                type="search"
                value={busqueda}
                placeholder="Buscar por título o lugar"
                onChange={(evento) =>
                  setBusqueda(
                    evento.target.value,
                  )
                }
              />
            </div>
          </label>

          <label className="admin-activities-filter">
            <span>Estado</span>

            <select
              value={estadoSeleccionado}
              onChange={(evento) =>
                setEstadoSeleccionado(
                  evento.target.value,
                )
              }
            >
              <option value="todos">
                Todos los estados
              </option>

              <option value="programada">
                Programadas
              </option>

              <option value="en-curso">
                En curso
              </option>
            </select>
          </label>

          <label className="admin-activities-filter">
            <span>Visibilidad</span>

            <select
              value={
                visibilidadSeleccionada
              }
              onChange={(evento) =>
                setVisibilidadSeleccionada(
                  evento.target.value,
                )
              }
            >
              <option value="activas">
                Activas
              </option>

              <option value="desactivadas">
                Desactivadas
              </option>
            </select>
          </label>
        </section>
      )}

      {cargando && (
        <section
          className="admin-activities-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-activities-state__loader"
            aria-hidden="true"
          />

          <h2>Cargando actividades</h2>

          <p>
            Estamos preparando la información
            de las actividades.
          </p>
        </section>
      )}

      {!cargando && error && (
        <section
          className="admin-activities-state admin-activities-state--error"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />

          <h2>
            No fue posible cargar las actividades
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={reintentarCarga}
          >
            Intentar nuevamente
          </button>
        </section>
      )}

      {!cargando &&
        !error &&
        !existenActividades && (
          <section className="admin-activities-state">
            <CalendarDays aria-hidden="true" />

            <h2>
              No hay actividades vigentes
            </h2>

            <p>
              Cuando publiques una actividad,
              aparecerá en este espacio.
            </p>

            <Link
              to="/admin-principal/actividades/crear"
            >
              <Plus aria-hidden="true" />
              Crear primera actividad
            </Link>
          </section>
        )}

      {!cargando &&
        !error &&
        existenActividades && (
          <section
            className="admin-activities-list"
            aria-labelledby="admin-activities-list-title"
          >
            <header className="admin-activities-list__header">
              <div>
                <p>Listado</p>

                <h2 id="admin-activities-list-title">
                  Actividades vigentes
                </h2>
              </div>

              <span>
                {actividadesFiltradas.length}{' '}
                {actividadesFiltradas.length ===
                1
                  ? 'resultado'
                  : 'resultados'}
              </span>
            </header>

            {!existenResultados ? (
              <div className="admin-activities-no-results">
                <Search aria-hidden="true" />

                <h3>
                  No encontramos resultados
                </h3>

                <p>
                  Cambia la búsqueda o los filtros
                  seleccionados.
                </p>
              </div>
            ) : (
              <div className="admin-activities-management-table-wrapper">
                <table className="admin-activities-management-table">
                  <caption>
                    Listado administrativo de actividades
                    vigentes
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">
                        Actividad
                      </th>

                      <th scope="col">
                        Fecha y horario
                      </th>

                      <th scope="col">
                        Lugar
                      </th>

                      <th scope="col">
                        Cupos
                      </th>

                      <th scope="col">
                        Estado
                      </th>

                      <th scope="col">
                        Visibilidad
                      </th>

                      <th scope="col">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {actividadesFiltradas.map(
                      (actividad) => (
                        <tr key={actividad.id}>
                          <th scope="row">
                            <div className="admin-activity-name">
                              <span>
                                <CalendarDays
                                  aria-hidden="true"
                                />
                              </span>

                              <div>
                                <strong>
                                  {actividad.titulo ||
                                    'Actividad sin título'}
                                </strong>

                                <small>
                                  {
                                    actividad.horasAcreditables
                                  }{' '}
                                  {actividad.horasAcreditables ===
                                  1
                                    ? 'hora acreditable'
                                    : 'horas acreditables'}
                                </small>
                              </div>
                            </div>
                          </th>

                          <td>
                            <div className="admin-activity-schedule">
                              <time
                                dateTime={
                                  actividad.fecha
                                }
                              >
                                {formatearFecha(
                                  actividad.fecha,
                                )}
                              </time>

                              <small>
                                {actividad.horaInicio ||
                                  'Sin hora'}
                                {' – '}
                                {actividad.horaFinalizacion ||
                                  'Sin hora'}
                              </small>
                            </div>
                          </td>

                          <td>
                            {actividad.lugar ||
                              'Lugar por confirmar'}
                          </td>

                          <td>
                            {
                              actividad.cuposDisponibles
                            }
                          </td>

                          <td>
                            <span
                              className={
                                'admin-activity-state ' +
                                `admin-activity-state--${actividad.estado}`
                              }
                            >
                              {formatearEstado(
                                actividad.estado,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                actividad.activa !==
                                false
                                  ? 'admin-activity-visibility admin-activity-visibility--active'
                                  : 'admin-activity-visibility admin-activity-visibility--inactive'
                              }
                            >
                              {actividad.activa !==
                              false
                                ? 'Activa'
                                : 'Desactivada'}
                            </span>
                          </td>

                          <td>
                            <div className="admin-activity-actions">
                              <button
                                type="button"
                                title="Ver actividad"
                                aria-label={`Ver ${actividad.titulo}`}
                                onClick={() =>
                                  mostrarFuncionPendiente(
                                    'Ver actividad',
                                  )
                                }
                              >
                                <Eye aria-hidden="true" />
                              </button>

                              <button
                                type="button"
                                title="Editar actividad"
                                aria-label={`Editar ${actividad.titulo}`}
                                onClick={() =>
                                  mostrarFuncionPendiente(
                                    'Editar actividad',
                                  )
                                }
                              >
                                <Pencil aria-hidden="true" />
                              </button>

                              <button
                                type="button"
                                title={
                                  actividad.activa !==
                                  false
                                    ? 'Desactivar actividad'
                                    : 'Activar actividad'
                                }
                                aria-label={
                                  actividad.activa !==
                                  false
                                    ? `Desactivar ${actividad.titulo}`
                                    : `Activar ${actividad.titulo}`
                                }
                                onClick={() =>
                                  mostrarFuncionPendiente(
                                    actividad.activa !==
                                    false
                                      ? 'Desactivar actividad'
                                      : 'Activar actividad',
                                  )
                                }
                              >
                                <Power aria-hidden="true" />
                              </button>

                              <button
                                className="admin-activity-actions__delete"
                                type="button"
                                title="Eliminar actividad"
                                aria-label={`Eliminar ${actividad.titulo}`}
                                onClick={() =>
                                  mostrarFuncionPendiente(
                                    'Eliminar actividad',
                                  )
                                }
                              >
                                <Trash2 aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      <div
        className="admin-activities-future-note"
        role="note"
      >
        <Archive aria-hidden="true" />

        <p>
          Las opciones para consultar, editar,
          activar, desactivar y eliminar estarán
          disponibles en el siguiente avance.
        </p>
      </div>
    </div>
  )
}

export default AdminPrincipalActivities
