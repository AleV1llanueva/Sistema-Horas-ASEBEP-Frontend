// Iconos utilizados para reforzar visualmente la información.
import {
  CircleCheck,
  ExternalLink,
  Info,
} from 'lucide-react'

// Componentes compartidos del área pública.
import PublicNavbar from '../../components/public/PublicNavbar'

// Estilos compartidos y propios de la vista.
import '../../styles/public/PublicPageAnimation.css'
import '../../styles/public/GuiaPostulacion.css'

/*
 * Pasos generales para realizar una solicitud de beca.
 * Se mantienen fuera del componente para separar los datos
 * de la estructura visual de la página.
 */
const pasosPostulacion = [
  {
    numero: '01',
    titulo: 'Ingresa al portal de Registro',
    descripcion: 'Accede al sistema de Registro de la UNAH utilizando tus credenciales institucionales.',
    enlace: 'https://registro.unah.edu.hn/',
  },
  {
    numero: '02',
    titulo: 'Abre el módulo de solicitudes',
    descripcion: 'Dentro del portal, localiza el módulo correspondiente a las solicitudes estudiantiles.',
  },
  {
    numero: '03',
    titulo: 'Selecciona la solicitud de beca',
    descripcion: 'Elige la opción de solicitud de beca para comenzar el proceso de postulación.',
  },
  {
    numero: '04',
    titulo: 'Crea una nueva solicitud',
    descripcion: 'Presiona la opción para registrar una nueva solicitud y continúa con el formulario.',
  },
  {
    numero: '05',
    titulo: 'Completa tus datos',
    descripcion: 'Ingresa cuidadosamente la información personal, académica y socioeconómica solicitada.',
  },
  {
    numero: '06',
    titulo: 'Selecciona el tipo de beneficio',
    descripcion: 'Elige la categoría de beca o ayuda económica que corresponda con tu situación.',
  },
  {
    numero: '07',
    titulo: 'Confirma la declaración',
    descripcion: 'Lee y acepta la declaración incluida en el formulario antes de continuar.',
  },
  {
    numero: '08',
    titulo: 'Envía la solicitud',
    descripcion: 'Revisa que la información esté completa y envía formalmente tu postulación.',
  },
  {
    numero: '09',
    titulo: 'Espera la comunicación oficial',
    descripcion: 'La unidad responsable revisará tu solicitud y se comunicará contigo mediante los canales institucionales.',
  },
]

/*
 * Requisitos generales aplicables al proceso.
 * Los requisitos específicos pueden variar según la modalidad seleccionada.
 */
const requisitosGenerales = [
  'Estar matriculado en la Universidad Nacional Autónoma de Honduras.',
  'No haber egresado previamente de una carrera universitaria.',
  'Cumplir con el índice académico requerido para la categoría seleccionada.',
  'No contar con sanciones disciplinarias vigentes.',
  'Presentar el formulario, la Forma 003, el historial académico y los demás documentos solicitados.',
]

/*
 * Resumen de las principales modalidades de becas y ayudas.
 * La información completa siempre debe confirmarse en la convocatoria vigente.
 */
const modalidades = [
  {
    categoria: 'Rendimiento académico',
    titulo: 'Beca de excelencia académica',
    requisitos: [
      'Estudiantes de primer ingreso: índice académico mínimo de 85 % en educación media.',
      'Estudiantes regulares: índice global mínimo de 80 %.',
      'Haber aprobado al menos 10 asignaturas durante el año anterior o las establecidas en el plan de estudios.',
      'Para estudiantes con discapacidad se consideran condiciones especiales de carga académica.',
    ],
  },
  {
    categoria: 'Representación universitaria',
    titulo: 'Beca artística o deportiva',
    requisitos: [
      'Pertenecer activamente a una disciplina artística o deportiva reconocida por la UNAH.',
      'Contar con al menos un año de participación acreditada.',
      'Haber aprobado al menos 10 asignaturas durante el año anterior.',
      'Mantener un índice académico mínimo de 70 % por período.',
    ],
  },
  {
    categoria: 'Apoyo socioeconómico',
    titulo: 'Beca de equidad Alma Máter y equidad social',
    requisitos: [
      'Cumplir con el índice académico de permanencia establecido por la UNAH.',
      'Haber aprobado al menos 10 asignaturas durante el año anterior.',
      'Demostrar una mejora académica progresiva.',
      'Presentar los documentos socioeconómicos solicitados por la unidad responsable.',
    ],
  },
  {
    categoria: 'Convenios',
    titulo: 'Beca de patrocinio externo',
    requisitos: [
      'Cumplir con las condiciones establecidas en el convenio suscrito entre la UNAH y la institución patrocinadora.',
      'Presentar la documentación requerida por la organización que brinda el beneficio.',
    ],
  },
  {
    categoria: 'Intercambio académico',
    titulo: 'Ayuda económica para movilidad',
    requisitos: [
      'Ser estudiante regular y encontrarse matriculado activamente.',
      'Tener un índice académico del período igual o superior al índice de permanencia.',
      'Contar con la aprobación de la unidad académica que promueve la movilidad.',
    ],
  },
  {
    categoria: 'Atención estudiantil',
    titulo: 'Ayuda económica “Mi Bienestar”',
    requisitos: [
      'Ser estudiante regular y encontrarse matriculado activamente.',
      'Cumplir con el índice académico de permanencia.',
      'Presentar evidencia que justifique la emergencia o el propósito de la ayuda solicitada.',
    ],
  },
]

function GuiaPostulacion() {
  return (
    <div className="public-guide">
      {/* Barra de navegación compartida por todas las vistas públicas. */}
      <PublicNavbar />

      <main className="public-guide__main">
        {/*
         * La animación se aplica al contenido y no al contenedor principal.
         * Esto evita que aparezca una barra de desplazamiento temporal.
         */}
        <div className="public-guide__content public-page-entry">
          {/* Encabezado principal de la vista. */}
          <header className="public-guide__header">
            <span className="public-guide__eyebrow">
              Proceso de postulación
            </span>

            <h1>Guía de postulación y requisitos</h1>

            <p>
              Conoce los pasos generales para solicitar una beca o ayuda
              económica y revisa los requisitos de cada modalidad.
            </p>
          </header>

          {/* Aviso para evitar presentar el resumen como normativa definitiva. */}
          <aside className="public-guide__notice">
            <span
              className="public-guide__notice-icon"
              aria-hidden="true"
            >
              <Info size={22} strokeWidth={1.9} />
            </span>

            <div>
              <h2>Antes de comenzar</h2>

              <p>
                Las fechas, documentos y condiciones pueden cambiar según la
                convocatoria. Verifica siempre la información oficial antes de
                enviar tu solicitud.
              </p>
            </div>
          </aside>

          {/* Proceso general de postulación. */}
          <section
            className="public-guide__section"
            aria-labelledby="pasos-postulacion"
          >
            <div className="public-guide__section-heading">
              <span className="public-guide__section-number">
                01
              </span>

              <div>
                <h2 id="pasos-postulacion">
                  Pasos para realizar tu postulación
                </h2>

                <p>
                  Sigue este orden dentro del portal de Registro de la UNAH.
                </p>
              </div>
            </div>

            <ol className="public-guide__steps">
              {pasosPostulacion.map((paso) => (
                <li
                  className="public-guide__step"
                  key={paso.numero}
                >
                  <span className="public-guide__step-number">
                    {paso.numero}
                  </span>

                  <div className="public-guide__step-content">
                    <h3>{paso.titulo}</h3>
                    <p>{paso.descripcion}</p>

                    {paso.enlace && (
                      <a
                        className="public-guide__step-link"
                        href={paso.enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir Registro UNAH
                        <ExternalLink
                          size={16}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Requisitos generales del estudiante. */}
          <section
            className="public-guide__section"
            aria-labelledby="requisitos-generales"
          >
            <div className="public-guide__section-heading">
              <span className="public-guide__section-number">
                02
              </span>

              <div>
                <h2 id="requisitos-generales">
                  Requisitos generales
                </h2>

                <p>
                  Estas condiciones sirven como punto de partida para las
                  diferentes modalidades.
                </p>
              </div>
            </div>

            <div className="public-guide__requirements">
              <ul>
                {requisitosGenerales.map((requisito) => (
                  <li key={requisito}>
                    <CircleCheck
                      size={20}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />

                    <span>{requisito}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Modalidades disponibles y requisitos específicos. */}
          <section
            className="public-guide__section"
            aria-labelledby="modalidades-beca"
          >
            <div className="public-guide__section-heading">
              <span className="public-guide__section-number">
                03
              </span>

              <div>
                <h2 id="modalidades-beca">
                  Modalidades y condiciones
                </h2>

                <p>
                  Revisa la categoría que mejor se adapte a tu situación
                  académica o socioeconómica.
                </p>
              </div>
            </div>

            <div className="public-guide__modalities">
              {modalidades.map((modalidad) => (
                <article
                  className="public-guide__modality"
                  key={modalidad.titulo}
                >
                  <span className="public-guide__modality-category">
                    {modalidad.categoria}
                  </span>

                  <h3>{modalidad.titulo}</h3>

                  <ul>
                    {modalidad.requisitos.map((requisito) => (
                      <li key={requisito}>
                        <CircleCheck
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />

                        <span>{requisito}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Acceso a la fuente institucional completa. */}
          <section className="public-guide__official">
            <div>
              <span className="public-guide__official-label">
                Información oficial
              </span>

              <h2>Consulta la convocatoria vigente</h2>

              <p>
                Visita el sitio de VOAE para confirmar fechas, documentación,
                requisitos especiales y canales de atención.
              </p>
            </div>

            <a
              className="public-guide__official-link"
              href="https://voae.unah.edu.hn/servicios-voae/becas-unah"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visitar sitio de VOAE
              <ExternalLink
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </a>
          </section>
        </div>
      </main>
    </div>
  )
}

export default GuiaPostulacion