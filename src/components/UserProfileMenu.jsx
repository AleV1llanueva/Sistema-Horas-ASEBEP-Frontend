import {
    ChevronDown,
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
} from '../hooks/useCerrarSesion.js'
import { useUsuario } from '../hooks/useUsuario.js'

// Obtiene hasta dos iniciales para construir el avatar visual del usuario.
function obtenerIniciales(
    nombreCompleto,
) {
    const partes = String(
        nombreCompleto ?? '',
    )
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (partes.length === 0) {
        return 'US'
    }

    if (partes.length === 1) {
        return partes[0]
            .slice(0, 2)
            .toUpperCase()
    }

    return (
        partes[0].charAt(0) +
        partes[
            partes.length - 1
        ].charAt(0)
    ).toUpperCase()
}

function UserProfileMenu() {
    const [
        menuAbierto,
        setMenuAbierto,
    ] = useState(false)

    const contenedorRef = useRef(null)
    const botonRef =useRef(null)
    const { usuario } = useUsuario()

    const {
        solicitarCierreSesion,
    } = useCerrarSesion()

    const datosPersonales = usuario?.datosPersonales
    const nombreCompleto = datosPersonales
        ?.nombreCompleto || 'Usuario ASEBEP'
    const correo = datosPersonales
        ?.correoInstitucional || datosPersonales?.correoPersonal || 'Correo no disponible'
    
    const iniciales = obtenerIniciales(
        nombreCompleto,
    )

    useEffect(() => {
        if (!menuAbierto) {
            return undefined
        }

        function manejarClicExterior(
            evento,
        ) {
            if (
                contenedorRef.current &&
                !contenedorRef.current.contains(
                    evento.target,
                )
            ) {
                setMenuAbierto(false)
            }
        }

        function manejarTeclado(
            evento,
        ) {
            if (
                evento.key !== 'Escape'
            ) {
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
      className="user-profile-menu"
      ref={contenedorRef}
    >
      {/*
       * Botón superior con el avatar del usuario.
       *
       * En la adaptación móvil se ubicará en el
       * extremo derecho de la barra superior.
       */}
      <button
        ref={botonRef}
        className="user-profile-menu__trigger"
        type="button"
        aria-label="Abrir menú de perfil"
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        aria-controls="user-profile-dropdown"
        onClick={alternarMenu}
      >
        <span
          className="user-profile-menu__avatar"
          aria-hidden="true"
        >
          {iniciales}
        </span>

        <span className="user-profile-menu__trigger-copy">
          <strong>
            {nombreCompleto}
          </strong>
        </span>

        <ChevronDown
          className={
            menuAbierto
              ? 'user-profile-menu__chevron user-profile-menu__chevron--open'
              : 'user-profile-menu__chevron'
          }
          aria-hidden="true"
        />
      </button>

      {menuAbierto && (
        <div
          id="user-profile-dropdown"
          className="user-profile-menu__dropdown"
          role="menu"
          aria-label="Opciones del perfil"
        >
          {/* Resumen de la cuenta autenticada. */}
          <header className="user-profile-menu__summary">
            <span
              className="user-profile-menu__summary-avatar"
              aria-hidden="true"
            >
              {iniciales}
            </span>

            <div>
              <strong>
                {nombreCompleto}
              </strong>

              <span>{correo}</span>
            </div>
          </header>

          {/*
           * El menú contiene únicamente las dos acciones
           * acordadas para el portal personal.
           */}
          <div className="user-profile-menu__actions">
            <Link
              className="user-profile-menu__action"
              to="/perfil"
              role="menuitem"
              onClick={cerrarMenu}
            >
              <UserRound
                aria-hidden="true"
              />

              Ir a mi perfil
            </Link>

            <button
              className="user-profile-menu__action user-profile-menu__action--logout"
              type="button"
              role="menuitem"
              onClick={
                manejarCierreSesion
              }
            >
              <LogOut
                aria-hidden="true"
              />

              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfileMenu