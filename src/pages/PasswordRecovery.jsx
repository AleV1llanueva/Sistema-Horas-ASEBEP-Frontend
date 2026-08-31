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
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router'
import '../styles/PasswordRecovery.css'
import {
  notificarError,
  notificarInformacion,
} from '../services/notificationService.js'

const ID_SOLICITUD_PIN = 'solicitud-pin'
const ID_VERIFICACION_PIN = 'verificacion-pin'
const ID_NUEVA_CONTRASENA = 'nueva-contrasena'

/*
- Cada slot representa visualmente un dígito.
- input-otp mantiene internamente un único input accesible.
*/
function PinSlot({
  char,
  hasFakeCaret,
  isActive,
}) {
  const clase = isActive
    ? 'pin-slot pin-slot--active'
    : 'pin-slot'

  return (
    <div className={clase}>
      {char}

      {hasFakeCaret && (
        <span
          className="pin-slot__caret"
          aria-hidden="true"
        />
      )}
    </div>
  )
}


// Representa cada requisito de seguridad.
function Requisito({ cumplido, children }) {
  return (
    <li
      className={
        cumplido
          ? 'password-requirement password-requirement--complete'
          : 'password-requirement'
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

function PasswordRecovery() {
  const [pin, setPin] = useState('')
  const [contrasena, setContrasena] =
    useState('')
  const [confirmacion, setConfirmacion] =
    useState('')

  const [mostrarContrasena, setMostrarContrasena] =
    useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false)

  /*
  - Permanecerá en false hasta que el backend confirme
  - correctamente el PIN.
  - No simularemos una verificación exitosa.
  */
  const pinVerificado = false

  const requisitos = {
    longitud: contrasena.length >= 8,

    mayusculaMinuscula:
    /[a-z]/.test(contrasena) &&
    /[A-Z]/.test(contrasena),

    numero: /\d/.test(contrasena),

    coinciden:
      Boolean(contrasena) &&
      contrasena === confirmacion,
  }

  const totalCumplidos = Object.values(requisitos).filter(Boolean).length

  const requisitosCumplidos = totalCumplidos === 4
  const porcentajeFortaleza = (totalCumplidos / 4) * 100

  let etiquetaFortaleza = 'Sin evaluar'

  if (totalCumplidos === 1) {
    etiquetaFortaleza = 'Débil'
  }

  if (totalCumplidos === 2) {
    etiquetaFortaleza = 'Media'
  }

  if (totalCumplidos === 3) {
    etiquetaFortaleza = 'Buena'
  }

  if (totalCumplidos === 4) {
    etiquetaFortaleza = 'Fuerte'
  }

  /*
  * Solicita el envío del PIN.
  */
  function solicitarPin(event) {
    event.preventDefault()

    /*
    * La llamada real será incorporada cuando el backend
    * proporcione el endpoint para solicitar el PIN.
    */
    notificarInformacion({
      id: ID_SOLICITUD_PIN,
      titulo: 'Funcionalidad pendiente',
      descripcion: 'El envío del PIN estará disponible proximamente.',
    })
  }

  /*
  - Comprueba únicamente que el PIN tenga seis dígitos.
  - El backend será responsable de verificar si es correcto.
  */
  function verificarPin() {
    /*
    * Si el PIN no contiene exactamente seis dígitos,
    * mostramos el error y detenemos la función.
    */
    if (pin.length !== 6) {
      notificarError({
        id: ID_VERIFICACION_PIN,
        titulo: 'PIN incompleto',
        descripcion:
          'Ingresa los seis dígitos enviados a tu correo.',
      })

      return
    }

  /*
   * Esta parte solo se ejecuta cuando el correo
   * es válido y el PIN contiene seis dígitos.
   */
  notificarInformacion({
    id: ID_VERIFICACION_PIN,
    titulo: 'Funcionalidad pendiente',
    descripcion: 'La verificación del PIN estara disponible proximamente.',
  })
}

  /*
  - La actualización permanecerá deshabilitada
  - mientras el PIN no haya sido verificado por la API.
  */
  function actualizarContrasena(event) {
    event.preventDefault()

    if (!pinVerificado) {
      return
    }

    if (!requisitosCumplidos) {
      notificarError({
        id: ID_NUEVA_CONTRASENA,
        titulo: 'Revisa la contraseña',
        descripcion: 'Debes cumplir todos los requisitos de seguridad.',
      })
      return
    }
  }

  return (
    <div className="security-page">
      <header className="security-topbar">
        <Link
          className="security-brand"
          to="/login"
          aria-label="Volver al inicio de sesión"
        >
          <span className="security-brand__icon">
            <GraduationCap aria-hidden="true" />
          </span>

          <strong>ASEBEP</strong>
        </Link>

        <span>Configuración de seguridad</span>
      </header>

      <main className="security-main">
        <Link
          className="security-back"
          to="/login"
        >
          <ArrowLeft aria-hidden="true" />
          Volver al inicio de sesión
        </Link>

        <header className="security-heading">
          <p>Protección de la cuenta</p>
          <h1>Seguridad de la cuenta</h1>

          <span>
            Actualiza tu contraseña para mantener tu
            cuenta ASEBEP protegida.
          </span>
        </header>

        {/* Primer paso: solicitud y verificacion del PIN. */}
        <section
          className="security-card"
          aria-labelledby="verification-title"
        >
          <header className="security-card__header">
            <span className="security-step">
              1
            </span>

            <div>
              <h2 id="verification-title">
                Verificación de identidad
              </h2>

              <p>
                Recibe y confirma un PIN en tu correo
                institucional.
              </p>
            </div>
          </header>

          <div className="security-card__body">
            <form
              className="pin-request"
              onSubmit={solicitarPin}
            >
              {/*
              * Se envia directamente el PIN al correo del estudiante.
              */}
              <button
                className={
                  'security-button ' +
                  'security-button--secondary ' +
                  'security-button--request'
                }
                type="submit"
              >
                <Mail aria-hidden="true" />

                Enviar PIN
              </button>
            </form>
            <div
              className="security-divider"
              aria-hidden="true"
            />

            <div className="pin-section">
              <div className="pin-section__heading">
                <KeyRound aria-hidden="true" />

                <div>
                  <h3>Ingresa el PIN</h3>
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
                aria-label="Código PIN de seis dígitos"
                containerClassName="pin-input"
                render={({ slots }) => (
                  <>
                    <div className="pin-group">
                      {slots
                        .slice(0, 3)
                        .map((slot, index) => (
                          <PinSlot
                            key={`pin-first-${index}`}
                            {...slot}
                          />
                        ))}
                    </div>

                    <span
                      className="pin-separator"
                      aria-hidden="true"
                    >
                      –
                    </span>

                    <div className="pin-group">
                      {slots
                        .slice(3)
                        .map((slot, index) => (
                          <PinSlot
                            key={`pin-second-${index}`}
                            {...slot}
                          />
                        ))}
                    </div>
                  </>
                )}
              />

              <button
                className="security-button security-button--primary"
                type="button"
                onClick={verificarPin}
                disabled={pin.length !== 6}
              >
                <ShieldCheck aria-hidden="true" />
                Verificar PIN
              </button>

              <p className="resend-pin">
                ¿No recibiste el código?

                <button
                  type="button"
                  onClick={solicitarPin}
                >
                  Reenviar PIN
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* Segundo paso: creación de la contraseña. */}
        <section
          className={
            pinVerificado
              ? 'security-card'
              : 'security-card security-card--disabled'
          }
          aria-labelledby="password-title"
          aria-disabled={!pinVerificado}
        >
          <header className="security-card__header">
            <span className="security-step security-step--secondary">
              2
            </span>

            <div>
              <h2 id="password-title">
                Nueva contraseña
              </h2>

              <p>
                Crea una contraseña segura para tu
                cuenta.
              </p>
            </div>
          </header>

          <form
            className="password-layout"
            onSubmit={actualizarContrasena}
          >
            <fieldset
              className="password-fields"
              disabled={!pinVerificado}
            >
              <div className="security-field">
                <label htmlFor="new-password">
                  Nueva contraseña
                </label>

                <div className="password-input">
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="new-password"
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
                    onClick={() =>
                      setMostrarContrasena(
                        (valor) => !valor,
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

              <div className="security-field">
                <label htmlFor="confirm-password">
                  Confirmar contraseña
                </label>

                <div className="password-input">
                  <LockKeyhole aria-hidden="true" />

                  <input
                    id="confirm-password"
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

              <button
                className="security-button security-button--primary security-button--full"
                type="submit"
                disabled={
                  !pinVerificado ||
                  !requisitosCumplidos
                }
              >
                Actualizar contraseña
              </button>
            </fieldset>

            <aside
              className="password-security"
              aria-label="Requisitos de seguridad"
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

              <div className="password-strength">
                <div>
                  <span>Fortaleza</span>
                  <strong>
                    {etiquetaFortaleza}
                  </strong>
                </div>

                <div
                  className="password-strength__track"
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

export default PasswordRecovery