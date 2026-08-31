import {
    useEffect,
    useState,
} from 'react'

import {
    Navigate,
    useLocation,
} from 'react-router'

import {
    limpiarSesion,
    obtenerSesion,
} from '../../../../services/sesionService.js'

const RUTA_LOGIN_ADMIN = '/login-admin'

// Mensajes que posteriormente mostrara el formulario de accesso administrativo.
const MENSAJE_SESION_REQUERIDA = 'Debes iniciar sesión para ingresar al portal administrativo.'
const MENSAJE_ACCESO_DENEGADO = 'No tienes los permisos para entrar en esta área administrativa.'

/*
* Limpia una sesion sin permisos antes de realizar la
* redireccion hacia el login administrativo.
* 
* La limpieza se realiza dentro de useEffect para evitar
* modificar sessionStorage durante el renderizado.
*/
function RedireccionAccesoDenegado({
    rutaSolicitada,
}) {
    const [
        sesionLimpiada,
        setSesionLimpiada,
    ] = useState(false)

    useEffect(() => {
        limpiarSesion()
        setSesionLimpiada(true)
    }, [])

    // Esperamos a que la sesión anterior sea eliminada para impedir ciclos de redirección.
    if (!sesionLimpiada) {
        return null
    }

    return (
        <Navigate to={RUTA_LOGIN_ADMIN} replace state={{
            motivo: 'acceso-denegado',
            mensaje: MENSAJE_ACCESO_DENEGADO,
            desde: rutaSolicitada,
        }}
        />
    )
}

/*
* Protege una seccion administrativa verifica que:
*
* 1. Exista una sesión vigente.
* 2. El JWT contenga contenga el rol requerido por la seccion.
* 
* El rol se compara exactamente con el valor enviado por el backend.
*/
function AdminProtectedRoute({
    rolPermitido,
    children,
}) {
    const location = useLocation()
    const sesion = obtenerSesion()

    const rutaSolicitada = location.pathname + location.search + location.hash

    /*
    * obtenerSesion tambien comprueba la estructura y expiracion del JWT.
    * Si no es válido, devuelve null.
    */
   if (!sesion) {
    return (
        <Navigate to={RUTA_LOGIN_ADMIN} replace state={{
            motivo: 'sesion-requerida',
            mensaje: MENSAJE_SESION_REQUERIDA,
            desde: rutaSolicitada,
        }}
        />
    )
   }

   /*
   * Si el administrador intenta entrar un un area que
   * no le pertenece, eliminamos su sesion y lo
   * devolvemos al login con el aviso correspondiente.
   */
  if (sesion.rol !== rolPermitido) {
    return (
        <RedireccionAccesoDenegado rutaSolicitada={rutaSolicitada} />
    )
  }

  return children
}

export default AdminProtectedRoute