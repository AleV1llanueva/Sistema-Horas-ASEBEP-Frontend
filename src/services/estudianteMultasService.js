/*
 * Multas del becario autenticado.
 *
 * GET /becario/multas identifica al estudiante por el JWT,
 * por lo que no se envía número de cuenta.
 */
import {
  ApiError,
  apiFetch,
} from './api.js'

export class EstudianteMultasError extends Error {
  constructor(mensaje, detalles = null) {
    super(mensaje)

    this.name = 'EstudianteMultasError'
    this.detalles = detalles
  }
}

function normalizarMulta(multa) {
  const numero = Number(multa?.monto)

  return {
    id: Number(multa?.id) || 0,
    actividadId: Number(multa?.actividad_id) || 0,
    motivo: String(multa?.motivo ?? '').trim(),
    monto:
      Number.isFinite(numero) && numero > 0
        ? Math.round(numero)
        : 0,
    pagada: multa?.pagada === true,
    fechaMulta:
      String(multa?.fecha_multa ?? '').trim() ||
      null,
  }
}

export async function listarMisMultas() {
  let respuesta

  try {
    respuesta = await apiFetch('/becario/multas', {
      method: 'GET',
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw new EstudianteMultasError(
        error.message,
        error.details,
      )
    }

    throw new EstudianteMultasError(
      'No fue posible consultar tus multas.',
    )
  }

  if (!Array.isArray(respuesta)) {
    throw new EstudianteMultasError(
      'El servidor no devolvió una lista válida de multas.',
    )
  }

  return respuesta.map(normalizarMulta)
}
