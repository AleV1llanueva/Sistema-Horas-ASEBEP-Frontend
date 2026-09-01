import {
  ChevronDown,
  GraduationCap,
  LogOut,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'

import {
  useCerrarSesion,
} from '../../../hooks/useCerrarSesion.js'

function obtenerIniciales(nombreCompleto) {
  const partes = String(
    nombreCompleto ?? '',
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) {
    return 'AP'
  }

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    partes[0].charAt(0) +
    partes[partes.length - 1].charAt(0)
  ).toUpperCase()
}

function AdminProfileMenu({
  administrador,
}) {
  const [
    menuAbierto,
    setMenuAbierto,
  ] = useState(false)

  const contenedorRef = useRef(null)
  const botonRef = useRef(null)

  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  const datosPersonales =
    administrador?.datosPersonales

  const datosAdministrativos =
    administrador?.datosAdministrativos

  const nombreCompleto =
    datosPersonales?.nombreCompleto ||
    'Administrador ASEBEP'

  const correoInstitucional =
    datosPersonales?.correoInstitucional ||
    'Correo no disponible'

  const puesto =
    datosAdministrativos?.puesto ||
    'Administrador'

  const iniciales =
    obtenerIniciales(nombreCompleto)

  /*
   * Cuando el menú está abierto:
   * - Se cierra al hacer clic fuera.
   * - Se cierra al presionar Escape.
   * - El foco regresa al botón principal.
   */
  useEffect(() => {
    if (!menuAbierto) {
      return undefined
    }

    function manejarClicExterior(event) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(
          event.target,
        )
      ) {
        setMenuAbierto(false)
      }
    }

    function manejarTeclado(event) {
      if (event.key !== 'Escape') {
        return
      }

      setMenuAbierto(false)
      botonRef.current?.focus()
    }

    document.addEventListener(
      'pointerdown',
      manejarClicExterior,
    )

    document.addEventListener(
      'keydown',
      manejarTeclado,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        manejarClicExterior,
      )

      document.removeEventListener(
        'keydown',
        manejarTeclado,
      )
    }
  }, [menuAbierto])

  function alternarMenu() {
    setMenuAbierto(
      (estadoActual) => !estadoActual,
    )
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  function manejarCierreSesion() {
    cerrarMenu()
    solicitarCierreSesion()
  }

  return (
    <div
      className="admin-profile-menu"
      ref={contenedorRef}
    >
      <button
        className="admin-profile-menu__trigger"
        type="button"
        ref={botonRef}
        aria-label="Abrir menú del administrador"
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        aria-controls="admin-profile-dropdown"
        onClick={alternarMenu}
      >
        <span
          className="admin-profile-menu__avatar"
          aria-hidden="true"
        >
          {iniciales}
        </span>

        <span className="admin-profile-menu__trigger-copy">
          <strong>{nombreCompleto}</strong>
          <small>{puesto}</small>
        </span>

        <ChevronDown
          className={
            menuAbierto
              ? 'admin-profile-menu__chevron admin-profile-menu__chevron--open'
              : 'admin-profile-menu__chevron'
          }
          aria-hidden="true"
        />
      </button>

      {menuAbierto && (
        <div
          className="admin-profile-menu__dropdown"
          id="admin-profile-dropdown"
          role="menu"
          aria-label="Opciones del administrador"
        >
          <header className="admin-profile-menu__summary">
            <span
              className="admin-profile-menu__summary-avatar"
              aria-hidden="true"
            >
              {iniciales}
            </span>

            <div>
              <strong>{nombreCompleto}</strong>
              <span>{correoInstitucional}</span>
              <small>{puesto}</small>
            </div>
          </header>

          <div className="admin-profile-menu__actions">
            {/*
             * Cambia hacia el portal personal del mismo
             * administrador sin cerrar la sesión.
             */}
            <Link
              className="admin-profile-menu__action"
              to="/dashboard"
              role="menuitem"
              onClick={cerrarMenu}
            >
              <GraduationCap aria-hidden="true" />
              Ir a mi cuenta
            </Link>

            <Link
              className="admin-profile-menu__action"
              to="/admin-principal/perfil"
              role="menuitem"
              onClick={cerrarMenu}
            >
              <UserRound aria-hidden="true" />
              Ver perfil
            </Link>

            <button
              className="admin-profile-menu__action admin-profile-menu__action--logout"
              type="button"
              role="menuitem"
              onClick={manejarCierreSesion}
            >
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProfileMenu