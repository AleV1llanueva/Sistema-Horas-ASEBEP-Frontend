import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  iniciarSesionMock,
  obtenerUsuarioPersonalMock,
} from '../mocks/autenticacionMock.js'

import {
  EVENTO_SESION_INVALIDADA,
  limpiarSesion,
  obtenerSesion,
} from '../services/sesionService.js'

import UsuarioContext from './UsuarioContext.js'

/*
* Construye errores similares a los enviados por la API.
* El status permite que Login muestre el mensaje apropiado.
*/
function crearErrorPrueba(
  mensaje,
  status,
) {
  const error = new Error(mensaje)

  error.status = status

  return error
}

// Recupera la sesion general almacenada y localiza la informacion personal de la cuenta simulada.
function obtenerEstadoInicial() {
  const sesion = obtenerSesion()

  if (!sesion) {
    return {
      sesion: null,
      usuario: null,
    }
  }

  const usuario = obtenerUsuarioPersonalMock(
    sesion.numeroCuenta,
  )

  /* Si la sesion pertenece a una cuenta que ya no existe en el mock,
  evitamos conservarla.
  */
 if (!usuario) {
  limpiarSesion()
  return {
    sesion: null,
    usuario: null,
  }
 }

 return {
  sesion,
  usuario,
 }
}

/*
* Utiliza la misma estructura de sesion que el backend,
* permitiendo autenticar becarios y administradores desde un unico formulario.
*/
export function UsuarioProviderPrueba({
  children,
}) {
  const [
    estadoAutenticacion,
    setEstadoAutenticacion,
  ] = useState(obtenerEstadoInicial)

  const [
    errorUsuario,
    setErrorUsuario,
  ] = useState(null)

  const {
    sesion,
    usuario,
  } = estadoAutenticacion

  // El mock responde localmente, por lo que no necesita mantener un estado visual independiente de carga.
  const cargandoUsuario = false
  const sesionComprobada = true

  /*
  * Autentica cualquiera de las cuatro cuentas simuladas.
  *
  * iniciarSesionMock genera y guarda el JWT. Despues, el provider
  * sincroniza la sesion con react.
  */
 const iniciarSesionPrueba = useCallback(async ({
  numeroCuenta,
  contrasena,
 }) => {
  setErrorUsuario(null)

  const sesionCreada =
    await iniciarSesionMock({
      numeroCuenta,
      contrasena,
    })

    const usuarioEncontrado =
      obtenerUsuarioPersonalMock(
        sesionCreada.numeroCuenta,
      )

      if (!usuarioEncontrado) {
        limpiarSesion()

        throw crearErrorPrueba(
          'No se encontró la información personal de la cuenta simulada.',
          404,
        )
      }

      setEstadoAutenticacion({
        sesion: sesionCreada,
        usuario: usuarioEncontrado,
      })

      /*
      * Login utilizara este resultado para conocer
      * el rol y seleccionar su ruta inicial.
      */
     return sesionCreada
 }, [])

 /*
 * Recupera la informacion personal del becario
 * asociado con la sesion actual.
 * Tambien funciona para los admins cuando ingresan a su portal personal.
 */
const cargarUsuario =
 useCallback(async () => {
  const sesionActual = obtenerSesion()

  if (!sesionActual) {
    const error = crearErrorPrueba(
      'No existe una sesión de prueba válida.',
      401,
    )

    setEstadoAutenticacion({
      sesion: null,
      usuario: null,
    })
    setErrorUsuario(error)

    throw error
  }

  const usuarioEncontrado = obtenerUsuarioPersonalMock(
    sesionActual.numeroCuenta,
  )

  if (!usuarioEncontrado) {
    const error = crearErrorPrueba(
      'No se encontró la información personal de la cuenta simulada.',
      404,
    )

    limpiarSesion()

    setEstadoAutenticacion({
      sesion: null,
      usuario: null,
    })
    setErrorUsuario(error)

    throw error
  }

  setEstadoAutenticacion({
    sesion: sesionActual,
    usuario: usuarioEncontrado,
  })
  setErrorUsuario(null)

  return usuarioEncontrado
 }, [])

 // Elimina el JWT y todos los datos mantenidos por el provider de prueba.
 const limpiarUsuario =
  useCallback(() => {
    limpiarSesion()

    setEstadoAutenticacion({
      sesion: null,
      usuario: null,
    })
    setErrorUsuario(null)
  }, [])

  // Sincroniza el contexto si apiFetch determina que la sesion dejo de ser valida.
  useEffect(() => {
    function manejarSesionInvalidada() {
      setEstadoAutenticacion({
        sesion: null,
        usuario: null,
      })
      setErrorUsuario(null)
    }

    window.addEventListener(
      EVENTO_SESION_INVALIDADA,
      manejarSesionInvalidada,
    )

    return () => {
      window.removeEventListener(
        EVENTO_SESION_INVALIDADA,
        manejarSesionInvalidada,
      )
    }
  }, [])

  const autenticado = Boolean(sesion)
  const rol = sesion?.rol ?? null

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