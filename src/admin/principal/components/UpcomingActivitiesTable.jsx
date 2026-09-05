import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

/*
* Convierte una fecha ISO como "2026-00-00" a un formato legible
* sin provocar algun cambio por las zonas horarias
*/
function formatearFecha(fecha) {
    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return 'Sin fecha'
    }

    const [anio,
        mes,
        dia,
    ] = fecha
        .split('-')
        .map(Number)

    const fechaLocal = new Date(
        anio,
        mes -1,
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
            month: '2-digit',
            year: 'numeric',
        },
    ).format(fechaLocal)
}

/*
* Convierte estados como "EN_CURSO" o "programda" en textos apropiados para la interfaz.
*/
function formatearEstado(estado) {
    const texto = String(estado ?? '')
        .trim()
        .replace(/_/g, ' ')
        .toLowerCase()

    if (!texto) {
        return 'Sin estado'
    }

    return (
        texto.charAt(0).toUpperCase() + texto.slice(1)
    )
}

/*
* Prepara una clase CSS segura para cada estado.
*/
function obtenerClaseEstado(estado) {
    const modificador = String(estado ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    if (!modificador) {
        return 'admin-activity-status'
    }

    return (
        'admin-activity-status ' +
        `admin-activity-status--${modificador}`
    )
}

function UpcomingActivitiesTable({
    actividades = [],
}) {
    const existenActividades = actividades.length > 0

    return (
    <section
      className="admin-activities-panel"
      aria-labelledby="admin-upcoming-title"
    >
      <header className="admin-activities-panel__header">
        <div>
          <p className="admin-activities-panel__eyebrow">
            Agenda
          </p>

          <h2 id="admin-upcoming-title">
            Próximas actividades
          </h2>
        </div>

        <Link
          className="admin-activities-panel__link"
          to="/admin-principal/actividades"
        >
          Ver todas
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <div className="admin-activities-table-wrapper">
        <table className="admin-activities-table">
          <caption>
            Listado de próximas actividades
            programadas por ASEBEP
          </caption>

          <thead>
            <tr>
              <th scope="col">Actividad</th>
              <th scope="col">Fecha</th>
              <th scope="col">Hora</th>
              <th scope="col">Lugar</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>

          <tbody>
            {existenActividades ? (
              actividades.map((actividad) => (
                <tr key={actividad.id}>
                  <th scope="row">
                    {actividad.titulo ||
                      'Actividad sin nombre'}
                  </th>

                  <td>
                    <time
                      dateTime={actividad.fecha}
                    >
                      {formatearFecha(
                        actividad.fecha,
                      )}
                    </time>
                  </td>

                  <td>
                    <time
                      dateTime={actividad.horaInicio}
                    >
                      {actividad.horaInicio ||
                        'Sin hora'}
                    </time>
                  </td>

                  <td>
                    {actividad.lugar ||
                      'Lugar por confirmar'}
                  </td>

                  <td>
                    <span
                      className={obtenerClaseEstado(
                        actividad.estado,
                      )}
                    >
                      {formatearEstado(
                        actividad.estado,
                      )}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="admin-activities-table__empty"
                  colSpan="5"
                >
                  No hay próximas actividades
                  programadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default UpcomingActivitiesTable