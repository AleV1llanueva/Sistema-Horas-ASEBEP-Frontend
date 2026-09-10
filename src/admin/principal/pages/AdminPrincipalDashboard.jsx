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
import {
  listarEstudiantes,
} from '../services/adminEstudiantesService.js'

import '../styles/AdminPrincipalDashboard.css'

// Solamente estos estados pueden aparecer dentro del resumen de próximas actividades
const ESTADOS_VIGENTES = ['programada', 'en-curso']

function obtenerFechaHoy() {
  const fechaActual = new Date()
  const anio = fechaActual.getFullYear()
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0')
  const dia = String(fechaActual.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

// Convierte las cantidades metricas en numeros seguros y no muestra valores negativos
function prepararValor(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 0
  }

  return Math.max(0, numero)
}

function AdminPrincipalDashboard() {
  // Por ahora, las metricas administrativas vienen de los datos simulados
  const resumen = adminPrincipalDashboardMock.resumen

  /*
  * Estados necesarios para controlar:
  * Las actividades obtenidas, la pantalla de carga, los posibles errores, los intentos de recarga.
  */
  const [actividades, setActividades] = useState([])
  const [cargandoActividades, setCargandoActividades] = useState(true)
  const [errorActividades, setErrorActividades] = useState('')
  const [recarga, setRecarga] = useState(0)

  // Consulta las actividades mediante el servicio
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
        console.log('error al cargar: ', errorCarga);
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

  // Muestra las actividades que deben aparecer en la agenda principal
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

  // Mientras las actividades cargan o existe un error muestra un guion antes de una informacino falsa
  const totalActividades = cargandoActividades || errorActividades
    ? '—'
    : actividadesProximas.length

  function reintentarCarga() {
    setRecarga((valorActual) => valorActual + 1)
  }

  const [estudiantesActivos, setEstudiantesActivos] = useState(0)
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(true)

  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiantes() {
      setCargandoEstudiantes(true)
      try {
        const estudiantesObtenidos = await listarEstudiantes()
        if (!componenteMontado) return
        setEstudiantesActivos(
          Array.isArray(estudiantesObtenidos) ? estudiantesObtenidos.length : 0,
        )
      } catch (error) {
        console.log('error al cargar estudiantes:', error)
        if (!componenteMontado) return
        setEstudiantesActivos(0)
      } finally {
        if (componenteMontado) {
          setCargandoEstudiantes(false)
        }
      }
    }

    cargarEstudiantes()

    return () => {
      componenteMontado = false
    }
  }, [])



  /*
  * La configuracion visual permanece dentro del dashboard y no se mezcla con los datos.
  */
  const metricas = [
    {
      id: 'actividades-proximas',
      titulo: 'Actividades próximas',
      valor: totalActividades,
      icono: CalendarDays,
      variante: 'actividades',
    },
    {
      id: 'estudiantes-activos',
      titulo: 'Estudiantes activos',
      valor: estudiantesActivos,
      icono: UsersRound,
      variante: 'estudiantes',
    },
  ]

  return (
    <div className="admin-principal-dashboard">
      {/* Encabezado y acceso rápido para crear actividades. */}
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

      {/* Resumen general mediante tarjetas reutilizables. */}
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

      {/* Permite volver a intentar la consulta si ocurre un error. */}
      {!cargandoActividades && errorActividades && (
        <section className="admin-activities-panel" role="alert">
          <h2>No fue posible cargar las actividades</h2>
          <p>{errorActividades}</p>

          <button type="button" onClick={reintentarCarga}>
            Intentar nuevamente
          </button>
        </section>
      )}

      {/* El dashboard muestra como maximo las primeras 4 actividades vigentes y ordenadas */}
      {!cargandoActividades && !errorActividades && (
        <UpcomingActivitiesTable actividades={actividadesProximas.slice(0, 4)} />
      )}
    </div>
  )
}

export default AdminPrincipalDashboard
