import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  CircleCheck,
  GraduationCap,
  IdCard,
  Info,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  actualizarEstudiante,
  obtenerEstudiante,
} from '../services/adminEstudiantesService.js'

import {
  notificarError,
  notificarExito,
} from '../../../services/notificationService.js'

import '../styles/AdminPrincipalEditStudent.css'

/*
 * Estos catálogos se completarán cuando tengamos
 * los identificadores reales de roles y carreras.
 */
const ROLES_DISPONIBLES = []
const CARRERAS_DISPONIBLES = []

const FORMULARIO_VACIO = {
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  correoPersonal: '',
  correoInstitucional: '',
  telefono: '',
  carreraId: '',
  rolId: '',
}

const ID_ESTUDIANTE_ACTUALIZADO =
  'estudiante-actualizado'

const ID_ERROR_ACTUALIZACION =
  'error-actualizar-estudiante'

function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

function capitalizarPrimeraLetra(valor) {
    const texto = prepararTexto(valor)

    if (!texto) {
        return ''
    }

    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    )
}

function normalizarNombre(valor) {
  return prepararTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/*
 * El listado del backend todavía no devuelve los IDS.
 * Cuando exista el catálogo, también podremos localizar
 * el identificador utilizando el nombre actual.
 */
function resolverIdCatalogo(
  identificador,
  nombreActual,
  catalogo,
) {
  const numero = Number(identificador)

  if (
    Number.isInteger(numero) &&
    numero > 0
  ) {
    return String(numero)
  }

  const nombreNormalizado =
    normalizarNombre(nombreActual)

  if (!nombreNormalizado) {
    return ''
  }

  const opcionEncontrada =
    catalogo.find(
      (opcion) =>
        normalizarNombre(opcion.nombre) ===
        nombreNormalizado,
    )

  return opcionEncontrada
    ? String(opcionEncontrada.id)
    : ''
}

function crearFormularioDesdeEstudiante(
  estudiante,
) {
  const datosPersonales =
    estudiante?.datosPersonales ?? {}

  const credenciales =
    estudiante?.credenciales ?? {}

  return {
    primerNombre:
      prepararTexto(
        datosPersonales.primerNombre,
      ),

    segundoNombre:
      prepararTexto(
        datosPersonales.segundoNombre,
      ),

    primerApellido:
      prepararTexto(
        datosPersonales.primerApellido,
      ),

    segundoApellido:
      prepararTexto(
        datosPersonales.segundoApellido,
      ),

    correoPersonal:
      prepararTexto(
        datosPersonales.correoPersonal,
      ),

    correoInstitucional:
      prepararTexto(
        datosPersonales
          .correoInstitucional,
      ),

    telefono:
      prepararTexto(
        datosPersonales.telefono,
      ),

    carreraId:
      resolverIdCatalogo(
        datosPersonales.carreraId,
        datosPersonales.carrera,
        CARRERAS_DISPONIBLES,
      ),

    rolId:
      resolverIdCatalogo(
        credenciales.rolId,
        credenciales.rol,
        ROLES_DISPONIBLES,
      ),
  }
}

function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    correo,
  )
}

function validarFormulario(
  formulario,
  catalogoRolesDisponible,
  catalogoCarrerasDisponible,
) {
  const errores = {}

  if (!formulario.primerNombre.trim()) {
    errores.primerNombre =
      'El primer nombre es obligatorio.'
  }

  if (!formulario.primerApellido.trim()) {
    errores.primerApellido =
      'El primer apellido es obligatorio.'
  }

  const correoPersonal =
    formulario.correoPersonal
      .trim()
      .toLowerCase()

  if (
    !correoPersonal ||
    !validarCorreo(correoPersonal)
  ) {
    errores.correoPersonal =
      'Ingresa un correo personal válido.'
  }

  const correoInstitucional =
    formulario.correoInstitucional
      .trim()
      .toLowerCase()

  if (
    !correoInstitucional.endsWith(
      '@unah.hn',
    )
  ) {
    errores.correoInstitucional =
      'El correo debe pertenecer al dominio @unah.hn.'
  }

  if (
    !/^\d{1,8}$/.test(
      formulario.telefono,
    )
  ) {
    errores.telefono =
      'El teléfono debe contener entre 1 y 8 dígitos.'
  }

  if (
    catalogoCarrerasDisponible &&
    !formulario.carreraId
  ) {
    errores.carreraId =
      'Selecciona una carrera.'
  }

  if (
    catalogoRolesDisponible &&
    !formulario.rolId
  ) {
    errores.rolId =
      'Selecciona un rol.'
  }

  return errores
}

function normalizarFormulario(
  formulario,
) {
  return {
    primerNombre:
      formulario.primerNombre.trim(),

    segundoNombre:
      formulario.segundoNombre.trim(),

    primerApellido:
      formulario.primerApellido.trim(),

    segundoApellido:
      formulario.segundoApellido.trim(),

    correoPersonal:
      formulario.correoPersonal
        .trim()
        .toLowerCase(),

    correoInstitucional:
      formulario.correoInstitucional
        .trim()
        .toLowerCase(),

    telefono:
      formulario.telefono.trim(),

    carreraId:
      formulario.carreraId,

    rolId:
      formulario.rolId,
  }
}

/*
 * Solamente se envían los campos que realmente
 * fueron modificados por el administrador.
 */
function construirCambios(
  formulario,
  formularioInicial,
  catalogoRolesDisponible,
  catalogoCarrerasDisponible,
) {
  const valoresActuales =
    normalizarFormulario(formulario)

  const valoresIniciales =
    normalizarFormulario(
      formularioInicial,
    )

  const datosPersonales = {}
  const credenciales = {}

  const camposPersonales = [
    'primerNombre',
    'segundoNombre',
    'primerApellido',
    'segundoApellido',
    'correoPersonal',
    'correoInstitucional',
    'telefono',
  ]

  camposPersonales.forEach((campo) => {
    if (
      valoresActuales[campo] !==
      valoresIniciales[campo]
    ) {
      datosPersonales[campo] =
        valoresActuales[campo]
    }
  })

  if (
    catalogoCarrerasDisponible &&
    valoresActuales.carreraId !==
      valoresIniciales.carreraId
  ) {
    datosPersonales.carreraId =
      Number(valoresActuales.carreraId)
  }

  if (
    catalogoRolesDisponible &&
    valoresActuales.rolId !==
      valoresIniciales.rolId
  ) {
    credenciales.rolId =
      Number(valoresActuales.rolId)
  }

  const cambios = {}

  if (
    Object.keys(datosPersonales)
      .length > 0
  ) {
    cambios.datosPersonales =
      datosPersonales
  }

  if (
    Object.keys(credenciales)
      .length > 0
  ) {
    cambios.credenciales =
      credenciales
  }

  return cambios
}

function obtenerIniciales(
  primerNombre,
  primerApellido,
) {
  const primeraInicial =
    prepararTexto(primerNombre)
      .charAt(0)
      .toUpperCase()

  const segundaInicial =
    prepararTexto(primerApellido)
      .charAt(0)
      .toUpperCase()

  return (
    `${primeraInicial}${segundaInicial}` ||
    'ES'
  )
}

function AdminPrincipalEditStudent() {
  const { numeroCuenta } = useParams()
  const navigate = useNavigate()

  const [
    estudiante,
    setEstudiante,
  ] = useState(null)

  const [
    formulario,
    setFormulario,
  ] = useState(FORMULARIO_VACIO)

  const [
    formularioInicial,
    setFormularioInicial,
  ] = useState(FORMULARIO_VACIO)

  const [
    errores,
    setErrores,
  ] = useState({})

  const [
    cargando,
    setCargando,
  ] = useState(true)

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    errorCarga,
    setErrorCarga,
  ] = useState('')

  const [
    recarga,
    setRecarga,
  ] = useState(0)

  const [
    dialogoCancelarAbierto,
    setDialogoCancelarAbierto,
  ] = useState(false)

  const catalogoRolesDisponible =
    ROLES_DISPONIBLES.length > 0

  const catalogoCarrerasDisponible =
    CARRERAS_DISPONIBLES.length > 0

  /*
   * Recupera el estudiante utilizando el mismo servicio
   * para el modo simulado y el consumo de la API.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarEstudiante() {
      setCargando(true)
      setErrorCarga('')

      try {
        const estudianteObtenido =
          await obtenerEstudiante(
            numeroCuenta,
          )

        if (!componenteMontado) {
          return
        }

        if (!estudianteObtenido) {
          setErrorCarga(
            'No encontramos un estudiante con ese número de cuenta.',
          )

          return
        }

        const formularioPreparado =
          crearFormularioDesdeEstudiante(
            estudianteObtenido,
          )

        setEstudiante(
          estudianteObtenido,
        )

        setFormulario(
          formularioPreparado,
        )

        setFormularioInicial(
          formularioPreparado,
        )
      } catch (error) {
        if (!componenteMontado) {
          return
        }

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la información del estudiante.',
        )
      } finally {
        if (componenteMontado) {
          setCargando(false)
        }
      }
    }

    cargarEstudiante()

    return () => {
      componenteMontado = false
    }
  }, [
    numeroCuenta,
    recarga,
  ])

  const cambiosPendientes =
    useMemo(
      () =>
        construirCambios(
          formulario,
          formularioInicial,
          catalogoRolesDisponible,
          catalogoCarrerasDisponible,
        ),
      [
        formulario,
        formularioInicial,
        catalogoRolesDisponible,
        catalogoCarrerasDisponible,
      ],
    )

  const formularioModificado =
    Object.keys(
      cambiosPendientes,
    ).length > 0

  const datosPersonales =
    estudiante?.datosPersonales ?? {}

  const credenciales =
    estudiante?.credenciales ?? {}

  const activo =
    credenciales.activo !== false

  const nombreCompleto =
    [
      formulario.primerNombre,
      formulario.segundoNombre,
      formulario.primerApellido,
      formulario.segundoApellido,
    ]
      .map((parte) => parte.trim())
      .filter(Boolean)
      .join(' ')

  const iniciales =
    obtenerIniciales(
      formulario.primerNombre,
      formulario.primerApellido,
    )

  const carreraSeleccionada =
    CARRERAS_DISPONIBLES.find(
      (carrera) =>
        String(carrera.id) ===
        formulario.carreraId,
    )

  const rolSeleccionado =
    ROLES_DISPONIBLES.find(
      (rol) =>
        String(rol.id) ===
        formulario.rolId,
    )

  const carreraMostrada =
    carreraSeleccionada?.nombre ||
    datosPersonales.carrera ||
    'Carrera no disponible'

  const rolMostrado =
    capitalizarPrimeraLetra(
        rolSeleccionado?.nombre || credenciales.rol,
    ) ||
    'Rol no disponible'

  function actualizarCampo(evento) {
    const {
      name,
      value,
    } = evento.target

    const valorPreparado =
      name === 'telefono'
        ? value.replace(/\D/g, '')
        : value

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [name]: valorPreparado,
      }),
    )

    setErrores(
      (erroresActuales) => ({
        ...erroresActuales,
        [name]: '',
      }),
    )
  }

  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }

  function regresarVistaAnterior() {
    navigate(-1)
  }

  function cancelarEdicion() {
    if (guardando) {
      return
    }

    if (!formularioModificado) {
      regresarVistaAnterior()

      return
    }

    setDialogoCancelarAbierto(true)
  }

  function confirmarCancelacion() {
    setDialogoCancelarAbierto(false)
    regresarVistaAnterior()
  }

  async function guardarCambios(
    evento,
  ) {
    evento.preventDefault()

    const erroresEncontrados =
      validarFormulario(
        formulario,
        catalogoRolesDisponible,
        catalogoCarrerasDisponible,
      )

    setErrores(
      erroresEncontrados,
    )

    if (
      Object.keys(
        erroresEncontrados,
      ).length > 0
    ) {
      notificarError({
        titulo:
          'Revisa el formulario',

        descripcion:
          'Corrige los campos marcados antes de guardar los cambios.',
      })

      return
    }

    if (!formularioModificado) {
      return
    }

    setGuardando(true)

    try {
      await actualizarEstudiante(
        numeroCuenta,
        cambiosPendientes,
      )

      notificarExito({
        id:
          ID_ESTUDIANTE_ACTUALIZADO,

        titulo:
          'Información actualizada',

        descripcion:
          'Los cambios del estudiante se guardaron correctamente.',
      })

      navigate(
        `/admin-principal/estudiantes/${encodeURIComponent(
          numeroCuenta,
        )}`,
        {
          replace: true,
        },
      )
    } catch (error) {
      console.log(
        'Error al actualizar el estudiante: ',
        error,
      )

      notificarError({
        id:
          ID_ERROR_ACTUALIZACION,

        titulo:
          'No fue posible guardar',

        descripcion:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="admin-edit-student-page">
        <section
          className="admin-edit-student-state"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="admin-edit-student-state__loader"
            aria-hidden="true"
          />

          <h2>
            Cargando información
          </h2>

          <p>
            Estamos preparando los datos
            del estudiante.
          </p>
        </section>
      </div>
    )
  }

  if (
    errorCarga ||
    !estudiante
  ) {
    return (
      <div className="admin-edit-student-page">
        <section
          className="admin-edit-student-state admin-edit-student-state--error"
          role="alert"
        >
          <TriangleAlert
            aria-hidden="true"
          />

          <h2>
            No fue posible cargar al estudiante
          </h2>

          <p>
            {errorCarga ||
              'El estudiante solicitado no está disponible.'}
          </p>

          <div className="admin-edit-student-state__actions">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin-principal/estudiantes',
                )
              }
            >
              <ArrowLeft aria-hidden="true" />
              Volver a estudiantes
            </button>

            <button
              type="button"
              onClick={reintentarCarga}
            >
              Reintentar
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="admin-edit-student-page">
      {/* Permite regresar sin perder cambios accidentalmente. */}
      <nav
        className="admin-edit-student-breadcrumb"
        aria-label="Migas de navegación"
      >
        <button
          type="button"
          onClick={cancelarEdicion}
        >
          <ArrowLeft aria-hidden="true" />
          Volver
        </button>

        <span aria-hidden="true">
          /
        </span>

        <span>
          Editar estudiante
        </span>
      </nav>

      {/* Encabezado de la vista. */}
      <header className="admin-edit-student-heading">
        <div>
          <p className="admin-edit-student-heading__eyebrow">
            Gestión de estudiantes
          </p>

          <h1>
            Editar información
          </h1>

          <p>
            Actualiza únicamente los datos
            permitidos por el sistema.
          </p>
        </div>

        <span
          className={
            activo
              ? 'admin-edit-student-heading__badge admin-edit-student-heading__badge--active'
              : 'admin-edit-student-heading__badge admin-edit-student-heading__badge--inactive'
          }
        >
          <CircleCheck aria-hidden="true" />

          {activo
            ? 'Estudiante activo'
            : 'Estudiante inactivo'}
        </span>
      </header>

      {(
        !catalogoRolesDisponible ||
        !catalogoCarrerasDisponible
      ) && (
        <section
          className="admin-edit-student-catalog-notice"
          role="status"
        >
          <Info aria-hidden="true" />

          <div>
            <strong>
              Catálogos pendientes
            </strong>

            <p>
              Los datos personales pueden
              editarse normalmente. La carrera
              y el rol permanecerán bloqueados
              hasta agregar sus IDS reales.
            </p>
          </div>
        </section>
      )}

      <div className="admin-edit-student-layout">
        <form
          className="admin-edit-student-form"
          noValidate
          onSubmit={guardarCambios}
        >
          {/* El número de cuenta identifica el registro y no se modifica. */}
          <div className="admin-edit-student-account">
            <span>
              <IdCard aria-hidden="true" />
            </span>

            <div>
              <small>
                Número de cuenta
              </small>

              <strong>
                {datosPersonales.numeroCuenta}
              </strong>
            </div>

            <span>
              No editable
            </span>
          </div>

          {/* Información personal permitida por el backend. */}
          <fieldset className="admin-edit-student-section">
            <legend>
              <span>
                <UserRound aria-hidden="true" />
              </span>

              <span>
                <strong>
                  Información personal
                </strong>

                <small>
                  Nombres y apellidos del estudiante
                </small>
              </span>
            </legend>

            <div className="admin-edit-student-fields">
              <div className="admin-edit-student-field">
                <label htmlFor="editar-primer-nombre">
                  Primer nombre
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <input
                  id="editar-primer-nombre"
                  name="primerNombre"
                  type="text"
                  maxLength="20"
                  value={formulario.primerNombre}
                  aria-invalid={
                    Boolean(
                      errores.primerNombre,
                    )
                  }
                  onChange={actualizarCampo}
                />

                {errores.primerNombre && (
                  <p className="admin-edit-student-field__error">
                    {errores.primerNombre}
                  </p>
                )}
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-segundo-nombre">
                  Segundo nombre
                  <small>
                    Opcional
                  </small>
                </label>

                <input
                  id="editar-segundo-nombre"
                  name="segundoNombre"
                  type="text"
                  maxLength="20"
                  value={formulario.segundoNombre}
                  onChange={actualizarCampo}
                />
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-primer-apellido">
                  Primer apellido
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <input
                  id="editar-primer-apellido"
                  name="primerApellido"
                  type="text"
                  maxLength="20"
                  value={formulario.primerApellido}
                  aria-invalid={
                    Boolean(
                      errores.primerApellido,
                    )
                  }
                  onChange={actualizarCampo}
                />

                {errores.primerApellido && (
                  <p className="admin-edit-student-field__error">
                    {errores.primerApellido}
                  </p>
                )}
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-segundo-apellido">
                  Segundo apellido
                  <small>
                    Opcional
                  </small>
                </label>

                <input
                  id="editar-segundo-apellido"
                  name="segundoApellido"
                  type="text"
                  maxLength="20"
                  value={formulario.segundoApellido}
                  onChange={actualizarCampo}
                />
              </div>
            </div>
          </fieldset>

          {/* Correos y teléfono permitidos por el contrato. */}
          <fieldset className="admin-edit-student-section">
            <legend>
              <span>
                <Mail aria-hidden="true" />
              </span>

              <span>
                <strong>
                  Información de contacto
                </strong>

                <small>
                  Correos y teléfono personal
                </small>
              </span>
            </legend>

            <div className="admin-edit-student-fields">
              <div className="admin-edit-student-field">
                <label htmlFor="editar-correo-institucional">
                  Correo institucional
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-edit-student-input-icon">
                  <Mail aria-hidden="true" />

                  <input
                    id="editar-correo-institucional"
                    name="correoInstitucional"
                    type="email"
                    maxLength="120"
                    value={
                      formulario
                        .correoInstitucional
                    }
                    aria-invalid={
                      Boolean(
                        errores
                          .correoInstitucional,
                      )
                    }
                    onChange={actualizarCampo}
                  />
                </div>

                {errores.correoInstitucional && (
                  <p className="admin-edit-student-field__error">
                    {
                      errores
                        .correoInstitucional
                    }
                  </p>
                )}
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-correo-personal">
                  Correo personal
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-edit-student-input-icon">
                  <Mail aria-hidden="true" />

                  <input
                    id="editar-correo-personal"
                    name="correoPersonal"
                    type="email"
                    maxLength="120"
                    value={
                      formulario.correoPersonal
                    }
                    aria-invalid={
                      Boolean(
                        errores.correoPersonal,
                      )
                    }
                    onChange={actualizarCampo}
                  />
                </div>

                {errores.correoPersonal && (
                  <p className="admin-edit-student-field__error">
                    {errores.correoPersonal}
                  </p>
                )}
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-telefono">
                  Teléfono
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-edit-student-input-icon">
                  <Phone aria-hidden="true" />

                  <input
                    id="editar-telefono"
                    name="telefono"
                    type="tel"
                    inputMode="numeric"
                    maxLength="8"
                    value={formulario.telefono}
                    aria-invalid={
                      Boolean(
                        errores.telefono,
                      )
                    }
                    onChange={actualizarCampo}
                  />
                </div>

                <div className="admin-edit-student-field__support">
                  <small>
                    Máximo 8 dígitos.
                  </small>

                  <small>
                    {formulario.telefono.length}
                    /8
                  </small>
                </div>

                {errores.telefono && (
                  <p className="admin-edit-student-field__error">
                    {errores.telefono}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Carrera y rol se activarán al conocer sus IDS. */}
          <fieldset className="admin-edit-student-section">
            <legend>
              <span>
                <GraduationCap aria-hidden="true" />
              </span>

              <span>
                <strong>
                  Información académica y acceso
                </strong>

                <small>
                  Carrera y rol asignado en el sistema
                </small>
              </span>
            </legend>

            <div className="admin-edit-student-fields">
              <div className="admin-edit-student-field">
                <label htmlFor="editar-carrera">
                  Carrera
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <select
                  id="editar-carrera"
                  name="carreraId"
                  value={formulario.carreraId}
                  disabled={
                    !catalogoCarrerasDisponible
                  }
                  aria-invalid={
                    Boolean(
                      errores.carreraId,
                    )
                  }
                  onChange={actualizarCampo}
                >
                  {!catalogoCarrerasDisponible && (
                    <option
                      value={formulario.carreraId}
                    >
                      {carreraMostrada}
                    </option>
                  )}

                  {catalogoCarrerasDisponible && (
                    <>
                      <option value="">
                        Selecciona una carrera
                      </option>

                      {CARRERAS_DISPONIBLES.map(
                        (carrera) => (
                          <option
                            key={carrera.id}
                            value={carrera.id}
                          >
                            {carrera.nombre}
                          </option>
                        ),
                      )}
                    </>
                  )}
                </select>

                {errores.carreraId && (
                  <p className="admin-edit-student-field__error">
                    {errores.carreraId}
                  </p>
                )}
              </div>

              <div className="admin-edit-student-field">
                <label htmlFor="editar-rol">
                  Rol del sistema
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <select
                  id="editar-rol"
                  name="rolId"
                  value={formulario.rolId}
                  disabled={
                    !catalogoRolesDisponible
                  }
                  aria-invalid={
                    Boolean(
                      errores.rolId,
                    )
                  }
                  onChange={actualizarCampo}
                >
                  {!catalogoRolesDisponible && (
                    <option
                      value={formulario.rolId}
                    >
                      {rolMostrado}
                    </option>
                  )}

                  {catalogoRolesDisponible && (
                    <>
                      <option value="">
                        Selecciona un rol
                      </option>

                      {ROLES_DISPONIBLES.map(
                        (rol) => (
                          <option
                            key={rol.id}
                            value={rol.id}
                          >
                            {capitalizarPrimeraLetra(
                                rol.nombre,
                            )}
                          </option>
                        ),
                      )}
                    </>
                  )}
                </select>

                {errores.rolId && (
                  <p className="admin-edit-student-field__error">
                    {errores.rolId}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <div className="admin-edit-student-form__notice">
            <ShieldCheck aria-hidden="true" />

            <span>
              El número de cuenta, las horas,
              las aportaciones y el periodo de
              ingreso no se pueden modificar.
            </span>
          </div>

          <footer className="admin-edit-student-form__actions">
            <button
              type="button"
              disabled={guardando}
              onClick={cancelarEdicion}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando ||
                !formularioModificado
              }
            >
              {guardando ? (
                <LoaderCircle
                  className="admin-edit-student-form__loader"
                  aria-hidden="true"
                />
              ) : (
                <Save aria-hidden="true" />
              )}

              {guardando
                ? 'Guardando...'
                : 'Guardar cambios'}
            </button>
          </footer>
        </form>

        {/* Resumen actualizado mientras se escriben los cambios. */}
        <aside
          className="admin-edit-student-preview"
          aria-label="Resumen del estudiante"
        >
          <header className="admin-edit-student-preview__header">
            <div>
              <p>Vista previa</p>
              <h2>Estudiante</h2>
            </div>

            <span>
              {formularioModificado
                ? 'Con cambios'
                : 'Sin cambios'}
            </span>
          </header>

          <div className="admin-edit-student-preview__identity">
            <span aria-hidden="true">
              {iniciales}
            </span>

            <div>
              <h3>
                {nombreCompleto ||
                  'Nombre del estudiante'}
              </h3>

              <p>
                {datosPersonales.numeroCuenta}
              </p>
            </div>
          </div>

          <dl className="admin-edit-student-preview__details">
            <div>
              <dt>
                <GraduationCap aria-hidden="true" />
                Carrera
              </dt>

              <dd>
                {carreraMostrada}
              </dd>
            </div>

            <div>
              <dt>
                <ShieldCheck aria-hidden="true" />
                Rol
              </dt>

              <dd>
                {rolMostrado}
              </dd>
            </div>

            <div>
              <dt>
                <Mail aria-hidden="true" />
                Correo institucional
              </dt>

              <dd>
                {formulario
                  .correoInstitucional ||
                  'No disponible'}
              </dd>
            </div>

            <div>
              <dt>
                <Phone aria-hidden="true" />
                Teléfono
              </dt>

              <dd>
                {formulario.telefono ||
                  'No disponible'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {/* Evita abandonar el formulario sin confirmar. */}
      <AlertDialog.Root
        open={dialogoCancelarAbierto}
        onOpenChange={
          setDialogoCancelarAbierto
        }
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-edit-student-cancel-dialog__overlay" />

          <AlertDialog.Content className="admin-edit-student-cancel-dialog__content">
            <div className="admin-edit-student-cancel-dialog__icon">
              <TriangleAlert aria-hidden="true" />
            </div>

            <AlertDialog.Title className="admin-edit-student-cancel-dialog__title">
              ¿Descartar los cambios?
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-edit-student-cancel-dialog__description">
              La información modificada no se
              guardará y no podrá recuperarse.
            </AlertDialog.Description>

            <div className="admin-edit-student-cancel-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-edit-student-cancel-dialog__continue"
                  type="button"
                >
                  Continuar editando
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  className="admin-edit-student-cancel-dialog__confirm"
                  type="button"
                  onClick={confirmarCancelacion}
                >
                  Sí, descartar
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

export default AdminPrincipalEditStudent