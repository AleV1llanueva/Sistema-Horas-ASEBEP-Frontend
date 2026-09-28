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
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  School,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'

import {
  Toaster as SonnerToaster,
} from 'sonner'

import {
  useUsuario,
} from '../../../hooks/useUsuario.js'

import {
  actualizarContrasenaConPin,
  solicitarPinCambioContrasena,
} from '../../../services/authService.js'

import {
  limpiarNotificaciones,
  notificarError,
  notificarExito,
  notificarInformacion,
} from '../../../services/notificationService.js'

import {
  obtenerNumeroCuentaSesion,
} from '../../../services/sesionService.js'

import '../styles/AdminPrincipalProfile.css'

const ID_TOASTER_CAMBIO_CONTRASENA_ADMIN =
  'toaster-cambio-contrasena-admin'

const ID_SOLICITUD_PIN_ADMIN =
  'solicitud-pin-admin'

const ID_CAMBIO_CONTRASENA_ADMIN =
  'cambio-contrasena-admin'

const ID_EXITO_CAMBIO_CONTRASENA_ADMIN =
  'exito-cambio-contrasena-admin'

// Prepara estados y roles antes de mostrarlos.
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

// Evita dejar espacios vacíos en las tarjetas.
function mostrarDato(valor) {
  const texto = String(valor ?? '').trim()

  return texto || 'No disponible'
}

// Representa visualmente cada número del PIN.
function PinSlot({
  char,
  hasFakeCaret,
  isActive,
}) {
  const clase = isActive
    ? (
      'admin-principal-profile-password__pin-slot ' +
      'admin-principal-profile-password__pin-slot--active'
    )
    : 'admin-principal-profile-password__pin-slot'

  return (
    <div className={clase}>
      {char}

      {hasFakeCaret && (
        <span
          className="admin-principal-profile-password__pin-caret"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// Muestra el estado de cada requisito de seguridad.
function RequisitoContrasena({
  cumplido,
  children,
}) {
  const clase = cumplido
    ? (
      'admin-principal-profile-password__requirement ' +
      'admin-principal-profile-password__requirement--complete'
    )
    : 'admin-principal-profile-password__requirement'

  return (
    <li className={clase}>
      {cumplido ? (
        <CircleCheck aria-hidden="true" />
      ) : (
        <Circle aria-hidden="true" />
      )}

      <span>{children}</span>
    </li>
  )
}

// Convierte los errores del backend en mensajes más claros.
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

function CambioContrasenaAdminModal({
  numeroCuenta,
  correoInstitucional,
  onCerrar,
}) {
  const dialogRef = useRef(null)

  const [
    pinSolicitado,
    setPinSolicitado,
  ] = useState(false)

  const [
    pin,
    setPin,
  ] = useState('')

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
   * El dialog nativo mantiene el foco dentro del modal
   * y permite controlar su cierre mediante Escape.
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
        ID_SOLICITUD_PIN_ADMIN,
      )

      limpiarNotificaciones(
        ID_CAMBIO_CONTRASENA_ADMIN,
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
    Object.values(requisitos).every(
      Boolean,
    )

  const operacionEnProceso =
    solicitandoPin ||
    actualizandoContrasena

  function cerrarModal() {
    if (operacionEnProceso) {
      return
    }

    onCerrar()
  }

  function manejarCancelacion(event) {
    event.preventDefault()
    cerrarModal()
  }

  function manejarClicFondo(event) {
    if (event.target === dialogRef.current) {
      cerrarModal()
    }
  }

  async function manejarSolicitudPin() {
    if (!numeroCuenta) {
      const mensaje =
        'No existe un número de cuenta válido en la sesión.'

      setErrorModal(mensaje)

      notificarError({
        id: ID_SOLICITUD_PIN_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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

      // El PIN nuevo reemplaza al solicitado anteriormente.
      setPin('')
      setPinSolicitado(true)
      setMensajePin(mensaje)

      notificarInformacion({
        id: ID_SOLICITUD_PIN_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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
        id: ID_SOLICITUD_PIN_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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
        id: ID_CAMBIO_CONTRASENA_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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
        id: ID_CAMBIO_CONTRASENA_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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
       * Cerramos el modal sin finalizar la sesión.
       * El JWT actual continúa siendo válido.
       */
      onCerrar()

      notificarExito({
        id:
          ID_EXITO_CAMBIO_CONTRASENA_ADMIN,
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
        id: ID_CAMBIO_CONTRASENA_ADMIN,
        toasterId:
          ID_TOASTER_CAMBIO_CONTRASENA_ADMIN,
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
      className="admin-principal-profile-password__dialog"
      ref={dialogRef}
      aria-labelledby="admin-password-title"
      aria-describedby="admin-password-description"
      onCancel={manejarCancelacion}
      onClick={manejarClicFondo}
    >
      <SonnerToaster
        id={ID_TOASTER_CAMBIO_CONTRASENA_ADMIN}
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
            border:
              '1px solid #dbe2e8',
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

      <article className="admin-principal-profile-password__modal">
        <header className="admin-principal-profile-password__header">
          <div className="admin-principal-profile-password__heading">
            <span
              className="admin-principal-profile-password__icon"
              aria-hidden="true"
            >
              <LockKeyhole />
            </span>

            <div>
              <p>Seguridad de la cuenta</p>

              <h2 id="admin-password-title">
                Cambiar contraseña
              </h2>

              <span id="admin-password-description">
                Confirma tu identidad mediante el PIN
                enviado a tu correo institucional.
              </span>
            </div>
          </div>

          <button
            className="admin-principal-profile-password__close"
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
          className="admin-principal-profile-password__form"
          onSubmit={manejarCambioContrasena}
          noValidate
        >
          {/* Datos de la cuenta autenticada. */}
          <section className="admin-principal-profile-password__account">
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

          {/* Primero se solicita el PIN de seguridad. */}
          <section className="admin-principal-profile-password__step">
            <header className="admin-principal-profile-password__step-header">
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
              className="admin-principal-profile-password__send"
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
                className="admin-principal-profile-password__pin-message"
                role="status"
                aria-live="polite"
              >
                <CircleCheck aria-hidden="true" />
                <span>{mensajePin}</span>
              </div>
            )}
          </section>

          {/* El segundo paso se habilita después de enviar el PIN. */}
          <fieldset
            className="admin-principal-profile-password__fields"
            disabled={
              !pinSolicitado ||
              operacionEnProceso
            }
          >
            <section className="admin-principal-profile-password__step">
              <header className="admin-principal-profile-password__step-header">
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

              <div className="admin-principal-profile-password__pin">
                <div className="admin-principal-profile-password__field-heading">
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
                  onChange={(valor) => {
                    setPin(valor)

                    if (errorModal) {
                      setErrorModal('')
                    }
                  }}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="PIN de seguridad de seis dígitos"
                  containerClassName="admin-principal-profile-password__pin-input"
                  render={({ slots }) => (
                    <>
                      <div className="admin-principal-profile-password__pin-group">
                        {slots
                          .slice(0, 3)
                          .map((slot, index) => (
                            <PinSlot
                              key={`admin-pin-one-${index}`}
                              {...slot}
                            />
                          ))}
                      </div>

                      <span
                        className="admin-principal-profile-password__pin-separator"
                        aria-hidden="true"
                      >
                        –
                      </span>

                      <div className="admin-principal-profile-password__pin-group">
                        {slots
                          .slice(3)
                          .map((slot, index) => (
                            <PinSlot
                              key={`admin-pin-two-${index}`}
                              {...slot}
                            />
                          ))}
                      </div>
                    </>
                  )}
                />
              </div>

              <div className="admin-principal-profile-password__grid">
                <div className="admin-principal-profile-password__field">
                  <label htmlFor="admin-new-password">
                    Nueva contraseña
                  </label>

                  <div className="admin-principal-profile-password__input">
                    <LockKeyhole aria-hidden="true" />

                    <input
                      id="admin-new-password"
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
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="admin-principal-profile-password__field">
                  <label htmlFor="admin-confirm-password">
                    Confirmar contraseña
                  </label>

                  <div className="admin-principal-profile-password__input">
                    <LockKeyhole aria-hidden="true" />

                    <input
                      id="admin-confirm-password"
                      type={
                        mostrarConfirmacion
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      value={confirmacionContrasena}
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
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <aside
                className="admin-principal-profile-password__security"
                aria-label="Requisitos de seguridad"
              >
                <h4>
                  Requisitos de seguridad
                </h4>

                <ul>
                  <RequisitoContrasena
                    cumplido={requisitos.longitud}
                  >
                    Mínimo 8 caracteres
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={requisitos.mayuscula}
                  >
                    Al menos una mayúscula
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={requisitos.minuscula}
                  >
                    Al menos una minúscula
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={requisitos.numero}
                  >
                    Al menos un número
                  </RequisitoContrasena>

                  <RequisitoContrasena
                    cumplido={requisitos.coinciden}
                  >
                    Las contraseñas coinciden
                  </RequisitoContrasena>
                </ul>
              </aside>
            </section>
          </fieldset>

          {errorModal && (
            <div
              className="admin-principal-profile-password__error"
              role="alert"
            >
              <ShieldCheck aria-hidden="true" />
              <span>{errorModal}</span>
            </div>
          )}

          <footer className="admin-principal-profile-password__actions">
            <button
              className="admin-principal-profile-password__cancel"
              type="button"
              disabled={operacionEnProceso}
              onClick={cerrarModal}
            >
              Cancelar
            </button>

            <button
              className="admin-principal-profile-password__submit"
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

function AdminPrincipalProfile() {
  const [
    modalContrasenaAbierto,
    setModalContrasenaAbierto,
  ] = useState(false)

  /*
   * UsuarioProvider y UsuarioProviderPrueba entregan
   * la misma estructura para los dos modos de trabajo.
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

  const numeroCuenta =
    datosPersonales?.numeroCuenta ||
    obtenerNumeroCuentaSesion()

  const rol =
    prepararEtiqueta(
      credenciales?.rol,
    )

  const estadoUsuario =
    credenciales?.activo
      ? `${rol} activo`
      : `${rol} inactivo`

  const estadoCuentaAdministrativa =
    credenciales?.activo
        ? 'Activa'
        : 'Inactiva'

  function reintentarCarga() {
    cargarUsuario().catch(
      () => undefined,
    )
  }

  return (
    <>
      {/*
       * AdminLayout ya contiene el menú lateral,
       * el encabezado y la navegación móvil.
       */}
      <div className="admin-principal-profile">
        <header className="admin-principal-profile__heading">
          <p>Perfil administrativo</p>
          <h1>Mi perfil</h1>
        </header>

        {cargandoUsuario && (
          <section
            className="admin-principal-profile__identity"
            role="status"
            aria-live="polite"
          >
            <div className="admin-principal-profile__identity-information">
              <div className="admin-principal-profile__name">
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
              className="admin-principal-profile__identity"
              role="alert"
            >
              <div className="admin-principal-profile__identity-information">
                <div className="admin-principal-profile__name">
                  <h2>
                    No pudimos cargar tu perfil
                  </h2>
                </div>

                <p>
                  {errorUsuario.message ||
                    'Ocurrió un error al consultar tus datos.'}
                </p>
              </div>

              <div className="admin-principal-profile__actions">
                <button
                  className="admin-principal-profile__button admin-principal-profile__button--primary"
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
              className="admin-principal-profile__identity"
              role="status"
            >
              <div className="admin-principal-profile__identity-information">
                <div className="admin-principal-profile__name">
                  <h2>
                    Información no disponible
                  </h2>
                </div>

                <p>
                  No encontramos información de
                  perfil para mostrar.
                </p>
              </div>
            </section>
          )}

        {!cargandoUsuario &&
          !errorUsuario &&
          usuario && (
            <>
              {/* Identidad de la cuenta administrativa. */}
              <section
                className="admin-principal-profile__identity"
                aria-labelledby="admin-profile-name"
              >
                <div
                  className="admin-principal-profile__avatar"
                  aria-hidden="true"
                >
                  <UserRound />
                </div>

                <div className="admin-principal-profile__identity-information">
                  <div className="admin-principal-profile__name">
                    <h2 id="admin-profile-name">
                      {mostrarDato(
                        datosPersonales
                          ?.nombreCompleto,
                      )}
                    </h2>

                    <span>
                      <ShieldCheck aria-hidden="true" />
                      {estadoUsuario}
                    </span>
                  </div>

                  <p>
                    <IdCard aria-hidden="true" />

                    N.º{' '}
                    {mostrarDato(numeroCuenta)}
                  </p>
                </div>

                <div className="admin-principal-profile__actions">
                  <button
                    className="admin-principal-profile__button admin-principal-profile__button--primary"
                    type="button"
                    onClick={() =>
                      setModalContrasenaAbierto(
                        true,
                      )
                    }
                  >
                    <LockKeyhole aria-hidden="true" />
                    Cambiar contraseña
                  </button>
                </div>
              </section>

              <section className="admin-principal-profile__grid">
                <article className="admin-principal-profile__card">
                  <header className="admin-principal-profile__card-header">
                    <UserRound aria-hidden="true" />
                    <h2>Datos personales</h2>
                  </header>

                  <dl className="admin-principal-profile__details">
                    <div>
                      <dt>Correo personal</dt>

                      <dd>
                        <Mail aria-hidden="true" />

                        {mostrarDato(
                          datosPersonales
                            ?.correoPersonal,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Teléfono</dt>

                      <dd>
                        <Phone aria-hidden="true" />

                        {mostrarDato(
                          datosPersonales
                            ?.telefono,
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>

                <article className="admin-principal-profile__card">
                  <header className="admin-principal-profile__card-header">
                    <School aria-hidden="true" />

                    <h2>
                      Información académica
                    </h2>
                  </header>

                  <dl className="admin-principal-profile__details admin-principal-profile__details--academic">
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
                        <Mail aria-hidden="true" />

                        {mostrarDato(
                          datosPersonales
                            ?.correoInstitucional,
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              </section>

              {/* Los administradores conservan su información de becario. */}
              <section className="admin-principal-profile__scholarship">
                <div className="admin-principal-profile__scholarship-icon">
                    <GraduationCap aria-hidden="true" />
                </div>

                <div>
                    <h2>
                    Cuenta administrativa:{' '}
                    {estadoCuentaAdministrativa}
                    </h2>

                    <p>
                    Formas parte de la asociación ASEBEP.
                    </p>
                </div>

                <ShieldCheck
                    className="admin-principal-profile__scholarship-watermark"
                    aria-hidden="true"
                />
                </section>
            </>
          )}
      </div>

      {modalContrasenaAbierto && (
        <CambioContrasenaAdminModal
          numeroCuenta={numeroCuenta}
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

export default AdminPrincipalProfile