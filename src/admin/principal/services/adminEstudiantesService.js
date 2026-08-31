/*
 * Servicio simulado del módulo administrativo de estudiantes.
 *
 * Las funciones públicas son asincrónicas para conservar el
 * mismo contrato para la conexión con la API.
 * Mientras tanto, los datos se almacenan en localStorage.
 */

import {
  CUOTA_MENSUAL_APORTACION,
  estudiantesAdminMock,
} from '../mocks/adminPrincipalMock.js'

const CLAVE_ESTUDIANTES =
  'asebep_admin_estudiantes_simulados'

const usarDatosAdminSimulados =
  import.meta.env.DEV &&
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS === 'true'

export class EstudianteAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'EstudianteAdminError'
  }
}

/*
 * Evita que los datos simulados se utilicen accidentalmente
 * fuera del entorno de desarrollo configurado.
 */
function comprobarModoSimulado() {
  if (!usarDatosAdminSimulados) {
    throw new EstudianteAdminError(
      'Los datos administrativos simulados están desactivados.',
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
  const numero = prepararNumeroNoNegativo(
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

/*
 * Los mocks contienen únicamente datos compatibles
 * con JSON, por lo que esta copia evita entregar las
 * referencias originales a los componentes de React.
 */
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

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
    fecha: prepararTexto(actividad.fecha),
    titulo: prepararTexto(actividad.titulo),
    horasAcreditadas:
      prepararNumeroNoNegativo(
        actividad.horasAcreditadas ?? 0,
        'Las horas acreditadas',
      ),
    registradoPor:
      prepararTexto(
        actividad.registradoPor,
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

  const estado =
    prepararTexto(aportacion.estado)
      .toLowerCase()

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
    monto: prepararNumeroNoNegativo(
      aportacion.monto ??
        CUOTA_MENSUAL_APORTACION,
      'El monto de la aportación',
    ),
    fechaPago:
      prepararTexto(aportacion.fechaPago) ||
      null,
    estado,
    comprobante:
      prepararTexto(
        aportacion.comprobante,
      ) || null,
  }
}

/*
 * Normaliza cada estudiante antes de mostrarlo o guardarlo.
 * Esta función actúa como frontera entre los datos externos
 * y la estructura utilizada por las vistas administrativas.
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
      : {}

  const datosBecario =
    esObjeto(estudiante.datosBecario)
      ? estudiante.datosBecario
      : {}

  const numeroCuenta = prepararTexto(
    datosPersonales.numeroCuenta,
  )

  if (!numeroCuenta) {
    throw new EstudianteAdminError(
      'El número de cuenta del estudiante es obligatorio.',
    )
  }

  const primerNombre = prepararTexto(
    datosPersonales.primerNombre,
  )

  const segundoNombre = prepararTexto(
    datosPersonales.segundoNombre,
  )

  const primerApellido = prepararTexto(
    datosPersonales.primerApellido,
  )

  const segundoApellido = prepararTexto(
    datosPersonales.segundoApellido,
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
   * Un estudiante eliminado no puede permanecer activo,
   * aunque los datos almacenados hayan quedado inconsistentes.
   */
  const activo =
    !eliminado &&
    credenciales.activo !== false

  const mesesSinPagar =
    prepararEnteroNoNegativo(
      datosBecario.mesesSinPagar ?? 0,
      'Los meses sin pagar',
    )

  const actividadesRecientes =
    Array.isArray(
      estudiante.actividadesRecientes,
    )
      ? estudiante.actividadesRecientes
          .map(normalizarActividadReciente)
          .sort(
            (actividadA, actividadB) =>
              actividadB.fecha.localeCompare(
                actividadA.fecha,
              ),
          )
      : []

  const aportaciones =
    Array.isArray(estudiante.aportaciones)
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
          credenciales.rol,
        ) || 'becario',
      activo,
    },

    datosPersonales: {
      numeroCuenta,
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      nombreCompleto,
      correoPersonal: prepararTexto(
        datosPersonales.correoPersonal,
      ),
      correoInstitucional:
        prepararTexto(
          datosPersonales
            .correoInstitucional,
        ),
      carrera: prepararTexto(
        datosPersonales.carrera,
      ),
      telefono: prepararTexto(
        datosPersonales.telefono,
      ),
      anioNacimiento:
        prepararEnteroOpcional(
          datosPersonales
            .anioNacimiento,
          'El año de nacimiento',
        ),
    },

    datosBecario: {
      periodoInicio: prepararTexto(
        datosBecario.periodoInicio,
      ),
      anioInicio:
        prepararEnteroOpcional(
          datosBecario.anioInicio,
          'El año de inicio',
        ),
      horasAcumuladas:
        prepararNumeroNoNegativo(
          datosBecario
            .horasAcumuladas ?? 0,
          'Las horas acumuladas',
        ),
      horasFaltantes:
        prepararNumeroNoNegativo(
          datosBecario
            .horasFaltantes ?? 0,
          'Las horas faltantes',
        ),
      mesesSinPagar,
      estadoBeca:
        eliminado
          ? 'inactivo'
          : prepararTexto(
              datosBecario.estadoBeca,
            ).toLowerCase() ||
            (activo
              ? 'activo'
              : 'inactivo'),
    },

    actividadesRecientes,
    aportaciones,

    /*
     * El saldo siempre se vuelve a calcular para impedir
     * que quede desactualizado respecto a los meses pendientes.
     */
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

function obtenerEstudiantesIniciales() {
  if (!Array.isArray(estudiantesAdminMock)) {
    return []
  }

  return estudiantesAdminMock.map(
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
 * La primera consulta inicializa localStorage con los tres
 * estudiantes del mock. Las siguientes consultas utilizan
 * los cambios realizados durante las pruebas.
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
 * Las rutas podrán utilizar el identificador interno o el
 * número de cuenta para localizar al mismo estudiante.
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

export async function listarEstudiantes() {
  comprobarModoSimulado()

  const estudiantes =
    leerEstudiantes().filter(
      (estudiante) =>
        estudiante.eliminado !== true,
    )

  return clonarDatos(
    ordenarEstudiantes(estudiantes),
  )
}

export async function obtenerEstudiante(
  identificador,
) {
  comprobarModoSimulado()

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
    return null
  }

  return clonarDatos(
    estudiantes[indiceEstudiante],
  )
}

/*
 * La actualización queda disponible para la futura vista
 * de edición, de momento solo mostrara un mensaje de
 * Disponible proximamente".
 */
export async function actualizarEstudiante(
  identificador,
  cambios,
) {
  comprobarModoSimulado()

  if (!esObjeto(cambios)) {
    throw new EstudianteAdminError(
      'Los cambios del estudiante no son válidos.',
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
      'El estudiante que deseas actualizar no existe.',
    )
  }

  const estudianteActual =
    estudiantes[indiceEstudiante]

  /*
   * Los objetos internos se combinan por separado para
   * conservar los campos que no fueron incluidos en el cambio.
   */
  const estudianteCombinado = {
    ...estudianteActual,
    ...cambios,

    credenciales: {
      ...estudianteActual.credenciales,
      ...(esObjeto(cambios.credenciales)
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
      ...(esObjeto(cambios.datosBecario)
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
      Array.isArray(cambios.aportaciones)
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

  /*
   * Evita que dos estudiantes terminen utilizando
   * el mismo número de cuenta.
   */
  const cuentaDuplicada =
    estudiantes.some(
      (estudiante, indice) =>
        indice !== indiceEstudiante &&
        estudiante.eliminado !== true &&
        estudiante.datosPersonales
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

  estudiantes[indiceEstudiante] =
    estudianteActualizado

  guardarEstudiantes(estudiantes)

  return clonarDatos(
    estudianteActualizado,
  )
}

export async function cambiarEstadoEstudiante(
  identificador,
  activo,
) {
  comprobarModoSimulado()

  if (typeof activo !== 'boolean') {
    throw new EstudianteAdminError(
      'El estado del estudiante no es válido.',
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

      actualizadoEn: fechaActual,
    })

  estudiantes[indiceEstudiante] =
    estudianteActualizado

  guardarEstudiantes(estudiantes)

  return clonarDatos(
    estudianteActualizado,
  )
}

/*
 * La eliminación es lógica: el registro permanece guardado,
 * pero deja de aparecer en las consultas normales.
 */
export async function eliminarEstudiante(
  identificador,
) {
  comprobarModoSimulado()

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

  guardarEstudiantes(estudiantes)

  return clonarDatos(
    estudianteEliminado,
  )
}

/*
 * Permite regresar a los tres estudiantes originales
 * después de probar activaciones, cambios o eliminaciones.
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