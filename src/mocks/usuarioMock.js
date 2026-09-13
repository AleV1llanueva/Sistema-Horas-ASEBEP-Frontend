/*
 * Usuario utilizado exclusivamente durante
 * el desarrollo del portal de becarios.
 */
export const ESTADOS_APORTACION_BACKEND =
  Object.freeze({
    PENDIENTE: 'Pendiente',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
  })

// Credenciales ficticias para probar el login.
export const credencialesUsuarioMock =
  Object.freeze({
    numeroCuenta: '20249999999',
    contrasena: 'AsebepBeta2026!',
  })

export const usuarioMock = {
  credenciales: {
    rol: 'becario',
    activo: true,
  },

  // Información personal ficticia.
  datosPersonales: {
    numeroCuenta:
      credencialesUsuarioMock.numeroCuenta,

    primerNombre: 'Usuario',
    segundoNombre: 'De',
    primerApellido: 'Prueba',
    segundoApellido: 'ASEBEP',
    nombreCompleto: 'Usuario De Prueba ASEBEP',
    correoPersonal: 'usuario.prueba@example.com',
    correoInstitucional: 'usuario.prueba@unah.hn',
    carrera: 'Licenciatura en Informática Administrativa',
    telefono: '99999999',
    anioNacimiento: 2003,
  },

  // Información ficticia relacionada con la beca.
  datosBecario: {
    periodoInicio: 'III PAC',
    anioInicio: 2024,
    horasAcumuladas: 250,
    horasFaltantes: 130,
    mesesSinPagar: 2,
    estadoBeca: 'activo',
  },

  // Aportaciones iniciales del usuario de prueba.
  aportaciones: [
    {
      id: 1,
      num_cuenta: credencialesUsuarioMock.numeroCuenta,
      num_referencia: 'AP-2026-0001',
      descripcion: 'Pago correspondiente a dos meses de aportación.',
      ruta_pdf: 'uploads/aportaciones/20249999999_AP-2026-0001_comprobante-septiembre.pdf',
      estado:
        ESTADOS_APORTACION_BACKEND
          .PENDIENTE,

      /*
       * Una aportación pendiente todavía no tiene
       * meses acreditados por el administrador.
       */
      meses_aprobados: 0,
      fecha_subida: '2026-09-10T16:35:00-06:00',
    },

    {
      id: 2,
      num_cuenta: credencialesUsuarioMock.numeroCuenta,
      num_referencia: 'AP-2026-0002',
      descripcion: 'Pago correspondiente a tres meses de aportación.',
      ruta_pdf: 'uploads/aportaciones/20249999999_AP-2026-0002_comprobante-agosto.pdf',
      estado:
        ESTADOS_APORTACION_BACKEND
          .APROBADO,

      /*
       * La aprobación aplica a todos los meses
       * declarados en este comprobante.
       */
      meses_aprobados: 3,
      fecha_subida: '2026-08-05T10:20:00-06:00',
    },

    {
      id: 3,
      num_cuenta: credencialesUsuarioMock.numeroCuenta,
      num_referencia: 'AP-2026-0003',
      descripcion: 'Pago correspondiente a un mes de aportación.',
      ruta_pdf: 'uploads/aportaciones/20249999999_AP-2026-0003_comprobante-julio.pdf',
      estado:
        ESTADOS_APORTACION_BACKEND
          .RECHAZADO,

      /*
       * Una aportación rechazada no acredita meses.
       *
       * El contrato actual todavía no dispone de un
       * campo para guardar la razón del rechazo.
       */
      meses_aprobados: 0,
      fecha_subida: '2026-07-04T09:15:00-06:00',
    },
  ],
}