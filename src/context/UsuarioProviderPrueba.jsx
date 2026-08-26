import {
  useCallback,
  useState,
} from 'react'

import { usuarioMock } from '../mocks/usuarioMock.js'
import UsuarioContext from './UsuarioContext.js'

/*
 * Provider utilizado exclusivamente para probar
 * las interfaces sin iniciar sesión ni consultar la API.
 */
export function UsuarioProviderPrueba({
  children,
}) {
  /*
   * Iniciamos directamente con el usuario ficticio.
   - Cuando el usuario cierre sesión, este estado
   - cambiará a null.
   */
  const [
    usuario,
    setUsuario,
  ] = useState(() => usuarioMock)

  /*
   - En este Provider nunca necesitamos consultar
   - un servidor, por lo que estos estados permanecen
   - resueltos desde el inicio.
   */
  const cargandoUsuario = false
  const errorUsuario = null
  const sesionComprobada = true

  const cargarUsuario = useCallback(async () => {
    setUsuario(usuarioMock)

    return usuarioMock
  }, [])

  /*
   * Simula el cierre de sesión eliminando al usuario
   * del estado mantenido por React.
   */
  const limpiarUsuario = useCallback(() => {
    setUsuario(null)
  }, [])

  const autenticado = Boolean(usuario)

  return (
    <UsuarioContext.Provider
      value={{
        usuario,
        autenticado,
        sesionComprobada,
        cargandoUsuario,
        errorUsuario,
        cargarUsuario,
        limpiarUsuario,
      }}
    >
      {children}
    </UsuarioContext.Provider>
  )
}