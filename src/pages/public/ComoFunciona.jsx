import {
    ArrowRight,
    Globe2,
    LayoutDashboard,
    LockKeyhole,
    UserRound,
} from 'lucide-react'
import { Link } from 'react-router'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import '../../styles/public/PublicPageAnimation.css'
import '../../styles/public/ComoFunciona.css'

// Informacion disponible sin necesidad de iniciar sesion
const funcionalidadesPublicas = [
    {
        id: 'beneficios',
        titulo: 'Consulta de beneficios',
        descripcion: 'Explora las categorias de becas y ayudas disponibles para conocer las opciones de apoyo que ofrece ASEBEP.',
    },
    {
        id: 'postulacion',
        titulo: 'Guía de postulación',
        descripcion: 'Consulta los requisitos generales y el proceso que debes seguir para presentar correctamente una solicitud.',
    },
    {
        id: 'preguntas',
        titulo: 'Preguntas frecuentes',
        descripcion: 'Encuentra respuestas sobre el proceso de becas, las horas, las aportaciones y el funcionamiento del portal.',
    },
]

// Areas disponibles despues de iniciar sesion en el portal.
const gruposPortal = [
    {
        id: 'seguimiento',
        titulo: 'Seguimiento del becario',
        icono: LayoutDashboard,
        variante: 'blue',
        funcionalidades: [
            {
                id: 'dashboard',
                titulo: 'Panel principal',
                descripcion: 'Consulta el resumen de tus horas acumuladas, aportaciones pendientes y próximas actividades desde un solo lugar.',
            },
            {
                id: 'actividades',
                titulo: 'Gestión de actividades',
                descripcion: 'Revisa las actividades disponibles, inscritas y completadas, junto con las horas correspondientes a cada una.',
            },
        ],
    },
    {
        id: 'gestion-personal',
        titulo: 'Aportaciones y perfil',
        icono: UserRound,
        variante: 'navy',
        funcionalidades: [
            {
                id: 'aportaciones',
                titulo: 'Control de aportaciones',
                descripcion: 'Consulta tu historial, verifica el estado de cada comprobante y registra pagos de uno o varios meses.',
            },
            {
                id: 'perfil',
                titulo: 'Información personal',
                descripcion: 'Revisa tus datos personales y académicos, consulta tu estado como becario y administra tu contraseña.',
            },
        ],
    },
]

function ComoFunciona() {
    return (
    <div className="public-how">
      <PublicNavbar />

      <main className="public-how__main">
        {/* Este contenedor recibe la animación sin mover el elemento main. */}
        <div className="public-how__content public-page-entry">
          {/* Presentación de la página. */}
          <header
            className="public-how__header"
            aria-labelledby="public-how-title"
          >
            <span className="public-how__eyebrow">
              Portal ASEBEP · UNAH
            </span>

            <h1
              id="public-how-title"
              className="public-how__title"
            >
              ¿Cómo funciona la plataforma?
            </h1>

            <p className="public-how__description">
              ASEBEP está organizada para orientar a la
              comunidad estudiantil y brindar a los becarios
              un espacio privado para administrar su
              información, actividades y aportaciones.
            </p>
          </header>

          {/* Información disponible en el área pública. */}
          <section
            className="public-how__section"
            aria-labelledby="public-how-public-title"
          >
            <div className="public-how__section-heading">
              <span
                className="public-how__section-icon public-how__section-icon--blue"
                aria-hidden="true"
              >
                <Globe2 />
              </span>

              <div className="public-how__section-copy">
                <span className="public-how__section-number">
                  Área 01
                </span>

                <h2 id="public-how-public-title">
                  Información para toda la comunidad
                  estudiantil
                </h2>
              </div>
            </div>

            <p className="public-how__section-description">
              Estas secciones pueden consultarse libremente,
              incluso si todavía no cuentas con una beca
              activa o no has iniciado sesión.
            </p>

            <div className="public-how__feature-grid">
              {funcionalidadesPublicas.map(
                (funcionalidad) => (
                  <article
                    key={funcionalidad.id}
                    className="public-how__feature-card public-how__feature-card--blue"
                  >
                    <h3>{funcionalidad.titulo}</h3>
                    <p>{funcionalidad.descripcion}</p>
                  </article>
                ),
              )}
            </div>
          </section>

          {/* Explicación de las herramientas del portal privado. */}
          <section
            className="public-how__section public-how__section--private"
            aria-labelledby="public-how-private-title"
          >
            <div className="public-how__section-heading">
              <span
                className="public-how__section-icon public-how__section-icon--navy"
                aria-hidden="true"
              >
                <LockKeyhole />
              </span>

              <div className="public-how__section-copy">
                <span className="public-how__section-number">
                  Área 02
                </span>

                <h2 id="public-how-private-title">
                  Portal privado para becarios
                </h2>
              </div>
            </div>

            <p className="public-how__section-description">
              Después de iniciar sesión con tu cuenta, podrás
              acceder a las herramientas de seguimiento y
              gestión asociadas a tu beca.
            </p>

            <div className="public-how__groups">
              {gruposPortal.map((grupo) => {
                const IconoGrupo = grupo.icono

                return (
                  <section
                    key={grupo.id}
                    className="public-how__group"
                    aria-labelledby={`public-how-${grupo.id}`}
                  >
                    <div className="public-how__group-heading">
                      <span
                        className={`public-how__group-icon public-how__group-icon--${grupo.variante}`}
                        aria-hidden="true"
                      >
                        <IconoGrupo />
                      </span>

                      <h3 id={`public-how-${grupo.id}`}>
                        {grupo.titulo}
                      </h3>
                    </div>

                    <div className="public-how__feature-grid public-how__feature-grid--compact">
                      {grupo.funcionalidades.map(
                        (funcionalidad) => (
                          <article
                            key={funcionalidad.id}
                            className={`public-how__feature-card public-how__feature-card--${grupo.variante}`}
                          >
                            <h4>{funcionalidad.titulo}</h4>
                            <p>
                              {funcionalidad.descripcion}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          </section>

          {/* Acceso hacia la siguiente sección informativa. */}
          <section
            className="public-how__callout"
            aria-labelledby="public-how-callout-title"
          >
            <div className="public-how__callout-copy">
              <h2 id="public-how-callout-title">
                ¿Quieres conocer los beneficios disponibles?
              </h2>

              <p>
                Explora las alternativas de apoyo que ASEBEP
                pone a disposición de la comunidad
                estudiantil.
              </p>
            </div>

            <Link
              className="public-how__callout-link"
              to="/beneficios"
            >
              Ver beneficios
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}

export default ComoFunciona