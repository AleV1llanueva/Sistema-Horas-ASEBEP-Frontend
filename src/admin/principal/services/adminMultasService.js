import {
  ApiError,
  apiDescargarArchivo,
  apiFetch,
} from '../../../services/api.js'

/*
 * Servicio administrativo de multas.
 *
 * El backend expone dos recursos distintos:
 *   - GET /multas                 -> multas registradas
 *   - GET /multas/comprobantes    -> comprobantes de pago subidos
 *   - PUT /multas/comprobantes/id -> aprobar o rechazar un pago
 */

export const ESTADOS_MULTA =
  Object.freeze({
    PENDIENTE: 'Pendiente',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
  })

export class MultaAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'MultaAdminError'
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
  if (valor === null || valor === undefined) {
    return ''
  }

  return String(valor).trim()
}

function prepararEnteroNoNegativo(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) && numero >= 0
    ? Math.trunc(numero)
    : 0
}

function prepararIdentificador(valor) {
  const numero = Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    throw new MultaAdminError(
      'El identificador de la multa no es válido.',
    )
  }

  return numero
}

/*
 * Normaliza el estado recibido a los valores
 * utilizados por las pestañas del panel.
 */
function normalizarEstado(valor) {
  const estado =
    prepararTexto(valor).toLowerCase()

  if (estado.startsWith('aprob')) {
    return ESTADOS_MULTA.APROBADO
  }

  if (estado.startsWith('rechaz')) {
    return ESTADOS_MULTA.RECHAZADO
  }

  return ESTADOS_MULTA.PENDIENTE
}

function normalizarMulta(multa) {
  if (!esObjeto(multa)) {
    throw new MultaAdminError(
      'La información de la multa no es válida.',
    )
  }

  const numCuenta =
    prepararTexto(multa.num_cuenta)

  if (!numCuenta) {
    throw new MultaAdminError(
      'La multa no tiene número de cuenta.',
    )
  }

  const nombreEstudiante =
    prepararTexto(multa.nombre_estudiante)

  return {
    id: prepararEnteroNoNegativo(multa.id),
    numCuenta,
    nombreEstudiante: nombreEstudiante || null,
    actividadId:
      prepararEnteroNoNegativo(
        multa.actividad_id,
      ),
    tituloActividad:
      prepararTexto(multa.titulo_actividad) ||
      null,
    motivo: prepararTexto(multa.motivo),
    monto: prepararEnteroNoNegativo(multa.monto),
    pagada: multa.pagada === true,
    fechaMulta:
      prepararTexto(multa.fecha_multa) || null,
  }
}

function normalizarComprobante(comprobante) {
  if (!esObjeto(comprobante)) {
    throw new MultaAdminError(
      'La información del comprobante no es válida.',
    )
  }

  return {
    id: prepararEnteroNoNegativo(comprobante.id),
    multaId:
      prepararEnteroNoNegativo(
        comprobante.multa_id,
      ),
    numCuenta:
      prepararTexto(comprobante.num_cuenta),
    numReferencia:
      prepararTexto(comprobante.num_referencia),
    rutaPdf:
      prepararTexto(comprobante.ruta_pdf),
    estado: normalizarEstado(comprobante.estado),
    fechaSolicitud:
      prepararTexto(
        comprobante.fecha_solicitud,
      ) || null,
  }
}

async function peticionApi(
  endpoint,
  opciones = {},
) {
  try {
    return await apiFetch(endpoint, opciones)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new MultaAdminError(error.message)
    }

    throw new MultaAdminError(
      'No fue posible conectar con el servidor de multas.',
    )
  }
}

/*
 * Devuelve todas las multas junto con sus comprobantes,
 * relacionándolos por `multa_id`.
 */
export async function listarMultas() {
  const [multasRecibidas, comprobantesRecibidos] =
    await Promise.all([
      peticionApi('/multas'),
      peticionApi('/multas/comprobantes'),
    ])

  if (!Array.isArray(multasRecibidas)) {
    throw new MultaAdminError(
      'El servidor no devolvió una lista válida de multas.',
    )
  }

  if (!Array.isArray(comprobantesRecibidos)) {
    throw new MultaAdminError(
      'El servidor no devolvió una lista válida de comprobantes.',
    )
  }

  const comprobantesPorMulta = new Map()

  comprobantesRecibidos
    .map(normalizarComprobante)
    .forEach((comprobante) => {
      const existentes =
        comprobantesPorMulta.get(
          comprobante.multaId,
        ) ?? []

      existentes.push(comprobante)

      comprobantesPorMulta.set(
        comprobante.multaId,
        existentes,
      )
    })

  return multasRecibidas
    .map(normalizarMulta)
    .map((multa) => {
      const comprobantes =
        comprobantesPorMulta.get(multa.id) ?? []

      /*
       * El comprobante más reciente es el que define
       * el estado visible de la multa.
       */
      comprobantes.sort((a, b) =>
        String(b.fechaSolicitud).localeCompare(
          String(a.fechaSolicitud),
        ),
      )

      const ultimoComprobante =
        comprobantes[0] ?? null

      return {
        ...multa,
        comprobantes,
        ultimoComprobante,
        estado: multa.pagada
          ? ESTADOS_MULTA.APROBADO
          : ultimoComprobante
            ? ultimoComprobante.estado
            : ESTADOS_MULTA.PENDIENTE,
      }
    })
}

/*
 * Aprueba o rechaza el comprobante de pago de una multa.
 * Al aprobarlo, el backend marca la multa como pagada.
 */
export async function revisarComprobanteMulta(
  comprobanteId,
  estado,
) {
  const identificador =
    prepararIdentificador(comprobanteId)

  if (
    ![ESTADOS_MULTA.APROBADO, ESTADOS_MULTA.RECHAZADO].includes(
      estado,
    )
  ) {
    throw new MultaAdminError(
      'El estado indicado no es válido.',
    )
  }

  const respuesta = await peticionApi(
    `/multas/comprobantes/${encodeURIComponent(
      identificador,
    )}`,
    {
      method: 'PUT',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({ estado }),
    },
  )

  return {
    mensaje:
      prepararTexto(respuesta?.mensaje) ||
      'Comprobante actualizado correctamente.',
  }
}

/*
 * Descarga el PDF del comprobante de una multa.
 */
export async function descargarComprobanteMulta(
  comprobanteId,
) {
  const identificador =
    prepararIdentificador(comprobanteId)

  try {
    const descarga = await apiDescargarArchivo(
      `/multas/comprobantes/${identificador}/archivo`,
    )

    return {
      archivo: descarga.archivo,
      nombre:
        descarga.nombre ||
        `comprobante-multa-${identificador}.pdf`,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw new MultaAdminError(error.message)
    }

    throw new MultaAdminError(
      'No fue posible descargar el comprobante.',
    )
  }
}
