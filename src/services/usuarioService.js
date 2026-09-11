import { apiFetch } from './api.js'

// Valida y prepara el número de cuenta.
function prepararNumeroCuenta(numeroCuenta) {
  const cuenta = String(
    numeroCuenta ?? '',
  ).trim()

  if (!cuenta) {
    throw new Error(
      'El número de cuenta es obligatorio.',
    )
  }

  if (!/^\d+$/.test(cuenta)) {
    throw new Error(
      'El número de cuenta solamente puede contener números.',
    )
  }

  return cuenta
}

// Convierte cualquier valor textual valido en texto.
function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

/*
 * Convierte las cantidades enviadas por el backend
 * en números seguros para realizar cálculos.
 *
 * Si el valor no puede convertirse, devolvemos cero.
 */
function prepararNumero(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 0
  }

  return numero
}

function prepararNumeroOpcional(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return null
  }

  return numero
}

/*
 * Comprueba que la respuesta tenga las secciones
 * principales definidas por el backend:
 *
 * - credenciales
 * - datos_personales
 * - datos_becario
 */
function validarRespuestaUsuario(datosApi) {
  if (
    !datosApi ||
    typeof datosApi !== 'object' ||
    Array.isArray(datosApi)
  ) {
    throw new Error(
      'El servidor devolvió una respuesta de usuario inválida.',
    )
  }

  const seccionesEsperadas = [
    'credenciales',
    'datos_personales',
    'datos_becario',
  ]

  const respuestaIncompleta =
    seccionesEsperadas.some((seccion) => {
      const contenido = datosApi[seccion]

      return (
        !contenido ||
        typeof contenido !== 'object' ||
        Array.isArray(contenido)
      )
    })

  if (respuestaIncompleta) {
    throw new Error(
      'El servidor devolvió información incompleta del usuario.',
    )
  }
}

/*
 * Construye el nombre completo usando únicamente
 * los nombres y apellidos que existan.
 *
 * filter(Boolean) elimina valores null, undefined
 * o cadenas vacías.
 */
function construirNombreCompleto(
  datosPersonales,
) {
  return [
    prepararTexto(
      datosPersonales.p_nombre,
    ),
    prepararTexto(
      datosPersonales.s_nombre,
    ),
    prepararTexto(
      datosPersonales.p_apellido,
    ),
    prepararTexto(
      datosPersonales.s_apellido,
    ),
  ]
    .filter(Boolean)
    .join(' ')
}

/*
 * Convierte los nombres enviados por el backend
 * a nombres más fáciles de utilizar en React.
 *
 * Esta función evita llenar los componentes de propiedades
 * como p_nombre, correo_inst o horas_acumuladas.
 */
function normalizarUsuario(datosApi) {
  const credenciales =
    datosApi.credenciales

  const personales =
    datosApi.datos_personales

  const becario =
    datosApi.datos_becario

  return {
    credenciales: {
      rol: prepararTexto(
        credenciales.rol,
      ),

      /*
       * FastAPI entrega active como un booleano real.
       * Comparamos directamente con true para evitar
       * que una cadena como "false" se considere verdadera.
       */
      activo:
        credenciales.active === true,
    },

    datosPersonales: {
      numeroCuenta: prepararTexto(
        personales.num_cuenta,
      ),
      primerNombre: prepararTexto(
        personales.p_nombre,
      ),
      segundoNombre: prepararTexto(
        personales.s_nombre,
      ),
      primerApellido: prepararTexto(
        personales.p_apellido,
      ),
      segundoApellido: prepararTexto(
        personales.s_apellido,
      ),
      nombreCompleto:
        construirNombreCompleto(personales),
      correoPersonal: prepararTexto(
        personales.correo_personal,
      ),
      correoInstitucional: prepararTexto(
        personales.correo_inst,
      ),
      carrera: prepararTexto(
        personales.carrera,
      ),
      telefono: prepararTexto(
        personales.telefono,
      ),

      anioNacimiento:
        prepararNumeroOpcional(
          personales.anio_nacimiento,
        ),
    },

    datosBecario: {
      periodoInicio: prepararTexto(
        becario.periodo_inicio,
      ),
      anioInicio:
        prepararNumeroOpcional(
          becario.anio_inicio,
        ),
      horasAcumuladas: prepararNumero(
        becario.horas_acumuladas,
      ),
      horasFaltantes: prepararNumero(
        becario.horas_faltantes,
      ),
      mesesSinPagar: prepararNumero(
        becario.meses_sin_pagar,
      ),
      estadoBeca: prepararTexto(
        becario.estado_beca,
      ),
    },
  }
}

/*
 * Consulta un usuario mediante:
 * GET /usuario/{num_cuenta}
 *
 * apiFetch agrega automáticamente:
 * Authorization: Bearer <token>
 */
export async function obtenerUsuario(
  numeroCuenta,
) {
  const cuenta =
    prepararNumeroCuenta(numeroCuenta)

  const datosApi = await apiFetch(
    `/usuario/${encodeURIComponent(cuenta)}`,
    {
      method: 'GET',
    },
  )

  /*
   * Antes de normalizar verificamos que la respuesta
   * respete la estructura definida por el backend.
   */
  validarRespuestaUsuario(datosApi)

  const usuario =
    normalizarUsuario(datosApi)

  /*
   * Comprobamos que el backend haya devuelto la misma
   * cuenta solicitada desde el JWT.
   */
  if (
    usuario.datosPersonales.numeroCuenta !==
    cuenta
  ) {
    throw new Error(
      'La información recibida no pertenece a la cuenta autenticada.',
    )
  }

  return usuario
}
