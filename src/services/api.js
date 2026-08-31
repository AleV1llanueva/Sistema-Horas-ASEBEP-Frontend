import {
    invalidarSesion,
    obtenerTokenAcceso,
} from './sesionService.js'

// URL principal
const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '')

export class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message)

        this.name = 'ApiError'
        this.status = status
        this.details = details
    }
}

// Construye los encabezados de cada solicitud
function construirHeaders(headersIniciales) {
    const headers = new Headers(headersIniciales)

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json')
    }

    const token = obtenerTokenAcceso()

    if (token && !headers.has('Authorization')) {
        headers.set(
            'Authorization',
            `Bearer ${token}`,
        )
    }

    return headers
}

// Conseguimos un mensaje comprensible desde una respuesta de error producida por FastAPI
function obtenerMensajeError(data) {
    if (typeof data?.detail === 'string') {
        return data.detail
    }

    if (Array.isArray(data?.detail)) {
        const mensajes = data.detail
        .map((detalle) => detalle?.msg)
        .filter(
            (mensaje) =>
                typeof mensaje === 'string',
        )

        if (mensajes.length > 0) {
            return mensajes.join(' ')
        }
    }

    if (typeof data?.message === 'string') {
        return data.message
    }

    return 'No fue posible completar la solicitud.'
}

// Funcion central para el consumo de la API con FETCH
export async function apiFetch(
    endpoint,
    options = {},
) {
    if(!API_BASE_URL) {
        throw new ApiError(
            'La URL del backend no está configurada.',
            0,
        )
    }

    const headers = construirHeaders(
        options.headers,
    )

    let response

    try {
        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers,
            },
        )
    } catch (error) {
        // fetch entra en este bloque cuando existe un problema de red/CORS/Conexion de servidor
        throw new ApiError(
            'No fue posible conectarse con el servidor.',
            0,
            error,
        )
    }

    // Un 401 indica que el token no existe, es invalido o esta vencido
    if (response.status === 401) {
        invalidarSesion()
    }

    // Algunas respuestas exitosas no contienen cuerpo.
    if (response.status === 204) {
        return null
    }

    const contentType = response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')
    ) {
    throw new ApiError(
        'El servidor no devolvió una respuesta JSON. Verifica la URL y la configuración del backend.',
        response.status,
        )
    }

    let data

    try {
        data = await response.json()
    } catch (error) {
        throw new ApiError(
            'El servidor devolvió una respuesta JSON inválida.',
            response.status,
            error,
        )
    }

    // fetch no prouce automaticamente un error con respuestas 400, 401, 404, 422 0 500
    if (!response.ok) {
        throw new ApiError(
            obtenerMensajeError(data),
            response.status,
            data,
        )
    }

    return data
}