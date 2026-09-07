import {
    CalendarDays,
    Clock3,
    Eye,
    GraduationCap,
    MapPin,
    RotateCcw,
    Search,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import {
    listarActividadesDisponibles,
    listarHistorialActividades,
    listarProximasActividadesInscritas,
} from '../services/estudianteActividadesService.js'
import '../styles/AppLayout.css'
import '../styles/Activities.css'

/*
* Identifacadores internos de las 3 vistas.
*
* Estos valores se utilizan para relacionar cada pestaña con su coleccion de actividades
* y evitar cadenas repetidas en el componente.
*/
const VISTAS = Object.freeze({
    disponibles: 'disponibles',
    proximas: 'proximas',
    historial: 'historial',
})

// Informacion visual correspondiente a cada pestaña.
const INFORMACION_VISTAS =
    Object.freeze({
        [VISTAS.disponibles]: {
            nombre: 'Actividades disponibles',
            descripcion: 'Consulta las actividades publicadas por ASEBEP.',
            mensajeVacio: 'No hay actividades disponibles en este momento.',
        },

        [VISTAS.proximas]: {
            nombre: 'Mis próximas actividades',
            descripcion: 'Revisa las actividades en las que te encuentras inscrito.',
            mensajeVacio: 'Todavía no estás inscrito en una próxima actividad.',
        },

        [VISTAS.historial]: {
            nombre: 'Historial',
            descripcion: 'Consulta las actividades en las que tu asistencia fue confirmada.',
            mensajeVacio: 'Todavía no tienes actividades completadas en el historial.',
        },
    })

    /*
    * Prepara los textos utilizados en el buscador.
    *
    * La conversion a minusculas permite encontrar resultados sin importar la forma que se escribio.
    */
   function normalizarBusqueda(valor) {
    return String(valor ?? '')
        .trim()
        .toLocaleLowerCase('es')
   }

   // Convierte una fecha YYYY-MM-DD en los valores necesarios para la tarjeta.
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
            fechaCompleta: 'Fecha pendiente',
        }
    }

    const [
        anio,
        mes,
        dia,
    ] = fecha.split('-').map(Number)

    const fechaLocal = new Date(
        anio,
        mes - 1,
        dia,
    )

    // Tambien verificamos que la fecha exista
    const fechaValida = fechaLocal.getFullYear() === anio &&
    fechaLocal.getMonth() === mes -1 && fechaLocal.getDate() === dia

    if (!fechaValida) {
        return {
            dia: '--',
            mes: '---',
            fechaCompleta: 'Fecha pendiente',
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
                }
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

   // Convierte una hora HH:mm al formato habitual de Honduras.
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
    ] = hora.split(':').map(Number)

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
   * Construye el intervalo que se mostrara en cada tarjeta.
   * Si falta alguna de las 2 horas, evitamos presentar informacion incompleta.
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

        if (!horaInicio || !horaFinalizacion) {
            return 'Horario pendiente'
        }

        return (
            `${horaInicio} - ` +
            `${horaFinalizacion}`
        )
  }

  // Agrega la forma singular o plural correspondiente a las horas acreditables.
  function obtenerTextoHoras(cantidad) {
    const horas = Math.max(
        0,
        Number(cantidad) || 0,
    )

    return `${horas} ${
        horas === 1 ? 'hora' : 'horas'
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

    if (!Number.isFinite(cuposTotales) || cuposTotales <= 0 ||
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
                (cuposDisponibles / cuposTotales) * 100,
            ),
        ),
    )
}

// Tarjeta reutilizable para las 3 vistas.
function ActivityCard({
    actividad,
    vista,
    onVerActividad,
}) {
    const {
        dia,
        mes,
        fechaCompleta,
    } = obtenerPartesFecha(
        actividad.fecha,
    )

    const esHistorial = vista === VISTAS.historial

    // En el historial tienen prioridad las horas realmente registradas.
    const horasMostradas =
        esHistorial
        ? actividad.horasRegistradas ??
        actividad.horasAcreditables
        : actividad.horasAcreditables

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
            ? actividad.cuposDisponibles
            : 0

    return (
    <article className="student-activity-card">
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

          {obtenerHorario(actividad)}
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
              aria-label={`Cupos disponibles para ${actividad.titulo}`}
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

      {/* Abre la vista completa de la actividad seleccionada */}
      <button
        className="student-activity-card__view"
        type="button"
        aria-label={`Ver actividad: ${actividad.titulo}`}
        title="Ver actividad"
        onClick={() =>
          onVerActividad(actividad)
        }
      >
        <Eye aria-hidden="true" />
      </button>
    </article>
  )
}

function Activities() {
  /*
   * La pantalla inicia mostrando las actividades
   * disponibles para el estudiante.
   */
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
   * cuando el estudiante presiona "Intentar nuevamente".
   */
  const [
    intentoCarga,
    setIntentoCarga,
  ] = useState(0)

  /*
   * Consultamos las tres colecciones desde el servicio.
   */
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
            Array.isArray(disponibles)
              ? disponibles
              : [],

          [VISTAS.proximas]:
            Array.isArray(proximas)
              ? proximas
              : [],

          [VISTAS.historial]:
            Array.isArray(historial)
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

    cargarActividades()

    return () => {
      componenteActivo = false
    }
  }, [intentoCarga])

  const informacionVista =
    INFORMACION_VISTAS[vistaActiva]
  /*
   * El buscador solamente trabaja con la colección
   * perteneciente a la pestaña seleccionada.
   *
   * Se permite buscar por:
   * - Título.
   * - Descripción.
   * - Lugar.
   */
  const actividadesFiltradas =
    useMemo(() => {
        const actividadesVista =
            actividades[vistaActiva] ?? []

        const termino =
            normalizarBusqueda(busqueda)

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
                    .map(normalizarBusqueda)
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
   * Limpiamos la búsqueda al cambiar de pestaña
   * para evitar que un filtro anterior oculte información.
   */
  function cambiarVista(
    nuevaVista,
  ) {
    setVistaActiva(nuevaVista)
    setBusqueda('')
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

  // Abre el detalle correspondiente a la actividad seleccionada mediante su id.
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

    navigate(`/actividades/${
      encodeURIComponent(
        identificador,
      )
    }`,)
  }

  return (
    <div className="app-layout">
      {/* Navegación lateral compartida del portal. */}
      <AppSidebar />

      <section className="app-content">
        {/* Encabezado superior compartido. */}
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <GraduationCap aria-hidden="true" />

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
              Consulta las actividades publicadas
              por ASEBEP y encuentra oportunidades
              para completar tus horas.
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
                    key={identificador}
                    id={`tab-${identificador}`}
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
                <Search aria-hidden="true" />

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
                onClick={limpiarFiltrosActividades}
                disabled={!busqueda}
              >
                <RotateCcw aria-hidden="true" />

                <span>Limpiar filtros</span>
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
              aria-labelledby={`tab-${vistaActiva}`}
              className="student-activities-results"
            >
              <header className="student-activities-results__heading">
                <div>
                  <h2>
                    {informacionVista.nombre}
                  </h2>

                  <p>
                    {
                      informacionVista.descripcion
                    }
                  </p>
                </div>

                {!cargando &&
                  !errorCarga && (
                    <span>
                      {
                        actividadesFiltradas.length
                      }{' '}
                      {actividadesFiltradas.length ===
                      1
                        ? 'actividad'
                        : 'actividades'}
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
                actividadesFiltradas.length ===
                  0 && (
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
                        : informacionVista.mensajeVacio}
                    </p>
                  </div>
                )}

              {/* Listado correspondiente a la pestaña activa. */}
              {!cargando &&
                !errorCarga &&
                actividadesFiltradas.length >
                  0 && (
                  <div className="student-activities-list">
                    {actividadesFiltradas.map(
                      (actividad) => (
                        <ActivityCard
                          key={
                            actividad.inscripcionId ??
                            actividad.id
                          }
                          actividad={
                            actividad
                          }
                          vista={
                            vistaActiva
                          }
                          onVerActividad={
                            abrirDetalleActividad
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
    </div>
  )
}

export default Activities