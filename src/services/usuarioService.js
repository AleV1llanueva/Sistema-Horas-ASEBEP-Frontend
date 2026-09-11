import {
  esRolAdministrativo,
  normalizarRol,
  ROL_BECARIO,
} from '../config/rutasPorRol.js'

import { apiFetch } from './api.js'
import {
  obtenerRolSesion,
} from './sesionService.js'

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

// Convierte cualquier valor válido en texto.
function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

// Prepara las cantidades recibidas desde el backend.
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
 * Comprueba que la respuesta incluya las secciones
 * utilizadas por las vistas de perfil.
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

// Construye el nombre utilizando solamente los datos disponibles.
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
 * Convierte las propiedades del backend a los nombres
 * que utilizan actualmente los componentes de React.
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

      // FastAPI entrega active como un booleano.
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
        construirNombreCompleto(
          personales,
        ),

      correoPersonal: prepararTexto(
        personales.correo_personal,
      ),

      /*
       * correo_institucional es el nombre actual.
       * El segundo valor conserva compatibilidad con
       * respuestas antiguas del backend.
       */
      correoInstitucional:
        prepararTexto(
          personales
            .correo_institucional ??
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

      horasAcumuladas:
        prepararNumero(
          becario.horas_acumuladas,
        ),

      horasFaltantes:
        prepararNumero(
          becario.horas_faltantes,
        ),

      mesesSinPagar:
        prepararNumero(
          becario.meses_sin_pagar,
        ),

      estadoBeca: prepararTexto(
        becario.estado_beca,
      ),
    },
  }
}

// Localiza la cuenta autenticada dentro del listado administrativo.
function buscarUsuarioEnListado(
  usuarios,
  numeroCuenta,
) {
  if (!Array.isArray(usuarios)) {
    throw new Error(
      'El servidor no devolvió una lista válida de usuarios.',
    )
  }

  return (
    usuarios.find((usuario) => {
      const cuentaUsuario =
        prepararTexto(
          usuario
            ?.datos_personales
            ?.num_cuenta,
        )

      return (
        cuentaUsuario === numeroCuenta
      )
    }) ?? null
  )
}

// Los becarios pueden consultar directamente su perfil.
async function consultarUsuarioDesdeApi(
  numeroCuenta,
) {
  const rolSesion =
    normalizarRol(
      obtenerRolSesion(),
    )

  if (rolSesion === ROL_BECARIO) {
    return apiFetch(
      `/usuarios/${encodeURIComponent(
        numeroCuenta,
      )}`,
      {
        method: 'GET',
      },
    )
  }

  if (esRolAdministrativo(rolSesion)) {
    const usuarios =
      await apiFetch('/usuarios', {
        method: 'GET',
      })

    const usuarioEncontrado =
      buscarUsuarioEnListado(
        usuarios,
        numeroCuenta,
      )

    if (!usuarioEncontrado) {
      throw new Error(
        'No se encontró el perfil asociado con la cuenta administrativa.',
      )
    }

    return usuarioEncontrado
  }

  throw new Error(
    'El rol de la sesión no permite consultar información de perfil.',
  )
}

/*
 * Consulta la información de la cuenta autenticada.
 *
 * En modo simulado, UsuarioProviderPrueba entrega los datos
 * directamente y esta función no realiza solicitudes HTTP.
 *
 * En modo API, UsuarioProvider utiliza esta función para
 * consultar y normalizar la respuesta del backend.
 */
export async function obtenerUsuario(
  numeroCuenta,
) {
  const cuenta =
    prepararNumeroCuenta(numeroCuenta)

  const datosApi =
    await consultarUsuarioDesdeApi(
      cuenta,
    )

  validarRespuestaUsuario(datosApi)

  const usuario =
    normalizarUsuario(datosApi)

  // Evita mostrar información de una cuenta diferente.
  if (
    usuario.datosPersonales
      .numeroCuenta !== cuenta
  ) {
    throw new Error(
      'La información recibida no pertenece a la cuenta autenticada.',
    )
  }

  return usuario
}