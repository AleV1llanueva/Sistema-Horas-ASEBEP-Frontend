import { useState } from 'react'
import { ArrowRight, Bell, CalendarDays, Check, Clock3,
    Menu, GraduationCap, X,
} from 'lucide-react'
import { Link, NavLink } from 'react-router'
import logoAsebep from '../assets/asebep-logo.png'
import '../styles/Home.css'

const enlacesNavegacion = [
    {
        texto: 'Inicio',
        destino: '/',
        fin: true,
    },
    {
        texto: 'Beneficios',
        destino: '/beneficios',
    },
    {
        texto: 'Cómo funciona',
        destino: '/como-funciona',
    },
    {
        texto: 'Preguntas frecuentes',
        destino: '/preguntas-frecuentes',
    },
]

// Los beneficios se almacenan en una coleccion para evitar repetir manualmente la misma estructura.
const beneficios = [
    {
        titulo: 'Consulta tu progreso',
        descripcion: 'Revisa tus horas acumuladas y conoce cuánto falta para alcanzar tu meta.',
        icono: Clock3,
    },
    {
        titulo: 'Descubre actividades',
        descripcion: 'Encuentra oportunidades disponibles y consulta todos sus detalles.',
        icono: CalendarDays,
    },
    {
        titulo: 'Mantente informado',
        descripcion: 'Recibe comunicados importantes y revisa el estado de tus aportaciones.',
        icono: Bell,
    },
]

function Home() {
    const [menuAbierto, setMenuAbierto] = useState(false)

    // Cierra la navegacion movil despues de seleccionar un enelace
    function cerrarMenu() {
        setMenuAbierto(false)
    }

    return (
        <div className="student-home">
            {/* Encabezado publico de ASEBEP. */}
            <header className="student-home__header">
                <div className="student-home__header-inner">
                    <Link className="student-home__brand"
                    to="/"
                    onClick={cerrarMenu}
                    aria-label="Ir a la página principal de ASEBEP"
                    >
                        <span
                            className="student-home__brand-icon"
                            aria-hidden="true"
                            >
                                <img className="student-home__brand-logo" src={logoAsebep} alt="" />
                            </span>

                            <span className="student-home__brand-copy">
                                <strong>ASEBEP</strong>
                                <small>
                                    Portal de Gestión de Becas
                                </small>
                            </span>
                    </Link>

                    {/* Este boton solo sera visible cuando no exista espacio para mostrar la navegacion completa.*/}
                    <button
                        className="student-home__menu-button"
                        type="button"
                        onClick={() =>
                            setMenuAbierto(
                                (estadoActual) => !estadoActual,
                            )
                        }
                        aria-expanded={menuAbierto}
                        aria-controls="student-home-navigation"
                        aria-label={
                            menuAbierto
                            ? 'Cerrar menú de navegación'
                            : 'Abrir menú de navegación'
                        }
                        >
                            {menuAbierto ? (
                                <X aria-hidden="true" />
                            ) : (
                                <Menu aria-hidden="true" />
                            )}
                        </button>

                        <nav
                            id="student-home-navigation"
                            className={
                                menuAbierto
                                ? 'student-home__navigation student-home__navigation--open'
                                : 'student-home__navigation'
                            }
                            aria-label="Navegación principal"
                            >
                                <div className="student-home__links">
                                    {enlacesNavegacion.map(
                                        (enlace) => (
                                            <NavLink
                                            key={enlace.destino}
                                            className={({
                                                isActive,
                                           }) =>
                                                isActive
                                                ? 'student-home__link student-home__link--active'
                                                : 'student-home__link'
                                            }
                                            to={enlace.destino}
                                            end={enlace.fin}
                                            onClick={cerrarMenu}
                                            >
                                                {enlace.texto}
                                            </NavLink>
                                        ),
                                    )}
                                </div>

                                <div className="student-home__actions">
                                    <Link
                                        className="student-home__login-link"
                                        to="/login"
                                        onClick={cerrarMenu}
                                        >
                                            Iniciar sesión
                                    </Link>
                                </div>
                        </nav>
                </div>
            </header>

            <main>
                {/* Presentacion principal del portal estudiantil. */}
                <section
                    className="student-home__hero"
                    aria-labelledby="student-home-title"
                    >
                        <div className="student-home__hero-copy">
                            <p className="student-home__eyebrow">
                                Portal para estudiantes becarios
                            </p>

                            <h1 id="student-home-title">
                                Gestiona tu beca,
                                <span>logra tu meta</span>
                            </h1>

                            <p className="student-home__introduction">
                                Consulta tus horas, descubre nuevas
                                actividades y mantente al día con tus
                                aportaciones desde un solo lugar.
                            </p>

                            <div className="student-home__hero-actions">
                                <Link className="student-home__primary-button" to="/login">
                                Ingresar al portal<ArrowRight aria-hidden="true" /></Link>

                                <Link className="student-home__secondary-button" to="/como-funciona">
                                Conocer cómo funciona</Link>
                            </div>

                            <ul className="student-home__trust-list" aria-label="Características del portal">
                                <li><Check aria-hidden="true" />
                                Información clara</li>

                                <li><Check aria-hidden="true" />
                                Seguimiento seguro</li>

                                <li>
                                    <Check aria-hidden="true" />
                                    Acceso institucional
                                </li>
                            </ul>
                        </div>

                        {/*El lado derecho se reserva exclusivamente para la identidad visual de ASEBEP */}
                        <div className="student-home__hero-visual">
                            <div className="student-home__logo-stage" aria-labelledby="student-home-logo-title">
                                    <div className="student-home__animated-logo">
                                        <span className="student-home__animated-logo-icon" aria-hidden="true">
                                            <img className="student-home__hero-logo" src={logoAsebep} alt="" />
                                        </span>

                                        <div className="student-home__animated-logo-copy">
                                            <h2 id="student-home-logo-title">
                                                ASEBEP
                                            </h2>
                                            <p>Portal de Gestión de Becas</p>
                                        </div>
                                    </div>
                                    
                                    <p className="student-home__logo-message">
                                        Información clara para avanzar con tu beca.
                                    </p>
                                </div>  
                            </div>
                    </section>

                    {/* Resumen de los principales beneficios del portal */}
                    <section className="student-home__benefits" aria-labelledby="benefits-title">
                        <header className="student-home__section-heading">
                            <h2 id="benefits-title">
                                Todo lo que necesitas, en un solo lugar
                            </h2>

                            <p>Una experiencia sencilla para acompañar cada etapa de tu beca.</p>
                        </header>

                        <div className="student-home__benefit-grid">
                            {beneficios.map((beneficio) => {
                                const Icono = beneficio.icono

                                return (
                                    <article className="student-home__benefit-card"
                                    key={beneficio.titulo}
                                    >
                                        <span className="student-home__benefit-icon" aria-hidden="true">
                                            <Icono />
                                        </span>

                                        <div>
                                            <h3>
                                                {beneficio.titulo}
                                            </h3>

                                            <p>{beneficio.descripcion}</p>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </section>

                    {/* Cierre institucional de la pagina principal.*/}
                    <section className="student-home__support" aria-labelledby="support-title">
                        <div className="student-home__support-heading">
                            <GraduationCap aria-hidden="true" />

                            <div>
                                <h2 id="support-title">
                                    Estamos para acompañarte
                                </h2>
                                <p>Tu proceso de beca también merece información clara.</p>
                            </div>
                        </div>

                        <div className="student-home__support-action">
                            <p>Si tienes dudas o necesitas apoyo, consulta nuestras respuestas frecuentes.</p>

                            <Link to="/preguntas-frecuentes">
                                Consultar ayuda
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
            </main>
        </div>
    )
}

export default Home