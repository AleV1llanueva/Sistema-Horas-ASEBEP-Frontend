import { ArrowRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import '../../styles/public/PublicPageAnimation.css'
import '../../styles/public/PreguntasFrecuentes.css'

// Las preguntas se mantienen fuera del componente porque son contenido estático.
const preguntasFrecuentes = [
  {
    id: 'rendimiento-academico',
    pregunta: '¿Qué pasa si repruebo una clase o mi índice académico baja?',
    respuesta: "La VOAE realiza un seguimiento académico constante. Mantener el estatus de 'Becario Activo' exige cumplir con los requisitos e índices mínimos establecidos por la universidad. Si tu rendimiento baja o repruebas materias, la institución evaluará tu continuidad y podrías correr el riesgo de perder el beneficio.",
  },
  {
    id: 'registro-horas',
    pregunta: '¿Cómo se registran y validan mis horas beca?',
    respuesta: 'Tras participar en las actividades institucionales correspondientes, debes llenar los formularios oficiales de asistencia. Posteriormente, la junta directiva se encarga de revisar, verificar y aprobar dichos registros para actualizar tu contador de horas acumuladas y pendientes en el portal.',
  },
  {
    id: 'aportaciones-mensuales',
    pregunta: '¿Cómo puedo saber si mis aportaciones mensuales están al día?',
    respuesta: 'En tu panel privado cuentas con un apartado visual dedicado a las aportaciones y multas. Allí la junta directiva actualiza el registro de tus entregas mensuales. Si existe algún retraso o penalización interna por comité, lo verás reflejado directamente en esta sección.',
  },
  {
    id: 'postulacion',
    pregunta: '¿Puedo postularme a una beca si soy de primer ingreso o de reingreso?',
    respuesta: 'Sí. A través del módulo público del portal puedes consultar las guías, categorías de ayuda y los requisitos oficiales exigidos por la VOAE para saber cuándo se abren los periodos de postulación para nuevos estudiantes.',
  },
  {
    id: 'datos-personales',
    pregunta: "¿Qué debo hacer si mis datos personales o carrera no aparecen correctos en la sección 'Mi Perfil'?",
    respuesta: 'Tus datos como el número de cuenta, nombre y correo institucional están vinculados directamente a tu expediente oficial en la UNAH. Si notas alguna discrepancia o error de visualización, debes comunicarte de inmediato con los administradores o la junta directiva para solicitar la corrección en el sistema.',
  },
]

function PreguntasFrecuentes() {
  const [preguntaAbierta, setPreguntaAbierta] =
    useState(null)

  // Abre la pregunta seleccionada o la cierra si ya estaba desplegada.
  function alternarPregunta(preguntaId) {
    setPreguntaAbierta((preguntaActual) =>
      preguntaActual === preguntaId
        ? null
        : preguntaId,
    )
  }

  return (
    <div className="public-faq">
      <PublicNavbar />
      <main className="public-faq__main">
        <div className="public-page-entry">
        {/* Presentación principal de la sección. */}
        <header
          className="public-faq__header"
          aria-labelledby="public-faq-title"
        >
          <span className="public-faq__eyebrow">
            Portal ASEBEP · UNAH
          </span>

          <h1
            id="public-faq-title"
            className="public-faq__title"
          >
            Preguntas frecuentes
          </h1>

          <p className="public-faq__description">
            Encuentra respuestas claras a las dudas más
            comunes sobre el proceso de becas, la gestión de
            horas, las aportaciones y los lineamientos de la
            VOAE.
          </p>
        </header>

        {/* Acordeón accesible para consultar cada respuesta. */}
        <section
          className="public-faq__list"
          aria-label="Listado de preguntas frecuentes"
        >
          {preguntasFrecuentes.map((item) => {
            const estaAbierta =
              preguntaAbierta === item.id

            const preguntaId = `pregunta-${item.id}`
            const respuestaId = `respuesta-${item.id}`

            return (
              <article
                key={item.id}
                className={
                  estaAbierta
                    ? 'public-faq__item public-faq__item--open'
                    : 'public-faq__item'
                }
              >
                <h2 className="public-faq__question-heading">
                  <button
                    id={preguntaId}
                    className="public-faq__question"
                    type="button"
                    onClick={() =>
                      alternarPregunta(item.id)
                    }
                    aria-expanded={estaAbierta}
                    aria-controls={respuestaId}
                  >
                    <span>{item.pregunta}</span>

                    <ChevronDown
                      className={
                        estaAbierta
                          ? 'public-faq__question-icon public-faq__question-icon--open'
                          : 'public-faq__question-icon'
                      }
                      aria-hidden="true"
                    />
                  </button>
                </h2>

                {estaAbierta && (
                  <div
                    id={respuestaId}
                    className="public-faq__answer"
                    role="region"
                    aria-labelledby={preguntaId}
                  >
                    <p>{item.respuesta}</p>
                  </div>
                )}
              </article>
            )
          })}
        </section>

        {/* Enlace hacia la información de beneficios disponibles. */}
        <section
          className="public-faq__callout"
          aria-labelledby="public-faq-callout-title"
        >
          <div className="public-faq__callout-copy">
            <h2 id="public-faq-callout-title">
              ¿Tienes alguna otra duda?
            </h2>

            <p>
              Explora los beneficios disponibles o comunícate
              directamente con los encargados de ASEBEP.
            </p>
          </div>

          <Link
            className="public-faq__callout-link"
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

export default PreguntasFrecuentes