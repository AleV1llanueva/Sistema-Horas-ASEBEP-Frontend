import {
    useEffect,
    useState,
} from 'react'

import {
    LoaderCircle,
    LockKeyhole,
    LogIn,
    ShieldCheck,
    UserRound,
} from 'lucide-react'

import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router'

import {
    notificarError,
    notificarExito,
} from '../../../../services/notificationService.js'

import {
    SesionError,
} from '../../../../services/sesionService.js'

import logoAsebepCircular from '../assets/asebep-admin-logo-circular.png'
import {
    AdminAuthError,
    iniciarSesionAdmin,
} from '../services/adminAuthService.js'
import '../styles/AdminLogin.css'

const formularioInicial = {
    numeroCuenta: '',
    contrasena: '',
}

const RUTA_LOGIN_ADMIN = '/login-admin'
const RUTA_RECUPERACION_ADMIN = '/recuperar-contrasena-admin'

const ID_NOTIFICACION_LOGIN_ADMIN = 'inicio-sesion-admin'
const ID_NOTIFICACION_ACCESO_ADMIN = 'acceso-administrativo-restringido'

/*
 * Icono del ojo para activar o desactivar la contraseña.
 */
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

      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  )
}

// Traduce los diferentes errores del servicio a mensajes comprensibles para el administrador.
function obtenerDescripcionError(error) {
    /* SesionError indica que el backend respondio, pero el JWT esta incompleto, vencido o mal formado. */
    if (error instanceof SesionError) {
        return (
            'La sesión enviada por el servidor no es válida. '+ 'Verifica que el JWT contenga el número de cuenta, ' +
            'el rol administrativo y la fecha de expiración.'
        )
    }

    /*
    * AdminAuthError representa porblemas detectados después
    * de interpretar conrrectamente el JWT.
    */
   if (error instanceof AdminAuthError) {
    if (
        error.codigo === 'CUENTA_JWT_NO_COINCIDE'
    ) {
        return (
            'La cuenta identificada por el servidor no coincide ' + 
            'con la cuenta utilizada para iniciar sesión.'
        )
    }

    if (
        error.codigo === 'ROL_NO_ADMINISTRATIVO'
    ) {
        return (
            'La cuenta ingresada no tiene permisos para acceder ' +
            'al portal administrativo.'
        )
    }

    return error.message
   }

   /*
   * El backend y el mock utilizan 401 cuando las credenciales no son correctas.
   */
  if (error?.status === 401) {
    return (
        'El número de cuenta o la contraseña son incorrectos. ' +
        'Verifica tus credenciales e intenta nuevamente.'
    )
  }

  // Una cuenta inactiva o bloqueada puede producir una respuesta 403.
  if (error?.status === 403) {
    const mensajeServidor = String(
        error.message ?? '',
    ).toLowerCase()

    if (mensajeServidor.includes('inactiva')) {
        return (
            'La cuenta administrativa se encuentra inactiva. ' +
            'Comunícate con la administración de ASEBEP.'
        )
    }

    return (
        'No tienes permisos para ingresar al portal administrativo.'
    )
  }

  // FastAPI utiliza 422 cuando el cuerpo enviado no coincide con el contrato esperado.
  if (error?.status === 422) {
    return (
        'El servidor no pudo procesar las credenciales. ' +
        'Verifica que el backend acepte número de cuenta ' + 'y contraseña.'
    )
  }

  // apiFetch utiliza status 0 cuando no pudo obtener una respuesta HTTP válida.
  if (
    error?.status === 0 || !error?.status
  ) {
    return (
        'No fue posible conectarse con el servidor. ' + 
        'Verifica la conexión e intenta nuevamente.'
    )
  }

  return (
    error.message || 'No fue posible completar el inicio de sesión.'
  )
}

function AdminLogin() {
    const location = useLocation()
    const navigate = useNavigate()

    const [
        formulario,
        setFormulario,
    ] = useState(formularioInicial)

    const [
        errores,
        setErrores,
    ] = useState({})

    const [
        mostrarContrasena,
        setMostrarContrasena,
    ] = useState(false)

    const [
        enviando,
        setEnviando,
    ] = useState(false)

    /*
    * Muestra el mensaje enviando por AdminProtectedRoute
    * cuando alguien llega desde una ruta protegida.
    * 
    * Despues eliminamos el state de navegacion para impedir
    * que el aviso se repita al recargar la página.
    */
   useEffect(() => {
    const mensaje = String(
        location.state?.mensaje ?? '',
    ).trim()

    if (!mensaje) {
        return
    }

    const accesoDenegado = location.state?.motivo === 'acceso-denegado'

    notificarError({
        id: ID_NOTIFICACION_ACCESO_ADMIN,
        titulo: accesoDenegado
            ? 'Acceso administrativo denegado'
            : 'Sesión administrativa requerida',
        descripcion: mensaje,
    })

    navigate(
        RUTA_LOGIN_ADMIN,
        {
            replace: true,
            state: null,
        },
    )
   }, [
    location.state,
    navigate,
   ])

   // Actualiza el campo modificado y elimina su error cuando el usurio comienza a corregirlo.
   function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((valoresAnteriores) => ({
        ...valoresAnteriores,
        [name]: value,
    }))

    if (errores[name]) {
        setErrores((erroresAnteriores) => ({
            ...erroresAnteriores,
            [name]: '',
        }))
    }
   }

   /*
   * Comprueba los campos antes de consultar el mock o enviar una petición al backend.
   */
  function validarFormulario() {
    const nuevosErrores = {}
    const numeroCuenta = formulario.numeroCuenta.trim()

    if (!numeroCuenta) {
        nuevosErrores.numeroCuenta = 'Ingresa tu número de cuenta.'
    } else if (!/^\d+$/.test(numeroCuenta)) {
        nuevosErrores.numeroCuenta = 'El número de cuenta solo puede contener números.'
    }

    if (!formulario.contrasena) {
        nuevosErrores.contrasena = 'Ingresa tu contraseña.'
    }

    return nuevosErrores
  }

  /*
  * Flujo del inicio de sesión:
  *
  * 1. Valida los campos.
  * 2. Evita solicitures duplicadas.
  * 3. Consulta el mock o el backend.
  * 4. Guarda y valida el JWT.
  * 5. Obtiene la ruta correspondiente al rol.
  * 6. Redirige hacia el dashboard autorizado.
  */
 async function manejarEnvio(event) {
    event.preventDefault()

    if (enviando) {
        return
    }

    const nuevosErrores = validarFormulario()

    if (
        Object.keys(nuevosErrores).length > 0
    ) {
        setErrores(nuevosErrores)
        return
    }

    setErrores({})
    setEnviando(true)

    try {
        const sesion =
            await iniciarSesionAdmin({
                numeroCuenta: formulario.numeroCuenta,
                contrasena: formulario.contrasena,
            })

        setFormulario(formularioInicial)

        notificarExito({
            id: ID_NOTIFICACION_LOGIN_ADMIN,
            titulo: 'Inicio de sesión correcto',
            descripcion: 'Bienvenido al portal administrativo de ASEBEP.',
        })

        // La ruta nunca se toma del formulario. Proviene del rol validado dentro del JWT.
        navigate(
            sesion.rutaInicio,
            {
                replace: true,
            },
        )
    } catch (error) {
        notificarError({
            id: ID_NOTIFICACION_LOGIN_ADMIN,
            titulo: 'No fue posible iniciar sesión',
            descripcion: obtenerDescripcionError(error),
        })
    } finally {
        setEnviando(false)
    }
 }

 return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <section
          className="admin-login-card"
          aria-labelledby="admin-login-title"
        >
          <header className="admin-login-brand">
            <img
              className="admin-login-brand__logo"
              src={logoAsebepCircular}
              alt="Emblema de ASEBEP"
            />

            <h1>ASEBEP</h1>

            <p>
              Portal de Gestión Administrativa
            </p>
          </header>

          <div
            className="admin-login-divider"
            aria-hidden="true"
          />

          <header className="admin-login-heading">
            <h2 id="admin-login-title">
              Acceso administrativo
            </h2>

            <p>
              Ingresa con tus credenciales autorizadas
            </p>
          </header>

          <div
            className="admin-login-notice"
            role="note"
          >
            <span
              className="admin-login-notice__icon"
              aria-hidden="true"
            >
              <ShieldCheck />
            </span>

            <span>
              Acceso exclusivo para personal autorizado
            </span>
          </div>

          <form
            onSubmit={manejarEnvio}
            noValidate
          >
            <div className="admin-login-field">
              <label htmlFor="admin-numero-cuenta">
                Número de cuenta
              </label>

              <div className="admin-login-control">
                <UserRound aria-hidden="true" />

                <input
                  id="admin-numero-cuenta"
                  name="numeroCuenta"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="Ingresa tu número de cuenta"
                  value={formulario.numeroCuenta}
                  onChange={manejarCambio}
                  aria-invalid={
                    Boolean(errores.numeroCuenta)
                  }
                  aria-describedby={
                    errores.numeroCuenta
                      ? 'error-admin-numero-cuenta'
                      : undefined
                  }
                  disabled={enviando}
                  autoFocus
                />
              </div>

              {errores.numeroCuenta && (
                <small
                  id="error-admin-numero-cuenta"
                  className="admin-login-field-error"
                  role="alert"
                >
                  {errores.numeroCuenta}
                </small>
              )}
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-contrasena">
                Contraseña
              </label>

              <div
                className={
                  'admin-login-control ' +
                  'admin-login-control--password'
                }
              >
                <LockKeyhole aria-hidden="true" />

                <input
                  id="admin-contrasena"
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
                  aria-invalid={
                    Boolean(errores.contrasena)
                  }
                  aria-describedby={
                    errores.contrasena
                      ? 'error-admin-contrasena'
                      : undefined
                  }
                  disabled={enviando}
                />

                <button className="admin-login-password-toggle" type="button" aria-label={
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
                        (valorAnterior) => !valorAnterior,
                    )
                }
                disabled={enviando}
                >
                    <IconoOjo visible={mostrarContrasena} />
                </button>
              </div>

              {errores.contrasena && (
                <small
                  id="error-admin-contrasena"
                  className="admin-login-field-error"
                  role="alert"
                >
                  {errores.contrasena}
                </small>
              )}
            </div>

            <button
              className="admin-login-submit"
              type="submit"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <LoaderCircle
                    className="admin-login-submit__loader"
                    aria-hidden="true"
                  />

                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn aria-hidden="true" />
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          <div className="admin-login-recovery">
            <Link
              to={RUTA_RECUPERACION_ADMIN}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </section>

        <footer className="admin-login-footer">
          <p>
            ASEBEP
            <span aria-hidden="true">·</span>
            Portal de Gestión Administrativa
          </p>
        </footer>
      </div>
    </main>
  )
}

export default AdminLogin