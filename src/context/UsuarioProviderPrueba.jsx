import {
  useCallback,
  useState,
} from 'react'

import {
  credencialesUsuarioMock,
  usuarioMock,
} from '../mocks/usuarioMock.js'
import UsuarioContext from './UsuarioContext.js'

const CLAVE_SESION_PRUEBA =
  'asebep_sesion_usuario_prueba'

/*
 * Obtiene sessionStorage de forma segura para
 * conservar la sesión simulada durante la pestaña actual.
 */
function obtenerAlmacenamientoPrueba() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/*
 * Comprueba si la cuenta simulada posee
 * una sesión activa en esta pestaña.
 */
function existeSesionPrueba() {
  const almacenamiento =
    obtenerAlmacenamientoPrueba()

  if (!almacenamiento) {
    return false
  }

  try {
    return (
      almacenamiento.getItem(
        CLAVE_SESION_PRUEBA,
      ) ===
      credencialesUsuarioMock.numeroCuenta
    )
  } catch {
    return false
  }
}

// Construye errores similares a los devueltos por la API.
function crearErrorPrueba(
  mensaje,
  status,
) {
  const error = new Error(mensaje)

  error.status = status

  return error
}

/*
 * Provider utilizado exclusivamente para probar
 * la interfaz de usuario sin consultar la API.
 */
export function UsuarioProviderPrueba({
  children,
}) {
  /*
   * La sesión simulada permanece al recargar,
   * pero desaparece al cerrar la pestaña.
   */
  const [
    usuario,
    setUsuario,
  ] = useState(() =>
    existeSesionPrueba()
      ? usuarioMock
      : null,
  )

  const cargandoUsuario = false
  const errorUsuario = null
  const sesionComprobada = true

  /*
   * Valida las credenciales ficticias y crea
   * una sesión exclusiva para el modo simulado.
   */
  const iniciarSesionPrueba =
    useCallback(async ({
      numeroCuenta,
      contrasena,
    }) => {
      const cuentaNormalizada =
        String(numeroCuenta ?? '').trim()

      const contrasenaNormalizada =
        String(contrasena ?? '')

      const credencialesCorrectas =
        cuentaNormalizada ===
          credencialesUsuarioMock.numeroCuenta &&
        contrasenaNormalizada ===
          credencialesUsuarioMock.contrasena

      if (!credencialesCorrectas) {
        throw crearErrorPrueba(
          'Las credenciales simuladas no son correctas.',
          401,
        )
      }

      const almacenamiento =
        obtenerAlmacenamientoPrueba()

      if (!almacenamiento) {
        throw crearErrorPrueba(
          'El almacenamiento de sesión no está disponible.',
          500,
        )
      }

      try {
        almacenamiento.setItem(
          CLAVE_SESION_PRUEBA,
          credencialesUsuarioMock.numeroCuenta,
        )
      } catch {
        throw crearErrorPrueba(
          'No fue posible guardar la sesión de prueba.',
          500,
        )
      }

      setUsuario(usuarioMock)

      return usuarioMock
    }, [])

  /*
   * Restaura el usuario únicamente cuando existe
   * una sesión simulada válida en esta pestaña.
   */
  const cargarUsuario =
    useCallback(async () => {
      if (!existeSesionPrueba()) {
        setUsuario(null)

        throw crearErrorPrueba(
          'No existe una sesión de prueba válida.',
          401,
        )
      }

      setUsuario(usuarioMock)

      return usuarioMock
    }, [])

  /*
   * Elimina la sesión simulada y los datos
   * mantenidos dentro del estado de React.
   */
  const limpiarUsuario =
    useCallback(() => {
      const almacenamiento =
        obtenerAlmacenamientoPrueba()

      if (almacenamiento) {
        try {
          almacenamiento.removeItem(
            CLAVE_SESION_PRUEBA,
          )
        } catch {
          /*
           * Aunque sessionStorage falle,
           * siempre limpiamos el estado de React.
           */
        }
      }

      setUsuario(null)
    }, [])

  const autenticado =
    Boolean(usuario) &&
    existeSesionPrueba()

  const rol =
    usuario?.credenciales?.rol ?? null

  return (
    <UsuarioContext.Provider
      value={{
        usuario,
        autenticado,
        rol,
        sesionComprobada,
        cargandoUsuario,
        errorUsuario,
        modoSimulado: true,
        iniciarSesionPrueba,
        cargarUsuario,
        limpiarUsuario,
      }}
    >
      {children}
    </UsuarioContext.Provider>
  )
}