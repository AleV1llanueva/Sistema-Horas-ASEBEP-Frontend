/*
 * Inscripciones iniciales del estudiante de prueba.
 * Incluimos dos situaciones:
 *
 * 1. Una actividad completada con entrada y salida.
 * 2. Una actividad finalizada que solamente posee entrada.
 */

export const NUMERO_CUENTA_ESTUDIANTE_PRUEBA =
  '20249999999'

export const inscripcionesEstudianteMock =
  Object.freeze([
    /*
     * Actividad completada correctamente.
     * El estudiante registró entrada y salida,
     * por lo que recibió todas las horas.
     */
    Object.freeze({
      id: 'inscripcion-historial-001',
      actividadId: 'actividad-historial-001',
      numeroCuenta: NUMERO_CUENTA_ESTUDIANTE_PRUEBA,
      estadoInscripcion: 'completada',
      estadoAsistencia: 'Asistió',
      entradaRegistrada: true,
      entradaRegistradaEn: '2026-08-24T08:02:00-06:00',
      salidaRegistrada: true,
      salidaRegistradaEn: '2026-08-24T12:00:00-06:00',
      horasRegistradas: 4,
      cupoDescontado: false,
      creadaEn: '2026-08-20T12:30:00-06:00',

      /*
       * Conservamos una copia de la actividad para
       * mantener disponible su información histórica.
       */
      actividad: Object.freeze({
        id: 'actividad-historial-001',
        titulo: 'Jornada de reforestación universitaria',
        descripcion: 'Apoyo en la recuperación y mantenimiento de las áreas verdes del campus.',
        fecha: '2026-08-24',
        horaInicio: '08:00',
        horaFinalizacion: '12:00',
        lugar: 'Jardín Botánico UNAH',
        horasAcreditables: 4,
        cuposTotales: null,
        cuposDisponibles: null,
        estado: 'finalizada',
        activa: false,
        eliminada: false,
      }),
    }),

    /*
     * Actividad con asistencia incompleta.
     *
     * La entrada fue registrada, pero la actividad
     * terminó sin que el estudiante marcara su salida.
     */
    Object.freeze({
      id: 'inscripcion-incompleta-001',
      actividadId: 'actividad-incompleta-001',
      numeroCuenta: NUMERO_CUENTA_ESTUDIANTE_PRUEBA,
      estadoInscripcion: 'inscrita',
      estadoAsistencia: 'Pendiente',
      entradaRegistrada: true,
      entradaRegistradaEn: '2026-09-06T08:03:00-06:00',
      salidaRegistrada: false,
      salidaRegistradaEn: null,

      /*
       * No se acreditan horas mientras el administrador
       * no confirme la asistencia mediante el comprobante
       * entregado fuera del portal.
       */
      horasRegistradas: 0,
      cupoDescontado: false,
      creadaEn: '2026-09-01T10:15:00-06:00',

      actividad: Object.freeze({
        id: 'actividad-incompleta-001',
        titulo: 'Apoyo en jornada informativa',
        descripcion: 'Apoyo en la organización y atención de estudiantes durante una jornada informativa de ASEBEP.',
        fecha: '2026-09-06',
        horaInicio: '08:00',
        horaFinalizacion: '12:00',
        lugar: 'Edificio administrativo',
        horasAcreditables: 4,
        cuposTotales: null,
        cuposDisponibles: null,
        estado: 'finalizada',
        activa: false,
        eliminada: false,
      }),
    }),
  ])