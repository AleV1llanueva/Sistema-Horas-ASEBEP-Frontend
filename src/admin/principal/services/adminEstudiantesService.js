import {
  apiFetch,
  ApiError,
} from '../../../services/api.js'

import {
  CUOTA_MENSUAL_APORTACION,
  estudiantesAdminMock,
} from '../mocks/adminPrincipalMock.js'

import {
  usuarioMock,
} from '../../../mocks/usuarioMock.js'

/*
 * Servicio administrativo de estudiantes.
 *
 * true  -> usuario mock y localStorage.
 * false -> backend.
 */

const CLAVE_ESTUDIANTES =
  'asebep_admin_estudiantes_simulados'

const usarDatosAdminSimulados =
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS ===
  'true'

export class EstudianteAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'EstudianteAdminError'
  }
}

/* Funciones generales del servicio. */

function comprobarModoSimulado() {
  if (!usarDatosAdminSimulados) {
    throw new EstudianteAdminError(
      'Esta operación simulada está desactivada.',
    )
  }
}

async function peticionApi(
  endpoint,
  opciones = {},
) {
  try {
    return await apiFetch(
      endpoint,
      opciones,
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw new EstudianteAdminError(
        error.message,
      )
    }

    throw new EstudianteAdminError(
      'No se pudo conectar con el servidor backend.',
    )
  }
}

function obtenerAlmacenamiento() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function esObjeto(valor) {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  )
}

function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

function prepararNumeroNoNegativo(
  valor,
  nombreCampo,
) {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    throw new EstudianteAdminError(
      `${nombreCampo} debe ser un número mayor o igual a cero.`,
    )
  }

  return numero
}

function prepararEnteroNoNegativo(
  valor,
  nombreCampo,
) {
  const numero =
    prepararNumeroNoNegativo(
      valor,
      nombreCampo,
    )

  if (!Number.isInteger(numero)) {
    throw new EstudianteAdminError(
      `${nombreCampo} debe ser un número entero.`,
    )
  }

  return numero
}

function prepararEnteroOpcional(
  valor,
  nombreCampo,
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero = Number(valor)

  if (!Number.isInteger(numero)) {
    throw new EstudianteAdminError(
      `${nombreCampo} debe ser un número entero.`,
    )
  }

  return numero
}

function prepararEnteroPositivo(
  valor,
  nombreCampo,
) {
  const numero = Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    throw new EstudianteAdminError(
      `${nombreCampo} no es válido.`,
    )
  }

  return numero
}

function obtenerPrimerValorDefinido(
  ...valores
) {
  return valores.find(
    (valor) => valor !== undefined,
  )
}

/*
 * Los datos simulados son compatibles con JSON.
 * La copia evita entregar las referencias originales.
 */

function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/* Normalización de información relacionada. */

function normalizarActividadReciente(
  actividad,
) {
  if (!esObjeto(actividad)) {
    throw new EstudianteAdminError(
      'Una actividad reciente tiene un formato inválido.',
    )
  }

  return {
    id: prepararTexto(actividad.id),
    fecha: prepararTexto(
      actividad.fecha,
    ),
    titulo: prepararTexto(
      actividad.titulo,
    ),

    horasAcreditadas:
      prepararNumeroNoNegativo(
        actividad.horasAcreditadas ??
          actividad.horas_acreditadas ??
          0,
        'Las horas acreditadas',
      ),

    registradoPor:
      prepararTexto(
        actividad.registradoPor ??
          actividad.registrado_por,
      ) || 'ASEBEP',
  }
}

function normalizarAportacion(
  aportacion,
) {
  if (!esObjeto(aportacion)) {
    throw new EstudianteAdminError(
      'Una aportación tiene un formato inválido.',
    )
  }

  const estadoRecibido =
    prepararTexto(
      aportacion.estado,
    ).toLowerCase()

  /*
   * El mock utiliza "confirmada", mientras que
   * el backend utiliza "Aprobado".
   */
  const estado =
    estadoRecibido === 'aprobado'
      ? 'confirmada'
      : estadoRecibido

  if (
    estado !== 'pendiente' &&
    estado !== 'confirmada'
  ) {
    throw new EstudianteAdminError(
      'El estado de una aportación no es válido.',
    )
  }

  return {
    id: prepararTexto(aportacion.id),

    periodo: prepararTexto(
      aportacion.periodo,
    ),

    monto:
      prepararNumeroNoNegativo(
        aportacion.monto ??
          CUOTA_MENSUAL_APORTACION,
        'El monto de la aportación',
      ),

    fechaPago:
      prepararTexto(
        aportacion.fechaPago ??
          aportacion.fecha_pago,
      ) || null,

    estado,

    comprobante:
      prepararTexto(
        aportacion.comprobante,
      ) || null,
  }
}

/*
 * Convierte el mes de ingreso al periodo
 * utilizado actualmente por el backend.
 */

function obtenerPeriodoDesdeMes(
  mesInicio,
) {
  if (mesInicio <= 5) {
    return 'I-PAC'
  }

  if (mesInicio <= 8) {
    return 'II-PAC'
  }

  return 'III-PAC'
}

/*
 * Replica el cálculo actual del backend para que
 * el modo simulado conserve un comportamiento similar.
 */

function calcularMesesActivos(
  mesInicio,
  anioInicio,
) {
  const fechaActual = new Date()

  let mes = mesInicio
  let anio = anioInicio
  let cantidadMeses = 0

  while (
    anio < fechaActual.getFullYear() ||
    (
      anio ===
        fechaActual.getFullYear() &&
      mes <= fechaActual.getMonth() + 1
    )
  ) {
    const eneroEspecial =
      mes === 1 &&
      [2024, 2025].includes(anio)

    if (
      ![1, 12].includes(mes) ||
      eneroEspecial
    ) {
      cantidadMeses += 1
    }

    if (mes === 12) {
      mes = 1
      anio += 1
    } else {
      mes += 1
    }
  }

  return cantidadMeses
}

/*
 * Esta función actúa como frontera entre los datos
 * del backend, los mocks y las vistas administrativas.
 */

function normalizarEstudiante(
  estudiante,
) {
  if (!esObjeto(estudiante)) {
    throw new EstudianteAdminError(
      'La información del estudiante no es válida.',
    )
  }

  const credenciales =
    esObjeto(estudiante.credenciales)
      ? estudiante.credenciales
      : {}

  const datosPersonales =
    esObjeto(estudiante.datosPersonales)
      ? estudiante.datosPersonales
      : esObjeto(
          estudiante.datos_personales,
        )
        ? estudiante.datos_personales
        : {}

  const datosBecario =
    esObjeto(estudiante.datosBecario)
      ? estudiante.datosBecario
      : esObjeto(
          estudiante.datos_becario,
        )
        ? estudiante.datos_becario
        : esObjeto(
            estudiante.perfil_becario,
          )
          ? estudiante.perfil_becario
          : {}

  const numeroCuenta = prepararTexto(
    datosPersonales.numeroCuenta ??
      datosPersonales.num_cuenta ??
      estudiante.num_cuenta,
  )

  if (!numeroCuenta) {
    throw new EstudianteAdminError(
      'El número de cuenta del estudiante es obligatorio.',
    )
  }

  const primerNombre = prepararTexto(
    datosPersonales.primerNombre ??
      datosPersonales.p_nombre ??
      estudiante.primer_nombre,
  )

  const segundoNombre = prepararTexto(
    datosPersonales.segundoNombre ??
      datosPersonales.s_nombre ??
      estudiante.segundo_nombre,
  )

  const primerApellido = prepararTexto(
    datosPersonales.primerApellido ??
      datosPersonales.p_apellido ??
      estudiante.primer_apellido,
  )

  const segundoApellido = prepararTexto(
    datosPersonales.segundoApellido ??
      datosPersonales.s_apellido ??
      estudiante.segundo_apellido,
  )

  const nombreCompleto =
    prepararTexto(
      datosPersonales.nombreCompleto,
    ) ||
    [
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
    ]
      .filter(Boolean)
      .join(' ')

  if (!nombreCompleto) {
    throw new EstudianteAdminError(
      'El nombre del estudiante es obligatorio.',
    )
  }

  const eliminado =
    estudiante.eliminado === true

  /*
   * Un registro eliminado no puede aparecer activo,
   * aunque el almacenamiento tuviera datos inconsistentes.
   */
  const activo =
    !eliminado &&
    (
      credenciales.activo ??
      credenciales.active ??
      estudiante.active
    ) !== false

  const rolId =
    prepararEnteroOpcional(
      credenciales.rolId ??
        credenciales.rol_id ??
        estudiante.rol_id,
      'El identificador del rol',
    )

  const carreraId =
    prepararEnteroOpcional(
      datosPersonales.carreraId ??
        datosPersonales.carrera_id ??
        estudiante.carrera_id,
      'El identificador de la carrera',
    )

  const mesInicio =
    prepararEnteroOpcional(
      datosBecario.mesInicio ??
        datosBecario.mes_inicio,
      'El mes de inicio',
    )

  const mesesSinPagar =
    prepararEnteroNoNegativo(
      datosBecario.mesesSinPagar ??
        datosBecario.meses_sin_pagar ??
        0,
      'Los meses sin pagar',
    )

  const actividadesRecientes =
    Array.isArray(
      estudiante.actividadesRecientes,
    )
      ? estudiante.actividadesRecientes
          .map(
            normalizarActividadReciente,
          )
          .sort(
            (
              actividadA,
              actividadB,
            ) =>
              actividadB.fecha.localeCompare(
                actividadA.fecha,
              ),
          )
      : []

  const aportaciones =
    Array.isArray(
      estudiante.aportaciones,
    )
      ? estudiante.aportaciones.map(
          normalizarAportacion,
        )
      : []

  return {
    id:
      prepararTexto(estudiante.id) ||
      `estudiante-${numeroCuenta}`,

    credenciales: {
      rol:
        prepararTexto(
          credenciales.rol ??
            credenciales.role,
        ) || 'becario',

      rolId,
      activo,
    },

    datosPersonales: {
      numeroCuenta,
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      nombreCompleto,

      correoPersonal:
        prepararTexto(
          datosPersonales
            .correoPersonal ??
            datosPersonales
              .correo_personal ??
            estudiante.correo_personal,
        ),

      correoInstitucional:
        prepararTexto(
          datosPersonales
            .correoInstitucional ??
            datosPersonales
              .correo_institucional ??
            estudiante
              .correo_institucional,
        ),

      carrera:
        prepararTexto(
          datosPersonales.carrera ??
            estudiante.carrera,
        ),

      carreraId,

      telefono:
        prepararTexto(
          datosPersonales.telefono ??
            estudiante.telefono,
        ),

      anioNacimiento:
        prepararEnteroOpcional(
          datosPersonales
            .anioNacimiento ??
            datosPersonales
              .anio_nacimiento,
          'El año de nacimiento',
        ),
    },

    datosBecario: {
      periodoInicio:
        prepararTexto(
          datosBecario
            .periodoInicio ??
            datosBecario
              .periodo_inicio,
        ),

      anioInicio:
        prepararEnteroOpcional(
          datosBecario.anioInicio ??
            datosBecario.anio_inicio,
          'El año de inicio',
        ),

      mesInicio,

      horasAcumuladas:
        prepararNumeroNoNegativo(
          datosBecario
            .horasAcumuladas ??
            datosBecario
              .horas_acumuladas ??
            0,
          'Las horas acumuladas',
        ),

      horasFaltantes:
        prepararNumeroNoNegativo(
          datosBecario
            .horasFaltantes ??
            datosBecario
              .horas_faltantes ??
            0,
          'Las horas faltantes',
        ),

      mesesSinPagar,

      estadoBeca:
        eliminado
          ? 'inactivo'
          : prepararTexto(
                datosBecario
                  .estadoBeca ??
                  datosBecario
                    .estado_beca,
              ).toLowerCase() ||
            (
              activo
                ? 'activo'
                : 'inactivo'
            ),
    },

    actividadesRecientes,
    aportaciones,

    saldoAportacionesPendientes:
      mesesSinPagar *
      CUOTA_MENSUAL_APORTACION,

    eliminado,

    desactivadoEn:
      prepararTexto(
        estudiante.desactivadoEn,
      ) || null,

    eliminadoEn:
      prepararTexto(
        estudiante.eliminadoEn,
      ) || null,

    creadoEn:
      prepararTexto(
        estudiante.creadoEn,
      ) || null,

    actualizadoEn:
      prepararTexto(
        estudiante.actualizadoEn,
      ) || null,
  }
}

// Construye la colección inicial de estudiantes simulados.
function obtenerEstudiantesIniciales() {
  if (
    !Array.isArray(
      estudiantesAdminMock,
    )
  ) {
    return []
  }
  const estudiantePortalMock = {
    ...usuarioMock,
    actividadesRecientes: [],
    aportaciones: [],
  }

  const estudiantesIniciales = [
    estudiantePortalMock,
    ...estudiantesAdminMock,
  ]

  return estudiantesIniciales.map(
    normalizarEstudiante,
  )
}

function guardarEstudiantes(
  estudiantes,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_ESTUDIANTES,
      JSON.stringify(estudiantes),
    )
  } catch {
    throw new EstudianteAdminError(
      'No fue posible guardar los estudiantes en el navegador.',
    )
  }
}

/*
 * La primera consulta carga los registros del mock.
 * Después se conservan los cambios realizados localmente.
 */

function leerEstudiantes() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_ESTUDIANTES,
      )

    if (contenido === null) {
      const estudiantesIniciales =
        obtenerEstudiantesIniciales()

      guardarEstudiantes(
        estudiantesIniciales,
      )

      return estudiantesIniciales
    }

    const estudiantes =
      JSON.parse(contenido)

    if (!Array.isArray(estudiantes)) {
      throw new Error()
    }

    return estudiantes.map(
      normalizarEstudiante,
    )
  } catch (error) {
    if (
      error instanceof
      EstudianteAdminError
    ) {
      throw error
    }

    throw new EstudianteAdminError(
      'Los estudiantes almacenados no tienen un formato válido.',
    )
  }
}

function ordenarEstudiantes(
  estudiantes,
) {
  return [...estudiantes].sort(
    (estudianteA, estudianteB) =>
      estudianteA.datosPersonales
        .nombreCompleto.localeCompare(
          estudianteB.datosPersonales
            .nombreCompleto,
          'es',
          {
            sensitivity: 'base',
          },
        ),
  )
}

/*
 * Las rutas pueden utilizar el identificador interno
 * o el número de cuenta del estudiante.
 */

function buscarIndiceEstudiante(
  estudiantes,
  identificador,
) {
  const valorBuscado =
    prepararTexto(identificador)

  if (!valorBuscado) {
    throw new EstudianteAdminError(
      'El identificador del estudiante es obligatorio.',
    )
  }

  return estudiantes.findIndex(
    (estudiante) =>
      estudiante.id === valorBuscado ||
      estudiante.datosPersonales
        .numeroCuenta === valorBuscado,
  )
}

/* Preparación de datos para crear un estudiante. */

function prepararDatosCreacion(
  estudiante,
) {
  if (!esObjeto(estudiante)) {
    throw new EstudianteAdminError(
      'Los datos del estudiante no son válidos.',
    )
  }

  const datosPersonales =
    esObjeto(estudiante.datosPersonales)
      ? estudiante.datosPersonales
      : esObjeto(
          estudiante.datos_personales,
        )
        ? estudiante.datos_personales
        : {}

  const datosBecario =
    esObjeto(estudiante.datosBecario)
      ? estudiante.datosBecario
      : esObjeto(
          estudiante.datos_becario,
        )
        ? estudiante.datos_becario
        : {}

  const credenciales =
    esObjeto(estudiante.credenciales)
      ? estudiante.credenciales
      : {}

  const numeroCuenta =
    prepararTexto(
      datosPersonales.numeroCuenta ??
        datosPersonales.num_cuenta ??
        estudiante.numeroCuenta ??
        estudiante.num_cuenta,
    )

  if (!/^\d{11}$/.test(numeroCuenta)) {
    throw new EstudianteAdminError(
      'El número de cuenta debe tener exactamente 11 dígitos.',
    )
  }

  const primerNombre =
    prepararTexto(
      datosPersonales.primerNombre ??
        datosPersonales.p_nombre ??
        estudiante.primerNombre ??
        estudiante.primer_nombre,
    )

  if (!primerNombre) {
    throw new EstudianteAdminError(
      'El primer nombre es obligatorio.',
    )
  }

  const segundoNombre =
    prepararTexto(
      datosPersonales.segundoNombre ??
        datosPersonales.s_nombre ??
        estudiante.segundoNombre ??
        estudiante.segundo_nombre,
    )

  const primerApellido =
    prepararTexto(
      datosPersonales.primerApellido ??
        datosPersonales.p_apellido ??
        estudiante.primerApellido ??
        estudiante.primer_apellido,
    )

  if (!primerApellido) {
    throw new EstudianteAdminError(
      'El primer apellido es obligatorio.',
    )
  }

  const segundoApellido =
    prepararTexto(
      datosPersonales.segundoApellido ??
        datosPersonales.s_apellido ??
        estudiante.segundoApellido ??
        estudiante.segundo_apellido,
    )

  const correoInstitucional =
    prepararTexto(
      datosPersonales
        .correoInstitucional ??
        datosPersonales
          .correo_institucional ??
        estudiante
          .correoInstitucional ??
        estudiante
          .correo_institucional,
    ).toLowerCase()

  if (
    !correoInstitucional.endsWith(
      '@unah.hn',
    )
  ) {
    throw new EstudianteAdminError(
      'El correo institucional debe terminar en @unah.hn.',
    )
  }

  const correoPersonal =
    prepararTexto(
      datosPersonales.correoPersonal ??
        datosPersonales
          .correo_personal ??
        estudiante.correoPersonal ??
        estudiante.correo_personal,
    ).toLowerCase()

  if (
    !correoPersonal ||
    !correoPersonal.includes('@')
  ) {
    throw new EstudianteAdminError(
      'El correo personal no es válido.',
    )
  }

  const telefono =
    prepararTexto(
      datosPersonales.telefono ??
        estudiante.telefono,
    )
      .replaceAll('-', '')
      .replaceAll(' ', '')

  if (
    !/^\d{1,8}$/.test(telefono)
  ) {
    throw new EstudianteAdminError(
      'El teléfono debe contener un máximo de 8 dígitos.',
    )
  }

  const carreraId =
    prepararEnteroPositivo(
      datosPersonales.carreraId ??
        datosPersonales.carrera_id ??
        estudiante.carreraId ??
        estudiante.carrera_id,
      'La carrera seleccionada',
    )

  const rolId =
    prepararEnteroPositivo(
      credenciales.rolId ??
        credenciales.rol_id ??
        estudiante.rolId ??
        estudiante.rol_id,
      'El rol seleccionado',
    )

  const mesInicio =
    prepararEnteroPositivo(
      datosBecario.mesInicio ??
        datosBecario.mes_inicio ??
        estudiante.mesInicio ??
        estudiante.mes_inicio,
      'El mes de inicio',
    )

  if (
    mesInicio < 1 ||
    mesInicio > 12
  ) {
    throw new EstudianteAdminError(
      'El mes de inicio debe estar entre 1 y 12.',
    )
  }

  const anioInicio =
    prepararEnteroPositivo(
      datosBecario.anioInicio ??
        datosBecario.anio_inicio ??
        estudiante.anioInicio ??
        estudiante.anio_inicio,
      'El año de inicio',
    )

  const anioActual =
    new Date().getFullYear()

  if (
    anioInicio < 2000 ||
    anioInicio > anioActual
  ) {
    throw new EstudianteAdminError(
      'El año de inicio no es válido.',
    )
  }

  return {
    numeroCuenta,
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    correoInstitucional,
    correoPersonal,
    telefono,
    carreraId,

    carreraNombre:
      prepararTexto(
        datosPersonales.carrera ??
          estudiante.carreraNombre ??
          estudiante.carrera,
      ),

    rolId,

    rolNombre:
      prepararTexto(
        credenciales.rol ??
          estudiante.rolNombre ??
          estudiante.rol,
      ),

    mesInicio,
    anioInicio,
  }
}

/*
 * Convierte los datos del formulario al contrato
 * requerido por CrearUsuario en el backend.
 */

function convertirNuevoEstudianteParaBackend(
  estudiante,
) {
  return {
    num_cuenta:
      estudiante.numeroCuenta,

    primer_nombre:
      estudiante.primerNombre,

    segundo_nombre:
      estudiante.segundoNombre ||
      null,

    primer_apellido:
      estudiante.primerApellido,

    segundo_apellido:
      estudiante.segundoApellido ||
      null,

    correo_institucional:
      estudiante.correoInstitucional,

    correo_personal:
      estudiante.correoPersonal,

    telefono:
      estudiante.telefono,

    carrera_id:
      estudiante.carreraId,

    rol_id:
      estudiante.rolId,

    mes_inicio:
      estudiante.mesInicio,

    anio_inicio:
      estudiante.anioInicio,
  }
}

/*
 * Convierte únicamente los campos que
 * ActualizarUsuarioInput permite modificar.
 */

function convertirCambiosParaBackend(
  cambios,
) {
  const datosPersonales =
    esObjeto(cambios.datosPersonales)
      ? cambios.datosPersonales
      : esObjeto(
          cambios.datos_personales,
        )
        ? cambios.datos_personales
        : {}

  const credenciales =
    esObjeto(cambios.credenciales)
      ? cambios.credenciales
      : {}

  const equivalencias = {
    primer_nombre:
      obtenerPrimerValorDefinido(
        datosPersonales.primerNombre,
        datosPersonales.p_nombre,
        cambios.primer_nombre,
      ),

    segundo_nombre:
      obtenerPrimerValorDefinido(
        datosPersonales.segundoNombre,
        datosPersonales.s_nombre,
        cambios.segundo_nombre,
      ),

    primer_apellido:
      obtenerPrimerValorDefinido(
        datosPersonales.primerApellido,
        datosPersonales.p_apellido,
        cambios.primer_apellido,
      ),

    segundo_apellido:
      obtenerPrimerValorDefinido(
        datosPersonales.segundoApellido,
        datosPersonales.s_apellido,
        cambios.segundo_apellido,
      ),

    correo_personal:
      obtenerPrimerValorDefinido(
        datosPersonales.correoPersonal,
        datosPersonales
          .correo_personal,
        cambios.correo_personal,
      ),

    correo_institucional:
      obtenerPrimerValorDefinido(
        datosPersonales
          .correoInstitucional,
        datosPersonales
          .correo_institucional,
        cambios.correo_institucional,
      ),

    telefono:
      obtenerPrimerValorDefinido(
        datosPersonales.telefono,
        cambios.telefono,
      ),

    carrera_id:
      obtenerPrimerValorDefinido(
        datosPersonales.carreraId,
        datosPersonales.carrera_id,
        cambios.carrera_id,
      ),

    rol_id:
      obtenerPrimerValorDefinido(
        credenciales.rolId,
        credenciales.rol_id,
        cambios.rol_id,
      ),
  }

  return Object.fromEntries(
    Object.entries(
      equivalencias,
    ).filter(
      ([, valor]) =>
        valor !== undefined,
    ),
  )
}

/* Consultas principales. */

export async function listarEstudiantes() {
  if (usarDatosAdminSimulados) {
    const estudiantes =
      leerEstudiantes().filter(
        (estudiante) =>
          estudiante.eliminado !== true,
      )

    return clonarDatos(
      ordenarEstudiantes(
        estudiantes,
      ),
    )
  }

  const respuesta =
    await peticionApi('/usuarios')

  if (!Array.isArray(respuesta)) {
    throw new EstudianteAdminError(
      'El servidor no devolvió una lista válida de estudiantes.',
    )
  }

  return ordenarEstudiantes(
    respuesta.map(
      normalizarEstudiante,
    ),
  )
}

export async function obtenerEstudiante(
  identificador,
) {
  const valorBuscado =
    prepararTexto(identificador)

  if (!valorBuscado) {
    throw new EstudianteAdminError(
      'El identificador del estudiante es obligatorio.',
    )
  }

  if (!usarDatosAdminSimulados) {
    /*
     * El listado administrativo contiene la información
     * disponible para el administrador principal.
     */
    const estudiantes =
      await listarEstudiantes()

    return (
      estudiantes.find(
        (estudiante) =>
          estudiante.id ===
            valorBuscado ||
          estudiante.datosPersonales
            .numeroCuenta ===
            valorBuscado,
      ) ?? null
    )
  }

  const estudiantes =
    leerEstudiantes()

  const indiceEstudiante =
    buscarIndiceEstudiante(
      estudiantes,
      valorBuscado,
    )

  if (
    indiceEstudiante === -1 ||
    estudiantes[indiceEstudiante]
      .eliminado === true
  ) {
    return null
  }

  return clonarDatos(
    estudiantes[indiceEstudiante],
  )
}

/* Creación de estudiantes. */

export async function crearEstudiante(
  estudiante,
) {
  const datosPreparados =
    prepararDatosCreacion(
      estudiante,
    )

  if (!usarDatosAdminSimulados) {
    const datosParaBackend =
      convertirNuevoEstudianteParaBackend(
        datosPreparados,
      )

    const respuesta =
      await peticionApi(
        '/usuarios',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            datosParaBackend,
          ),
        },
      )

    /*
     * El POST devuelve una respuesta resumida.
     * Consultamos nuevamente el listado para recuperar
     * la carrera, el rol y los cálculos del becario.
     */
    try {
      const estudianteRecuperado =
        await obtenerEstudiante(
          datosPreparados.numeroCuenta,
        )

      if (estudianteRecuperado) {
        return normalizarEstudiante({
          ...estudianteRecuperado,

          credenciales: {
            ...estudianteRecuperado
              .credenciales,

            rolId:
              datosPreparados.rolId,
          },

          datosPersonales: {
            ...estudianteRecuperado
              .datosPersonales,

            carreraId:
              datosPreparados.carreraId,
          },

          datosBecario: {
            ...estudianteRecuperado
              .datosBecario,

            mesInicio:
              datosPreparados.mesInicio,
          },
        })
      }
    } catch {
      /*
       * El usuario ya fue creado por el POST.
       * Si la segunda consulta falla, utilizamos una
       * respuesta local para evitar repetir el registro.
       */
    }

    const mesesActivos =
      calcularMesesActivos(
        datosPreparados.mesInicio,
        datosPreparados.anioInicio,
      )

    return normalizarEstudiante({
      ...respuesta,

      id:
        `estudiante-${datosPreparados.numeroCuenta}`,

      credenciales: {
        rol:
          datosPreparados.rolNombre ||
          'Rol asignado',

        rolId:
          datosPreparados.rolId,

        activo:
          respuesta?.active === true,
      },

      datosPersonales: {
        numeroCuenta:
          datosPreparados.numeroCuenta,

        primerNombre:
          datosPreparados.primerNombre,

        segundoNombre:
          datosPreparados.segundoNombre,

        primerApellido:
          datosPreparados.primerApellido,

        segundoApellido:
          datosPreparados.segundoApellido,

        correoInstitucional:
          datosPreparados
            .correoInstitucional,

        correoPersonal:
          datosPreparados.correoPersonal,

        telefono:
          datosPreparados.telefono,

        carrera:
          datosPreparados
            .carreraNombre ||
          'Carrera asignada',

        carreraId:
          datosPreparados.carreraId,
      },

      datosBecario: {
        periodoInicio:
          respuesta?.perfil_becario
            ?.periodo_inicio ||
          obtenerPeriodoDesdeMes(
            datosPreparados.mesInicio,
          ),

        mesInicio:
          datosPreparados.mesInicio,

        anioInicio:
          datosPreparados.anioInicio,

        horasAcumuladas: 0,

        horasFaltantes:
          mesesActivos * 20,

        mesesSinPagar:
          mesesActivos,

        estadoBeca: 'inactivo',
      },

      actividadesRecientes: [],
      aportaciones: [],
      eliminado: false,
      desactivadoEn: null,
      eliminadoEn: null,
      creadoEn:
        new Date().toISOString(),
      actualizadoEn:
        new Date().toISOString(),
    })
  }

  const estudiantes =
    leerEstudiantes()

  const cuentaDuplicada =
    estudiantes.some(
      (estudianteActual) =>
        estudianteActual
          .datosPersonales
          .numeroCuenta ===
        datosPreparados.numeroCuenta,
    )

  if (cuentaDuplicada) {
    throw new EstudianteAdminError(
      'El número de cuenta ya está registrado.',
    )
  }

  const correoDuplicado =
    estudiantes.some(
      (estudianteActual) =>
        estudianteActual
          .datosPersonales
          .correoInstitucional
          .toLowerCase() ===
        datosPreparados
          .correoInstitucional
          .toLowerCase(),
    )

  if (correoDuplicado) {
    throw new EstudianteAdminError(
      'El correo institucional ya está registrado.',
    )
  }

  const fechaActual =
    new Date().toISOString()

  const mesesActivos =
    calcularMesesActivos(
      datosPreparados.mesInicio,
      datosPreparados.anioInicio,
    )

  const estudianteCreado =
    normalizarEstudiante({
      id:
        `estudiante-${datosPreparados.numeroCuenta}`,

      credenciales: {
        rol:
          datosPreparados.rolNombre ||
          'becario',

        rolId:
          datosPreparados.rolId,

        /*
         * Todo usuario nuevo debe crear su contraseña
         * antes de poder ingresar al sistema.
         */
        activo: false,
      },

      datosPersonales: {
        numeroCuenta:
          datosPreparados.numeroCuenta,

        primerNombre:
          datosPreparados.primerNombre,

        segundoNombre:
          datosPreparados.segundoNombre,

        primerApellido:
          datosPreparados.primerApellido,

        segundoApellido:
          datosPreparados.segundoApellido,

        correoInstitucional:
          datosPreparados
            .correoInstitucional,

        correoPersonal:
          datosPreparados.correoPersonal,

        telefono:
          datosPreparados.telefono,

        carrera:
          datosPreparados
            .carreraNombre ||
          'Carrera asignada',

        carreraId:
          datosPreparados.carreraId,
      },

      datosBecario: {
        periodoInicio:
          obtenerPeriodoDesdeMes(
            datosPreparados.mesInicio,
          ),

        mesInicio:
          datosPreparados.mesInicio,

        anioInicio:
          datosPreparados.anioInicio,

        horasAcumuladas: 0,

        horasFaltantes:
          mesesActivos * 20,

        mesesSinPagar:
          mesesActivos,

        estadoBeca: 'inactivo',
      },

      actividadesRecientes: [],
      aportaciones: [],
      eliminado: false,
      desactivadoEn: null,
      eliminadoEn: null,
      creadoEn: fechaActual,
      actualizadoEn: fechaActual,
    })

  estudiantes.push(
    estudianteCreado,
  )

  guardarEstudiantes(
    estudiantes,
  )

  return clonarDatos(
    estudianteCreado,
  )
}

/* Edición de información permitida por el backend. */

export async function actualizarEstudiante(
  identificador,
  cambios,
) {
  if (!esObjeto(cambios)) {
    throw new EstudianteAdminError(
      'Los cambios del estudiante no son válidos.',
    )
  }

  if (!usarDatosAdminSimulados) {
    const estudianteActual =
      await obtenerEstudiante(
        identificador,
      )

    if (!estudianteActual) {
      throw new EstudianteAdminError(
        'El estudiante que deseas actualizar no existe.',
      )
    }

    const datosParaBackend =
      convertirCambiosParaBackend(
        cambios,
      )

    if (
      Object.keys(
        datosParaBackend,
      ).length === 0
    ) {
      throw new EstudianteAdminError(
        'Los cambios indicados no pertenecen a campos editables de la API.',
      )
    }

    const numeroCuenta =
      estudianteActual
        .datosPersonales
        .numeroCuenta

    await peticionApi(
      `/usuarios/${encodeURIComponent(
        numeroCuenta,
      )}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify(
          datosParaBackend,
        ),
      },
    )

    const estudianteActualizado =
      await obtenerEstudiante(
        numeroCuenta,
      )

    if (!estudianteActualizado) {
      throw new EstudianteAdminError(
        'El estudiante fue actualizado, pero no pudo recuperarse nuevamente.',
      )
    }

    /*
     * El listado actual no devuelve los identificadores.
     * Conservamos los que ya conoce el formulario.
     */
    return normalizarEstudiante({
      ...estudianteActualizado,

      credenciales: {
        ...estudianteActualizado
          .credenciales,

        rolId:
          datosParaBackend.rol_id ??
          estudianteActual
            .credenciales
            .rolId,
      },

      datosPersonales: {
        ...estudianteActualizado
          .datosPersonales,

        carreraId:
          datosParaBackend.carrera_id ??
          estudianteActual
            .datosPersonales
            .carreraId,
      },

      datosBecario: {
        ...estudianteActualizado
          .datosBecario,

        mesInicio:
          estudianteActual
            .datosBecario
            .mesInicio,
      },
    })
  }

  const estudiantes =
    leerEstudiantes()

  const indiceEstudiante =
    buscarIndiceEstudiante(
      estudiantes,
      identificador,
    )

  if (
    indiceEstudiante === -1 ||
    estudiantes[indiceEstudiante]
      .eliminado === true
  ) {
    throw new EstudianteAdminError(
      'El estudiante que deseas actualizar no existe.',
    )
  }

  const estudianteActual =
    estudiantes[indiceEstudiante]

  /*
   * Los objetos internos se combinan por separado
   * para conservar los campos que no fueron enviados.
   */
  const estudianteCombinado = {
    ...estudianteActual,
    ...cambios,

    credenciales: {
      ...estudianteActual.credenciales,

      ...(esObjeto(
        cambios.credenciales,
      )
        ? cambios.credenciales
        : {}),
    },

    datosPersonales: {
      ...estudianteActual
        .datosPersonales,

      ...(esObjeto(
        cambios.datosPersonales,
      )
        ? cambios.datosPersonales
        : {}),
    },

    datosBecario: {
      ...estudianteActual.datosBecario,

      ...(esObjeto(
        cambios.datosBecario,
      )
        ? cambios.datosBecario
        : {}),
    },

    actividadesRecientes:
      Array.isArray(
        cambios.actividadesRecientes,
      )
        ? cambios.actividadesRecientes
        : estudianteActual
            .actividadesRecientes,

    aportaciones:
      Array.isArray(
        cambios.aportaciones,
      )
        ? cambios.aportaciones
        : estudianteActual.aportaciones,

    id: estudianteActual.id,

    creadoEn:
      estudianteActual.creadoEn,

    actualizadoEn:
      new Date().toISOString(),
  }

  const estudianteActualizado =
    normalizarEstudiante(
      estudianteCombinado,
    )

  const cuentaDuplicada =
    estudiantes.some(
      (
        estudianteGuardado,
        indice,
      ) =>
        indice !== indiceEstudiante &&
        estudianteGuardado
          .datosPersonales
          .numeroCuenta ===
        estudianteActualizado
          .datosPersonales
          .numeroCuenta,
    )

  if (cuentaDuplicada) {
    throw new EstudianteAdminError(
      'Ya existe otro estudiante con ese número de cuenta.',
    )
  }

  const correoDuplicado =
    estudiantes.some(
      (
        estudianteGuardado,
        indice,
      ) =>
        indice !== indiceEstudiante &&
        estudianteGuardado
          .datosPersonales
          .correoInstitucional
          .toLowerCase() ===
        estudianteActualizado
          .datosPersonales
          .correoInstitucional
          .toLowerCase(),
    )

  if (correoDuplicado) {
    throw new EstudianteAdminError(
      'Ya existe otro estudiante con ese correo institucional.',
    )
  }

  estudiantes[indiceEstudiante] =
    estudianteActualizado

  guardarEstudiantes(
    estudiantes,
  )

  return clonarDatos(
    estudianteActualizado,
  )
}

/* Activación y desactivación. */

export async function cambiarEstadoEstudiante(
  identificador,
  activo,
) {
  if (typeof activo !== 'boolean') {
    throw new EstudianteAdminError(
      'El estado del estudiante no es válido.',
    )
  }

  if (!usarDatosAdminSimulados) {
    throw new EstudianteAdminError(
      'El backend actual todavía no permite activar o desactivar estudiantes.',
    )
  }

  const estudiantes =
    leerEstudiantes()

  const indiceEstudiante =
    buscarIndiceEstudiante(
      estudiantes,
      identificador,
    )

  if (
    indiceEstudiante === -1 ||
    estudiantes[indiceEstudiante]
      .eliminado === true
  ) {
    throw new EstudianteAdminError(
      'El estudiante que deseas modificar no existe.',
    )
  }

  const estudianteActual =
    estudiantes[indiceEstudiante]

  const fechaActual =
    new Date().toISOString()

  const estudianteActualizado =
    normalizarEstudiante({
      ...estudianteActual,

      credenciales: {
        ...estudianteActual.credenciales,
        activo,
      },

      datosBecario: {
        ...estudianteActual.datosBecario,

        estadoBeca:
          activo
            ? 'activo'
            : 'inactivo',
      },

      desactivadoEn:
        activo
          ? null
          : fechaActual,

      actualizadoEn:
        fechaActual,
    })

  estudiantes[indiceEstudiante] =
    estudianteActualizado

  guardarEstudiantes(
    estudiantes,
  )

  return clonarDatos(
    estudianteActualizado,
  )
}

/*
 * La eliminación simulada es lógica.
 * El registro permanece almacenado, pero desaparece
 * de las consultas administrativas normales.
 */

export async function eliminarEstudiante(
  identificador,
) {
  if (!usarDatosAdminSimulados) {
    throw new EstudianteAdminError(
      'El backend actual todavía no permite eliminar estudiantes.',
    )
  }

  const estudiantes =
    leerEstudiantes()

  const indiceEstudiante =
    buscarIndiceEstudiante(
      estudiantes,
      identificador,
    )

  if (
    indiceEstudiante === -1 ||
    estudiantes[indiceEstudiante]
      .eliminado === true
  ) {
    throw new EstudianteAdminError(
      'El estudiante que deseas eliminar no existe.',
    )
  }

  const estudianteActual =
    estudiantes[indiceEstudiante]

  const fechaActual =
    new Date().toISOString()

  const estudianteEliminado =
    normalizarEstudiante({
      ...estudianteActual,

      credenciales: {
        ...estudianteActual.credenciales,
        activo: false,
      },

      datosBecario: {
        ...estudianteActual.datosBecario,
        estadoBeca: 'inactivo',
      },

      eliminado: true,

      desactivadoEn:
        estudianteActual.desactivadoEn ||
        fechaActual,

      eliminadoEn: fechaActual,
      actualizadoEn: fechaActual,
    })

  estudiantes[indiceEstudiante] =
    estudianteEliminado

  guardarEstudiantes(
    estudiantes,
  )

  return clonarDatos(
    estudianteEliminado,
  )
}

/*
 * Permite regresar a los datos iniciales después
 * de probar registros, cambios o eliminaciones.
 */

export async function restablecerEstudiantes() {
  comprobarModoSimulado()

  const estudiantesIniciales =
    obtenerEstudiantesIniciales()

  guardarEstudiantes(
    estudiantesIniciales,
  )

  return clonarDatos(
    estudiantesIniciales,
  )
}