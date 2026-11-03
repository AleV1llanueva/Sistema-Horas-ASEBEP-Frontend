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

/*
 * El backend exige 20 horas por mes activo cuando calcula
 * las horas esperadas del becario.
 */
const HORAS_POR_MES = 20

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
  const numero = prepararEnteroNoNegativo(
    valor,
    nombreCampo,
  )

  if (numero <= 0) {
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

const NOMBRES_MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function avanzarMes(mes, anio, cantidad) {
  /*
   * El backend calcula los meses con `calcular_meses_activos`,
   * que no cuenta enero ni diciembre (salvo enero de 2024 y 2025).
   * Para mostrar una fecha estimada se avanza mes a mes igual que
   * allí para que ambas vistas coincidan en cantidad de meses.
   */
  let mesActual = mes
  let anioActual = anio
  let restantes = cantidad

  while (restantes > 0) {
    const eneroEspecial =
      mesActual === 1 &&
      [2024, 2025].includes(anioActual)

    if (
      ![1, 12].includes(mesActual) ||
      eneroEspecial
    ) {
      restantes -= 1

      if (restantes === 0) {
        break
      }
    }

    if (mesActual === 12) {
      mesActual = 1
      anioActual += 1
    } else {
      mesActual += 1
    }
  }

  return { mes: mesActual, anio: anioActual }
}

/*
 * Describe hasta qué mes cubren los datos previos al sistema.
 * Las horas se manejan por horas y las aportaciones por meses.
 */
export function obtenerCoberturaBecario(
  datosBecario,
) {
  const mesInicio = Number(
    datosBecario?.mesInicio,
  )

  const anioInicio = Number(
    datosBecario?.anioInicio,
  )

  const tienePeriodo =
    Number.isInteger(mesInicio) &&
    mesInicio >= 1 &&
    mesInicio <= 12 &&
    Number.isInteger(anioInicio) &&
    anioInicio > 2000

  const mesesDeHoras = Math.floor(
    Number(
      datosBecario?.horasAcumuladas,
    ) / HORAS_POR_MES || 0,
  )

  const mesesDeAportaciones = Math.floor(
    Number(
      datosBecario?.montoAcumulado,
    ) || 0,
  )

  const describir = (meses) => {
    if (!tienePeriodo) {
      return 'Periodo de ingreso no definido'
    }

    if (meses <= 0) {
      return 'Sin cobertura registrada'
    }

    const {
      mes,
      anio,
    } = avanzarMes(
      mesInicio,
      anioInicio,
      meses,
    )

    return `Cubre hasta ${NOMBRES_MESES[mes - 1]} de ${anio}`
  }

  return {
    mesesDeHoras,
    mesesDeAportaciones,
    horas: describir(mesesDeHoras),
    aportaciones: describir(
      mesesDeAportaciones,
    ),
  }
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
          /*
           * El backend solo expone el total de horas cubiertas,
           * que ya incluye las horas previas al sistema.
           */
          datosBecario.horasTotales ??
          datosBecario.horas_totales ??
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

      /*
       * En este sistema el campo `monto_acumulado` representa los meses
       * de aportación cubiertos antes de la migración, no colones.
       */
      montoAcumulado:
        prepararEnteroNoNegativo(
          datosBecario
            .montoAcumulado ??
          datosBecario
            .monto_acumulado ??
          0,
          'Los meses de aportación acumulados',
        ),

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

  /*
   * Algunas bases antiguas registraron carreras con id 0,
   * por eso aquí se acepta desde cero.
   */
  const carreraId =
    prepararEnteroNoNegativo(
      datosPersonales.carreraId ??
      datosPersonales.carrera_id ??
      estudiante.carreraId ??
      estudiante.carrera_id,
      'La carrera seleccionada',
    )

  /*
   * El rol de becario lo resuelve el backend por nombre.
   * Solo se valida si el cliente decide enviarlo.
   */
  const rolId =
    prepararEnteroOpcional(
      credenciales.rolId ??
      credenciales.rol_id ??
      estudiante.rolId ??
      estudiante.rol_id,
      'El identificador del rol',
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
  const datos = {
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

    mes_inicio:
      estudiante.mesInicio,

    anio_inicio:
      estudiante.anioInicio,
  }

  /*
   * El rol se omite si no viene: el backend asigna el de becario.
   */
  if (
    estudiante.rolId !== undefined &&
    estudiante.rolId !== null
  ) {
    datos.rol_id = estudiante.rolId
  }

  return datos
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

  const datosBecario =
    esObjeto(cambios.datosBecario)
      ? cambios.datosBecario
      : esObjeto(
        cambios.datos_becario,
      )
        ? cambios.datos_becario
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

    /*
     * Ajustes del perfil previos al sistema. Solo los envía la
     * pantalla de edición de administradores.
     */
    horas_acumuladas:
      obtenerPrimerValorDefinido(
        datosBecario.horasAcumuladas,
        datosBecario.horas_acumuladas,
        cambios.horas_acumuladas,
      ),

    monto_acumulado:
      obtenerPrimerValorDefinido(
        datosBecario.montoAcumulado,
        datosBecario.monto_acumulado,
        cambios.monto_acumulado,
      ),

    anio_inicio:
      obtenerPrimerValorDefinido(
        datosBecario.anioInicio,
        datosBecario.anio_inicio,
        cambios.anio_inicio,
      ),

    mes_inicio:
      obtenerPrimerValorDefinido(
        datosBecario.mesInicio,
        datosBecario.mes_inicio,
        cambios.mes_inicio,
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

/*
 * Convierte el texto de búsqueda a una forma consistente
 * para comparar sin tildes ni mayúsculas.
 */
function normalizarTextoFiltro(valor) {
  return prepararTexto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/*
 * Replica en el cliente el filtro del backend para que el modo
 * simulado se comporte igual que la paginación real.
 */
function coincideBusqueda(
  estudiante,
  textoBuscado,
) {
  if (!textoBuscado) {
    return true
  }

  const datosPersonales =
    estudiante.datosPersonales ?? {}

  const credenciales =
    estudiante.credenciales ?? {}

  return [
    datosPersonales.nombreCompleto,
    datosPersonales.numeroCuenta,
    datosPersonales.carrera,
    datosPersonales.correoPersonal,
    datosPersonales.correoInstitucional,
    credenciales.rol,
  ].some((campo) =>
    normalizarTextoFiltro(campo).includes(
      textoBuscado,
    ),
  )
}

function prepararPagina(valor) {
  const numero = Math.trunc(Number(valor))

  return Number.isFinite(numero) && numero > 0
    ? numero
    : 1
}

function prepararLimite(valor) {
  const numero = Math.trunc(Number(valor))

  return Number.isFinite(numero) && numero > 0
    ? Math.min(numero, 100)
    : 10
}

/*
 * Devuelve una página de becarios con correo institucional.
 * La búsqueda, el orden y el conteo los resuelve el backend,
 * por lo que el cliente no descarga los registros totales.
 */
export async function listarEstudiantesPaginados({
  pagina = 1,
  limite = 10,
  busqueda = '',
  activo = null,
} = {}) {
  const paginaPreparada =
    prepararPagina(pagina)
  const limitePreparado =
    prepararLimite(limite)
  const textoBuscado =
    normalizarTextoFiltro(busqueda)

  if (usarDatosAdminSimulados) {
    const filtrados = ordenarEstudiantes(
      leerEstudiantes().filter(
        (estudiante) =>
          estudiante.eliminado !== true &&
          Boolean(
            estudiante.datosPersonales
              ?.correoInstitucional,
          ) &&
          coincideBusqueda(
            estudiante,
            textoBuscado,
          ) &&
          (activo === null ||
            (estudiante.credenciales
              ?.activo !== false) === activo),
      ),
    )

    const indiceInicial =
      (paginaPreparada - 1) *
      limitePreparado

    return clonarDatos({
      elementos: filtrados.slice(
        indiceInicial,
        indiceInicial + limitePreparado,
      ),
      total: filtrados.length,
      pagina: paginaPreparada,
      limite: limitePreparado,
      totalPaginas: Math.max(
        1,
        Math.ceil(
          filtrados.length / limitePreparado,
        ),
      ),
    })
  }

  const parametros = new URLSearchParams({
    pagina: String(paginaPreparada),
    limite: String(limitePreparado),
  })

  const texto = prepararTexto(busqueda)

  if (texto) {
    parametros.set('busqueda', texto)
  }

  if (typeof activo === 'boolean') {
    parametros.set(
      'active',
      String(activo),
    )
  }

  const respuesta = await peticionApi(
    `/usuarios?${parametros.toString()}`,
  )

  if (!Array.isArray(respuesta?.elementos)) {
    throw new EstudianteAdminError(
      'El servidor no devolvió una página válida de estudiantes.',
    )
  }

  return {
    elementos: respuesta.elementos.map(
      normalizarEstudiante,
    ),
    total: prepararCantidadTotal(
      respuesta.total,
    ),
    pagina: prepararPagina(respuesta.pagina),
    limite: prepararLimite(respuesta.limite),
    totalPaginas: Math.max(
      1,
      prepararCantidadTotal(
        respuesta.total_paginas,
      ),
    ),
  }
}

function prepararCantidadTotal(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) && numero >= 0
    ? Math.trunc(numero)
    : 0
}

/*
 * Cantidad de becarios con correo para cada estado.
 * El listado se pagina en el servidor, así que los contadores
 * de las pestañas se obtienen del 'total' de cada consulta.
 */
export async function contarEstudiantesPorEstado() {
  if (usarDatosAdminSimulados) {
    const disponibles = leerEstudiantes().filter(
      (estudiante) =>
        estudiante.eliminado !== true &&
        Boolean(
          estudiante.datosPersonales
            ?.correoInstitucional,
        ),
    )

    return {
      activos: disponibles.filter(
        (estudiante) =>
          estudiante.credenciales
            ?.activo !== false,
      ).length,
      inactivos: disponibles.filter(
        (estudiante) =>
          estudiante.credenciales
            ?.activo === false,
      ).length,
    }
  }

  /*
   * Se piden páginas de un solo registro: solo interesa el
   * 'total' que acompaña a cada página.
   */
  const [activos, inactivos] = await Promise.all([
    peticionApi(
      '/usuarios?pagina=1&limite=1&active=true',
    ),
    peticionApi(
      '/usuarios?pagina=1&limite=1&active=false',
    ),
  ])

  return {
    activos: prepararCantidadTotal(
      activos?.total,
    ),
    inactivos: prepararCantidadTotal(
      inactivos?.total,
    ),
  }
}

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

  /*
   * El backend puede devolver la lista directa o una página
   * con el formato { elementos, total, pagina, ... }.
   */
  const registros = Array.isArray(respuesta)
    ? respuesta
    : respuesta?.elementos

  if (!Array.isArray(registros)) {
    throw new EstudianteAdminError(
      'El servidor no devolvió una lista válida de estudiantes.',
    )
  }

  return ordenarEstudiantes(
    registros.map(
      normalizarEstudiante,
    ),
  )
}

/*
 * Becarios cuyo correo institucional todavía no ha sido asignado.
 * El backend devuelve el mismo contrato general sin el correo,
 * por lo que se reutiliza la normalización y se toleran
 * los registros sin horas o sin nombre para no romper el listado.
 */
export async function listarEstudiantesSinCorreo() {
  if (usarDatosAdminSimulados) {
    return clonarDatos(
      ordenarEstudiantes(
        leerEstudiantes().filter(
          (estudiante) =>
            estudiante.eliminado !== true &&
            !estudiante.datosPersonales
              ?.correoInstitucional,
        ),
      ),
    )
  }

  const respuesta = await peticionApi(
    '/usuarios/sin-correo',
  )

  if (!Array.isArray(respuesta)) {
    throw new EstudianteAdminError(
      'El servidor no devolvió una lista válida de estudiantes sin correo.',
    )
  }

  const estudiantesSinCorreo = []

  for (const registro of respuesta) {
    try {
      estudiantesSinCorreo.push(
        normalizarEstudiante(registro),
      )
    } catch {
      /* Un registro incompleto no debe ocultar el resto. */
    }
  }

  return ordenarEstudiantes(
    estudiantesSinCorreo,
  )
}

/*
 * Catálogo de carreras activas para el alta de estudiantes.
 * Si el backend no responde, el formulario sigue usable pero
 * sin opciones, y el usuario ve el mensaje de error.
 */
export async function listarCarrerasDisponibles() {
  if (usarDatosAdminSimulados) {
    return [
      { id: 1, nombre: 'Ingeniería en Sistemas' },
      { id: 2, nombre: 'Ingeniería Industrial' },
      { id: 3, nombre: 'Administración de Empresas' },
      { id: 4, nombre: 'Contaduría Pública' },
    ]
  }

  const respuesta = await peticionApi(
    '/carreras/catalogo',
  )

  if (!Array.isArray(respuesta)) {
    throw new EstudianteAdminError(
      'El servidor no devolvió un catálogo válido de carreras.',
    )
  }

  return respuesta
    .filter((carrera) => esObjeto(carrera))
    .map((carrera) => ({
      id: carrera.id,
      nombre: prepararTexto(
        carrera.nombre_carrera ??
        carrera.nombre,
      ),
    }))
    .filter(
      (carrera) =>
        carrera.id !== undefined &&
        Boolean(carrera.nombre),
    )
}

/*
 * Asigna el correo institucional a un becario que no lo tenía.
 * El dominio y el formato se validan en el backend.
 */
export async function asignarCorreoInstitucional(
  numCuenta,
  correoInstitucional,
) {
  const numeroCuenta = prepararTexto(numCuenta)
  const correo = prepararTexto(
    correoInstitucional,
  ).toLowerCase()

  if (!numeroCuenta) {
    throw new EstudianteAdminError(
      'El número de cuenta es obligatorio.',
    )
  }

  if (!correo) {
    throw new EstudianteAdminError(
      'El correo institucional es obligatorio.',
    )
  }

  if (usarDatosAdminSimulados) {
    const estudiantes = leerEstudiantes()
    const indice = buscarIndiceEstudiante(
      estudiantes,
      numeroCuenta,
    )

    if (indice === -1) {
      throw new EstudianteAdminError(
        'El estudiante no existe.',
      )
    }

    const estudiante = estudiantes[indice]

    const correoDuplicado =
      estudiantes.some(
        (otro) =>
          otro.id !== estudiante.id &&
          otro.datosPersonales
            ?.correoInstitucional === correo,
      )

    if (correoDuplicado) {
      throw new EstudianteAdminError(
        'El correo institucional ya está registrado por otro usuario.',
      )
    }

    const estudianteActualizado = {
      ...estudiante,
      datosPersonales: {
        ...estudiante.datosPersonales,
        correoInstitucional: correo,
      },
      actualizadoEn:
        new Date().toISOString(),
    }

    estudiantes[indice] =
      estudianteActualizado

    guardarEstudiantes(estudiantes)

    return clonarDatos(
      estudianteActualizado,
    )
  }

  await peticionApi(
    `/usuarios/${encodeURIComponent(
      numeroCuenta,
    )}/correo`,
    {
      method: 'PATCH',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        correo_institucional: correo,
      }),
    },
  )

  return obtenerEstudiante(numeroCuenta)
}

export async function obtenerEstudiante(num_cuenta) {

  const respuesta =
    await peticionApi(`/usuarios/${num_cuenta}`)

  if (respuesta == null) {
    throw new EstudianteAdminError(
      'El servidor no encontró al estudiante.',
    )
  }

  return normalizarEstudiante(respuesta);
}

// export async function obtenerEstudiante(
//   identificador,
// ) {
//   const valorBuscado =
//     prepararTexto(identificador)
//
//   if (!valorBuscado) {
//     throw new EstudianteAdminError(
//       'El identificador del estudiante es obligatorio.',
//     )
//   }
//
//   if (!usarDatosAdminSimulados) {
//     /*
//      * El listado administrativo contiene la información
//      * disponible para el administrador principal.
//      */
//     const estudiantes =
//       await listarEstudiantes()
//
//     return (
//       estudiantes.find(
//         (estudiante) =>
//           estudiante.id ===
//             valorBuscado ||
//           estudiante.datosPersonales
//             .numeroCuenta ===
//             valorBuscado,
//       ) ?? null
//     )
//   }
//
//   const estudiantes =
//     leerEstudiantes()
//
//   const indiceEstudiante =
//     buscarIndiceEstudiante(
//       estudiantes,
//       valorBuscado,
//     )
//
//   if (
//     indiceEstudiante === -1 ||
//     estudiantes[indiceEstudiante]
//       .eliminado === true
//   ) {
//     return null
//   }
//
//   return clonarDatos(
//     estudiantes[indiceEstudiante],
//   )
// }
//
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

    /*
     * Los ajustes de horas, aportaciones y periodo de ingreso viven
     * en el perfil del becario, no en el usuario. Se envían por su
     * propia ruta administrativa.
     */
    const {
      horas_acumuladas: horasAcumuladas,
      monto_acumulado: mesesAportados,
      anio_inicio: anioInicio,
      mes_inicio: mesInicio,
      ...datosDeUsuario
    } = datosParaBackend

    const datosDeBecario = Object.fromEntries(
      Object.entries({
        horas_acumuladas: horasAcumuladas,
        monto_acumulado: mesesAportados,
        anio_inicio: anioInicio,
        mes_inicio: mesInicio,
      }).filter(
        ([, valor]) => valor !== undefined,
      ),
    )

    if (
      Object.keys(datosDeUsuario).length === 0 &&
      Object.keys(datosDeBecario).length === 0
    ) {
      throw new EstudianteAdminError(
        'Los cambios indicados no pertenecen a campos editables de la API.',
      )
    }

    const numeroCuenta =
      estudianteActual
        .datosPersonales
        .numeroCuenta

    if (Object.keys(datosDeUsuario).length > 0) {
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
            datosDeUsuario,
          ),
        },
      )
    }

    if (Object.keys(datosDeBecario).length > 0) {
      await peticionApi(
        `/becarios/${encodeURIComponent(
          numeroCuenta,
        )}/datos-academicos`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            datosDeBecario,
          ),
        },
      )
    }

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

        horasAcumuladas:
          datosDeBecario
            .horas_acumuladas ??
          estudianteActualizado
            .datosBecario
            .horasAcumuladas,

        montoAcumulado:
          datosDeBecario
            .monto_acumulado ??
          estudianteActualizado
            .datosBecario
            .montoAcumulado,

        anioInicio:
          datosDeBecario.anio_inicio ??
          estudianteActualizado
            .datosBecario
            .anioInicio,

        mesInicio:
          datosDeBecario.mes_inicio ??
          estudianteActualizado
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
