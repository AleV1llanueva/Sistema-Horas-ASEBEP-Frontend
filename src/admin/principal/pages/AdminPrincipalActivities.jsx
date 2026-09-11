import * as AlertDialog from '@radix-ui/react-alert-dialog'

import {
    Archive,
    CalendarDays,
    Clock3,
    Eye,
    History,
    LoaderCircle,
    LogIn,
    LogOut,
    Pencil,
    Plus,
    Power,
    QrCode,
    RefreshCw,
    Search,
    Trash2,
    TriangleAlert,
    X,
} from 'lucide-react'

import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
    habilitarEntradaActividad,
    habilitarSalidaActividad,
    listarActividades,
} from '../services/adminActividadesService.js'

import '../styles/AdminPrincipalActivities.css'

const ESTADOS_VIGENTES = [
    'programada',
    'en-curso',
]

const TIPOS_MARCACION = Object.freeze({
    entrada: 'entrada',
    salida: 'salida',
})

const MAXIMO_GENERACIONES_QR = 2

/*
 * Convierte el texto de búsqueda a una forma consistente.
 * Esto permite comparar palabras con o sin tildes.
 */
function normalizarBusqueda(valor) {
    return String(valor ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

/*
 * Convierte la fecha almacenada en una presentación
 * legible sin cambiarla por diferencias de zona horaria.
 */
function formatearFecha(fecha) {
    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return 'Sin fecha'
    }

    const [
        anio,
        mes,
        dia,
    ] = fecha.split('-').map(Number)

    const fechaLocal = new Date(
        anio,
        mes - 1,
        dia,
    )

    const fechaValida =
        fechaLocal.getFullYear() === anio &&
        fechaLocal.getMonth() === mes - 1 &&
        fechaLocal.getDate() === dia

    if (!fechaValida) {
        return 'Sin fecha'
    }

    return new Intl.DateTimeFormat(
        'es-HN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(fechaLocal)
}

/*
 * Presenta el estado interno utilizando un texto
 * comprensible para el administrador.
 */
function formatearEstado(estado) {
    const estadoNormalizado =
        String(estado ?? '')
            .trim()
            .toLowerCase()

    const nombres = {
        programada: 'Programada',
        'en-curso': 'En curso',
    }

    return (
        nombres[estadoNormalizado] ??
        'Sin estado'
    )
}

/*
 * Construye el inicio o la finalización de una actividad
 * utilizando la zona horaria local del navegador.
 */
function crearFechaHoraLocal(
    fecha,
    hora,
) {
    const fechaPreparada =
        String(fecha ?? '').trim()

    const horaPreparada =
        String(hora ?? '').trim()

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            fechaPreparada,
        ) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            horaPreparada,
        )
    ) {
        return null
    }

    const [
        anio,
        mes,
        dia,
    ] = fechaPreparada
        .split('-')
        .map(Number)

    const [
        horas,
        minutos,
    ] = horaPreparada
        .split(':')
        .map(Number)

    const fechaHora = new Date(
        anio,
        mes - 1,
        dia,
        horas,
        minutos,
        0,
        0,
    )

    const fechaHoraValida =
        fechaHora.getFullYear() === anio &&
        fechaHora.getMonth() === mes - 1 &&
        fechaHora.getDate() === dia &&
        fechaHora.getHours() === horas &&
        fechaHora.getMinutes() === minutos

    return fechaHoraValida
        ? fechaHora
        : null
}

/*
 * Obtiene cuántas generaciones se han utilizado
 * para un tipo específico de marcación.
 */
function obtenerGeneracionesQr(
    actividad,
    tipo,
) {
    const cantidad = Number(
        tipo === TIPOS_MARCACION.entrada
            ? actividad?.generacionesQrEntrada
            : actividad?.generacionesQrSalida,
    )

    if (
        !Number.isInteger(cantidad) ||
        cantidad < 0
    ) {
        return 0
    }

    return Math.min(
        cantidad,
        MAXIMO_GENERACIONES_QR,
    )
}

/*
 * Determina si el administrador puede mostrar,
 * habilitar o reactivar una marcación.
 */
function obtenerDisponibilidadMarcacion(
    actividad,
    tipo,
    instanteActual,
) {
    if (actividad?.activa === false) {
        return {
            disponible: false,
            mensaje:
                'La actividad está desactivada.',
        }
    }

    const estado = String(
        actividad?.estado ?? '',
    )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')

    if (estado === 'cancelada') {
        return {
            disponible: false,
            mensaje:
                'La actividad está cancelada.',
        }
    }

    if (estado === 'finalizada') {
        return {
            disponible: false,
            mensaje:
                'La actividad está finalizada.',
        }
    }

    const inicio = crearFechaHoraLocal(
        actividad?.fecha,
        actividad?.horaInicio,
    )

    const finalizacion =
        crearFechaHoraLocal(
            actividad?.fecha,
            actividad?.horaFinalizacion,
        )

    if (!inicio || !finalizacion) {
        return {
            disponible: false,
            mensaje:
                'No fue posible comprobar el horario.',
        }
    }

    const qrVigente =
        marcacionEstaVigente(
            actividad,
            tipo,
            instanteActual,
        )

    const generacionesUtilizadas =
        obtenerGeneracionesQr(
            actividad,
            tipo,
        )

    /*
     * Mientras el QR siga vigente siempre se puede
     * volver a mostrar. Esto no genera otro token.
     */
    if (qrVigente) {
        return {
            disponible: true,

            mensaje:
                tipo === TIPOS_MARCACION.entrada
                    ? 'Mostrar el QR de entrada que sigue vigente.'
                    : 'Mostrar el QR de salida que sigue vigente.',
        }
    }

    // Después de dos generaciones no se permite generar más codigos.
    if (
        generacionesUtilizadas >=
        MAXIMO_GENERACIONES_QR
    ) {
        return {
            disponible: false,

            mensaje:
                tipo === TIPOS_MARCACION.entrada
                    ? 'La entrada ya utilizó sus dos oportunidades.'
                    : 'La salida ya utilizó sus dos oportunidades.',
        }
    }

    if (
        instanteActual <
        inicio.getTime()
    ) {
        return {
            disponible: false,

            mensaje:
                tipo === TIPOS_MARCACION.entrada
                    ? 'La entrada estará disponible cuando comience la actividad.'
                    : 'La salida no puede habilitarse antes del inicio.',
        }
    }

    if (
        tipo === TIPOS_MARCACION.entrada &&
        instanteActual >=
            finalizacion.getTime()
    ) {
        return {
            disponible: false,
            mensaje:
                'La actividad ya terminó y no admite nuevas entradas.',
        }
    }

    const esReactivacion =
        generacionesUtilizadas > 0

    return {
        disponible: true,

        mensaje:
            tipo === TIPOS_MARCACION.entrada
                ? esReactivacion
                    ? 'Reactivar el QR de entrada.'
                    : 'Habilitar el QR de entrada.'
                : esReactivacion
                  ? 'Reactivar el QR de salida.'
                  : 'Habilitar el QR de salida.',
    }
}

/*
 * Comprueba si el último QR guardado todavía
 * se encuentra dentro de su tiempo de vigencia.
 */
function marcacionEstaVigente(
    actividad,
    tipo,
    instanteActual,
) {
    const esEntrada =
        tipo === TIPOS_MARCACION.entrada

    const habilitada = esEntrada
        ? actividad?.entradaHabilitada === true
        : actividad?.salidaHabilitada === true

    const expiraEn = esEntrada
        ? actividad?.entradaHabilitadaHasta
        : actividad?.salidaHabilitadaHasta

    const fechaExpiracion =
        Date.parse(expiraEn)

    return (
        habilitada &&
        Number.isFinite(fechaExpiracion) &&
        fechaExpiracion > instanteActual
    )
}

// Calcula el contador visible dentro del diálogo.
function obtenerSegundosRestantes(
    expiraEn,
    instanteActual,
) {
    const fechaExpiracion =
        Date.parse(expiraEn)

    if (!Number.isFinite(fechaExpiracion)) {
        return 0
    }

    return Math.max(
        0,
        Math.ceil(
            (
                fechaExpiracion -
                instanteActual
            ) / 1000,
        ),
    )
}

function formatearTiempoRestante(
    segundosTotales,
) {
    const minutos = Math.floor(
        segundosTotales / 60,
    )

    const segundos = String(
        segundosTotales % 60,
    ).padStart(2, '0')

    return `${minutos}:${segundos}`
}

function AdminPrincipalActivities() {
    const [
        actividades,
        setActividades,
    ] = useState([])

    const [
        cargando,
        setCargando,
    ] = useState(true)

    const [
        error,
        setError,
    ] = useState('')

    const [
        recarga,
        setRecarga,
    ] = useState(0)

    const [
        busqueda,
        setBusqueda,
    ] = useState('')

    const [
        estadoSeleccionado,
        setEstadoSeleccionado,
    ] = useState('todos')

    const [
        visibilidadSeleccionada,
        setVisibilidadSeleccionada,
    ] = useState('activas')

    /*
     * Identifica qué botón está generando un QR.
     * Su formato interno es: actividadId:tipo.
     */
    const [
        procesandoMarcacion,
        setProcesandoMarcacion,
    ] = useState('')

    /*
     * Contiene el QR que actualmente se muestra
     * en el diálogo administrativo.
     */
    const [
        qrActivo,
        setQrActivo,
    ] = useState(null)

    // Contola unicamente la visibilidad del dialogo.
    const [
      dialogoQrAbierto,
      setDialogoQrAbierto,
    ] = useState(false)

    /*
     * El reloj permite actualizar automáticamente los
     * botones y el contador de vencimiento del QR.
     */
    const [
        instanteActual,
        setInstanteActual,
    ] = useState(() => Date.now())

    /*
     * Carga las actividades al ingresar y cuando
     * el administrador solicita reintentar.
     */
    useEffect(() => {
        let componenteMontado = true

        async function cargarActividades() {
            setCargando(true)
            setError('')

            try {
                const actividadesObtenidas =
                    await listarActividades()

                if (!componenteMontado) {
                    return
                }

                setActividades(
                    Array.isArray(
                        actividadesObtenidas,
                    )
                        ? actividadesObtenidas
                        : [],
                )
            } catch (errorCarga) {
                if (!componenteMontado) {
                    return
                }

                setActividades([])

                setError(
                    errorCarga instanceof Error
                        ? errorCarga.message
                        : 'No fue posible cargar las actividades.',
                )
            } finally {
                if (componenteMontado) {
                    setCargando(false)
                }
            }
        }

        cargarActividades()

        return () => {
            componenteMontado = false
        }
    }, [recarga])

    /*
     * Mientras existe un QR abierto actualizamos el reloj
     * cada segundo. En el listado bastan comprobaciones
     * cada 30 segundos.
     */
    useEffect(() => {
        const intervalo = window.setInterval(
            () => {
                setInstanteActual(
                    Date.now(),
                )
            },
            dialogoQrAbierto
              ? 1000
              : 30000,
        )

        function actualizarAlRegresar() {
            setInstanteActual(
                Date.now(),
            )
        }

        function actualizarVisibilidad() {
            if (
                document.visibilityState ===
                'visible'
            ) {
                actualizarAlRegresar()
            }
        }

        window.addEventListener(
            'focus',
            actualizarAlRegresar,
        )

        document.addEventListener(
            'visibilitychange',
            actualizarVisibilidad,
        )

        return () => {
            window.clearInterval(
                intervalo,
            )

            window.removeEventListener(
                'focus',
                actualizarAlRegresar,
            )

            document.removeEventListener(
                'visibilitychange',
                actualizarVisibilidad,
            )
        }
    }, [dialogoQrAbierto])

    /*
     * Mantiene fuera del listado las actividades
     * finalizadas, canceladas y eliminadas.
     */
    const actividadesVigentes =
        useMemo(
            () =>
                actividades.filter(
                    (actividad) =>
                        ESTADOS_VIGENTES.includes(
                            actividad.estado,
                        ) &&
                        actividad.eliminada !==
                            true,
                ),
            [actividades],
        )

    /*
     * Aplica búsqueda, estado y visibilidad sin
     * modificar el arreglo original.
     */
    const actividadesFiltradas =
        useMemo(() => {
            const textoBuscado =
                normalizarBusqueda(
                    busqueda,
                )

            return actividadesVigentes.filter(
                (actividad) => {
                    const coincideBusqueda =
                        !textoBuscado ||
                        normalizarBusqueda(
                            actividad.titulo,
                        ).includes(
                            textoBuscado,
                        ) ||
                        normalizarBusqueda(
                            actividad.lugar,
                        ).includes(
                            textoBuscado,
                        )

                    const coincideEstado =
                        estadoSeleccionado ===
                            'todos' ||
                        actividad.estado ===
                            estadoSeleccionado

                    const actividadActiva =
                        actividad.activa !==
                        false

                    const coincideVisibilidad =
                        visibilidadSeleccionada ===
                        'activas'
                            ? actividadActiva
                            : !actividadActiva

                    return (
                        coincideBusqueda &&
                        coincideEstado &&
                        coincideVisibilidad
                    )
                },
            )
        }, [
            actividadesVigentes,
            busqueda,
            estadoSeleccionado,
            visibilidadSeleccionada,
        ])

    const existenActividades =
        actividadesVigentes.length > 0

    const existenResultados =
        actividadesFiltradas.length > 0

    const segundosRestantes =
        qrActivo
            ? obtenerSegundosRestantes(
                  qrActivo.expiraEn,
                  instanteActual,
              )
            : 0

    const qrEstaVigente =
        Boolean(qrActivo) &&
        segundosRestantes > 0

    const identificadorProcesoQr =
        qrActivo
            ? `${qrActivo.actividadId}:${qrActivo.tipo}`
            : ''

    const procesandoQrActivo =
        Boolean(qrActivo) &&
        procesandoMarcacion ===
            identificadorProcesoQr
    
    // Identifica la generacion que se encuentra abierta y si todavia puede reactivarse despues de vencer.
    const generacionQrActiva =
        qrActivo
          ? Math.min(
            Math.max(
              Number(
                qrActivo.generacion,
              ) || 1,
              1,
            ),
            MAXIMO_GENERACIONES_QR,
          )
        : 0

    
    const limiteQrAlcanzado = generacionQrActiva >= MAXIMO_GENERACIONES_QR
    const qrPuedeReactivarse =
        Boolean(qrActivo) &&
        !qrEstaVigente &&
        !limiteQrAlcanzado

    function mostrarFuncionPendiente(
        nombreFuncion,
    ) {
        toast.info(
            `${nombreFuncion} estará disponible próximamente`,
        )
    }

    function reintentarCarga() {
        setRecarga(
            (valorActual) =>
                valorActual + 1,
        )
    }

    /*
     * Genera el QR solicitado, actualiza la actividad
     * dentro de la tabla y abre el diálogo.
     */
    async function habilitarMarcacion(
        actividad,
        tipo,
    ) {
        if (
            !actividad?.id ||
            procesandoMarcacion
        ) {
            return
        }

        const identificadorProceso =
            `${actividad.id}:${tipo}`

        setProcesandoMarcacion(
            identificadorProceso,
        )

        try {
            const respuesta =
                tipo ===
                TIPOS_MARCACION.entrada
                    ? await habilitarEntradaActividad(
                          actividad.id,
                      )
                    : await habilitarSalidaActividad(
                          actividad.id,
                      )

            if (
                !respuesta?.actividad ||
                !respuesta?.qr?.url
            ) {
                throw new Error(
                    'El servicio no devolvió un código QR válido.',
                )
            }

            setActividades(
                (actividadesActuales) =>
                    actividadesActuales.map(
                        (actividadActual) =>
                            actividadActual.id ===
                            respuesta.actividad.id
                                ? respuesta.actividad
                                : actividadActual,
                    ),
            )

            setQrActivo({
                ...respuesta.qr,
                actividadId:
                    respuesta.actividad.id,
                actividadTitulo:
                    respuesta.actividad.titulo,
            })

            // Abrimos el dialogo despues de conservar toda la informacion que debe mostrar.
            setDialogoQrAbierto(true)

            setInstanteActual(
                Date.now(),
            )

            const nombreMarcacion =
              tipo === TIPOS_MARCACION.entrada
                  ? 'entrada'
                  : 'salida'
            
            if (respuesta.reutilizado) {
              toast.info(
                `QR de ${nombreMarcacion}. Se puede renovar al expirar el tiempo.`,
              )
            } else {
              toast.success(
                `QR de ${nombreMarcacion} habilitado. Generación ${respuesta.qr.generacion} de ${MAXIMO_GENERACIONES_QR}.`,
              )
            }

        } catch (errorMarcacion) {
            toast.error(
                errorMarcacion instanceof Error
                    ? errorMarcacion.message
                    : 'No fue posible habilitar el código QR.',
            )
        } finally {
            setProcesandoMarcacion('')
        }
    }

    /*
     * Permite renovar un QR vencido desde el mismo diálogo.
     * El servicio reemplazará el token anterior.
     */
    function renovarQrActivo() {
        if (!qrActivo) {
            return
        }

        const actividad =
            actividades.find(
                (elemento) =>
                    elemento.id ===
                    qrActivo.actividadId,
            )

        if (!actividad) {
            toast.error(
                'La actividad ya no se encuentra disponible.',
            )

            return
        }

        habilitarMarcacion(
            actividad,
            qrActivo.tipo,
        )
    }

    function cerrarDialogoQr() {
        if (procesandoQrActivo) {
            return
        }

        // Cerramos unicamente el dialogo
        setDialogoQrAbierto(false)
    }

    return (
        <div className="admin-activities-page">
            <header className="admin-activities-heading">
                <div>
                    <p className="admin-activities-heading__eyebrow">
                        Gestión de actividades
                    </p>

                    <h1>Actividades</h1>

                    <p>
                        Administra las actividades
                        vigentes y habilita los códigos
                        QR de entrada y salida.
                    </p>
                </div>

                <div className="admin-activities-heading__actions">
                    <button
                        className="admin-activities-history-button"
                        type="button"
                        onClick={() =>
                            mostrarFuncionPendiente(
                                'El historial de actividades',
                            )
                        }
                    >
                        <History aria-hidden="true" />
                        Historial
                    </button>

                    <Link
                        className="admin-activities-create-button"
                        to="/admin-principal/actividades/crear"
                    >
                        <Plus aria-hidden="true" />
                        Crear actividad
                    </Link>
                </div>
            </header>

            {!cargando && !error && (
                <section
                    className="admin-activities-toolbar"
                    aria-label="Filtros de actividades"
                >
                    <label className="admin-activities-search">
                        <span>
                            Buscar actividad
                        </span>

                        <div className="admin-activities-search__control">
                            <Search aria-hidden="true" />

                            <input
                                type="search"
                                value={busqueda}
                                placeholder="Buscar por título o lugar"
                                onChange={(evento) =>
                                    setBusqueda(
                                        evento.target.value,
                                    )
                                }
                            />
                        </div>
                    </label>

                    <label className="admin-activities-filter">
                        <span>Estado</span>

                        <select
                            value={
                                estadoSeleccionado
                            }
                            onChange={(evento) =>
                                setEstadoSeleccionado(
                                    evento.target.value,
                                )
                            }
                        >
                            <option value="todos">
                                Todos los estados
                            </option>

                            <option value="programada">
                                Programadas
                            </option>

                            <option value="en-curso">
                                En curso
                            </option>
                        </select>
                    </label>

                    <label className="admin-activities-filter">
                        <span>Visibilidad</span>

                        <select
                            value={
                                visibilidadSeleccionada
                            }
                            onChange={(evento) =>
                                setVisibilidadSeleccionada(
                                    evento.target.value,
                                )
                            }
                        >
                            <option value="activas">
                                Activas
                            </option>

                            <option value="desactivadas">
                                Desactivadas
                            </option>
                        </select>
                    </label>
                </section>
            )}

            {cargando && (
                <section
                    className="admin-activities-state"
                    role="status"
                    aria-live="polite"
                >
                    <LoaderCircle
                        className="admin-activities-state__loader"
                        aria-hidden="true"
                    />

                    <h2>
                        Cargando actividades
                    </h2>

                    <p>
                        Estamos preparando la
                        información de las actividades.
                    </p>
                </section>
            )}

            {!cargando && error && (
                <section
                    className="admin-activities-state admin-activities-state--error"
                    role="alert"
                >
                    <TriangleAlert aria-hidden="true" />

                    <h2>
                        No fue posible cargar las
                        actividades
                    </h2>

                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={reintentarCarga}
                    >
                        Intentar nuevamente
                    </button>
                </section>
            )}

            {!cargando &&
                !error &&
                !existenActividades && (
                    <section className="admin-activities-state">
                        <CalendarDays aria-hidden="true" />

                        <h2>
                            No hay actividades vigentes
                        </h2>

                        <p>
                            Cuando publiques una
                            actividad, aparecerá en este
                            espacio.
                        </p>

                        <Link to="/admin-principal/actividades/crear">
                            <Plus aria-hidden="true" />
                            Crear primera actividad
                        </Link>
                    </section>
                )}

            {!cargando &&
                !error &&
                existenActividades && (
                    <section
                        className="admin-activities-list"
                        aria-labelledby="admin-activities-list-title"
                    >
                        <header className="admin-activities-list__header">
                            <div>
                                <p>Listado</p>

                                <h2 id="admin-activities-list-title">
                                    Actividades vigentes
                                </h2>
                            </div>

                            <span>
                                {
                                    actividadesFiltradas.length
                                }{' '}
                                {actividadesFiltradas.length ===
                                1
                                    ? 'resultado'
                                    : 'resultados'}
                            </span>
                        </header>

                        {!existenResultados ? (
                            <div className="admin-activities-no-results">
                                <Search aria-hidden="true" />

                                <h3>
                                    No encontramos
                                    resultados
                                </h3>

                                <p>
                                    Cambia la búsqueda o
                                    los filtros
                                    seleccionados.
                                </p>
                            </div>
                        ) : (
                            <div className="admin-activities-management-table-wrapper">
                                <table className="admin-activities-management-table">
                                    <caption>
                                        Listado administrativo
                                        de actividades vigentes
                                    </caption>

                                    <thead>
                                        <tr>
                                            <th scope="col">
                                                Actividad
                                            </th>

                                            <th scope="col">
                                                Fecha y horario
                                            </th>

                                            <th scope="col">
                                                Lugar
                                            </th>

                                            <th scope="col">
                                                Cupos
                                            </th>

                                            <th scope="col">
                                                Estado
                                            </th>

                                            <th scope="col">
                                                Visibilidad
                                            </th>

                                            <th scope="col">
                                                Asistencia
                                            </th>

                                            <th scope="col">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {actividadesFiltradas.map(
                                            (actividad) => {
                                                const disponibilidadEntrada =
                                                    obtenerDisponibilidadMarcacion(
                                                        actividad,
                                                        TIPOS_MARCACION.entrada,
                                                        instanteActual,
                                                    )

                                                const disponibilidadSalida =
                                                    obtenerDisponibilidadMarcacion(
                                                        actividad,
                                                        TIPOS_MARCACION.salida,
                                                        instanteActual,
                                                    )

                                                const entradaVigente =
                                                    marcacionEstaVigente(
                                                        actividad,
                                                        TIPOS_MARCACION.entrada,
                                                        instanteActual,
                                                    )

                                                const salidaVigente =
                                                    marcacionEstaVigente(
                                                        actividad,
                                                        TIPOS_MARCACION.salida,
                                                        instanteActual,
                                                    )

                                                const generacionesEntrada =
                                                    obtenerGeneracionesQr(
                                                      actividad,
                                                      TIPOS_MARCACION.entrada,
                                                    )

                                                const generacionesSalida =
                                                    obtenerGeneracionesQr(
                                                      actividad,
                                                      TIPOS_MARCACION.salida,
                                                    )

                                                const textoBotonEntrada =
                                                    entradaVigente
                                                      ? 'Ver QR de entrada'
                                                      : generacionesEntrada >= MAXIMO_GENERACIONES_QR
                                                      ? 'Entrada agotada'
                                                      : generacionesEntrada > 0
                                                        ? 'Reactivar entrada'
                                                        : 'Habilitar entrada'
                                                
                                                const textoBotonSalida =
                                                    salidaVigente
                                                      ? 'Ver QR de salida'
                                                      : generacionesSalida >= MAXIMO_GENERACIONES_QR
                                                      ? 'Salida agotada'
                                                      : generacionesSalida > 0
                                                        ? 'Reactivar salida'
                                                        : 'Habilitar salida'

                                                const procesoEntrada =
                                                    `${actividad.id}:${TIPOS_MARCACION.entrada}`

                                                const procesoSalida =
                                                    `${actividad.id}:${TIPOS_MARCACION.salida}`

                                                const generandoEntrada =
                                                    procesandoMarcacion ===
                                                    procesoEntrada

                                                const generandoSalida =
                                                    procesandoMarcacion ===
                                                    procesoSalida

                                                return (
                                                    <tr key={actividad.id}>
                                                        <th scope="row">
                                                            <div className="admin-activity-name">
                                                                <span>
                                                                    <CalendarDays
                                                                        aria-hidden="true"
                                                                    />
                                                                </span>

                                                                <div>
                                                                    <strong>
                                                                        {actividad.titulo ||
                                                                            'Actividad sin título'}
                                                                    </strong>

                                                                    <small>
                                                                        {
                                                                            actividad.horasAcreditables
                                                                        }{' '}
                                                                        {actividad.horasAcreditables ===
                                                                        1
                                                                            ? 'hora acreditable'
                                                                            : 'horas acreditables'}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </th>

                                                        <td>
                                                            <div className="admin-activity-schedule">
                                                                <time
                                                                    dateTime={
                                                                        actividad.fecha
                                                                    }
                                                                >
                                                                    {formatearFecha(
                                                                        actividad.fecha,
                                                                    )}
                                                                </time>

                                                                <small>
                                                                    {actividad.horaInicio ||
                                                                        'Sin hora'}
                                                                    {' – '}
                                                                    {actividad.horaFinalizacion ||
                                                                        'Sin hora'}
                                                                </small>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {actividad.lugar ||
                                                                'Lugar por confirmar'}
                                                        </td>

                                                        <td>
                                                            {
                                                                actividad.cuposDisponibles
                                                            }
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    'admin-activity-state ' +
                                                                    `admin-activity-state--${actividad.estado}`
                                                                }
                                                            >
                                                                {formatearEstado(
                                                                    actividad.estado,
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    actividad.activa !==
                                                                    false
                                                                        ? 'admin-activity-visibility admin-activity-visibility--active'
                                                                        : 'admin-activity-visibility admin-activity-visibility--inactive'
                                                                }
                                                            >
                                                                {actividad.activa !==
                                                                false
                                                                    ? 'Activa'
                                                                    : 'Desactivada'}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="admin-activity-attendance-actions">
                                                                <button
                                                                    className={
                                                                        entradaVigente
                                                                            ? 'admin-activity-attendance-button admin-activity-attendance-button--entry admin-activity-attendance-button--active'
                                                                            : 'admin-activity-attendance-button admin-activity-attendance-button--entry'
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        !disponibilidadEntrada.disponible ||
                                                                        Boolean(
                                                                            procesandoMarcacion,
                                                                        )
                                                                    }
                                                                    title={
                                                                        disponibilidadEntrada.mensaje
                                                                    }
                                                                    aria-label={`${textoBotonEntrada} para ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        habilitarMarcacion(
                                                                            actividad,
                                                                            TIPOS_MARCACION.entrada,
                                                                        )
                                                                    }
                                                                >
                                                                    {generandoEntrada ? (
                                                                        <LoaderCircle
                                                                            className="admin-activity-attendance-button__loader"
                                                                            aria-hidden="true"
                                                                        />
                                                                    ) : (
                                                                        <LogIn
                                                                            aria-hidden="true"
                                                                        />
                                                                    )}

                                                                    <span>
                                                                        {textoBotonEntrada}
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    className={
                                                                        salidaVigente
                                                                            ? 'admin-activity-attendance-button admin-activity-attendance-button--exit admin-activity-attendance-button--active'
                                                                            : 'admin-activity-attendance-button admin-activity-attendance-button--exit'
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        !disponibilidadSalida.disponible ||
                                                                        Boolean(
                                                                            procesandoMarcacion,
                                                                        )
                                                                    }
                                                                    title={
                                                                        disponibilidadSalida.mensaje
                                                                    }
                                                                    aria-label={`${textoBotonSalida} para ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        habilitarMarcacion(
                                                                            actividad,
                                                                            TIPOS_MARCACION.salida,
                                                                        )
                                                                    }
                                                                >
                                                                    {generandoSalida ? (
                                                                        <LoaderCircle
                                                                            className="admin-activity-attendance-button__loader"
                                                                            aria-hidden="true"
                                                                        />
                                                                    ) : (
                                                                        <LogOut
                                                                            aria-hidden="true"
                                                                        />
                                                                    )}

                                                                    <span>
                                                                        {textoBotonSalida}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="admin-activity-actions">
                                                                <button
                                                                    type="button"
                                                                    title="Ver actividad"
                                                                    aria-label={`Ver ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        mostrarFuncionPendiente(
                                                                            'Ver actividad',
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye aria-hidden="true" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title="Editar actividad"
                                                                    aria-label={`Editar ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        mostrarFuncionPendiente(
                                                                            'Editar actividad',
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil aria-hidden="true" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title={
                                                                        actividad.activa !==
                                                                        false
                                                                            ? 'Desactivar actividad'
                                                                            : 'Activar actividad'
                                                                    }
                                                                    aria-label={
                                                                        actividad.activa !==
                                                                        false
                                                                            ? `Desactivar ${actividad.titulo}`
                                                                            : `Activar ${actividad.titulo}`
                                                                    }
                                                                    onClick={() =>
                                                                        mostrarFuncionPendiente(
                                                                            actividad.activa !==
                                                                            false
                                                                                ? 'Desactivar actividad'
                                                                                : 'Activar actividad',
                                                                        )
                                                                    }
                                                                >
                                                                    <Power aria-hidden="true" />
                                                                </button>

                                                                <button
                                                                    className="admin-activity-actions__delete"
                                                                    type="button"
                                                                    title="Eliminar actividad"
                                                                    aria-label={`Eliminar ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        mostrarFuncionPendiente(
                                                                            'Eliminar actividad',
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

            <div
                className="admin-activities-future-note"
                role="note"
            >
                <Archive aria-hidden="true" />

                <p>
                    Las opciones para consultar,
                    editar, activar, desactivar y
                    eliminar se implementarán en los
                    siguientes avances.
                </p>
            </div>

            {/* Diálogo que muestra el QR habilitado. */}
            <AlertDialog.Root
                open={dialogoQrAbierto}
                onOpenChange={(abierto) => {
                    if (!abierto) {
                        cerrarDialogoQr()
                    }
                }}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="admin-qr-dialog__overlay" />

                    <AlertDialog.Content className="admin-qr-dialog__content">
                        <button
                            className="admin-qr-dialog__close"
                            type="button"
                            disabled={procesandoQrActivo}
                            aria-label="Cerrar código QR"
                            onClick={cerrarDialogoQr}
                        >
                            <X aria-hidden="true" />
                        </button>

                        <div className="admin-qr-dialog__icon">
                            <QrCode aria-hidden="true" />
                        </div>

                        <AlertDialog.Title className="admin-qr-dialog__title">
                            QR de{' '}
                            {qrActivo?.tipo ===
                            TIPOS_MARCACION.entrada
                                ? 'entrada'
                                : 'salida'}
                        </AlertDialog.Title>

                        <AlertDialog.Description className="admin-qr-dialog__description">
                            Solicita a los estudiantes
                            inscritos que escaneen este
                            código para registrar su{' '}
                            {qrActivo?.tipo ===
                            TIPOS_MARCACION.entrada
                                ? 'hora de entrada'
                                : 'hora de salida'}
                            .
                        </AlertDialog.Description>

                        <p className="admin-qr-dialog__activity">
                            {qrActivo?.actividadTitulo}
                        </p>

                        {qrActivo?.url && (
                            <div
                                className={
                                    qrEstaVigente
                                        ? 'admin-qr-dialog__code'
                                        : 'admin-qr-dialog__code admin-qr-dialog__code--expired'
                                }
                            >
                                <QRCodeSVG
                                    value={qrActivo.url}
                                    size={248}
                                    level="M"
                                    marginSize={2}
                                    bgColor="#ffffff"
                                    fgColor="#002b4f"
                                    title={`Código QR de ${qrActivo.tipo}`}
                                />
                            </div>
                        )}

                        <div
                            className={
                                qrEstaVigente
                                    ? 'admin-qr-dialog__timer'
                                    : 'admin-qr-dialog__timer admin-qr-dialog__timer--expired'
                            }
                        >
                            <Clock3 aria-hidden="true" />

                            {qrEstaVigente ? (
                                <p>
                                    Disponible durante{' '}
                                    <strong>
                                        {formatearTiempoRestante(
                                            segundosRestantes,
                                        )}
                                    </strong>
                                </p>
                            ) : (
                                <p>
                                    Este código QR ha
                                    vencido.
                                </p>
                            )}
                        </div>

                        <p className="admin-qr-dialog__notice">
                            {qrEstaVigente
                                ? `Generación ${generacionQrActiva} de ${MAXIMO_GENERACIONES_QR}. Cerrar este diálogo no reinicia el contador.`
                                : limiteQrAlcanzado
                                  ? `Ya se utilizaron las ${MAXIMO_GENERACIONES_QR} oportunidades disponibles para esta marcación.`
                                  : `El QR venció. Puedes utilizar la reactivación ${generacionQrActiva + 1} de ${MAXIMO_GENERACIONES_QR}.`}
                        </p>

                        <div className="admin-qr-dialog__actions">
                            <AlertDialog.Cancel asChild>
                                <button
                                    className="admin-qr-dialog__secondary"
                                    type="button"
                                    disabled={
                                        procesandoQrActivo
                                    }
                                >
                                    Cerrar
                                </button>
                            </AlertDialog.Cancel>

                            {qrPuedeReactivarse && (
                                <button
                                    className="admin-qr-dialog__primary"
                                    type="button"
                                    disabled={
                                        procesandoQrActivo
                                    }
                                    onClick={
                                        renovarQrActivo
                                    }
                                >
                                    {procesandoQrActivo ? (
                                        <LoaderCircle
                                            className="admin-activity-attendance-button__loader"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <RefreshCw aria-hidden="true" />
                                    )}

                                    Reactivar QR
                                </button>
                            )}
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    )
}

export default AdminPrincipalActivities