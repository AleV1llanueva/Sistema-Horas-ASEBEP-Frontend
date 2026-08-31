import { useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { useUsuario } from '../hooks/useUsuario.js'
import { iniciarSesion } from '../services/authService.js'
import {
  notificarError,
  notificarExito,
} from '../services/notificationService.js'
import { SesionError } from '../services/sesionService.js'
import '../styles/Login.css'

const formularioInicial = {
  numeroCuenta: '',
  contrasena: '',
}

// Identificador único para las notificaciones del Login.
const ID_NOTIFICACION_LOGIN = 'inicio-sesion'

function IconoOjo({ visible }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 3l18 18" />

        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

        <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.7 3.8" />

        <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 8 10 8c1.8 0 3.3-.4 4.6-1" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />

      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function Login() {
  const navigate = useNavigate()

  /*
   * El contexto conserva tanto el inicio de sesión
   * real como el modo simulado utilizado en desarrollo.
   */
  const {
    cargarUsuario,
    limpiarUsuario,
    modoSimulado,
    iniciarSesionPrueba,
  } = useUsuario()

  const [formulario, setFormulario] =
    useState(formularioInicial)

  const [errores, setErrores] = useState({})

  const [
    mostrarContrasena,
    setMostrarContrasena,
  ] = useState(false)

  const [enviando, setEnviando] =
    useState(false)

  // Actualiza el campo donde está escribiendo el usuario.
  function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((valoresAnteriores) => ({
      ...valoresAnteriores,
      [name]: value,
    }))

    /*
     * Eliminamos el error del campo cuando el
     * usuario comienza a corregirlo.
     */
    if (errores[name]) {
      setErrores((erroresAnteriores) => ({
        ...erroresAnteriores,
        [name]: '',
      }))
    }
  }

  // Valida los datos antes de iniciar sesión.
  function validarFormulario() {
    const nuevosErrores = {}

    /*
     * Los espacios se eliminan únicamente para
     * validar el número de cuenta.
     */
    const numeroCuenta =
      formulario.numeroCuenta.trim()

    if (!numeroCuenta) {
      nuevosErrores.numeroCuenta =
        'Ingresa tu número de cuenta.'
    } else if (!/^\d+$/.test(numeroCuenta)) {
      nuevosErrores.numeroCuenta =
        'El número de cuenta solo puede contener números.'
    } else if (!/^\d{11}$/.test(numeroCuenta)) {
      nuevosErrores.numeroCuenta =
        'El número de cuenta debe tener exactamente 11 dígitos.'
    }

    /*
     * En el inicio de sesión solo comprobamos
     * que la contraseña haya sido proporcionada.
     */
    if (!formulario.contrasena) {
      nuevosErrores.contrasena =
        'Ingresa tu contraseña.'
    }

    return nuevosErrores
  }

  // Explica el error ocurrido al intentar iniciar sesión.
  function obtenerDescripcionError(error) {
    /*
     * SesionError significa que el backend respondió,
     * pero el JWT está incompleto, vencido o no es válido.
     */
    if (error instanceof SesionError) {
      return (
        'La sesión enviada por el servidor está incompleta. ' +
        'Verifica que el JWT contenga el número de cuenta, el rol y la expiración.'
      )
    }

    // 401 significa que las credenciales no son válidas.
    if (error.status === 401) {
      const mensajeServidor = String(
        error.message || '',
      ).toLowerCase()

      /*
       * Comprobamos si el backend indica que la
       * cuenta todavía no ha sido activada.
       */
      if (mensajeServidor.includes('inactivo')) {
        return (
          'Tu cuenta todavía no está activa. ' +
          'Configúrala desde la opción de primer ingreso.'
        )
      }

      return (
        'El número de cuenta o la contraseña son incorrectos. ' +
        'Por favor verifica tus datos e intenta de nuevo.'
      )
    }

    /*
     * 422 significa que los datos enviados no coinciden
     * con la estructura esperada por el backend.
     */
    if (error.status === 422) {
      return (
        'El servidor todavía no puede procesar estas credenciales. ' +
        'Verifica que el backend acepte número de cuenta y contraseña.'
      )
    }

    // ApiError utiliza 0 cuando no existe una respuesta HTTP válida.
    if (error.status === 0) {
      return (
        'No fue posible conectarse con el servidor. ' +
        'Verifica tu conexión a internet e intenta de nuevo.'
      )
    }

    /*
     * Para respuestas 400, 404 o 500, apiFetch prepara
     * el mensaje enviado por el backend.
     */
    return (
      error.message ||
      'No fue posible completar la operación.'
    )
  }

  /*
   * Procesa el envío del formulario:
   * 1. Valida los campos.
   * 2. Evita solicitudes duplicadas.
   * 3. Utiliza el login simulado o el backend.
   * 4. Carga al usuario cuando existe un JWT real.
   * 5. Limpia sesiones incompletas si ocurre un error.
   * 6. Redirige al Dashboard.
   */
  async function manejarEnvio(event) {
    event.preventDefault()

    if (enviando) {
      return
    }

    const nuevosErrores = validarFormulario()

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setErrores({})
    setEnviando(true)

    /*
     * Permite saber si debemos limpiar una sesión
     * parcialmente creada cuando ocurre un error.
     */
    let sesionCreada = false

    try {
      if (modoSimulado) {
        /*
         * En modo simulado validamos las credenciales
         * ficticias sin consultar el backend.
         */
        await iniciarSesionPrueba({
          numeroCuenta:
            formulario.numeroCuenta,
          contrasena:
            formulario.contrasena,
        })

        sesionCreada = true
      } else {
        /*
         * En modo real se obtiene el JWT y después
         * se consulta la información del usuario.
         */
        await iniciarSesion({
          numeroCuenta:
            formulario.numeroCuenta,
          contrasena:
            formulario.contrasena,
        })

        sesionCreada = true

        await cargarUsuario()
      }

      // Elimina las credenciales del estado del formulario.
      setFormulario(formularioInicial)

      notificarExito({
        id: ID_NOTIFICACION_LOGIN,
        titulo: 'Inicio de sesión correcto',
        descripcion:
          'Bienvenido al portal de becas ASEBEP.',
      })

      /*
       * replace evita regresar al Login utilizando
       * el botón atrás del navegador.
       */
      navigate('/dashboard', {
        replace: true,
      })
    } catch (error) {
      /*
       * Si la sesión fue creada pero el resto del
       * proceso falló, eliminamos sus datos.
       */
      if (sesionCreada) {
        limpiarUsuario()
      }

      const descripcionError =
        obtenerDescripcionError(error)

      const mensajeError = String(
        error.message || '',
      ).toLowerCase()

      const tituloError =
        error instanceof SesionError
          ? 'Sesión inválida'
          : error.status === 401
            ? mensajeError.includes('inactivo')
              ? 'Cuenta inactiva'
              : 'Credenciales incorrectas'
            : 'No fue posible iniciar sesión'

      notificarError({
        id: ID_NOTIFICACION_LOGIN,
        titulo: tituloError,
        descripcion: descripcionError,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-page">
      <section
        className="login-content"
        aria-labelledby="login-title"
      >
        {/* Identidad visual principal de ASEBEP. */}
        <header className="brand">
          <div
            className="brand__icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 9.25 12 5l9 4.25L12 13.5 3 9.25Z" />

              <path d="M7 11.1v5.1c2.9 2 7.1 2 10 0v-5.1" />

              <path d="M21 9.25v5" />
            </svg>
          </div>

          <div>
            <h1 id="login-title">
              ASEBEP
            </h1>

            <p>Portal de Gestión de Becas</p>
          </div>
        </header>

        {/*
         * Esta introducción se muestra únicamente
         * en dispositivos pequeños.
         */}
        <div className="login-intro">
          <h2>Bienvenido</h2>

          <p>
            Ingresa tus credenciales para acceder a tu
            panel de becario.
          </p>
        </div>

        {/*
         * onSubmit conecta el formulario con la función
         * que valida y envía las credenciales.
         */}
        <form
          className="login-card"
          onSubmit={manejarEnvio}
          noValidate
        >
          <div className="form-field">
            <label htmlFor="numero-cuenta">
              Número de cuenta
            </label>

            <input
              id="numero-cuenta"
              name="numeroCuenta"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              maxLength={11}
              placeholder="Ej. 20261000001"
              value={formulario.numeroCuenta}
              onChange={manejarCambio}
              aria-invalid={Boolean(
                errores.numeroCuenta,
              )}
              aria-describedby={
                errores.numeroCuenta
                  ? 'error-numero-cuenta'
                  : undefined
              }
            />

            {errores.numeroCuenta && (
              <small
                className="field-error"
                id="error-numero-cuenta"
                role="alert"
              >
                {errores.numeroCuenta}
              </small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="contrasena">
              Contraseña
            </label>

            <div className="password-control">
              <input
                id="contrasena"
                name="contrasena"
                type={
                  mostrarContrasena
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                value={formulario.contrasena}
                onChange={manejarCambio}
                aria-invalid={Boolean(
                  errores.contrasena,
                )}
                aria-describedby={
                  errores.contrasena
                    ? 'error-contrasena'
                    : undefined
                }
              />

              <button
                className="password-toggle"
                type="button"
                aria-label={
                  mostrarContrasena
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
                aria-pressed={mostrarContrasena}
                title={
                  mostrarContrasena
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
                onClick={() =>
                  setMostrarContrasena(
                    (valorAnterior) =>
                      !valorAnterior,
                  )
                }
              >
                <IconoOjo
                  visible={mostrarContrasena}
                />
              </button>
            </div>

            {errores.contrasena && (
              <small
                className="field-error"
                id="error-contrasena"
                role="alert"
              >
                {errores.contrasena}
              </small>
            )}
          </div>

          {/*
           * disabled evita solicitudes duplicadas.
           *
           * aria-busy comunica a las tecnologías
           * de asistencia que la acción está en proceso.
           */}
          <button
            className="login-button"
            type="submit"
            disabled={enviando}
            aria-busy={enviando}
          >
            {enviando ? (
              'Iniciando sesión...'
            ) : (
              <>
                Iniciar sesión{' '}
                <span aria-hidden="true">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        {/*
         * El primer enlace permite activar cuentas nuevas.
         * El segundo conserva la recuperación existente.
         */}
        <nav
          className="access-links"
          aria-label="Opciones de acceso"
        >
          <div>
            <Link to="/primer-ingreso">
              ¿Primera vez ingresando?
            </Link>

            <span aria-hidden="true">
              {' · '}
            </span>

            <Link to="/recuperar-contrasena">
              ¿Olvidaste tus datos?
            </Link>
          </div>
        </nav>

        <footer className="login-footer">
          <p>
            © 2026 ASEBEP · Portal de Becas
          </p>
        </footer>
      </section>
    </main>
  )
}

export default Login