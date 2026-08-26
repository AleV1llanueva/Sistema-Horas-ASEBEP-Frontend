import {
    CalendarDays,
    Clock3,
    Plus,
    ReceiptText,
    UsersRound,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router'
import AdminMetricCard from '../components/AdminMetricCard.jsx'
import UpcomingActivitiesTable from '../components/UpcomingActivitiesTable.jsx'
import {
    adminPrincipalDashboardMock,
} from '../mocks/adminPrincipalMock.js'

import {
  listarActividades,
} from '../services/adminActividadesService.js'

import '../styles/AdminPrincipalDashboard.css'

const ESTADOS_VIGENTES = ['programada', 'en-curso']

function obtenerFechaHoy() {
  const fechaActual = new Date()
  const anio = fechaActual.getFullYear()
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0')
  const dia = String(fechaActual.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function prepararValor(valor) {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
        return 0
    }

    return Math.max(0, numero)
}

function AdminPrincipalDashboard() {
    const resumen = adminPrincipalDashboardMock.resumen

    const [actividades, setActividades] = useState([])
    const [cargandoActividades, setCargandoActividades] = useState(true)
    const [errorActividades, setErrorActividades] = useState('')
    const [recarga, setRecarga] = useState(0)

    useEffect(() => {
      let componenteMontado = true

      async function cargarActividades() {
        setCargandoActividades(true)
        setErrorActividades('')

        try {
          const actividadesObtenidas = await listarActividades()

          if (!componenteMontado) return

          setActividades(
            Array.isArray(actividadesObtenidas)
              ? actividadesObtenidas
              : [],
          )
        } catch (errorCarga) {
          if (!componenteMontado) return

          setActividades([])
          setErrorActividades(
            errorCarga instanceof Error
              ? errorCarga.message
              : 'No fue posible cargar las actividades.',
          )
        } finally {
          if (componenteMontado) {
            setCargandoActividades(false)
          }
        }
      }

      cargarActividades()

      return () => {
        componenteMontado = false
      }
    }, [recarga])

    const actividadesProximas = useMemo(() => {
      const fechaHoy = obtenerFechaHoy()

      return actividades
        .filter((actividad) => (
          actividad.eliminada !== true && actividad.activa !== false
          && ESTADOS_VIGENTES.includes(actividad.estado) && actividad.fecha >= fechaHoy
        ))
        .sort((actividadA, actividadB) => (
          `${actividadA.fecha}T${actividadA.horaInicio}`
          .localeCompare(
            `${actividadB.fecha}T${actividadB.horaInicio}`
          )
        ))
    }, [actividades])

    const totalActividades = cargandoActividades || errorActividades
      ? '—'
      : actividadesProximas.length

      function reintentarCarga() {
        setRecarga((valorActual) => valorActual + 1)
      }

    /*
    * La configuracion visual permanece dentro del dashboard y no se mezcla con los datos.
    */
   const metricas = [
    {
        id: 'actividades-proximas',
        titulo: 'Actividades próximas',
        valor:totalActividades,
        icono: CalendarDays,
        variante: 'actividades',
    },
    {
        id: 'horas-por-aprobar',
        titulo: 'Horas por aprobar',
        valor: prepararValor(
            resumen.horasPorAprobar,
        ),
        icono: Clock3,
        variante: 'horas',
        porcentaje: resumen.porcentajeHorasPorAprobar,
    },
    {
        id: 'aportaciones-pendientes',
        titulo: 'Aportaciones pendientes',
        valor: prepararValor(
            resumen.aportacionesPendientes,
        ),
        icono: ReceiptText,
        variante: 'aportaciones',
    },
    {
        id: 'estudiantes-activos',
        titulo: 'Estudiantes activos',
        valor: prepararValor(
            resumen.estudiantesActivos,
        ),
        icono: UsersRound,
        variante: 'estudiantes',
    },
   ]

   return (
    <div className="admin-principal-dashboard">
      <header className="admin-dashboard-heading">
        <div className="admin-dashboard-heading__copy">
          <p className="admin-dashboard-heading__eyebrow">
            Gestión de actividades
          </p>

          <h1>
            Panel administrativo
          </h1>

          <p>
            Consulta el resumen operativo y administra
            las próximas actividades de ASEBEP.
          </p>
        </div>

        <Link
          className="admin-dashboard-create-button"
          to="/admin-principal/actividades/crear"
        >
          <Plus aria-hidden="true" />
          Crear actividad
        </Link>
      </header>

      <section
        className="admin-dashboard-metrics"
        aria-label="Resumen administrativo"
      >
        {metricas.map((metrica) => (
          <AdminMetricCard
            key={metrica.id}
            titulo={metrica.titulo}
            valor={metrica.valor}
            icono={metrica.icono}
            variante={metrica.variante}
            porcentaje={metrica.porcentaje}
          />
        ))}
      </section>

      {cargandoActividades && (
        <section className="admin-activities-panel" role="status" aria-live="polite">
          <p>Cargando próximas actividades...</p>
        </section>
      )}

      {!cargandoActividades && errorActividades && (
        <section className="admin-activities-panel" role="alert">
          <h2>No fue posible cargar las actividades</h2>
          <p>{errorActividades}</p>

          <button type="button" onClick={reintentarCarga}>
            Intentar nuevamente
          </button>
        </section>
      )}

      {!cargandoActividades && !errorActividades && (
        <UpcomingActivitiesTable actividades={actividadesProximas.slice(0, 4)} />
      )}
    </div>
  )
}

export default AdminPrincipalDashboard