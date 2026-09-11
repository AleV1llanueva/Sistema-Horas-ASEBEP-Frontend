/*
 * Configuración y datos simulados del módulo de aportaciones.
 *
 * Este archivo contiene únicamente la información inicial.
 */

/*
 * Valor fijo de cada aportación mensual.
 *
 * Tanto la deuda como el monto de un comprobante se calcularán
 * multiplicando la cantidad de meses por esta cuota.
 */
export const CUOTA_MENSUAL_APORTACION = 20

// Cuenta de becario simulado
export const NUMERO_CUENTA_APORTACIONES_PRUEBA =
  '20249999999'

/*
 * Tipos de aportación reconocidos por la interfaz.
 *
 * - un_mes: comprobante correspondiente a un solo mes.
 * - varios_meses: un comprobante que cubre dos o más meses.
 */
export const TIPOS_APORTACION =
  Object.freeze({
    UN_MES: 'un_mes',
    VARIOS_MESES: 'varios_meses',
  })

/*
 * Estados que puede tener un comprobante después de enviarse.
 *
 * Estos valores internos se convertirán en etiquetas legibles
 * dentro de las páginas de historial y detalle.
 */
export const ESTADOS_APORTACION =
  Object.freeze({
    PENDIENTE_APROBACION:
      'pendiente_aprobacion',
    APROBADA: 'aprobada',
    REQUIERE_CORRECCION:
      'requiere_correccion',
  })

/*
 * Historial inicial del estudiante de prueba.
 *
 * La fechaEnvio determina el mes y año mostrado en el
 * distintivo de cada registro del historial.
 *
 * En los pagos individuales, mesAportacion y anioAportacion
 * conservan el periodo seleccionado por el estudiante.
 *
 * En los pagos múltiples no existe un único periodo, por lo
 * que el detalle utiliza cantidadMeses y monto.
 */
export const aportacionesEstudianteMock =
  Object.freeze([
    Object.freeze({
      id: 'aportacion-estudiante-001',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo: TIPOS_APORTACION.UN_MES,

      mesAportacion: 9,
      anioAportacion: 2026,
      cantidadMeses: 1,
      monto: CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-09-03',
      numeroReferencia: '847291',
      fechaEnvio:
        '2026-09-03T16:35:00-06:00',

      estado:
        ESTADOS_APORTACION
          .PENDIENTE_APROBACION,
      observacionAsebep:
        'Tu aportación fue recibida correctamente y se encuentra en proceso de revisión.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-septiembre.jpg',
        tipoMime: 'image/jpeg',
        tamanioBytes: 1887437,
      }),
    }),

    /*
     * Este registro permite validar el resumen de un
     * comprobante correspondiente a varios meses.
     */
    Object.freeze({
      id: 'aportacion-estudiante-002',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo:
        TIPOS_APORTACION.VARIOS_MESES,

      mesAportacion: null,
      anioAportacion: null,
      cantidadMeses: 3,
      monto:
        3 * CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-08-05',
      numeroReferencia: '847116',
      fechaEnvio:
        '2026-08-05T10:20:00-06:00',

      estado:
        ESTADOS_APORTACION.APROBADA,
      observacionAsebep:
        'El comprobante fue revisado y la aportación quedó aprobada.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-tres-meses.png',
        tipoMime: 'image/png',
        tamanioBytes: 1724908,
      }),
    }),

    Object.freeze({
      id: 'aportacion-estudiante-003',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo: TIPOS_APORTACION.UN_MES,

      mesAportacion: 7,
      anioAportacion: 2026,
      cantidadMeses: 1,
      monto: CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-07-04',
      numeroReferencia: '846904',
      fechaEnvio:
        '2026-07-04T09:15:00-06:00',

      estado:
        ESTADOS_APORTACION.APROBADA,
      observacionAsebep:
        'El comprobante fue revisado y la aportación quedó aprobada.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-julio.jpg',
        tipoMime: 'image/jpeg',
        tamanioBytes: 1352663,
      }),
    }),

    Object.freeze({
      id: 'aportacion-estudiante-004',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo: TIPOS_APORTACION.UN_MES,

      mesAportacion: 6,
      anioAportacion: 2026,
      cantidadMeses: 1,
      monto: CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-06-06',
      numeroReferencia: '846721',
      fechaEnvio:
        '2026-06-06T11:40:00-06:00',

      estado:
        ESTADOS_APORTACION.APROBADA,
      observacionAsebep:
        'El comprobante fue revisado y la aportación quedó aprobada.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-junio.webp',
        tipoMime: 'image/webp',
        tamanioBytes: 1101005,
      }),
    }),

    Object.freeze({
      id: 'aportacion-estudiante-005',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo: TIPOS_APORTACION.UN_MES,

      mesAportacion: 5,
      anioAportacion: 2026,
      cantidadMeses: 1,
      monto: CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-05-03',
      numeroReferencia: '846508',
      fechaEnvio:
        '2026-05-03T14:05:00-06:00',

      estado:
        ESTADOS_APORTACION.APROBADA,
      observacionAsebep:
        'El comprobante fue revisado y la aportación quedó aprobada.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-mayo.jpg',
        tipoMime: 'image/jpeg',
        tamanioBytes: 1247804,
      }),
    }),

    /*
     * Este caso alimentará la variante visual de corrección
     * y habilitará el acceso para enviar un comprobante nuevo.
     */
    Object.freeze({
      id: 'aportacion-estudiante-006',
      numeroCuenta:
        NUMERO_CUENTA_APORTACIONES_PRUEBA,
      tipo: TIPOS_APORTACION.UN_MES,

      mesAportacion: 4,
      anioAportacion: 2026,
      cantidadMeses: 1,
      monto: CUOTA_MENSUAL_APORTACION,

      fechaPago: '2026-04-02',
      numeroReferencia: '846293',
      fechaEnvio:
        '2026-04-02T08:50:00-06:00',

      estado:
        ESTADOS_APORTACION
          .REQUIERE_CORRECCION,
      observacionAsebep:
        'La imagen enviada no permite leer claramente el número de referencia. Debes enviar un comprobante nuevo y legible.',

      comprobante: Object.freeze({
        nombreOriginal:
          'comprobante-abril.jpg',
        tipoMime: 'image/jpeg',
        tamanioBytes: 1468006,
      }),
    }),
  ])