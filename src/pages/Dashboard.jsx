import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GraduationCap,
  Info,
  Scale,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

import { Link } from 'react-router'
import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import { useUsuario } from '../hooks/useUsuario.js'
import '../styles/AppLayout.css'
import '../styles/Dashboard.css'

import { useEffect, useState } from 'react'
import {
  listarHistorialActividades,
  listarProximasActividadesInscritas,
} from '../services/estudianteActividadesService.js'
import {
  listarMisMultas,
} from '../services/estudianteMultasService.js'
import {
  ESTADOS_APORTACION,
  listarAportacionesEstudiante,
} from '../services/estudianteAportacionesService.js'
import {
  describirExcesoHoras,
  obtenerResumenHoras,
} from '../utils/becaHoras.js'

/*
 * Convierte un estado como "activo" o "EN_CURSO"
 * en un texto más fácil de mostrar al usuario.
 */
function prepararEstado(estado) {
  const texto = String(estado ?? '')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()

  if (!texto) {
    return 'Sin información'
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

/*
 * Interpreta "YYYY-MM-DD" como fecha local para no
 * desplazar la actividad un día por la zona horaria.
 */
function convertirFechaLocal(texto) {
  const coincidencia = String(texto ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!coincidencia) {
    return null
  }

  const [, anio, mes, dia] = coincidencia.map(Number)

  return new Date(anio, mes - 1, dia)
}

function combinarFechaHora(fecha, hora) {
  const dia = convertirFechaLocal(fecha)
  const partes = String(hora ?? '')
    .trim()
    .match(/^(\d{2}):(\d{2})/)

  if (!dia || !partes) {
    return null
  }

  return new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate(),
    Number(partes[1]),
    Number(partes[2]),
  )
}

function obtenerMomentoActividad(actividad) {
  const inicio = combinarFechaHora(
    actividad?.fecha,
    actividad?.horaInicio,
  )

  const fin = combinarFechaHora(
    actividad?.fecha,
    actividad?.horaFinalizacion,
  )

  return {
    inicio,
    fin: fin ?? inicio,
  }
}

function formatearFechaActividad(fecha) {
  const dia = convertirFechaLocal(fecha)

  if (!dia) {
    return 'Fecha pendiente'
  }

  return new Intl.DateTimeFormat('es-HN', {
    day: 'numeric',
    month: 'long',
  }).format(dia)
}

function TarjetaSiguientePaso({
  proximasInscritas,
  aportacionesEnRevision,
  mesesSinPagar,
  cargando,
}) {
  const ahora = new Date()

  const enCurso = proximasInscritas.find((actividad) => {
    const { inicio, fin } = obtenerMomentoActividad(actividad)

    return (
      inicio && fin && inicio <= ahora && ahora <= fin
    )
  })

  const proxima = proximasInscritas.find((actividad) => {
    const { inicio } = obtenerMomentoActividad(actividad)

    return inicio && inicio > ahora
  })

  let contenido

  if (cargando) {
    contenido = (
      <>
        <p className="next-step__title">
          Revisando tu próxima actividad…
        </p>
      </>
    )
  } else if (enCurso) {
    contenido = (
      <>
        <p className="next-step__title">
          Estás en curso: {enCurso.titulo}
        </p>

        <p className="next-step__detail">
          <Clock3 aria-hidden="true" />
          No olvides registrar tu salida antes de
          que termine.
        </p>

        <Link
          className="summary-action"
          to={`/actividades/${encodeURIComponent(enCurso.id)}`}
        >
          Ver actividad
          <ArrowRight aria-hidden="true" />
        </Link>
      </>
    )
  } else if (proxima) {
    contenido = (
      <>
        <p className="next-step__title">
          Tu próxima actividad: {proxima.titulo}
        </p>

        <p className="next-step__detail">
          <CalendarDays aria-hidden="true" />
          {formatearFechaActividad(proxima.fecha)}
          {proxima.horaInicio
            ? ` · ${proxima.horaInicio} hrs`
            : ''}

          {proxima.lugar
            ? ` · ${proxima.lugar}`
            : ''}
        </p>

        <Link
          className="summary-action"
          to="/actividades"
        >
          Ver actividades
          <ArrowRight aria-hidden="true" />
        </Link>
      </>
    )
  } else if (aportacionesEnRevision > 0) {
    contenido = (
      <>
        <p className="next-step__title">
          Tienes {aportacionesEnRevision}{' '}
          {aportacionesEnRevision === 1
            ? 'aportación en revisión'
            : 'aportaciones en revisión'}
        </p>

        <Link
          className="summary-action"
          to="/aportaciones"
        >
          Ir a aportaciones
          <ArrowRight aria-hidden="true" />
        </Link>
      </>
    )
  } else if (mesesSinPagar > 0) {
    contenido = (
      <>
        <p className="next-step__title">
          Te {mesesSinPagar === 1 ? 'falta' : 'faltan'}{' '}
          {mesesSinPagar}{' '}
          {mesesSinPagar === 1 ? 'mes' : 'meses'} de
          aportación
        </p>

        <Link
          className="summary-action"
          to="/aportaciones"
        >
          Ir a aportaciones
          <ArrowRight aria-hidden="true" />
        </Link>
      </>
    )
  } else {
    contenido = (
      <>
        <p className="next-step__title">
          Estás al día. Nada pendiente.
        </p>

        <p className="next-step__detail">
          <Info aria-hidden="true" />
          Sigue registrando tus actividades para
          avanzar en tus horas.
        </p>
      </>
    )
  }

  return (
    <section
      className="dashboard-next-step"
      aria-labelledby="next-step-title"
    >
      <div className="dashboard-next-step__icon">
        <TrendingUp aria-hidden="true" />
      </div>

      <div className="dashboard-next-step__body">
        <h2 id="next-step-title">Siguiente paso</h2>

        {contenido}
      </div>
    </section>
  )
}

function Dashboard() {
  /*
   * Obtenemos la información compartida por UsuarioProvider.
   */
  const {
    usuario,
    cargandoUsuario,
    errorUsuario,
    cargarUsuario,
  } = useUsuario()


  const [proximasInscritas, setProximasInscritas] = useState([])
  const [actividadesRecientes, setActividadesRecientes] = useState([])
  const [aportacionesEnRevision, setAportacionesEnRevision] = useState(0)
  const [multas, setMultas] = useState([])
  const [cargandoActividades, setCargandoActividades] = useState(true)

  useEffect(() => {
    let componenteActivo = true

    async function cargarActividades() {
      try {
        setCargandoActividades(true)

        const [proximas, historial, aportaciones, multasObtenidas] =
          await Promise.allSettled([
            listarProximasActividadesInscritas(),
            listarHistorialActividades(),
            listarAportacionesEstudiante(),
            listarMisMultas(),
          ])

        if (!componenteActivo) {
          return
        }

        setProximasInscritas(
          proximas.status === 'fulfilled' &&
            Array.isArray(proximas.value)
            ? proximas.value
            : [],
        )

        setActividadesRecientes(
          historial.status === 'fulfilled' &&
            Array.isArray(historial.value)
            ? historial.value.slice(0, 3)
            : [],
        )

        setAportacionesEnRevision(
          aportaciones.status === 'fulfilled' &&
            Array.isArray(aportaciones.value)
            ? aportaciones.value.filter(
              (aportacion) =>
                aportacion.estado ===
                ESTADOS_APORTACION.PENDIENTE,
            ).length
            : 0,
        )

        /*
         * Si el servicio de multas falla, el resto del
         * dashboard sigue funcionando y el bloque no
         * aparece: no se inventan estados.
         */
        setMultas(
          multasObtenidas.status === 'fulfilled'
            ? multasObtenidas.value
            : [],
        )
      } finally {
        if (componenteActivo) {
          setCargandoActividades(false)
        }
      }
    }

    cargarActividades()

    return () => {
      componenteActivo = false
    }
  }, [])

  const datosPersonales =
    usuario?.datosPersonales

  const datosBecario =
    usuario?.datosBecario

  const credenciales =
    usuario?.credenciales

  /*
   * Para el saludo utilizamos únicamente el primer nombre.
   * Si no existe, intentamos utilizar el nombre completo.
   */
  const nombreUsuario =
    datosPersonales?.primerNombre ||
    datosPersonales?.nombreCompleto ||
    'Becario'

  /*
   * La meta se mantiene como acumuladas + faltantes,
   * que es la fórmula con la que el backend entrega
   * sus datos. Así el exceso se detecta sin inventar
   * cifras cuando el becario se adelanta.
   */
  const resumenHoras = obtenerResumenHoras({
    horasAcumuladas:
      datosBecario?.horasAcumuladas ?? 0,
    horasFaltantes:
      datosBecario?.horasFaltantes ?? 0,
    enExceso: true,
  })

  const hayExceso =
    resumenHoras.exceso > 0

  const maximoProgreso =
    Math.max(resumenHoras.meta, 1)

  const estadoBeca = prepararEstado(
    datosBecario?.estadoBeca ||
    (credenciales?.activo
      ? 'activo'
      : 'inactivo'),
  )

  /*
   * Construimos el periodo de inicio utilizando
   * únicamente los datos disponibles.
   */
  const periodoInicio = [
    datosBecario?.periodoInicio,
    datosBecario?.anioInicio,
  ]
    .filter(Boolean)
    .join(' · ')

  const mesesSinPagar = Math.max(
    0,
    datosBecario?.mesesSinPagar ?? 0,
  )

  const aportacionesAlDia =
    mesesSinPagar === 0

  const totalMultasPendientes = multas
    .filter((multa) => !multa.pagada)
    .reduce((total, multa) => total + multa.monto, 0)

  const descripcionAportaciones =
    mesesSinPagar === 1
      ? '1 mes pendiente'
      : `${mesesSinPagar} meses pendientes`

  /*
   * Permite volver a consultar la información si
   * anteriormente ocurrió un error de conexión.
   */
  function reintentarCarga() {
    cargarUsuario().catch(() => undefined)
  }

  return (
    /*
     * app-layout pertenece a AppLayout.css.
     * Divide la pantalla entre la barra lateral
     * y el contenido principal.
     */
    <div className="app-layout">
      {/* Navegación compartida con la página de perfil. */}
      <AppSidebar />

      <section className="app-content">
        {/* Encabezado superior compartido. */}
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <GraduationCap aria-hidden="true" />

            <strong>ASEBEP</strong>
          </div>

          <span className="app-topbar__section">
            Dashboard
          </span>
        </header>

        <main className="dashboard-main">
          {/*
           * Mostramos este estado cuando se realiza
           * nuevamente una consulta del usuario.
           */}
          {cargandoUsuario && (
            <section
              className="hours-panel"
              role="status"
              aria-live="polite"
            >
              <div className="hours-panel__heading">
                <div>
                  <h1>Cargando información</h1>

                  <p>
                    Estamos consultando tus datos de
                    becario.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/*
           * Si la consulta falla, evitamos mostrar
           * cantidades vacías o información inventada.
           */}
          {!cargandoUsuario && errorUsuario && (
            <section
              className="hours-panel"
              role="alert"
            >
              <div className="hours-panel__heading">
                <div>
                  <h1>
                    No pudimos cargar tu información
                  </h1>

                  <p>
                    {errorUsuario.message ||
                      'Ocurrió un error al consultar tus datos.'}
                  </p>
                </div>
              </div>

              <button
                className="summary-action"
                type="button"
                onClick={reintentarCarga}
              >
                Intentar nuevamente
                <ArrowRight aria-hidden="true" />
              </button>
            </section>
          )}

          {/*
           * Este caso funciona como protección adicional
           * si no existe información ni un error registrado.
           */}
          {!cargandoUsuario &&
            !errorUsuario &&
            !usuario && (
              <section
                className="hours-panel"
                role="status"
              >
                <div className="hours-panel__heading">
                  <div>
                    <h1>
                      Información no disponible
                    </h1>

                    <p>
                      No encontramos datos para mostrar
                      en este momento.
                    </p>
                  </div>
                </div>
              </section>
            )}

          {/*
           * El Dashboard principal solamente se muestra
           * cuando UsuarioProvider contiene información.
           */}
          {!cargandoUsuario &&
            !errorUsuario &&
            usuario && (
              <>
                {/* Saludo principal del estudiante. */}
                <header className="dashboard-welcome">
                  <p className="dashboard-eyebrow">
                    Panel principal
                  </p>

                  <h1>
                    Hola,{' '}
                    <span>{nombreUsuario}</span>
                  </h1>

                  <p>
                    Bienvenido a tu panel de control de
                    becas. Aquí está el resumen de tu
                    progreso.
                  </p>
                </header>

                {/* Sección de progreso de horas acumuladas. */}
                <section
                  className="hours-panel"
                  aria-labelledby="hours-title"
                >
                  <GraduationCap
                    className="hours-watermark"
                    aria-hidden="true"
                  />

                  <div className="hours-panel__heading">
                    <div>
                      <h2 id="hours-title">
                        Horas acumuladas
                      </h2>

                      <p>
                        {periodoInicio
                          ? `Inicio de beca: ${periodoInicio}`
                          : 'Periodo de inicio no disponible'}
                      </p>
                    </div>

                    <span className="status-badge">
                      {estadoBeca}
                    </span>
                  </div>

                  <div className="hours-number">
                    <strong>
                      {resumenHoras.acumuladas}
                    </strong>

                    <span>
                      {' '}
                      / {resumenHoras.meta} horas
                    </span>
                  </div>

                  {/*
                   * Barra de progreso accesible.
                   * aria-valuenow contiene el progreso actual.
                   * aria-valuemax contiene la meta total.
                   * aria-valuetext explica el exceso cuando existe.
                   */}
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Progreso de horas acumuladas"
                    aria-valuemin="0"
                    aria-valuemax={maximoProgreso}
                    aria-valuenow={
                      resumenHoras.acumuladas
                    }
                    aria-valuetext={
                      hayExceso
                        ? `${resumenHoras.acumuladas} de ${resumenHoras.meta} horas, ${resumenHoras.exceso} horas adelantadas`
                        : `${resumenHoras.acumuladas} de ${resumenHoras.meta} horas`
                    }
                  >
                    <span
                      className={
                        hayExceso
                          ? 'progress-value progress-value--exceso'
                          : 'progress-value'
                      }
                      style={{
                        width: `${resumenHoras.porcentaje}%`,
                      }}
                    />

                    {/*
                     * El exceso no cambia el llenado: la meta
                     * ya está cubierta y solo se informa aparte.
                     */}
                    {hayExceso && (
                      <span className="progress-badge">
                        Adelantado
                      </span>
                    )}
                  </div>

                  <div className="hours-panel__footer">
                    <span>
                      <Clock3 aria-hidden="true" />

                      {resumenHoras.estado ===
                        'cumplida'
                        ? 'Meta cumplida'
                        : `${Math.max(
                          0,
                          datosBecario
                            ?.horasFaltantes ?? 0,
                        )} horas restantes`}
                    </span>

                    <span>
                      Progreso total:{' '}
                      {resumenHoras.porcentaje}%
                    </span>
                  </div>

                  {hayExceso && (
                    <p
                      className="hours-exceso"
                      role="status"
                    >
                      <TrendingUp aria-hidden="true" />

                      {describirExcesoHoras(
                        resumenHoras.exceso,
                      )}{' '}
                      frente a la meta
                    </p>
                  )}
                </section>

                {/* Resumen de aportaciones y multas. */}
                <section
                  className="dashboard-summary"
                  aria-label="Resumen financiero"
                >
                  {/* Tarjeta de aportaciones. */}
                  <article className="summary-card">
                    <div className="summary-card__icon summary-card__icon--blue">
                      <WalletCards aria-hidden="true" />
                    </div>

                    <div className="summary-card__content">
                      <div>
                        <span className="summary-card__label">
                          Aportaciones
                        </span>

                        <h2>
                          {aportacionesAlDia
                            ? 'Al día'
                            : descripcionAportaciones}
                        </h2>
                      </div>

                      {aportacionesAlDia ? (
                        <span className="positive-status">
                          <span aria-hidden="true" />

                          Sin pagos pendientes
                        </span>
                      ) : (
                        <p className="summary-card__description">
                          Tienes aportaciones pendientes
                          registradas.
                        </p>
                      )}

                      <div className="summary-card__details">
                        <span>
                          <CalendarDays
                            aria-hidden="true"
                          />

                          Meses sin pagar:{' '}
                          {mesesSinPagar}
                        </span>

                        <span>
                          Información proporcionada por
                          ASEBEP
                        </span>
                      </div>
                    </div>

                    <Link
                      className="summary-action"
                      to="/aportaciones"
                    >
                      Ver historial

                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </article>
                </section>

                {/*
                 * Las multas solo ocupan espacio cuando
                 * el becario tiene alguna registrada.
                 */}
                {multas.length > 0 && (
                  <section
                    className="dashboard-fines"
                    aria-labelledby="multas-title"
                  >
                    <div className="dashboard-fines__heading">
                      <h2 id="multas-title">
                        Mis multas
                      </h2>

                      <span>
                        {multas.length}{' '}
                        {multas.length === 1
                          ? 'multa'
                          : 'multas'}
                        {totalMultasPendientes > 0
                          ? ` · L ${totalMultasPendientes}.00 pendientes`
                          : ' · sin saldo pendiente'}
                      </span>
                    </div>

                    <ul className="dashboard-fines__list">
                      {multas.map((multa) => (
                        <li key={multa.id}>
                          <div className="summary-card__icon summary-card__icon--red">
                            <Scale aria-hidden="true" />
                          </div>

                          <div className="summary-card__content">
                            <strong>
                              {multa.motivo ||
                                'Multa registrada'}
                            </strong>

                            <span className="dashboard-fines__date">
                              <CalendarDays
                                aria-hidden="true"
                              />

                              {formatearFechaActividad(
                                multa.fechaMulta,
                              )}
                            </span>
                          </div>

                          <span className="dashboard-fines__amount">
                            L {multa.monto}.00
                          </span>

                          <span
                            className={
                              multa.pagada
                                ? 'fines-status fines-status--pagada'
                                : 'fines-status fines-status--pendiente'
                            }
                          >
                            {multa.pagada
                              ? 'Pagada'
                              : 'Pendiente de pago'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                  <TarjetaSiguientePaso
                    proximasInscritas={proximasInscritas}
                    aportacionesEnRevision={aportacionesEnRevision}
                    mesesSinPagar={mesesSinPagar}
                    cargando={cargandoActividades}
                  />

                  <section
                    className="dashboard-recent"
                    aria-labelledby="recent-title"
                  >
                    <div className="dashboard-recent__heading">
                      <h2 id="recent-title">
                        Actividades recientes
                      </h2>

                      <Link
                        className="summary-action"
                        to="/actividades"
                      >
                        Ver historial completo

                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </div>

                    {actividadesRecientes.length === 0 ? (
                      <div className="dashboard-recent__empty">
                        <CalendarDays aria-hidden="true" />

                        <p>
                          Todavía no tienes actividades
                          acreditadas.
                        </p>
                      </div>
                    ) : (
                      <ul className="dashboard-recent__list">
                        {actividadesRecientes.map(
                          (actividad) => (
                            <li
                              key={
                                actividad.id ??
                                actividad.actividadId
                              }
                            >
                              <div className="dashboard-recent__icon">
                                <CalendarDays
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="dashboard-recent__body">
                                <strong>
                                  {actividad.titulo ||
                                    'Actividad'}
                                </strong>

                                <span>
                                  {formatearFechaActividad(
                                    actividad.fecha,
                                  )}
                                </span>
                              </div>

                              <span className="dashboard-recent__hours">
                                {actividad.horasRegistradas ??
                                  actividad.horasAcreditables ??
                                  0}
                                {' '}
                                h
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </section>
                </>
              )}
        </main>

        {/**
        {/*
         * Navegación inferior para celulares.
         * AppLayout.css la oculta en computadoras.
         */}
        <MobileNavigation />
      </section>
    </div>
  )
}

export default Dashboard
