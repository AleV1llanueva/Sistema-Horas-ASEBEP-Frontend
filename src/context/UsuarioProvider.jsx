import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import UsuarioContext from './UsuarioContext.js'
import {
  EVENTO_SESION_INVALIDADA,
  limpiarSesion,
  obtenerNumeroCuentaSesion,
  obtenerSesion,
  SesionError,
} from '../services/sesionService.js'

import { obtenerUsuario } from '../services/usuarioService.js'

// Proporciona la informacion del usuario autenticado
// a todos los componentes de la aplicacion
export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargandoUsuario, setCargandoUsuario] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState(null)

  // Esto indica que ya revisamos si existia una sesion guardada en la aplicacion
  const [sesionComprobada, setSesionComprobada,
  ] = useState(false)
  // Evita ejecutar 2 veces la restauracion inicial
  const restauracionIniciada = useRef(false)

  // Consulta los datos reales del usuario autenticado.
  const cargarUsuario = useCallback(async () => {
    const numeroCuenta = obtenerNumeroCuentaSesion()

    if (!numeroCuenta) {
      const error = new SesionError(
        'No existe una sesión válida para cargar al usuario.',
      )

      setUsuario(null)
      setErrorUsuario(error)
      setSesionComprobada(true)

      throw error
    }

    setCargandoUsuario(true)
    setErrorUsuario(null)

    try {
      /*
      * Ejecutamos: GET /usuario/{num_cuenta}
      * apiFetch agrega automaticamente el JWT al encabezado Authorization.
      */
     const usuarioObtenido = await obtenerUsuario(numeroCuenta)
     setUsuario(usuarioObtenido)

     return usuarioObtenido
    } catch (error) {
      setUsuario(null)
      setErrorUsuario(error)

      throw error
    } finally {
      setCargandoUsuario(false)
      setSesionComprobada(true)
    }
  }, [])

  /*
  * Mantiene sincronizados sessionStorage y React al arrojar error 401
  */
  useEffect(() => {
    function manejarSesionInvalidada() {
      setUsuario(null)
      setCargandoUsuario(false)
      setErrorUsuario(null)
      setSesionComprobada(true)
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

  // Al iniciar la app revisamos sessionStorage
  useEffect(() => {
    if (restauracionIniciada.current) {
      return
    }

    restauracionIniciada.current = true

    if (!obtenerSesion()) {
      setSesionComprobada(true)
      return
    }

    // El error queda almacenado en errorUsuario.
    cargarUsuario().catch(() => undefined)
  }, [cargarUsuario])



  /*
  * Elimina toda la informacion de autenticacion
  - JWT guardado en sessionStorage
  - Usuario mantenido en React
  - Errores anteriores
  */
 function limpiarUsuario() {
  limpiarSesion()
  setUsuario(null)
  setErrorUsuario(null)
  setSesionComprobada(true)
 }

// Obtenemos la sesion una sola vez para conocer la autenticacion como el rol
const sesion =obtenerSesion()
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
      modoSimulado: false,
      iniciarSesionPrueba: null,
      cargarUsuario,
      limpiarUsuario,
    }}
    >
      {children}
    </UsuarioContext.Provider>
 )
}