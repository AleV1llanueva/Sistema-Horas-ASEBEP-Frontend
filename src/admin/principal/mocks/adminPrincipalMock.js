/*
 * Datos simulados del administrador principal.
 *
 * Este archivo concentra temporalmente los datos utilizados
 * por las vistas administrativas mientras se prepara el backend.
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

/*
 * Las propiedades "nombre" y "hora" se conservan
 * temporalmente para mantener compatibilidad con el
 * proceso de normalización del servicio de actividades.
 */
const proximasActividadesMock = [
  {
    id: 'actividad-001',
    nombre: 'Apoyo en biblioteca',
    descripcion: 'Apoyo en la organización, clasificación y atención de materiales en la biblioteca.',
    fecha: '2026-09-12',
    hora: '09:00',
    horaFinalizacion: '12:00',
    lugar: 'Biblioteca Central',
    cuposDisponibles: 20,
    horasAcreditables: 3,
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
    fecha: '2026-09-18',
    hora: '08:00',
    horaFinalizacion: '11:00',
    lugar: 'Campus Norte',
    cuposDisponibles: 30,
    horasAcreditables: 3,
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
    fecha: '2026-09-23',
    hora: '10:00',
    horaFinalizacion: '13:00',
    lugar: 'Oficinas ASEBEP',
    cuposDisponibles: 15,
    horasAcreditables: 3,
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
    fecha: '2026-09-28',
    hora: '16:00',
    horaFinalizacion: '19:00',
    lugar: 'Auditorio Central',
    cuposDisponibles: 50,
    horasAcreditables: 3,
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

/*
 * Todas las aportaciones mensuales tienen actualmente
 * un valor fijo de veinte lempiras.
 */
export const CUOTA_MENSUAL_APORTACION = 20

/*
 * Estudiantes simulados para probar el listado administrativo,
 * los filtros, el almacenamiento local y la futura vista de detalle.
 *
 * La estructura de credenciales, datosPersonales y datosBecario
 * coincide con el modelo utilizado en el portal del estudiante.
 */
export const estudiantesAdminMock = [
  {
    id: 'estudiante-20241001324',

    credenciales: {
      rol: 'becario',
      activo: true,
    },

    datosPersonales: {
      numeroCuenta: '20241001324',
      primerNombre: 'Juan',
      segundoNombre: '',
      primerApellido: 'Pérez',
      segundoApellido: 'Picapiedra',
      nombreCompleto: 'Juan Pérez Picapiedra',
      correoPersonal: 'juan.perez@example.test',
      correoInstitucional: 'juan.perez@unah.test',
      carrera: 'Ingeniería en Sistemas',
      telefono: '98989898',
      anioNacimiento: 2003,
    },

    datosBecario: {
      periodoInicio: 'III PAC',
      anioInicio: 2024,
      horasAcumuladas: 250,
      horasFaltantes: 130,

      /*
       * El saldo pendiente se calculará en el servicio:
       * mesesSinPagar × CUOTA_MENSUAL_APORTACION.
       */
      mesesSinPagar: 2,
      estadoBeca: 'activo',
    },

    actividadesRecientes: [
      {
        id: 'registro-horas-001',
        fecha: '2026-08-24',
        titulo: 'Apoyo en jornada de reforestación',
        horasAcreditadas: 6,
        registradoPor: 'Coordinación de Horas',
      },
      {
        id: 'registro-horas-002',
        fecha: '2026-08-17',
        titulo: 'Apoyo en biblioteca central',
        horasAcreditadas: 4,
        registradoPor: 'Coordinación de Horas',
      },
    ],

    aportaciones: [
      {
        id: 'aportacion-001',
        periodo: 'Agosto 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
      {
        id: 'aportacion-002',
        periodo: 'Julio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
      {
        id: 'aportacion-003',
        periodo: 'Junio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-06-10',
        estado: 'confirmada',
        comprobante:
          'comprobante-juan-junio-2026',
      },
    ],

    eliminado: false,
    desactivadoEn: null,
    eliminadoEn: null,
    creadoEn: '2024-09-01T14:00:00.000Z',
    actualizadoEn: '2026-08-24T16:30:00.000Z',
  },

  {
    id: 'estudiante-20241002418',

    credenciales: {
      rol: 'becario',
      activo: true,
    },

    datosPersonales: {
      numeroCuenta: '20241002418',
      primerNombre: 'María',
      segundoNombre: 'Fernanda',
      primerApellido: 'López',
      segundoApellido: 'Martínez',
      nombreCompleto: 'María Fernanda López Martínez',
      correoPersonal: 'maria.lopez@example.test',
      correoInstitucional:'maria.lopez@unah.test',
      carrera: 'Licenciatura en Administración de Empresas',
      telefono: '97654321',
      anioNacimiento: 2002,
    },

    datosBecario: {
      periodoInicio: 'I PAC',
      anioInicio: 2023,
      horasAcumuladas: 380,
      horasFaltantes: 0,
      mesesSinPagar: 0,
      estadoBeca: 'activo',
    },

    actividadesRecientes: [
      {
        id: 'registro-horas-003',
        fecha: '2026-08-20',
        titulo: 'Organización de documentos administrativos',
        horasAcreditadas: 5,
        registradoPor: 'Administración ASEBEP',
      },
      {
        id: 'registro-horas-004',
        fecha: '2026-08-12',
        titulo: 'Apoyo logístico en evento universitario',
        horasAcreditadas: 6,
        registradoPor: 'Coordinación de Horas',
      },
    ],

    aportaciones: [
      {
        id: 'aportacion-004',
        periodo: 'Agosto 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-08-08',
        estado: 'confirmada',
        comprobante: 'comprobante-maria-agosto-2026',
      },
      {
        id: 'aportacion-005',
        periodo: 'Julio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-07-09',
        estado: 'confirmada',
        comprobante: 'comprobante-maria-julio-2026',
      },
      {
        id: 'aportacion-006',
        periodo: 'Junio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-06-07',
        estado: 'confirmada',
        comprobante: 'comprobante-maria-junio-2026',
      },
    ],

    eliminado: false,
    desactivadoEn: null,
    eliminadoEn: null,
    creadoEn: '2023-02-01T14:00:00.000Z',
    actualizadoEn: '2026-08-20T15:00:00.000Z',
  },

  {
    id: 'estudiante-20241003756',

    /*
     * Este estudiante inicia desactivado para probar
     * el filtro y la futura acción de reactivación.
     */
    credenciales: {
      rol: 'becario',
      activo: false,
    },

    datosPersonales: {
      numeroCuenta: '20241003756',
      primerNombre: 'Carlos',
      segundoNombre: 'Andrés',
      primerApellido: 'Mejía',
      segundoApellido: 'Rivera',
      nombreCompleto: 'Carlos Andrés Mejía Rivera',
      correoPersonal: 'carlos.mejia@example.test',
      correoInstitucional: 'carlos.mejia@unah.test',
      carrera: 'Ingeniería Industrial',
      telefono: '94561230',
      anioNacimiento: 2001,
    },

    datosBecario: {
      periodoInicio: 'II PAC',
      anioInicio: 2022,
      horasAcumuladas: 190,
      horasFaltantes: 190,
      mesesSinPagar: 4,
      estadoBeca: 'inactivo',
    },

    actividadesRecientes: [
      {
        id: 'registro-horas-005',
        fecha: '2026-06-18',
        titulo: 'Clasificación de materiales en biblioteca',
        horasAcreditadas: 4,
        registradoPor: 'Coordinación de Horas',
      },
      {
        id: 'registro-horas-006',
        fecha: '2026-06-05',
        titulo: 'Apoyo en mantenimiento de áreas comunes',
        horasAcreditadas: 5,
        registradoPor: 'Coordinación de Horas',
      },
    ],

    aportaciones: [
      {
        id: 'aportacion-007',
        periodo: 'Agosto 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
      {
        id: 'aportacion-008',
        periodo: 'Julio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
      {
        id: 'aportacion-009',
        periodo: 'Junio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
      {
        id: 'aportacion-010',
        periodo: 'Mayo 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: null,
        estado: 'pendiente',
        comprobante: null,
      },
    ],

    eliminado: false,
    desactivadoEn: '2026-07-15T18:00:00.000Z',
    eliminadoEn: null,
    creadoEn: '2022-05-15T14:00:00.000Z',
    actualizadoEn: '2026-07-15T18:00:00.000Z',
  },
]
