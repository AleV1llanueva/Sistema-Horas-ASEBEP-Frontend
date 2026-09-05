import { useState } from 'react'
import {
    OTPInput,
    REGEXP_ONLY_DIGITS,
} from 'input-otp'

import {
    ArrowLeft,
    Circle,
    CircleCheck,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    LockKeyhole,
    Mail,
    Pencil,
    RefreshCw,
    ShieldCheck,
    UserRound,
} from 'lucide-react'

import {
    Link,
    useNavigate,
} from 'react-router'

import {
    activarCuentaPrimerIngreso,
    solicitarPinPrimerIngreso,
} from '../services/firstAccessService.js'

import {
    notificarError,
    notificarExito,
} from '../services/notificationService.js'

import '../styles/FirstAccess.css'

const ID_SOLICITUD_PIN = 'primer-ingreso-solicitud-pin'
const ID_ACTIVACION_CUENTA = 'primer-ingreso-activacion'

/*
* Cada espacio representa visualmente un digito.
* input-otp mantiene un unico campo accesible.
*/
function PinSlot({
    char,
    hasFakeCaret,
    isActive,
}) {
    const clase = isActive
        ? 'first-access-pin-slot first-access-pin-slot--active'
        : 'first-access-pin-slot'

        return (
            <div className={clase}>
                {char}

                {hasFakeCaret && (
                    <span className="first-access-pin-slot__caret" aria-hidden="true" />
                )}
            </div>
        )
}

// Muestra visualmente si un requisito de la contraseña ya fue cumplido.
function Requisito({
    cumplido,
    children,
}) {
    return (
        <li className={
            cumplido
                ? 'first-access-requirement first-access-requirement--complete'
                : 'first-access-requirement'
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
* Convierte los posibles errores al solicitar
* el PIN en mensajes comprensibles.
*/
function obtenerErrorSolicitud(error) {
    const mensajeServidor = String(
        error?.message || '',
    )

    const mensajeNormalizado = mensajeServidor.toLowerCase()

    if (
        error?.status === 400 && mensajeNormalizado.includes('activada')
    ) {
        return (
            'Esta cuenta ya fue activada. ' +
            'Puedes regresar e iniciar sesión normalmente.'
        )
    }

    if (error?.status === 404) {
        return (
            'No encontramos un estudiante registrado ' +
            'con este número de cuenta.'
        )
    }

    if (error?.status === 429) {
        return (
            mensajeServidor ||
            'Alcanzaste el límite de PIN disponibles. Intenta nuevamente más tarde.'
        )
    }

    if (error?.status === 422) {
        return (
            'El servidor no pudo procesar el número de cuenta. ' +
            'Verifica que contenga exactamente 11 dígitos.'
        )
    }
    if (error?.status === 0 || !error?.status) {
        return (
            'No fue posible conectarse con el servidor. ' +
            'Verifica tu conexión e intenta de nuevo.'
        )
    }

    return (
        mensajeServidor || 'No fue posible enviar el PIN.'
    )
}

/*
* Convierte los errores de activacion en mensajes especificos para el estudiante.
*/
function obtenerErrorActivacion(error) {
    const mensajeServidor = String(
        error?.message || '',
    )

    if (error?.status === 400) {
        return (
            mensajeServidor || 'El PIN no es válido o ya expiró.'
        )
    }

    if (error?.status === 404) {
        return (
            'No encontramos la cuenta que intentas activar.'
        )
    }

    if (error?.status === 422) {
        return (
            mensajeServidor || 'Revisa el PIN y los requisitos de la contraseña.'
        )
    }
    
    if (error?.status === 0 || !error?.status) {
        return (
            'No fue posible conectarse con el servidor. ' +
            'Verifica tu conexión e intenta nuevamente.'
        )
    }

    return (
        mensajeServidor || 'No fue posible activar la cuenta.'
    )
}

function FirstAccess() {
    const navigate = useNavigate()
    const [numeroCuenta, setNumeroCuenta] = useState('')
    const [pin, setPin] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [confirmacion, setConfirmacion] = useState('')

    const [
        mostrarContrasena,
        setMostrarContrasena,
    ] = useState(false)

    const [
        mostrarConfirmacion,
        setMostrarConfirmacion,
    ] = useState(false)

    const [
        pinSolicitado,
        setPinSolicitado,
    ] = useState(false)

    const [
        solicitandoPin,
        setSolicitandoPin,
    ] = useState(false)

    const [
        activandoCuenta,
        setActivandoCuenta,
    ] = useState(false)

    const [
        errorNumeroCuenta,
        setErrorNumeroCuenta,
    ] = useState('')

    /*
    * Estas reglas coinciden con las validaciones del backend.
    */
   const requisitos = {
        longitud: contrasena.length >=8,

        mayusculaMinuscula:
        /[A-Z]/.test(contrasena) &&
        /[a-z]/.test(contrasena),

        numero: /\d/.test(contrasena),

        coinciden:
            Boolean(contrasena) && contrasena === confirmacion,
   }

   const totalRequisitos = Object.values(requisitos).filter(Boolean).length

   const requisitosCumplidos = totalRequisitos === 4
   const porcentajeFortaleza = (totalRequisitos / 4) * 100

   let etiquetaFortaleza = 'Sin evaluar'

   if (totalRequisitos === 1) {
    etiquetaFortaleza = 'Débil'
   }

   if (totalRequisitos === 2) {
    etiquetaFortaleza = 'Media'
   }

   if (totalRequisitos === 3) {
    etiquetaFortaleza = 'Buena'
   }

   if (totalRequisitos === 4) {
    etiquetaFortaleza = 'Fuerte'
   }

   // Valida el numero de cuenta antes de solicitar el envio del PIN.
   function validarNumeroCuenta() {
    const numeroNormalizado = numeroCuenta.trim()

    if (!numeroNormalizado) {
        return 'Ingresa tu número de cuenta.'
    }

    if (!/^\d+$/.test(numeroNormalizado)) {
        return (
            'El número de cuenta solo puede ' +
            'contener números.'
        )
    }

    if (!/^\d{11}$/.test(numeroNormalizado)) {
        return (
            'El número de cuenta debe tener ' +
            'exactamente 11 dígitos.'
        )
    }

    return ''
   }

   // Solicita o reenvia el PIN. El correo ya esta registrado en la BD.
   async function manejarSolicitudPin(event) {
    event.preventDefault()

    if (solicitandoPin) {
        return
    }

    const nuevoError = validarNumeroCuenta()

    if (nuevoError) {
        setErrorNumeroCuenta(nuevoError)
        return
    }

    setErrorNumeroCuenta('')
    setSolicitandoPin(true)

    try {
        const respuesta =
            await solicitarPinPrimerIngreso({
                numeroCuenta,
            })

            // Todo PIN nuevo invalida el codigo anterior, por eso limpiamos el campo despues del envio.
            setPin('')
            setPinSolicitado(true)

            notificarExito({
                id: ID_SOLICITUD_PIN,
                titulo: 'PIN enviado',
                descripcion: respuesta?.mensaje || 'Revisa tu correo institucional para continuar.',
            })
    } catch (error) {
        notificarError({
            id: ID_SOLICITUD_PIN,
            titulo: 'No fue posible enviar el PIN',
            descripcion: obtenerErrorSolicitud(error),
        })
    } finally {
        setSolicitandoPin(false)
    }
    }

    // Permite corregir el numero de cuenta. Tambien elimina la informacion sensible escrita.
    function cambiarNumeroCuenta() {
        setPinSolicitado(false)
        setPin('')
        setContrasena('')
        setConfirmacion('')
        setMostrarContrasena(false)
        setMostrarConfirmacion(false)
    }

    // Envia el una sola operacion el PIN y la contraseña. El backend valida el PIN y activa la cuenta.
    async function manejarActivacion(event) {
        event.preventDefault()

        if (
            activandoCuenta || !pinSolicitado
        ) {
            return
        }

        if (!/^\d{6}$/.test(pin)) {
            notificarError({
                id: ID_ACTIVACION_CUENTA,
                titulo: 'PIN incompleto',
                descripcion: 'Ingresa los seis dígitos enviados a tu correo.',
            })

            return
        }
        if (!requisitosCumplidos) {
            notificarError({
                id: ID_ACTIVACION_CUENTA,
                titulo: 'Revisa tu contraseña',
                descripcion: 'Debes cumplir todos los requisitos antes de activar tu cuenta.',
            })

            return
        }

        setActivandoCuenta(true)

        try {
            const respuesta =
                await activarCuentaPrimerIngreso({
                    numeroCuenta,
                    pin,
                    nuevaContrasena: contrasena,
                })

                // Eliminamos la informacion sensible antes de abandonar la pantalla.
                setPin('')
                setContrasena('')
                setConfirmacion('')

                notificarExito({
                    id: ID_ACTIVACION_CUENTA,
                    titulo: 'Cuenta activada',
                    descripcion: respuesta?.mensaje || 'Ya puedes iniciar sesión con tu nueva contraseña.',
                })

                // replace evita regresar al formulario ya completado.
                navigate('/login', {
                    replace: true,
                })
    } catch (error) {
        notificarError({
            id: ID_ACTIVACION_CUENTA,
            titulo: 'No fue posible activar la cuenta',
            descripcion: obtenerErrorActivacion(error),
        })
    } finally {
        setActivandoCuenta(false)
    }
   }
   return (
    <div className="first-access-page">
      <header className="first-access-topbar">
        <Link
          className="first-access-brand"
          to="/login"
          aria-label="Volver al inicio de sesión"
        >
          <span className="first-access-brand__icon">
            <GraduationCap aria-hidden="true" />
          </span>

          <strong>ASEBEP</strong>
        </Link>

        <span>Activación de cuenta</span>
      </header>

      <main className="first-access-main">
        <Link
          className="first-access-back"
          to="/login"
        >
          <ArrowLeft aria-hidden="true" />
          Volver al inicio de sesión
        </Link>

        <header className="first-access-heading">
          <p>Primer ingreso</p>

          <h1>Activa tu cuenta</h1>

          <span>
            Confirma tu identidad y crea la contraseña
            que utilizarás para ingresar al portal.
          </span>
        </header>

        {/* Primer paso: solicitar el PIN. */}
        <section
          className="first-access-card"
          aria-labelledby="account-title"
        >
          <header className="first-access-card__header">
            <span className="first-access-step">
              1
            </span>

            <div>
              <h2 id="account-title">
                Confirma tu número de cuenta
              </h2>

              <p>
                Enviaremos un PIN al correo institucional
                registrado en el sistema.
              </p>
            </div>
          </header>

          <div className="first-access-card__body">
            <form
              className="first-access-account-form"
              onSubmit={manejarSolicitudPin}
              noValidate
            >
              <div className="first-access-field">
                <label htmlFor="first-access-account">
                  Número de cuenta
                </label>

                <div className="first-access-input">
                  <UserRound aria-hidden="true" />

                  <input
                    id="first-access-account"
                    type="text"
                    inputMode="numeric"
                    autoComplete="username"
                    maxLength={11}
                    placeholder="Ej. 20261000001"
                    value={numeroCuenta}
                    disabled={
                      pinSolicitado ||
                      solicitandoPin
                    }
                    aria-invalid={Boolean(
                      errorNumeroCuenta,
                    )}
                    aria-describedby={
                      errorNumeroCuenta
                        ? 'first-access-account-error'
                        : undefined
                    }
                    onChange={(event) => {
                      setNumeroCuenta(
                        event.target.value,
                      )

                      if (errorNumeroCuenta) {
                        setErrorNumeroCuenta('')
                      }
                    }}
                  />
                </div>

                {errorNumeroCuenta && (
                  <small
                    id="first-access-account-error"
                    className="first-access-field-error"
                    role="alert"
                  >
                    {errorNumeroCuenta}
                  </small>
                )}
              </div>

              {!pinSolicitado && (
                <button
                  className="first-access-button first-access-button--secondary"
                  type="submit"
                  disabled={solicitandoPin}
                  aria-busy={solicitandoPin}
                >
                  <Mail aria-hidden="true" />

                  {solicitandoPin
                    ? 'Enviando PIN...'
                    : 'Enviar PIN'}
                </button>
              )}
            </form>

            {pinSolicitado && (
              <div
                className="first-access-account-confirmed"
                role="status"
              >
                <div>
                  <CircleCheck aria-hidden="true" />

                  <p>
                    <strong>PIN enviado</strong>

                    <span>
                      Revisa el correo institucional
                      asociado a tu cuenta.
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    solicitandoPin ||
                    activandoCuenta
                  }
                  onClick={cambiarNumeroCuenta}
                >
                  <Pencil aria-hidden="true" />
                  Cambiar número
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Segundo paso: introducir PIN y contraseña. */}
        <section
          className={
            pinSolicitado
              ? 'first-access-card'
              : 'first-access-card first-access-card--disabled'
          }
          aria-labelledby="activation-title"
          aria-disabled={!pinSolicitado}
        >
          <header className="first-access-card__header">
            <span className="first-access-step first-access-step--secondary">
              2
            </span>

            <div>
              <h2 id="activation-title">
                Crea tu contraseña
              </h2>

              <p>
                Introduce el PIN recibido y establece
                tu contraseña de acceso.
              </p>
            </div>
          </header>

          <form
            className="first-access-activation-layout"
            onSubmit={manejarActivacion}
            noValidate
          >
            <fieldset
              className="first-access-fields"
              disabled={
                !pinSolicitado ||
                activandoCuenta
              }
            >
              <div className="first-access-pin-section">
                <div className="first-access-pin-heading">
                  <KeyRound aria-hidden="true" />

                  <div>
                    <h3>PIN de activación</h3>

                    <p>
                      Escribe el código de seis dígitos
                      enviado a tu correo.
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
                  aria-label="PIN de activación de seis dígitos"
                  containerClassName="first-access-pin-input"
                  render={({ slots }) => (
                    <>
                      <div className="first-access-pin-group">
                        {slots
                          .slice(0, 3)
                          .map((slot, index) => (
                            <PinSlot
                              key={`first-access-pin-one-${index}`}
                              {...slot}
                            />
                          ))}
                      </div>

                      <span
                        className="first-access-pin-separator"
                        aria-hidden="true"
                      >
                        –
                      </span>

                      <div className="first-access-pin-group">
                        {slots
                          .slice(3)
                          .map((slot, index) => (
                            <PinSlot
                              key={`first-access-pin-two-${index}`}
                              {...slot}
                            />
                          ))}
                      </div>
                    </>
                  )}
                />

                <p className="first-access-pin-help">
                  El PIN vence 15 minutos después
                  de ser enviado.
                </p>

                <button
                  className="first-access-resend"
                  type="button"
                  disabled={solicitandoPin}
                  onClick={manejarSolicitudPin}
                >
                  <RefreshCw aria-hidden="true" />

                  {solicitandoPin
                    ? 'Reenviando...'
                    : 'Reenviar PIN'}
                </button>
              </div>

              <div
                className="first-access-divider"
                aria-hidden="true"
              />

              <div className="first-access-field">
                <label htmlFor="first-access-password">
                  Nueva contraseña
                </label>

                <div className="first-access-input first-access-password-input">
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="first-access-password"
                    type={
                      mostrarContrasena
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    placeholder="Ingresa tu contraseña"
                    value={contrasena}
                    onChange={(event) =>
                      setContrasena(
                        event.target.value,
                      )
                    }
                  />

                  <button
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
                    {mostrarContrasena ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="first-access-field">
                <label htmlFor="first-access-confirmation">
                  Confirmar contraseña
                </label>

                <div className="first-access-input first-access-password-input">
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="first-access-confirmation"
                    type={
                      mostrarConfirmacion
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={confirmacion}
                    onChange={(event) =>
                      setConfirmacion(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    type="button"
                    aria-label={
                      mostrarConfirmacion
                        ? 'Ocultar confirmación'
                        : 'Mostrar confirmación'
                    }
                    aria-pressed={mostrarConfirmacion}
                    title={
                      mostrarConfirmacion
                        ? 'Ocultar confirmación'
                        : 'Mostrar confirmación'
                    }
                    onClick={() =>
                      setMostrarConfirmacion(
                        (valorAnterior) =>
                          !valorAnterior,
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

              <button
                className="first-access-button first-access-button--primary first-access-button--full"
                type="submit"
                disabled={
                  !pinSolicitado ||
                  activandoCuenta ||
                  pin.length !== 6 ||
                  !requisitosCumplidos
                }
                aria-busy={activandoCuenta}
              >
                <ShieldCheck aria-hidden="true" />

                {activandoCuenta
                  ? 'Activando cuenta...'
                  : 'Activar cuenta'}
              </button>
            </fieldset>

            <aside
              className="first-access-security"
              aria-label="Requisitos de la contraseña"
            >
              <h3>Requisitos de seguridad</h3>

              <ul>
                <Requisito
                  cumplido={requisitos.longitud}
                >
                  Mínimo 8 caracteres
                </Requisito>

                <Requisito
                  cumplido={
                    requisitos.mayusculaMinuscula
                  }
                >
                  Mayúsculas y minúsculas
                </Requisito>

                <Requisito
                  cumplido={requisitos.numero}
                >
                  Al menos un número
                </Requisito>

                <Requisito
                  cumplido={requisitos.coinciden}
                >
                  Las contraseñas coinciden
                </Requisito>
              </ul>

              <div className="first-access-strength">
                <div>
                  <span>Fortaleza</span>

                  <strong>
                    {etiquetaFortaleza}
                  </strong>
                </div>

                <div
                  className="first-access-strength__track"
                  aria-label={`Fortaleza: ${etiquetaFortaleza}`}
                >
                  <span
                    style={{
                      width: `${porcentajeFortaleza}%`,
                    }}
                  />
                </div>
              </div>
            </aside>
          </form>
        </section>
      </main>
    </div>
  )
}

export default FirstAccess