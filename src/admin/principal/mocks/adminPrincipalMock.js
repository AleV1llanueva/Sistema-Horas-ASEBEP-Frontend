/* Datos simulados para el administrador principal
* Este archivo se utilizara durante el desarrollo
*/

export const administradorPrincipalMock = {
    credenciales: {
        rol: 'administrador',
        areaAdministrativa: 'principal',
        activo: true,
    },

    datosPersonales: {
        numeroCuenta: '20249999999',
        primerNombre: 'Administrador',
        segundoNombre: '',
        primerApellido: 'Principal',
        segundoApellido: 'ASEBEP',
        nombreCompleto: 'Administrador Principal ASEBEP',
        correoInstitucional: 'administracion@asebep.test',
    },

    datosAdministrativos: {
        puesto: 'Administrador principal',
        area: 'Gestión de actividades',
    },
}


// Las propiedades "nombre" y "hora" se conservan temporalmente.
const proximasActividadesMock = [
    {
        id: 'actividad-001',
        nombre: 'Apoyo en biblioteca',
        descripcion: 'Apoyo en la organización, clasificación y atención de materiales en la biblioteca.',
        fecha: '2026-08-26',
        hora: '09:00',
        horaFinalizacion: '12:00',
        lugar: 'Biblioteca Central',
        cuposDisponibles: 20,
        horasAcreditables: 3,
        imagen: null,
        estado: 'programada',
        activa: true,
        eliminada: false,
        desactivadaEn: null,
        eliminadaEn: null,
        creadaEn: '2026-08-20T14:00:00.000Z',
        actualizadaEn: '2026-08-20T14:00:00.000Z',
    },
    {
        id: 'actividad-002',
        nombre: 'Jornada de limpieza',
        descripcion: 'Jornada de limpieza y mantenimiento de las áreas comunes del campus universitario.',
        fecha: '2026-08-27',
        hora: '08:00',
        horaFinalizacion: '11:00',
        lugar: 'Campus Norte',
        cuposDisponibles: 30,
        horasAcreditables: 3,
        imagen: null,
        estado: 'programada',
        activa: true,
        eliminada: false,
        desactivadaEn: null,
        eliminadaEn: null,
        creadaEn: '2026-08-20T15:00:00.000Z',
        actualizadaEn: '2026-08-20T15:00:00.000Z',
    },
    {
        id: 'actividad-003',
        nombre: 'Apoyo administrativo',
        descripcion: 'Apoyo en la organización de documentos y actividades administrativas de ASEBEP.',
        fecha: '2026-08-28',
        hora: '10:00',
        horaFinalizacion: '13:00',
        lugar: 'Oficinas ASEBEP',
        cuposDisponibles: 15,
        horasAcreditables: 3,
        imagen: null,
        estado: 'programada',
        activa: true,
        eliminada: false,
        desactivadaEn: null,
        eliminadaEn: null,
        creadaEn: '2026-08-21T14:00:00.000Z',
        actualizadaEn: '2026-08-21T14:00:00.000Z',
    },
    {
        id: 'actividad-004',
        nombre: 'Evento cultural',
        descripcion: 'Apoyo logístico durante la preparación y realización del evento cultural universitario.',
        fecha: '2026-08-30',
        hora: '16:00',
        horaFinalizacion: '19:00',
        lugar: 'Auditorio Central',
        cuposDisponibles: 50,
        horasAcreditables: 3,
        imagen: null,
        estado: 'programada',
        activa: true,
        eliminada: false,
        desactivadaEn: null,
        eliminadaEn: null,
        creadaEn: '2026-08-21T16:00:00.000Z',
        actualizadaEn: '2026-08-21T16:00:00.000Z',
    },
]

export const adminPrincipalDashboardMock = {
    resumen: {
        actividadesProximas: 4,
        horasPorAprobar: 36,
        porcentajeHorasPorAprobar: 64,
        aportacionesPendientes: 8,
        estudiantesActivos: 124,
    },

    proximasActividades: proximasActividadesMock,
}