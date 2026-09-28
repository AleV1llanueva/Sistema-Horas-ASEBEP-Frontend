import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
    ChevronLeft,
    ChevronRight,
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

import {
    Link,
    useNavigate,
} from 'react-router'

import { toast } from 'sonner'

import {
    cambiarVisibilidadActividad,
    eliminarActividad,
    obtenerQrEntradaActividad,
    obtenerQrSalidaActividad,
    listarActividades,
} from '../services/adminActividadesService.js'

import '../styles/AdminPrincipalActivities.css'

const TIPOS_MARCACION = Object.freeze({
    entrada: 'entrada',
    salida: 'salida',
})

const DURACION_VENTANA_QR_MINUTOS = 20

// Cada pagina muestra como maximo diez actividades
const ACTIVIDADES_POR_PAGINA = 10

/*
 * Cada pestaña define los estados que debe mostrar.
 * El historial también queda preparado para actividades canceladas.
 */
const PESTANAS_ACTIVIDADES = [
    {
        id: 'programadas',
        titulo: 'Programadas',
        tituloListado: 'Actividades programadas',
        estados: ['programada'],
        icono: CalendarDays,
    },

    {
        id: 'en-curso',
        titulo: 'En curso',
        tituloListado: 'Actividades en curso',
        estados: ['en-curso'],
        icono: Clock3,
    },

    {
        id: 'historial',
        titulo: 'Historial',
        tituloListado: 'Historial de actividades',
        estados: [
            'finalizada',
            'cancelada',
        ],
        icono: History,
    },
]

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
            .replace(/\s+/g, '-')

    const nombres = {
        programada: 'Programada',
        'en-curso': 'En curso',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
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
 * Calcula el estado actual usando el horario de la actividad.
 *
 * Esto permite que una actividad cambie automáticamente de
 * Programada a En curso y después a Finalizada sin recargar.
 */
function calcularEstadoTemporalActividad(
    actividad,
    instanteActual,
) {
    const estadoGuardado = String(
        actividad?.estado ?? '',
    )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')

    if (estadoGuardado === 'cancelada') {
        return 'cancelada'
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
        return (
            estadoGuardado ||
            'programada'
        )
    }

    if (
        instanteActual <
        inicio.getTime()
    ) {
        return 'programada'
    }

    if (
        instanteActual <
        finalizacion.getTime()
    ) {
        return 'en-curso'
    }

    return 'finalizada'
}

/*
 * Construye la ventana automática correspondiente.
 *
 * Entrada: desde el inicio hasta veinte minutos después.
 * Salida: desde la finalización hasta veinte minutos después.
 */
function obtenerVentanaQrMarcacion(
    actividad,
    tipo,
) {
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
        return null
    }

    const comienzaEn =
        tipo === TIPOS_MARCACION.entrada
            ? inicio
            : tipo ===
                TIPOS_MARCACION.salida
              ? finalizacion
              : null

    if (!comienzaEn) {
        return null
    }

    return {
        comienzaEn:
            comienzaEn.getTime(),

        expiraEn:
            comienzaEn.getTime() +
            DURACION_VENTANA_QR_MINUTOS *
                60 *
                1000,
    }
}

/*
 * Informa si el botón para mostrar el QR puede utilizarse.
 * Ya no se revisan generaciones, habilitaciones ni reactivaciones.
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

    const ventana =
        obtenerVentanaQrMarcacion(
            actividad,
            tipo,
        )

    if (!ventana) {
        return {
            disponible: false,
            mensaje:
                'No fue posible comprobar el horario.',
        }
    }

    if (
        instanteActual <
        ventana.comienzaEn
    ) {
        return {
            disponible: false,

            mensaje:
                tipo ===
                TIPOS_MARCACION.entrada
                    ? 'El QR de entrada estará disponible cuando comience la actividad.'
                    : 'El QR de salida estará disponible cuando finalice la actividad.',
        }
    }

    if (
        instanteActual >=
        ventana.expiraEn
    ) {
        return {
            disponible: false,

            mensaje:
                tipo ===
                TIPOS_MARCACION.entrada
                    ? 'La ventana de entrada ya finalizó.'
                    : 'La ventana de salida ya finalizó.',
        }
    }

    return {
        disponible: true,

        mensaje:
            tipo ===
            TIPOS_MARCACION.entrada
                ? 'Mostrar el QR de entrada.'
                : 'Mostrar el QR de salida.',
    }
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
    const navigate = useNavigate()

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
        pestanaActiva,
        setPestanaActiva,
    ] = useState('programadas')

    const [
        busqueda,
        setBusqueda,
    ] = useState('')

    const [
        visibilidadSeleccionada,
        setVisibilidadSeleccionada,
    ] = useState('todas')

    const [
        paginaActual,
        setPaginaActual,
    ] = useState(1)

    /*
     * Identifica qué botón está generando un QR.
     * Su formato interno es actividadId:tipo.
     */
    const [
        procesandoMarcacion,
        setProcesandoMarcacion,
    ] = useState('')

    const [
        qrActivo,
        setQrActivo,
    ] = useState(null)

    const [
        dialogoQrAbierto,
        setDialogoQrAbierto,
    ] = useState(false)

    /*
     * La acción pendiente conserva la actividad
     * que se desea activar, desactivar o eliminar.
     */
    const [
        accionPendiente,
        setAccionPendiente,
    ] = useState(null)

    const [
        dialogoAccionAbierto,
        setDialogoAccionAbierto,
    ] = useState(false)

    const [
        procesandoAccion,
        setProcesandoAccion,
    ] = useState(false)

    /*
     * El reloj actualiza los estados de los botones
     * y el tiempo restante de los códigos QR.
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
     * Cuando existe un QR abierto actualizamos el reloj
     * cada segundo. En el listado bastan treinta segundos.
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
     * Las imágenes recibidas desde la API utilizan una URL
     * temporal del navegador. La liberamos cuando se reemplaza
     * el QR o cuando el componente deja de mostrarse.
     */
    useEffect(() => {
        return () => {
            const imagenUrl =
                qrActivo?.imagenUrl

            if (
                typeof imagenUrl ===
                    'string' &&
                imagenUrl.startsWith(
                    'blob:',
                )
            ) {
                URL.revokeObjectURL(
                    imagenUrl,
                )
            }
        }
    }, [qrActivo])

    const actividadesDisponibles =
        useMemo(
            () =>
                actividades
                    .filter(
                        (actividad) =>
                            actividad.eliminada !==
                            true,
                    )
                    .map(
                        (actividad) => ({
                            ...actividad,

                            estado:
                                calcularEstadoTemporalActividad(
                                    actividad,
                                    instanteActual,
                                ),
                        }),
                    ),
            [
                actividades,
                instanteActual,
            ],
        )
    /*
     * Los contadores incluyen todas las actividades
     * de cada pestaña antes de aplicar los filtros.
     */
    const cantidadesPorPestana =
        useMemo(
            () => ({
                programadas:
                    actividadesDisponibles.filter(
                        (actividad) =>
                            actividad.estado ===
                            'programada',
                    ).length,

                'en-curso':
                    actividadesDisponibles.filter(
                        (actividad) =>
                            actividad.estado ===
                            'en-curso',
                    ).length,

                historial:
                    actividadesDisponibles.filter(
                        (actividad) =>
                            [
                                'finalizada',
                                'cancelada',
                            ].includes(
                                actividad.estado,
                            ),
                    ).length,
            }),
            [actividadesDisponibles],
        )

    const configuracionPestana =
        PESTANAS_ACTIVIDADES.find(
            (pestana) =>
                pestana.id ===
                pestanaActiva,
        ) ?? PESTANAS_ACTIVIDADES[0]

    /*
     * Primero seleccionamos las actividades de la pestaña.
     * El historial se ordena desde la más reciente.
     */
    const actividadesPestana =
        useMemo(() => {
            const actividadesEncontradas =
                actividadesDisponibles.filter(
                    (actividad) =>
                        configuracionPestana.estados.includes(
                            actividad.estado,
                        ),
                )

            return actividadesEncontradas.sort(
                (actividadA, actividadB) => {
                    const fechaA =
                        `${actividadA.fecha}T${actividadA.horaInicio}`

                    const fechaB =
                        `${actividadB.fecha}T${actividadB.horaInicio}`

                    return pestanaActiva ===
                        'historial'
                        ? fechaB.localeCompare(fechaA)
                        : fechaA.localeCompare(fechaB)
                },
            )
        }, [
            actividadesDisponibles,
            configuracionPestana,
            pestanaActiva,
        ])

    /*
     * La visibilidad solamente se aplica a las programadas.
     * Las demás pestañas conservan únicamente la búsqueda.
     */
    const actividadesFiltradas =
        useMemo(() => {
            const textoBuscado =
                normalizarBusqueda(
                    busqueda,
                )

            return actividadesPestana.filter(
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

                    if (!coincideBusqueda) {
                        return false
                    }

                    if (
                        pestanaActiva !==
                            'programadas' ||
                        visibilidadSeleccionada ===
                            'todas'
                    ) {
                        return true
                    }

                    const actividadActiva =
                        actividad.activa !==
                        false

                    return visibilidadSeleccionada ===
                        'activas'
                        ? actividadActiva
                        : !actividadActiva
                },
            )
        }, [
            actividadesPestana,
            busqueda,
            pestanaActiva,
            visibilidadSeleccionada,
        ])

    /*
     * Calcula cuántas páginas necesita el resultado filtrado.
     * Se conserva al menos una página para mantener estable
     * el estado del componente cuando no existen resultados.
     */
    const totalPaginas =
        useMemo(
            () =>
                Math.max(
                    1,
                    Math.ceil(
                        actividadesFiltradas.length /
                            ACTIVIDADES_POR_PAGINA,
                    ),
                ),
            [
                actividadesFiltradas.length,
            ],
        )

    /*
     * Obtiene únicamente las actividades correspondientes
     * a la página seleccionada.
     */
    const actividadesPagina =
        useMemo(() => {
            const indiceInicial =
                (paginaActual - 1) *
                ACTIVIDADES_POR_PAGINA

            return actividadesFiltradas.slice(
                indiceInicial,
                indiceInicial +
                    ACTIVIDADES_POR_PAGINA,
            )
        }, [
            actividadesFiltradas,
            paginaActual,
        ])

    /*
     * Al cambiar de pestaña o filtros regresamos a la
     * primera página para evitar mostrar una página vacía.
     */
    useEffect(() => {
        setPaginaActual(1)
    }, [
        pestanaActiva,
        busqueda,
        visibilidadSeleccionada,
    ])

    /*
     * Si disminuyen los resultados, impedimos conservar
     * una página que ya no existe.
     */
    useEffect(() => {
        setPaginaActual(
            (paginaSeleccionada) =>
                Math.min(
                    paginaSeleccionada,
                    totalPaginas,
                ),
        )
    }, [totalPaginas])

    const existenActividades =
        actividadesDisponibles.length > 0

    const existenResultados =
        actividadesFiltradas.length > 0

        const primeraActividadMostrada =
        existenResultados
            ? (
                  paginaActual - 1
              ) *
                  ACTIVIDADES_POR_PAGINA +
              1
            : 0

    const ultimaActividadMostrada =
        Math.min(
            paginaActual *
                ACTIVIDADES_POR_PAGINA,
            actividadesFiltradas.length,
        )

    const hayFiltrosAplicados =
        Boolean(busqueda.trim()) ||
        (
            pestanaActiva ===
                'programadas' &&
            visibilidadSeleccionada !==
                'todas'
        )

    const mostrarVisibilidad =
        pestanaActiva ===
        'programadas'

    // Durante la actividad mostramos los controles de asistencia.
    const existeVentanaQrEnHistorial =
        pestanaActiva ===
            'historial' &&
        actividadesFiltradas.some(
            (actividad) =>
                obtenerDisponibilidadMarcacion(
                    actividad,
                    TIPOS_MARCACION.salida,
                    instanteActual,
                ).disponible,
        )

    const mostrarAsistencia =
        pestanaActiva ===
            'en-curso' ||
        existeVentanaQrEnHistorial

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

    const accionEsEliminacion =
        accionPendiente?.tipo ===
        'eliminar'

    const accionEsActivacion =
        accionPendiente?.tipo ===
            'visibilidad' &&
        accionPendiente?.nuevaVisibilidad ===
            true

    function reintentarCarga() {
        setRecarga(
            (valorActual) =>
                valorActual + 1,
        )
    }

    function seleccionarPestana(
        identificador,
    ) {
        setPestanaActiva(
            identificador,
        )
    }

    function limpiarFiltros() {
        setBusqueda('')
        setVisibilidadSeleccionada(
            'todas',
        )
    }

    /*
     * Solicita al servicio el QR correspondiente y abre
     * el diálogo para que los estudiantes puedan escanearlo.
     */
    async function mostrarQrMarcacion(
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
                    ? await obtenerQrEntradaActividad(
                          actividad.id,
                      )
                    : await obtenerQrSalidaActividad(
                          actividad.id,
                      )

            const existeContenidoQr =
                Boolean(
                    respuesta?.qr?.url,
                ) ||
                Boolean(
                    respuesta?.qr
                        ?.imagenUrl,
                )

            if (
                !respuesta?.actividad ||
                !existeContenidoQr
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

            setDialogoQrAbierto(true)
            setInstanteActual(Date.now())

            const nombreMarcacion =
                tipo ===
                TIPOS_MARCACION.entrada
                    ? 'entrada'
                    : 'salida'

            toast.success(
                `El QR de ${nombreMarcacion} fue generado correctamente.`,
            )
        } catch (errorMarcacion) {
            toast.error(
                errorMarcacion instanceof Error
                    ? errorMarcacion.message
                    : 'No fue posible obtener el código QR.',
            )
        } finally {
            setProcesandoMarcacion('')
        }
    }

    function cerrarDialogoQr() {
        if (procesandoQrActivo) {
            return
        }

        setDialogoQrAbierto(false)
    }

    /*
     * Guarda la actividad seleccionada antes de mostrar
     * la confirmación para activar o desactivar.
     */
    function solicitarCambioVisibilidad(
        actividad,
    ) {
        if (
            !actividad?.id ||
            procesandoAccion
        ) {
            return
        }

        setAccionPendiente({
            tipo: 'visibilidad',
            actividad,
            nuevaVisibilidad:
                actividad.activa === false,
        })

        setDialogoAccionAbierto(true)
    }

    function solicitarEliminacion(
        actividad,
    ) {
        if (
            !actividad?.id ||
            procesandoAccion
        ) {
            return
        }

        setAccionPendiente({
            tipo: 'eliminar',
            actividad,
        })

        setDialogoAccionAbierto(true)
    }

    function cerrarDialogoAccion() {
        if (procesandoAccion) {
            return
        }

        /*
         * Conservamos la acción durante el cierre para evitar
         * cambios de contenido mientras termina la animación.
         */
        setDialogoAccionAbierto(false)
    }

    /*
     * Ejecuta la operación elegida y actualiza la tabla
     * sin realizar una nueva consulta completa.
     */
    async function confirmarAccionPendiente() {
        if (
            !accionPendiente?.actividad?.id ||
            procesandoAccion
        ) {
            return
        }

        const actividadSeleccionada =
            accionPendiente.actividad

        setProcesandoAccion(true)

        try {
            if (
                accionPendiente.tipo ===
                'visibilidad'
            ) {
                const actividadActualizada =
                    await cambiarVisibilidadActividad(
                        actividadSeleccionada.id,
                        accionPendiente.nuevaVisibilidad,
                    )

                setActividades(
                    (actividadesActuales) =>
                        actividadesActuales.map(
                            (actividad) =>
                                actividad.id ===
                                actividadActualizada.id
                                    ? actividadActualizada
                                    : actividad,
                        ),
                )

                toast.success(
                    accionPendiente.nuevaVisibilidad
                        ? 'La actividad fue activada correctamente.'
                        : 'La actividad fue desactivada correctamente.',
                )
            }

            if (
                accionPendiente.tipo ===
                'eliminar'
            ) {
                await eliminarActividad(
                    actividadSeleccionada.id,
                )

                setActividades(
                    (actividadesActuales) =>
                        actividadesActuales.filter(
                            (actividad) =>
                                actividad.id !==
                                actividadSeleccionada.id,
                        ),
                )

                if (
                    qrActivo?.actividadId ===
                    actividadSeleccionada.id
                ) {
                    setQrActivo(null)
                    setDialogoQrAbierto(false)
                }

                toast.success(
                    'La actividad fue eliminada permanentemente.',
                )
            }

            setDialogoAccionAbierto(false)
        } catch (errorAccion) {
            toast.error(
                errorAccion instanceof Error
                    ? errorAccion.message
                    : 'No fue posible completar la operación.',
            )
        } finally {
            setProcesandoAccion(false)
        }
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
                        Administra las actividades,
                        consulta su historial y controla
                        su disponibilidad para los
                        estudiantes.
                    </p>
                </div>

                <div className="admin-activities-heading__actions">
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
                <>
                    {/* Navegación entre los estados principales. */}
                    <div
                        className="admin-activities-tabs"
                        role="tablist"
                        aria-label="Clasificación de actividades"
                    >
                        {PESTANAS_ACTIVIDADES.map(
                            (pestana) => {
                                const IconoPestana =
                                    pestana.icono

                                const seleccionada =
                                    pestanaActiva ===
                                    pestana.id

                                return (
                                    <button
                                        key={
                                            pestana.id
                                        }
                                        id={`admin-activities-tab-${pestana.id}`}
                                        className={
                                            seleccionada
                                                ? 'admin-activities-tab admin-activities-tab--active'
                                                : 'admin-activities-tab'
                                        }
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            seleccionada
                                        }
                                        aria-controls="admin-activities-tab-panel"
                                        onClick={() =>
                                            seleccionarPestana(
                                                pestana.id,
                                            )
                                        }
                                    >
                                        <IconoPestana
                                            aria-hidden="true"
                                        />

                                        <span>
                                            {
                                                pestana.titulo
                                            }
                                        </span>

                                        <small>
                                            {
                                                cantidadesPorPestana[
                                                    pestana.id
                                                ]
                                            }
                                        </small>
                                    </button>
                                )
                            },
                        )}
                    </div>

                    {/* Los filtros trabajan sobre la pestaña seleccionada. */}
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

                        {mostrarVisibilidad && (
                            <label className="admin-activities-filter">
                                <span>
                                    Visibilidad
                                </span>

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
                                    <option value="todas">
                                        Todas
                                    </option>

                                    <option value="activas">
                                        Activas
                                    </option>

                                    <option value="desactivadas">
                                        Desactivadas
                                    </option>
                                </select>
                            </label>
                        )}

                        <button
                            className="admin-activities-clear-button"
                            type="button"
                            disabled={
                                !hayFiltrosAplicados
                            }
                            onClick={limpiarFiltros}
                        >
                            <X aria-hidden="true" />
                            Limpiar filtros
                        </button>
                    </section>
                </>
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
                            No hay actividades registradas
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
                        key={pestanaActiva}
                        id="admin-activities-tab-panel"
                        className="admin-activities-list"
                        role="tabpanel"
                        aria-labelledby={`admin-activities-tab-${pestanaActiva}`}
                    >
                        <header className="admin-activities-list__header">
                            <div>
                                <p>Listado</p>

                                <h2 id="admin-activities-list-title">
                                    {
                                        configuracionPestana.tituloListado
                                    }
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
                                    {actividadesPestana.length ===
                                    0
                                        ? 'No hay actividades en esta sección'
                                        : 'No encontramos resultados'}
                                </h3>

                                <p>
                                    {actividadesPestana.length ===
                                    0
                                        ? 'Las actividades aparecerán aquí cuando alcancen este estado.'
                                        : 'Cambia la búsqueda o limpia los filtros seleccionados.'}
                                </p>

                                {hayFiltrosAplicados && (
                                    <button
                                        className="admin-activities-no-results__clear"
                                        type="button"
                                        onClick={
                                            limpiarFiltros
                                        }
                                    >
                                        <X aria-hidden="true" />
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                            <div className="admin-activities-management-table-wrapper">
                                <table className="admin-activities-management-table">
                                    <caption>
                                        {
                                            configuracionPestana.tituloListado
                                        }
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

                                            {mostrarVisibilidad && (
                                                <th scope="col">
                                                    Visibilidad
                                                </th>
                                            )}

                                            {mostrarAsistencia && (
                                                <th scope="col">
                                                    Asistencia
                                                </th>
                                            )}

                                            <th scope="col">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {actividadesPagina.map(
                                            (actividad) => {
                                                const disponibilidadEntrada =
                                                    mostrarAsistencia
                                                        ? obtenerDisponibilidadMarcacion(
                                                            actividad,
                                                            TIPOS_MARCACION.entrada,
                                                            instanteActual,
                                                        )
                                                    : null

                                                const disponibilidadSalida =
                                                        mostrarAsistencia
                                                            ? obtenerDisponibilidadMarcacion(
                                                                actividad,
                                                                TIPOS_MARCACION.salida,
                                                                instanteActual,
                                                            )
                                                        : null

                                                const textoBotonEntrada =
                                                    'Mostrar QR de entrada'

                                                const textoBotonSalida =
                                                    'Mostrar QR de salida'

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

                                                const cuposDisponibles =
                                                    Number(
                                                        actividad.cuposDisponibles,
                                                    )

                                                const cuposTotales =
                                                    Number(
                                                        actividad.cuposTotales,
                                                    )

                                                const cuposLlenos =
                                                    Number.isFinite(
                                                        cuposDisponibles,
                                                    ) &&
                                                    cuposDisponibles <=
                                                        0

                                                const esProgramada =
                                                    actividad.estado ===
                                                    'programada'

                                                return (
                                                    <tr
                                                        key={
                                                            actividad.id
                                                        }
                                                        className={
                                                            actividad.activa ===
                                                            false
                                                                ? 'admin-activity-row--inactive'
                                                                : undefined
                                                        }
                                                    >
                                                        <th scope="row" data-label="Actividad">
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

                                                        <td data-label="Fecha y horario">
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

                                                        <td data-label="Lugar">
                                                            {actividad.lugar ||
                                                                'Lugar por confirmar'}
                                                        </td>

                                                        <td data-label="Cupos">
                                                            <div
                                                                className={
                                                                    cuposLlenos
                                                                        ? 'admin-activity-capacity admin-activity-capacity--full'
                                                                        : 'admin-activity-capacity'
                                                                }
                                                            >
                                                                <strong>
                                                                    {cuposLlenos
                                                                        ? 'Cupos llenos'
                                                                        : `${cuposDisponibles} disponibles`}
                                                                </strong>

                                                                <small>
                                                                    {Number.isFinite(
                                                                        cuposTotales,
                                                                    )
                                                                        ? `${cuposTotales} cupos totales`
                                                                        : 'Total no disponible'}
                                                                </small>
                                                            </div>
                                                        </td>

                                                        <td data-label="Estado">
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

                                                        {mostrarVisibilidad && (
                                                            <td data-label="Visibilidad">
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
                                                        )}

                                                        {mostrarAsistencia && (
                                                            <td data-label="Asistencia">
                                                                <div className="admin-activity-attendance-actions">
                                                                    <button
                                                                        className={
                                                                            disponibilidadEntrada?.disponible
                                                                                ? 'admin-activity-attendance-button admin-activity-attendance-button--entry admin-activity-attendance-button--active'
                                                                                : 'admin-activity-attendance-button admin-activity-attendance-button--entry'
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            !disponibilidadEntrada?.disponible ||
                                                                            Boolean(
                                                                                procesandoMarcacion,
                                                                            )
                                                                        }
                                                                        title={
                                                                            disponibilidadEntrada?.mensaje
                                                                        }
                                                                        aria-label={`${textoBotonEntrada} para ${actividad.titulo}`}
                                                                        onClick={() =>
                                                                            mostrarQrMarcacion(
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
                                                                            {
                                                                                textoBotonEntrada
                                                                            }
                                                                        </span>
                                                                    </button>

                                                                    <button
                                                                        className={
                                                                            disponibilidadSalida?.disponible
                                                                                ? 'admin-activity-attendance-button admin-activity-attendance-button--exit admin-activity-attendance-button--active'
                                                                                : 'admin-activity-attendance-button admin-activity-attendance-button--exit'
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            !disponibilidadSalida?.disponible ||
                                                                            Boolean(
                                                                                procesandoMarcacion,
                                                                            )
                                                                        }
                                                                        title={
                                                                            disponibilidadSalida?.mensaje
                                                                        }
                                                                        aria-label={`${textoBotonSalida} para ${actividad.titulo}`}
                                                                        onClick={() =>
                                                                            mostrarQrMarcacion(
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
                                                                            {
                                                                                textoBotonSalida
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}

                                                        <td data-label="Acciones">
                                                            <div className="admin-activity-actions">
                                                                <button
                                                                    type="button"
                                                                    title="Ver actividad"
                                                                    aria-label={`Ver ${actividad.titulo}`}
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/admin-principal/actividades/${encodeURIComponent(
                                                                                actividad.id,
                                                                            )}`,
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye aria-hidden="true" />
                                                                </button>

                                                                {esProgramada && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            title="Editar actividad"
                                                                            aria-label={`Editar ${actividad.titulo}`}
                                                                            onClick={() =>
                                                                                navigate(
                                                                                    `/admin-principal/actividades/${encodeURIComponent(
                                                                                        actividad.id,
                                                                                    )}/editar`,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil aria-hidden="true" />
                                                                        </button>

                                                                        <button
                                                                            className={
                                                                                actividad.activa !==
                                                                                false
                                                                                    ? 'admin-activity-actions__power'
                                                                                    : 'admin-activity-actions__power admin-activity-actions__power--inactive'
                                                                            }
                                                                            type="button"
                                                                            disabled={
                                                                                procesandoAccion
                                                                            }
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
                                                                                solicitarCambioVisibilidad(
                                                                                    actividad,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Power aria-hidden="true" />
                                                                        </button>

                                                                        <button
                                                                            className="admin-activity-actions__delete"
                                                                            type="button"
                                                                            disabled={
                                                                                procesandoAccion
                                                                            }
                                                                            title="Eliminar actividad"
                                                                            aria-label={`Eliminar ${actividad.titulo}`}
                                                                            onClick={() =>
                                                                                solicitarEliminacion(
                                                                                    actividad,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 aria-hidden="true" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación del listado de actividades */}
                            <div className="admin-activities-pagination">
                                <p>
                                    Mostrando{' '}
                                    {
                                        primeraActividadMostrada
                                    }{' '}
                                    a{' '}
                                    {
                                        ultimaActividadMostrada
                                    }{' '}
                                    de{' '}
                                    {
                                        actividadesFiltradas.length
                                    }{' '}
                                    {actividadesFiltradas.length ===
                                    1
                                        ? 'resultado'
                                        : 'resultados'}
                                </p>

                                <nav aria-label="Paginación de actividades">
                                    <button
                                        type="button"
                                        disabled={
                                            paginaActual === 1
                                        }
                                        aria-label="Ir a la página anterior"
                                        onClick={() =>
                                            setPaginaActual(
                                                (
                                                    paginaSeleccionada,
                                                ) =>
                                                    paginaSeleccionada -
                                                    1,
                                            )
                                        }
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                    </button>

                                    {Array.from(
                                        {
                                            length: totalPaginas,
                                        },
                                        (
                                            _,
                                            indice,
                                        ) =>
                                            indice +
                                            1,
                                    ).map(
                                        (pagina) => (
                                            <button
                                                key={
                                                    pagina
                                                }
                                                className={
                                                    pagina ===
                                                    paginaActual
                                                        ? 'admin-activities-pagination__page admin-activities-pagination__page--active'
                                                        : 'admin-activities-pagination__page'
                                                }
                                                type="button"
                                                aria-current={
                                                    pagina ===
                                                    paginaActual
                                                        ? 'page'
                                                        : undefined
                                                }
                                                aria-label={`Ir a la página ${pagina}`}
                                                onClick={() =>
                                                    setPaginaActual(
                                                        pagina,
                                                    )
                                                }
                                            >
                                                {
                                                    pagina
                                                }
                                            </button>
                                        ),
                                    )}

                                    <button
                                        type="button"
                                        disabled={
                                            paginaActual ===
                                            totalPaginas
                                        }
                                        aria-label="Ir a la página siguiente"
                                        onClick={() =>
                                            setPaginaActual(
                                                (
                                                    paginaSeleccionada,
                                                ) =>
                                                    paginaSeleccionada +
                                                    1,
                                            )
                                        }
                                    >
                                        <ChevronRight aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                            </>
                        )}
                    </section>
                )}

            {/* Confirmación para activar, desactivar o eliminar. */}
            <AlertDialog.Root
                open={dialogoAccionAbierto}
                onOpenChange={(abierto) => {
                    if (!procesandoAccion) {
                        setDialogoAccionAbierto(
                            abierto,
                        )
                    }
                }}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="admin-activity-confirm-dialog__overlay" />

                    <AlertDialog.Content className="admin-activity-confirm-dialog__content">
                        <div
                            className={
                                accionEsEliminacion
                                    ? 'admin-activity-confirm-dialog__icon admin-activity-confirm-dialog__icon--danger'
                                    : accionEsActivacion
                                      ? 'admin-activity-confirm-dialog__icon admin-activity-confirm-dialog__icon--activate'
                                      : 'admin-activity-confirm-dialog__icon admin-activity-confirm-dialog__icon--deactivate'
                            }
                        >
                            {accionEsEliminacion ? (
                                <Trash2 aria-hidden="true" />
                            ) : (
                                <Power aria-hidden="true" />
                            )}
                        </div>

                        <AlertDialog.Title className="admin-activity-confirm-dialog__title">
                            {accionEsEliminacion
                                ? 'Eliminar actividad'
                                : accionEsActivacion
                                  ? 'Activar actividad'
                                  : 'Desactivar actividad'}
                        </AlertDialog.Title>

                        <AlertDialog.Description className="admin-activity-confirm-dialog__description">
                            {accionEsEliminacion
                                ? 'Se eliminarán permanentemente la actividad, sus inscripciones y sus registros de asistencia. Las cuentas de los estudiantes no serán eliminadas.'
                                : accionEsActivacion
                                  ? 'La actividad volverá a mostrarse en el portal de los estudiantes.'
                                  : 'La actividad dejará de mostrarse en el portal de los estudiantes, pero conservará sus inscripciones y asistencias.'}
                        </AlertDialog.Description>

                        <p className="admin-activity-confirm-dialog__activity">
                            {
                                accionPendiente
                                    ?.actividad
                                    ?.titulo
                            }
                        </p>

                        {accionEsEliminacion && (
                            <div
                                className="admin-activity-confirm-dialog__warning"
                                role="note"
                            >
                                <TriangleAlert aria-hidden="true" />

                                <p>
                                    Esta acción no se
                                    puede deshacer.
                                </p>
                            </div>
                        )}

                        <div className="admin-activity-confirm-dialog__actions">
                            <AlertDialog.Cancel asChild>
                                <button
                                    className="admin-activity-confirm-dialog__cancel"
                                    type="button"
                                    disabled={
                                        procesandoAccion
                                    }
                                    onClick={
                                        cerrarDialogoAccion
                                    }
                                >
                                    Cancelar
                                </button>
                            </AlertDialog.Cancel>

                            <button
                                className={
                                    accionEsEliminacion
                                        ? 'admin-activity-confirm-dialog__confirm admin-activity-confirm-dialog__confirm--danger'
                                        : 'admin-activity-confirm-dialog__confirm'
                                }
                                type="button"
                                disabled={
                                    procesandoAccion
                                }
                                onClick={
                                    confirmarAccionPendiente
                                }
                            >
                                {procesandoAccion ? (
                                    <LoaderCircle
                                        className="admin-activity-confirm-dialog__loader"
                                        aria-hidden="true"
                                    />
                                ) : accionEsEliminacion ? (
                                    <Trash2 aria-hidden="true" />
                                ) : (
                                    <Power aria-hidden="true" />
                                )}

                                {procesandoAccion
                                    ? 'Procesando...'
                                    : accionEsEliminacion
                                      ? 'Eliminar permanentemente'
                                      : accionEsActivacion
                                        ? 'Activar actividad'
                                        : 'Desactivar actividad'}
                            </button>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>

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

                        {(
                            qrActivo?.imagenUrl ||
                            qrActivo?.url
                        ) && (
                            <div
                                className={
                                    qrEstaVigente
                                        ? 'admin-qr-dialog__code'
                                        : 'admin-qr-dialog__code admin-qr-dialog__code--expired'
                                }
                            >
                                {qrActivo.imagenUrl ? (
                                    /*
                                     * En modo API mostramos directamente
                                     * el archivo PNG creado por el backend.
                                     */
                                    <img
                                        src={
                                            qrActivo.imagenUrl
                                        }
                                        width="248"
                                        height="248"
                                        alt={`Código QR de ${qrActivo.tipo}`}
                                    />
                                ) : (
                                    /*
                                     * En modo simulado generamos el dibujo
                                     * a partir de la URL local con el token.
                                     */
                                    <QRCodeSVG
                                        value={
                                            qrActivo.url
                                        }
                                        size={248}
                                        level="M"
                                        marginSize={2}
                                        bgColor="#ffffff"
                                        fgColor="#002b4f"
                                        title={`Código QR de ${qrActivo.tipo}`}
                                    />
                                )}
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
                                ? 'El código permanecerá disponible únicamente durante la ventana oficial de veinte minutos.'
                                : 'La ventana permitida para esta marcación ya finalizó.'}
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
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    )
}

export default AdminPrincipalActivities