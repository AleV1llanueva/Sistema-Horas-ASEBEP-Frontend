import {
  ArrowRight,
  CircleCheck,
} from 'lucide-react'
import { Link } from 'react-router'

import imgBeneficios from '../../assets/img_beneficios_heroes.jpg'
import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import '../../styles/public/PublicPageAnimation.css'
import '../../styles/public/Beneficios.css'

// Beneficios mostrados en las tarjetas informativas.
const beneficiosDisponibles = [
  {
    id: 'movilidad',
    etiqueta: 'Movilidad',
    titulo: 'Ayuda financiera por movilidad estudiantil',
    descripcion: 'Asignación destinada a cubrir parcial o totalmente gastos relacionados con actividades académicas, artísticas, deportivas, culturales o de voluntariado dentro y fuera del país.',
    detalles: [
      'Pasajes e inscripciones para actividades académicas.',
      'Participación en congresos, talleres o seminarios.',
      'Apoyo para actividades deportivas y culturales.',
    ],
    nota: 'Sujeta a disponibilidad presupuestaria y lineamientos vigentes.',
    variante: 'blue',
  },
  {
    id: 'bienestar',
    etiqueta: 'Mi Bienestar',
    titulo: 'Ayudas financieras para el bienestar estudiantil',
    descripcion: 'Apoyos dirigidos a cubrir necesidades puntuales que puedan influir en la permanencia y el desempeño académico del estudiante.',
    detalles: [
      'Alimentación mediante los mecanismos establecidos.',
      'Apoyo para gastos de transporte.',
      'Compra de materiales y recursos educativos.',
    ],
    nota: 'Gestionada de acuerdo con los criterios institucionales aplicables.',
    variante: 'navy',
  },
  {
    id: 'acompanamiento',
    etiqueta: 'Acompañamiento',
    titulo: 'Seguimiento integral del becario',
    descripcion: 'Orientación y seguimiento de la información académica y del estado de la beca para facilitar el cumplimiento de las responsabilidades asociadas al beneficio.',
    detalles: [
      'Consulta del progreso de horas beca.',
      'Seguimiento de actividades y aportaciones.',
      'Acceso a información personal y académica.',
    ],
    nota: 'Acompañamiento sujeto a las disposiciones de ASEBEP y la UNAH.',
    variante: 'light',
  },
]

function Beneficios() {
  return (
    <div className="public-benefits">
      <PublicNavbar />

      <main className="public-benefits__main">
        {/* La animación se aplica al contenido interno para evitar el scrollbar temporal. */}
        <div className="public-benefits__content public-page-entry">
          {/* Presentación principal de los beneficios. */}
          <section
            className="public-benefits__hero"
            aria-labelledby="public-benefits-title"
          >
            <div className="public-benefits__hero-copy">
              <span className="public-benefits__eyebrow">
                Ventajas para becarios
              </span>

              <h1
                id="public-benefits-title"
                className="public-benefits__title"
              >
                Beneficios y ayudas financieras
              </h1>

              <p className="public-benefits__description">
                Conoce las alternativas de apoyo orientadas
                a fortalecer tu rendimiento académico,
                facilitar tu permanencia universitaria y
                acompañarte durante tu formación en la UNAH.
              </p>

              <Link
                className="public-benefits__guide-link"
                to="/guia-postulacion"
              >
                Ver guía de postulación
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            {/* Imagen representativa de la comunidad estudiantil. */}
            <div className="public-benefits__image-wrapper">
              <div className="public-benefits__image-frame">
                <img
                  className="public-benefits__image"
                  src={imgBeneficios}
                  alt="Estudiantes caminando en el campus de la UNAH"
                />
              </div>

              <div
                className="public-benefits__image-accent"
                aria-hidden="true"
              />
            </div>
          </section>

          {/* Listado de ayudas y servicios disponibles. */}
          <section
            className="public-benefits__information"
            aria-labelledby="public-benefits-information-title"
          >
            <header className="public-benefits__section-heading">
              <span className="public-benefits__section-label">
                Apoyo estudiantil
              </span>

              <h2 id="public-benefits-information-title">
                Alternativas de acompañamiento
              </h2>

              <p>
                Estos beneficios buscan apoyar necesidades
                académicas y personales que puedan presentarse
                durante la trayectoria universitaria.
              </p>
            </header>

            <div className="public-benefits__grid">
              {beneficiosDisponibles.map((beneficio) => (
                <article
                  key={beneficio.id}
                  className={`public-benefits__card public-benefits__card--${beneficio.variante}`}
                >
                  <div className="public-benefits__card-content">
                    <span className="public-benefits__card-label">
                      {beneficio.etiqueta}
                    </span>

                    <h3>{beneficio.titulo}</h3>

                    <p className="public-benefits__card-description">
                      {beneficio.descripcion}
                    </p>

                    <ul className="public-benefits__card-list">
                      {beneficio.detalles.map((detalle) => (
                        <li key={detalle}>
                          <CircleCheck aria-hidden="true" />
                          <span>{detalle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <footer className="public-benefits__card-footer">
                    <CircleCheck aria-hidden="true" />
                    <span>{beneficio.nota}</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Beneficios