import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GraduationCap,
  Scale,
  WalletCards,
} from 'lucide-react'

import { Link } from 'react-router'
import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import { useUsuario } from '../hooks/useUsuario.js'
import '../styles/AppLayout.css'
import '../styles/Dashboard.css'

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
   * Math.max impide mostrar cantidades negativas
   */
  const horasAcumuladas = Math.max(
    0,
    datosBecario?.horasAcumuladas ?? 0,
  )

  const horasRestantes = Math.max(
    0,
    datosBecario?.horasFaltantes ?? 0,
  )

  /*
   * El backend entrega horas acumuladas y faltantes.
   * Sumamos ambas cantidades para obtener la meta total.
   */
  const metaHoras =
    horasAcumuladas + horasRestantes

  /*
   * Evitamos dividir entre cero cuando todavía
   * no existe información de horas.
   */
  const porcentaje =
    metaHoras > 0
      ? Math.min(
          100,
          Math.round(
            (horasAcumuladas / metaHoras) *
              100,
          ),
        )
      : 0

  const maximoProgreso =
    Math.max(metaHoras, 1)

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
                      {horasAcumuladas}
                    </strong>

                    <span>
                      {' '}
                      / {metaHoras} horas
                    </span>
                  </div>

                  {/*
                   * Barra de progreso accesible.
                   * aria-valuenow contiene el progreso actual.
                   * aria-valuemax contiene la meta total.
                   */}
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Progreso de horas acumuladas"
                    aria-valuemin="0"
                    aria-valuemax={
                      maximoProgreso
                    }
                    aria-valuenow={
                      horasAcumuladas
                    }
                  >
                    <span
                      className="progress-value"
                      style={{
                        width: `${porcentaje}%`,
                      }}
                    />
                  </div>

                  <div className="hours-panel__footer">
                    <span>
                      <Clock3 aria-hidden="true" />

                      {horasRestantes} horas restantes
                    </span>

                    <span>
                      Progreso total: {porcentaje}%
                    </span>
                  </div>
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

                  {/* Tarjeta de multas. */}
                  <article className="summary-card">
                    <div className="summary-card__icon summary-card__icon--red">
                      <Scale aria-hidden="true" />
                    </div>

                    <div className="summary-card__content">
                      <div>
                        <span className="summary-card__label">
                          Multas
                        </span>

                        <h2>Sin información</h2>
                      </div>

                      <p className="summary-card__description">
                        La información de penalizaciones
                        estará disponible cuando exista
                        el endpoint correspondiente.
                      </p>
                    </div>
                  </article>
                </section>
              </>
            )}
        </main>

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