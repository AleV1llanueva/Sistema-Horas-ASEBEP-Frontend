/*
 * Datos simulados del administrador principal.
 *
 * Este archivo concentra temporalmente la información utilizada
 * por las vistas administrativas cuando la variable de entorno
 * VITE_USAR_DATOS_ADMIN_SIMULADOS contiene el valor "true".
 */

export const administradorPrincipalMock = {
  credenciales: {
    rol: 'administrador',
    areaAdministrativa: 'principal',
    activo: true,
  },

  datosPersonales: {
    numeroCuenta: '20260000001',
    primerNombre: 'Administrador',
    segundoNombre: '',
    primerApellido: 'Principal',
    segundoApellido: 'ASEBEP',
    nombreCompleto:
      'Administrador Principal ASEBEP',
    correoInstitucional:
      'administracion@asebep.test',
  },

  datosAdministrativos: {
    puesto: 'Administrador principal',
    area: 'Gestión de actividades',
  },
}

// ACTIVIDADES ADMINISTRATIVAS SIMULADAS
const proximasActividadesMock = [
  {
    id: 'actividad-001',
    nombre: 'Jornada de reforestación universitaria',
    descripcion: 'Participa en la recuperación de las áreas verdes del campus universitario. La jornada incluye preparación del terreno, siembra y orientación para el cuidado de las nuevas plantas.',
    fecha: '2026-09-12',
    hora: '08:00',
    horaFinalizacion: '12:00',
    lugar: 'Jardín Botánico UNAH',

    /*
     * Esta actividad tiene tres inscripciones simuladas.
     * Por eso quedan 22 espacios de los 25 originales.
     */
    cuposTotales: 25,
    cuposDisponibles: 22,
    horasAcreditables: 4,
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

    // Tiene una inscripción simulada.
    cuposTotales: 31,
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

    /*
     * Esta actividad inicia desactivada para comprobar
     * posteriormente el filtro y la reactivación.
     */
    cuposTotales: 16,
    cuposDisponibles: 15,
    horasAcreditables: 3,
    estado: 'programada',
    activa: false,
    eliminada: false,
    desactivadaEn: '2026-09-09T15:30:00.000Z',
    eliminadaEn: null,
    creadaEn: '2026-08-21T14:00:00.000Z',
    actualizadaEn: '2026-09-09T15:30:00.000Z',
  },

  {
    id: 'actividad-004',
    nombre: 'Evento cultural',
    descripcion: 'Apoyo logístico durante la preparación y realización del evento cultural universitario.',
    fecha: '2026-09-28',
    hora: '16:00',
    horaFinalizacion: '19:00',
    lugar: 'Auditorio Central',

    // Todavía no tiene estudiantes inscritos.
    cuposTotales: 50,
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

  {
    id: 'actividad-005',
    nombre: 'Entrega de kits estudiantiles',
    descripcion: 'Apoyo en la organización y entrega de kits para estudiantes beneficiarios de ASEBEP.',
    fecha: '2026-09-10',
    hora: '18:00',
    horaFinalizacion: '22:00',
    lugar: 'Edificio Administrativo ASEBEP',

    /*
     * Sus dos cupos están ocupados para comprobar
     * el estado visual de cupos llenos.
     */
    cuposTotales: 2,
    cuposDisponibles: 0,
    horasAcreditables: 4,
    estado: 'en-curso',
    activa: true,
    eliminada: false,
    desactivadaEn: null,
    eliminadaEn: null,
    creadaEn: '2026-08-29T16:00:00.000Z',
    actualizadaEn: '2026-09-10T18:00:00.000Z',
  },

  {
    id: 'actividad-006',
    nombre: 'Clasificación de material educativo',
    descripcion: 'Apoyo en la clasificación y organización de material educativo utilizado por los estudiantes becarios.',
    fecha: '2026-09-05',
    hora: '08:00',
    horaFinalizacion: '12:00',
    lugar: 'Centro de Recursos ASEBEP',

    // Esta actividad aparecerá dentro del historial.
    cuposTotales: 12,
    cuposDisponibles: 10,
    horasAcreditables: 4,
    estado: 'finalizada',
    activa: true,
    eliminada: false,
    desactivadaEn: null,
    eliminadaEn: null,
    creadaEn: '2026-08-25T14:00:00.000Z',
    actualizadaEn: '2026-09-05T18:30:00.000Z',
  },
]

/*
 * INFORMACIÓN GENERAL DEL DASHBOARD
 *
 * Las próximas actividades son compartidas con el módulo
 * administrativo para evitar mantener dos listas diferentes.
 */
export const adminPrincipalDashboardMock = {
  resumen: {
    actividadesProximas: 4,
    horasPorAprobar: 36,
    porcentajeHorasPorAprobar: 64,
    aportacionesPendientes: 8,
    estudiantesActivos: 124,
  },

  proximasActividades:
    proximasActividadesMock,
}

/*
 * Todas las aportaciones mensuales tienen actualmente
 * un valor fijo de veinte lempiras.
 */
export const CUOTA_MENSUAL_APORTACION = 20

/*
 * ESTUDIANTES ADMINISTRATIVOS SIMULADOS
 *
 * Estos registros alimentan el listado general y la vista
 * administrativa de detalle de cada estudiante.
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
       * El saldo pendiente se calcula en el servicio:
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
      correoInstitucional: 'maria.lopez@unah.test',
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

        comprobante:
          'comprobante-maria-agosto-2026',
      },

      {
        id: 'aportacion-005',
        periodo: 'Julio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-07-09',
        estado: 'confirmada',

        comprobante:
          'comprobante-maria-julio-2026',
      },

      {
        id: 'aportacion-006',
        periodo: 'Junio 2026',
        monto: CUOTA_MENSUAL_APORTACION,
        fechaPago: '2026-06-07',
        estado: 'confirmada',

        comprobante:
          'comprobante-maria-junio-2026',
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
     * Este estudiante inicia desactivado para comprobar
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

/*
 * ASISTENCIAS SIMULADAS POR ACTIVIDAD
 *
 * Esta colección reproduce la información que entrega:
 * GET /asistencias/actividades/{actividad_id}
 */
export const asistenciasAdminMock = [
  /*
   * ACTIVIDAD 001
   *
   * Los tres registros cubren los estados visuales necesarios:
   *
   * 1. Inscrito sin entrada.
   * 2. Entrada registrada y salida pendiente.
   * 3. Entrada, salida y horas acreditadas.
   */
  {
    id: 'asistencia-actividad-001-juan',
    actividadId: 'actividad-001',
    numeroCuenta: '20241001324',
    checkIn: false,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Inscrito',
  },

  {
    id: 'asistencia-actividad-001-maria',
    actividadId: 'actividad-001',
    numeroCuenta: '20241002418',
    checkIn: true,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Asistió',
  },

  {
    id: 'asistencia-actividad-001-carlos',
    actividadId: 'actividad-001',
    numeroCuenta: '20241003756',
    checkIn: true,
    checkOut: true,
    horasRegistradas: 4,
    estado: 'Asistió',
  },

  /*
   * ACTIVIDAD 002
   * Juan se encuentra inscrito, pero aún no registra entrada.
   */
  {
    id: 'asistencia-actividad-002-juan',
    actividadId: 'actividad-002',
    numeroCuenta: '20241001324',
    checkIn: false,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Inscrito',
  },

  /*
   * ACTIVIDAD 003
   * La inscripción se conserva aunque la actividad esté desactivada.
   */
  {
    id: 'asistencia-actividad-003-maria',
    actividadId: 'actividad-003',
    numeroCuenta: '20241002418',
    checkIn: false,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Inscrito',
  },

  /*
   * La actividad 004 no aparece en esta colección porque
   * todavía no tiene estudiantes inscritos.
   */

  /*
   * ACTIVIDAD 005
   * Ambos estudiantes ocupan los dos cupos disponibles.
   */
  {
    id: 'asistencia-actividad-005-juan',
    actividadId: 'actividad-005',
    numeroCuenta: '20241001324',
    checkIn: true,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Asistió',
  },

  {
    id: 'asistencia-actividad-005-maria',
    actividadId: 'actividad-005',
    numeroCuenta: '20241002418',
    checkIn: true,
    checkOut: false,
    horasRegistradas: 0,
    estado: 'Asistió',
  },

  /*
   * ACTIVIDAD 006
   * Los estudiantes completaron la actividad
   * y recibieron las horas correspondientes.
   */
  {
    id: 'asistencia-actividad-006-juan',
    actividadId: 'actividad-006',
    numeroCuenta: '20241001324',
    checkIn: true,
    checkOut: true,
    horasRegistradas: 4,
    estado: 'Asistió',
  },

  {
    id: 'asistencia-actividad-006-maria',
    actividadId: 'actividad-006',
    numeroCuenta: '20241002418',
    checkIn: true,
    checkOut: true,
    horasRegistradas: 4,
    estado: 'Asistió',
  },
]