/*
* Inscripciones iniciales del estudiante de prueba.
*
* Solo incluimos actividades completadas para alimentar.
* la vista Historial. Las próximas actividades apareceran
* cuando el estudiante se inscriba desde el detalle.
*/
export const NUMERO_CUENTA_ESTUDIANTE_PRUEBA = '20249999999'
export const inscripcionesEstudianteMock =
    Object.freeze([
        Object.freeze({
            id: 'inscripcion-historial-001',
            actividadId: 'actividad-historial-001',
            numeroCuenta: NUMERO_CUENTA_ESTUDIANTE_PRUEBA,
            estadoInscripcion: 'completada',
            estadoAsistencia: 'Asistió',
            horasRegistradas: 4,
            cupoDescontado: false,
            creadaEn: '2026-08-24T12:30:00.000Z',

            // Guardamos una copia de la actividad dentro de la inscripcion para conservar el historial
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
    ])