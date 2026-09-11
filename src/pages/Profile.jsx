import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  OTPInput,
  REGEXP_ONLY_DIGITS,
} from 'input-otp'
import {
  Circle,
  CircleX,
  Info,
  TriangleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  School,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { Toaster as SonnerToaster } from 'sonner'
import AppSidebar from '../components/AppSidebar.jsx'
import MobileNavigation from '../components/MobileNavigation.jsx'
import { useUsuario } from '../hooks/useUsuario.js'
import {
  actualizarContrasenaConPin,
  solicitarPinCambioContrasena,
} from '../services/authService.js'
import {
  limpiarNotificaciones,
  notificarError,
  notificarExito,
  notificarInformacion,
} from '../services/notificationService.js'
import {
  obtenerNumeroCuentaSesion,
} from '../services/sesionService.js'
import '../styles/AppLayout.css'
import '../styles/Profile.css'

const ID_TOASTER_CAMBIO_CONTRASENA_PERFIL =
  'toaster-cambio-contrasena-perfil'

const ID_SOLICITUD_PIN_PERFIL =
  'solicitud-pin-perfil'

const ID_CAMBIO_CONTRASENA_PERFIL =
  'cambio-contrasena-perfil'

const ID_EXITO_CAMBIO_CONTRASENA_PERFIL =
  'exito-cambio-contrasena-perfil'

/*
 * Prepara estados y roles para mostrarlos
 * de una forma más fácil de leer.
 */
function prepararEtiqueta(valor) {
  const texto = String(valor ?? '')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()

  if (!texto) {
    return 'Sin información'
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  )
}

// Evita mostrar valores vacíos en el perfil.
function mostrarDato(valor) {
  const texto = String(valor ?? '').trim()

  return texto || 'No disponible'
}

/*
 * Cada espacio representa visualmente un dígito.
 * input-otp conserva un único input accesible.
 */
function PinSlot({
  char,
  hasFakeCaret,
  isActive,
}) {
  const clase = isActive
    ? 'profile-password-pin-slot profile-password-pin-slot--active'
    : 'profile-password-pin-slot'

  return (
    <div className={clase}>
      {char}

      {hasFakeCaret && (
        <span
          className="profile-password-pin-caret"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// Representa un requisito de la contraseña.
function RequisitoContrasena({
  cumplido,
  children,
}) {
  return (
    <li
      className={
        cumplido
          ? 'profile-password-requirement profile-password-requirement--complete'
          : 'profile-password-requirement'
      }
    >
      {cumplido ? (
        <CircleCheck aria-hidden="true" />
      ) : (
        <Circle aria-hidden="true" />
      )}

      <span>{children}</span>
    </li>
  )
}

/*
 * Convierte los errores de la API o del mock
 * en mensajes apropiados para el usuario.
 */
function obtenerMensajeCambioContrasena(
  error,
) {
  if (error.status === 0) {
    return (
      'No fue posible conectarse con el servidor. ' +
      'Verifica tu conexión e intenta nuevamente.'
    )
  }

  if (error.status === 400) {
    return (
      error.message ||
      'El PIN es inválido o ha expirado.'
    )
  }

  if (error.status === 404) {
    return (
      'No encontramos una cuenta asociada con tu sesión.'
    )
  }

  if (error.status === 422) {
    return (
      error.message ||
      'La contraseña no cumple los requisitos de seguridad.'
    )
  }

  if (error.status === 429) {
    return (
      error.message ||
      'Alcanzaste el límite diario de solicitudes de PIN.'
    )
  }

  return (
    error.message ||
    'No fue posible completar el cambio de contraseña.'
  )
}

/*
 * Modal de Cambio de Contraseña.
 *
 * Se desmonta al cerrarse, por lo que todos sus campos
 * quedan limpios para la siguiente apertura.
 */
function CambioContrasenaModal({
  numeroCuenta,
  correoInstitucional,
  onCerrar,
}) {
  const dialogRef = useRef(null)

  const [pinSolicitado, setPinSolicitado] =
    useState(false)

  const [pin, setPin] = useState('')

  const [
    nuevaContrasena,
    setNuevaContrasena,
  ] = useState('')

  const [
    confirmacionContrasena,
    setConfirmacionContrasena,
  ] = useState('')

  const [
    mostrarNuevaContrasena,
    setMostrarNuevaContrasena,
  ] = useState(false)

  const [
    mostrarConfirmacion,
    setMostrarConfirmacion,
  ] = useState(false)

  const [
    solicitandoPin,
    setSolicitandoPin,
  ] = useState(false)

  const [
    actualizandoContrasena,
    setActualizandoContrasena,
  ] = useState(false)

  const [
    mensajePin,
    setMensajePin,
  ] = useState('')

  const [
    errorModal,
    setErrorModal,
  ] = useState('')

  /*
   * showModal activa el comportamiento modal nativo:
   * foco controlado, fondo bloqueado y tecla Escape.
   */
  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return undefined
    }

    dialog.showModal()

    return () => {
      if (dialog.open) {
        dialog.close()
      }

      limpiarNotificaciones(
        ID_SOLICITUD_PIN_PERFIL,
      )

      limpiarNotificaciones(
        ID_CAMBIO_CONTRASENA_PERFIL,
      )
    }
  }, [])

  const requisitos = {
    longitud:
      nuevaContrasena.length >= 8,

    mayuscula:
      /[A-Z]/.test(nuevaContrasena),

    minuscula:
      /[a-z]/.test(nuevaContrasena),

    numero:
      /\d/.test(nuevaContrasena),

    coinciden:
      Boolean(nuevaContrasena) &&
      nuevaContrasena ===
        confirmacionContrasena,
  }

  const requisitosCumplidos =
    Object.values(requisitos).every(Boolean)

  const operacionEnProceso =
    solicitandoPin ||
    actualizandoContrasena

  /*
   * Cierra el modal únicamente cuando no existe
   * una solicitud en proceso.
   */
  function cerrarModal() {
    if (operacionEnProceso) {
      return
    }

    onCerrar()
  }

  // Controla el cierre mediante la tecla Escape.
  function manejarCancelacion(event) {
    event.preventDefault()
    cerrarModal()
  }

  /*
   * Permite cerrar al presionar el fondo oscuro,
   * pero no al interactuar con el contenido.
   */
  function manejarClicFondo(event) {
    if (event.target === dialogRef.current) {
      cerrarModal()
    }
  }

  /*
   * Solicita o reenvía el PIN al correo institucional
   * asociado con el número de cuenta autenticado.
   */
  async function manejarSolicitudPin() {
    if (!numeroCuenta) {
      const mensaje =
        'No existe un número de cuenta válido en la sesión.'

      setErrorModal(mensaje)

      notificarError({
        id: ID_SOLICITUD_PIN_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo: 'Sesión incompleta',
        descripcion: mensaje,
      })

      return
    }

    setSolicitandoPin(true)
    setErrorModal('')

    try {
      const respuesta =
        await solicitarPinCambioContrasena({
          numeroCuenta,
        })

      const mensaje =
        respuesta?.mensaje ||
        'PIN enviado a tu correo institucional.'

      /*
       * Solicitar un PIN nuevo invalida el anterior.
       */
      setPin('')
      setPinSolicitado(true)
      setMensajePin(mensaje)

      notificarInformacion({
        id: ID_SOLICITUD_PIN_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo: 'PIN enviado',
        descripcion: mensaje,
      })
    } catch (error) {
      const mensaje =
        obtenerMensajeCambioContrasena(
          error,
        )

      setErrorModal(mensaje)

      notificarError({
        id: ID_SOLICITUD_PIN_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo:
          error.status === 429
            ? 'Límite diario alcanzado'
            : 'No fue posible enviar el PIN',
        descripcion: mensaje,
      })
    } finally {
      setSolicitandoPin(false)
    }
  }

  /*
   * Envía el PIN y la contraseña nueva.
   * El backend verifica ambos datos en una sola petición.
   */
  async function manejarCambioContrasena(
    event,
  ) {
    event.preventDefault()

    if (!pinSolicitado) {
      return
    }

    if (!/^\d{6}$/.test(pin)) {
      const mensaje =
        'Ingresa los seis dígitos del PIN.'

      setErrorModal(mensaje)

      notificarError({
        id: ID_CAMBIO_CONTRASENA_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo: 'PIN incompleto',
        descripcion: mensaje,
      })

      return
    }

    if (!requisitosCumplidos) {
      const mensaje =
        'La contraseña debe cumplir todos los requisitos y coincidir con la confirmación.'

      setErrorModal(mensaje)

      notificarError({
        id: ID_CAMBIO_CONTRASENA_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo: 'Revisa la contraseña',
        descripcion: mensaje,
      })

      return
    }

    setActualizandoContrasena(true)
    setErrorModal('')

    try {
      const respuesta =
        await actualizarContrasenaConPin({
          numeroCuenta,
          pin,
          nuevaContrasena,
        })

      /*
       * Cerramos únicamente el modal.
       * La sesión y el JWT permanecen activos.
       */
      onCerrar()

      notificarExito({
        id:
          ID_EXITO_CAMBIO_CONTRASENA_PERFIL,
        titulo: 'Contraseña actualizada',
        descripcion:
          respuesta?.mensaje ||
          'Tu contraseña fue cambiada correctamente.',
      })
    } catch (error) {
      const mensaje =
        obtenerMensajeCambioContrasena(
          error,
        )

      setErrorModal(mensaje)

      notificarError({
        id: ID_CAMBIO_CONTRASENA_PERFIL,
        toasterId: ID_TOASTER_CAMBIO_CONTRASENA_PERFIL,
        titulo:
          error.status === 400
            ? 'PIN no válido'
            : 'No fue posible cambiar la contraseña',
        descripcion: mensaje,
      })
    } finally {
      setActualizandoContrasena(false)
    }
  }

  return (
    <dialog
      className="profile-password-dialog"
      ref={dialogRef}
      aria-labelledby="profile-password-title"
      aria-describedby="profile-password-description"
      onCancel={manejarCancelacion}
      onClick={manejarClicFondo}
    >

    <SonnerToaster
      id={ID_TOASTER_CAMBIO_CONTRASENA_PERFIL}
      position="top-center"
      theme="light"
      richColors={false}
      closeButton
      expand={false}
      visibleToasts={2}
      gap={12}
      offset={20}
      mobileOffset={16}
      toastOptions={{
        duration: 4500,

        style: {
          color: '#10283e',
          border: '1px solid #dbe2e8',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow:
            '0 12px 30px rgb(10 39 64 / 12%)',
          padding: '14px 16px',
          fontFamily:
            'Arial, Helvetica, sans-serif',
        },

        actionButtonStyle: {
          color: '#ffffff',
          borderRadius: '7px',
          background: '#002b4f',
          fontWeight: 700,
        },

        cancelButtonStyle: {
          color: '#314c61',
          border:
            '1px solid #cdd6de',
          borderRadius: '7px',
          background: '#f3f7fa',
          fontWeight: 700,
        },
      }}
      icons={{
        success: (
          <CircleCheck
            size={19}
            strokeWidth={2.2}
            color="#218455"
            aria-hidden="true"
          />
        ),

        error: (
          <CircleX
            size={19}
            strokeWidth={2.2}
            color="#bb2d3b"
            aria-hidden="true"
          />
        ),

        info: (
          <Info
            size={19}
            strokeWidth={2.2}
            color="#0b5688"
            aria-hidden="true"
          />
        ),

        warning: (
          <TriangleAlert
            size={19}
            strokeWidth={2.2}
            color="#b7791f"
            aria-hidden="true"
          />
        ),
      }}
    />

      <article className="profile-password-modal">
        <header className="profile-password-modal__header">
          <div className="profile-password-modal__heading">
            <span
              className="profile-password-modal__icon"
              aria-hidden="true"
            >
              <LockKeyhole />
            </span>

            <div>
              <p>Seguridad de la cuenta</p>

              <h2 id="profile-password-title">
                Cambiar contraseña
              </h2>

              <span id="profile-password-description">
                Confirma tu identidad mediante el PIN
                enviado a tu correo institucional.
              </span>
            </div>
          </div>

          <button
            className="profile-password-modal__close"
            type="button"
            aria-label="Cerrar cambio de contraseña"
            title="Cerrar"
            disabled={operacionEnProceso}
            onClick={cerrarModal}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form
          className="profile-password-form"
          onSubmit={
            manejarCambioContrasena
          }
          noValidate
        >
          {/* Cuenta autenticada, no editable. */}
          <section className="profile-password-account">
            <div>
              <IdCard aria-hidden="true" />

              <p>
                <span>Número de cuenta</span>
                <strong>
                  {mostrarDato(numeroCuenta)}
                </strong>
              </p>
            </div>

            <div>
              <Mail aria-hidden="true" />

              <p>
                <span>Correo institucional</span>
                <strong>
                  {mostrarDato(
                    correoInstitucional,
                  )}
                </strong>
              </p>
            </div>
          </section>

          {/* Primer paso: solicitar el PIN. */}
          <section className="profile-password-step">
            <header className="profile-password-step__header">
              <span>1</span>

              <div>
                <h3>Solicita tu PIN</h3>

                <p>
                  El código vence después de 15 minutos
                  y solamente el último PIN será válido.
                </p>
              </div>
            </header>

            <button
              className="profile-password-send"
              type="button"
              disabled={operacionEnProceso}
              aria-busy={solicitandoPin}
              onClick={manejarSolicitudPin}
            >
              {pinSolicitado ? (
                <RefreshCw aria-hidden="true" />
              ) : (
                <Mail aria-hidden="true" />
              )}

              {solicitandoPin
                ? 'Enviando PIN...'
                : pinSolicitado
                  ? 'Reenviar PIN'
                  : 'Enviar PIN'}
            </button>

            {mensajePin && (
              <div
                className="profile-password-pin-message"
                role="status"
                aria-live="polite"
              >
                <CircleCheck aria-hidden="true" />
                <span>{mensajePin}</span>
              </div>
            )}
          </section>

          {/* Segundo paso: PIN y contraseña nueva. */}
          <fieldset
            className="profile-password-fields"
            disabled={
              !pinSolicitado ||
              operacionEnProceso
            }
          >
            <section className="profile-password-step">
              <header className="profile-password-step__header">
                <span>2</span>

                <div>
                  <h3>
                    Establece tu contraseña
                  </h3>

                  <p>
                    Escribe el PIN recibido y crea una
                    contraseña segura.
                  </p>
                </div>
              </header>

              <div className="profile-password-pin">
                <div className="profile-password-field-heading">
                  <KeyRound aria-hidden="true" />

                  <div>
                    <label>
                      PIN de seguridad
                    </label>

                    <p>
                      Código de seis dígitos.
                    </p>
                  </div>
                </div>

                <OTPInput
                  maxLength={6}
                  value={pin}
                  onChange={setPin}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="PIN de seguridad de seis dígitos"
                  containerClassName="profile-password-pin-input"
                  render={({ slots }) => (
                    <>
                      <div className="profile-password-pin-group">
                        {slots
                          .slice(0, 3)
                          .map(
                            (
                              slot,
                              index,
                            ) => (
                              <PinSlot
                                key={`profile-password-pin-one-${index}`}
                                {...slot}
                              />
                            ),
                          )}
                      </div>

                      <span
                        className="profile-password-pin-separator"
                        aria-hidden="true"
                      >
                        –
                      </span>

                      <div className="profile-password-pin-group">
                        {slots
                          .slice(3)
                          .map(
                            (
                              slot,
                              index,
                            ) => (
                              <PinSlot
                                key={`profile-password-pin-two-${index}`}
                                {...slot}
                              />
                            ),
                          )}
                      </div>
                    </>
                  )}
                />
              </div>

              <div className="profile-password-grid">
                <div className="profile-password-field">
                  <label htmlFor="profile-new-password">
                    Nueva contraseña
                  </label>

                  <div className="profile-password-input">
                    <LockKeyhole
                      aria-hidden="true"
                    />

                    <input
                      id="profile-new-password"
                      type={
                        mostrarNuevaContrasena
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      placeholder="Ingresa la contraseña"
                      value={nuevaContrasena}
                      onChange={(event) => {
                        setNuevaContrasena(
                          event.target.value,
                        )

                        if (errorModal) {
                          setErrorModal('')
                        }
                      }}
                    />

                    <button
                      type="button"
                      aria-label={
                        mostrarNuevaContrasena
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      aria-pressed={
                        mostrarNuevaContrasena
                      }
                      onClick={() =>
                        setMostrarNuevaContrasena(
                          (valor) => !valor,
                        )
                      }
                    >
                      {mostrarNuevaContrasena ? (
                        <EyeOff
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <div className="profile-password-field">
                  <label htmlFor="profile-confirm-password">
                    Confirmar contraseña
                  </label>

                  <div className="profile-password-input">
                    <LockKeyhole
                      aria-hidden="true"
                    />

                    <input
                      id="profile-confirm-password"
                      type={
                        mostrarConfirmacion
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      value={
                        confirmacionContrasena
                      }
                      onChange={(event) => {
                        setConfirmacionContrasena(
                          event.target.value,
                        )

                        if (errorModal) {
                          setErrorModal('')
                        }
                      }}
                    />

                    <button
                      type="button"
                      aria-label={
                        mostrarConfirmacion
                          ? 'Ocultar confirmación'
                          : 'Mostrar confirmación'
                      }
                      aria-pressed={
                        mostrarConfirmacion
                      }
                      onClick={() =>
                        setMostrarConfirmacion(
                          (valor) => !valor,
                        )
                      }
                    >
                      {mostrarConfirmacion ? (
                        <EyeOff
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <aside
                className="profile-password-security"
                aria-label="Requisitos de seguridad"
              >
                <h4>
                  Requisitos de seguridad
                </h4>

                <ul>
                  <RequisitoContrasena
                    cumplido={
                      requisitos.longitud
                    }
                  >
                    Mínimo 8 caracteres
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={
                      requisitos.mayuscula
                    }
                  >
                    Al menos una mayúscula
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={
                      requisitos.minuscula
                    }
                  >
                    Al menos una minúscula
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={
                      requisitos.numero
                    }
                  >
                    Al menos un número
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={
                      requisitos.coinciden
                    }
                  >
                    Las contraseñas coinciden
                  </RequisitoContrasena>
                </ul>
              </aside>
            </section>
          </fieldset>

          {errorModal && (
            <div
              className="profile-password-error"
              role="alert"
            >
              <ShieldCheck aria-hidden="true" />
              <span>{errorModal}</span>
            </div>
          )}

          <footer className="profile-password-modal__actions">
            <button
              className="profile-password-cancel"
              type="button"
              disabled={operacionEnProceso}
              onClick={cerrarModal}
            >
              Cancelar
            </button>

            <button
              className="profile-password-submit"
              type="submit"
              disabled={
                !pinSolicitado ||
                operacionEnProceso ||
                pin.length !== 6 ||
                !requisitosCumplidos
              }
              aria-busy={
                actualizandoContrasena
              }
            >
              <ShieldCheck aria-hidden="true" />

              {actualizandoContrasena
                ? 'Actualizando...'
                : 'Actualizar contraseña'}
            </button>
          </footer>
        </form>
      </article>
    </dialog>
  )
}

function Profile() {
  const [
    modalContrasenaAbierto,
    setModalContrasenaAbierto,
  ] = useState(false)

  /*
   * Obtenemos la información compartida
   * por UsuarioProvider.
   */
  const {
    usuario,
    cargandoUsuario,
    errorUsuario,
    cargarUsuario,
  } = useUsuario()

  const credenciales =
    usuario?.credenciales

  const datosPersonales =
    usuario?.datosPersonales

  const datosBecario =
    usuario?.datosBecario

  /*
   * El número de cuenta utilizado por el modal procede
   * de la sesión y no puede editarse desde el formulario.
   */
  const numeroCuentaSesion =
    obtenerNumeroCuentaSesion()

  const rol = prepararEtiqueta(
    credenciales?.rol,
  )

  const estadoUsuario =
    credenciales?.activo
      ? `${rol} activo`
      : `${rol} inactivo`

  const estadoBeca = prepararEtiqueta(
    datosBecario?.estadoBeca ||
      (credenciales?.activo
        ? 'activo'
        : 'inactivo'),
  )

  const horasFaltantes = Math.max(
    0,
    datosBecario?.horasFaltantes ?? 0,
  )

  const descripcionEstadoBeca =
    horasFaltantes === 0
      ? 'Actualmente no tienes horas faltantes registradas.'
      : `Actualmente tienes ${horasFaltantes} ${
          horasFaltantes === 1
            ? 'hora pendiente'
            : 'horas pendientes'
        } por completar.`

  function reintentarCarga() {
    cargarUsuario().catch(() => undefined)
  }

  return (
    <>
      <div className="app-layout">
        <AppSidebar />

        <section className="app-content">
          <header className="app-topbar">
            <div className="app-topbar__brand">
              <GraduationCap aria-hidden="true" />

              <strong>ASEBEP</strong>
            </div>

            <span className="app-topbar__section">
              Mi perfil
            </span>
          </header>

          <main className="profile-page">
            <header className="profile-heading">
              <p>Perfil del estudiante</p>

              <h1>Mi perfil</h1>
            </header>

            {cargandoUsuario && (
              <section
                className="profile-identity"
                role="status"
                aria-live="polite"
              >
                <div className="profile-identity__information">
                  <div className="profile-name">
                    <h2>
                      Cargando información
                    </h2>
                  </div>

                  <p>
                    Estamos consultando los datos de
                    tu perfil.
                  </p>
                </div>
              </section>
            )}

            {!cargandoUsuario &&
              errorUsuario && (
                <section
                  className="profile-identity"
                  role="alert"
                >
                  <div className="profile-identity__information">
                    <div className="profile-name">
                      <h2>
                        No pudimos cargar tu perfil
                      </h2>
                    </div>

                    <p>
                      {errorUsuario.message ||
                        'Ocurrió un error al consultar tus datos.'}
                    </p>
                  </div>

                  <div className="profile-actions">
                    <button
                      className="profile-button profile-button--primary"
                      type="button"
                      onClick={reintentarCarga}
                    >
                      Intentar nuevamente
                    </button>
                  </div>
                </section>
              )}

            {!cargandoUsuario &&
              !errorUsuario &&
              !usuario && (
                <section
                  className="profile-identity"
                  role="status"
                >
                  <div className="profile-identity__information">
                    <div className="profile-name">
                      <h2>
                        Información no disponible
                      </h2>
                    </div>

                    <p>
                      No encontramos datos de perfil
                      para mostrar en este momento.
                    </p>
                  </div>
                </section>
              )}

            {!cargandoUsuario &&
              !errorUsuario &&
              usuario && (
                <>
                  {/* Tarjeta principal de identidad. */}
                  <section
                    className="profile-identity"
                    aria-labelledby="student-name"
                  >
                    <div
                      className="profile-avatar"
                      aria-hidden="true"
                    >
                      <UserRound />
                    </div>

                    <div className="profile-identity__information">
                      <div className="profile-name">
                        <h2 id="student-name">
                          {mostrarDato(
                            datosPersonales
                              ?.nombreCompleto,
                          )}
                        </h2>

                        <span>
                          <ShieldCheck
                            aria-hidden="true"
                          />

                          {estadoUsuario}
                        </span>
                      </div>

                      <p>
                        <IdCard
                          aria-hidden="true"
                        />

                        N.º{' '}
                        {mostrarDato(
                          datosPersonales
                            ?.numeroCuenta,
                        )}
                      </p>
                    </div>

                    <div className="profile-actions">
                      <button
                        className="profile-button profile-button--primary"
                        type="button"
                        onClick={() =>
                          setModalContrasenaAbierto(
                            true,
                          )
                        }
                      >
                        <LockKeyhole
                          aria-hidden="true"
                        />
                        Cambiar contraseña
                      </button>
                    </div>
                  </section>

                  <section className="profile-grid">
                    <article className="profile-card">
                      <header className="profile-card__header">
                        <UserRound
                          aria-hidden="true"
                        />

                        <h2>Datos personales</h2>
                      </header>

                      <dl className="profile-details">
                        <div>
                          <dt>Correo personal</dt>

                          <dd>
                            <Mail
                              aria-hidden="true"
                            />

                            {mostrarDato(
                              datosPersonales
                                ?.correoPersonal,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Teléfono</dt>

                          <dd>
                            <Phone
                              aria-hidden="true"
                            />

                            {mostrarDato(
                              datosPersonales
                                ?.telefono,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </article>

                    <article className="profile-card">
                      <header className="profile-card__header">
                        <School
                          aria-hidden="true"
                        />

                        <h2>
                          Información académica
                        </h2>
                      </header>

                      <dl className="profile-details profile-details--academic">
                        <div>
                          <dt>Carrera</dt>

                          <dd>
                            {mostrarDato(
                              datosPersonales
                                ?.carrera,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Año de inicio</dt>

                          <dd>
                            {mostrarDato(
                              datosBecario
                                ?.anioInicio,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Periodo de inicio</dt>

                          <dd>
                            {mostrarDato(
                              datosBecario
                                ?.periodoInicio,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Correo institucional
                          </dt>

                          <dd>
                            <Mail
                              aria-hidden="true"
                            />

                            {mostrarDato(
                              datosPersonales
                                ?.correoInstitucional,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  </section>

                  <section className="scholarship-status">
                    <div className="scholarship-status__icon">
                      <GraduationCap
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <h2>
                        Estado de la beca:{' '}
                        {estadoBeca}
                      </h2>

                      <p>
                        {descripcionEstadoBeca}
                      </p>
                    </div>

                    <ShieldCheck
                      className="scholarship-status__watermark"
                      aria-hidden="true"
                    />
                  </section>
                </>
              )}
          </main>

          <MobileNavigation />
        </section>
      </div>

      {modalContrasenaAbierto && (
        <CambioContrasenaModal
          numeroCuenta={numeroCuentaSesion}
          correoInstitucional={
            datosPersonales
              ?.correoInstitucional
          }
          onCerrar={() =>
            setModalContrasenaAbierto(false)
          }
        />
      )}
    </>
  )
}

export default Profile