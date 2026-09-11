import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  IdCard,
  Info,
  LoaderCircle,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router'

import {
  notificarError,
  notificarExito,
  notificarInformacion,
} from '../../../services/notificationService.js'

import {
  crearEstudiante,
} from '../services/adminEstudiantesService.js'

import '../styles/AdminPrincipalCreateStudent.css'

// Estos catálogos se completarán cuando tengamos los IDS
const ROLES_DISPONIBLES = []
const CARRERAS_DISPONIBLES = []

const MESES = [
  {
    id: 1,
    nombre: 'Enero',
  },
  {
    id: 2,
    nombre: 'Febrero',
  },
  {
    id: 3,
    nombre: 'Marzo',
  },
  {
    id: 4,
    nombre: 'Abril',
  },
  {
    id: 5,
    nombre: 'Mayo',
  },
  {
    id: 6,
    nombre: 'Junio',
  },
  {
    id: 7,
    nombre: 'Julio',
  },
  {
    id: 8,
    nombre: 'Agosto',
  },
  {
    id: 9,
    nombre: 'Septiembre',
  },
  {
    id: 10,
    nombre: 'Octubre',
  },
  {
    id: 11,
    nombre: 'Noviembre',
  },
  {
    id: 12,
    nombre: 'Diciembre',
  },
]

const FORMULARIO_INICIAL = {
  numeroCuenta: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  correoInstitucional: '',
  correoPersonal: '',
  telefono: '',
  carreraId: '',
  rolId: '',
  mesInicio: '',
  anioInicio: '',
}

const ID_ESTUDIANTE_CREADO =
  'estudiante-creado'

const ID_ERROR_CREACION =
  'error-crear-estudiante'

const ID_CATALOGOS_PENDIENTES =
  'catalogos-estudiantes-pendientes'

function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    correo,
  )
}

function obtenerIniciales(
  primerNombre,
  primerApellido,
) {
  const primeraInicial =
    primerNombre
      .trim()
      .charAt(0)
      .toUpperCase()

  const segundaInicial =
    primerApellido
      .trim()
      .charAt(0)
      .toUpperCase()

  return (
    `${primeraInicial}${segundaInicial}` ||
    'ES'
  )
}

function obtenerPeriodoDesdeMes(
  mesInicio,
) {
  const mes = Number(mesInicio)

  if (!mes) {
    return 'Periodo pendiente'
  }

  if (mes <= 5) {
    return 'I-PAC'
  }

  if (mes <= 8) {
    return 'II-PAC'
  }

  return 'III-PAC'
}

function validarFormulario(
  formulario,
  catalogosDisponibles,
) {
  const errores = {}

  if (!/^\d{11}$/.test(
    formulario.numeroCuenta,
  )) {
    errores.numeroCuenta =
      'El número de cuenta debe tener exactamente 11 dígitos.'
  }

  if (!formulario.primerNombre.trim()) {
    errores.primerNombre =
      'El primer nombre es obligatorio.'
  }

  if (!formulario.primerApellido.trim()) {
    errores.primerApellido =
      'El primer apellido es obligatorio.'
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

  const correoPersonal =
    formulario.correoPersonal.trim()

  if (
    !correoPersonal ||
    !validarCorreo(correoPersonal)
  ) {
    errores.correoPersonal =
      'Ingresa un correo personal válido.'
  }

  if (
    !/^\d{1,8}$/.test(
      formulario.telefono,
    )
  ) {
    errores.telefono =
      'El teléfono debe contener un máximo de 8 dígitos.'
  }

  if (!catalogosDisponibles) {
    errores.catalogos =
      'Los catálogos de roles y carreras todavía están pendientes.'
  }

  const carreraId = Number(
    formulario.carreraId,
  )

  if (
    catalogosDisponibles &&
    (
      !Number.isInteger(carreraId) ||
      carreraId <= 0
    )
  ) {
    errores.carreraId =
      'Selecciona una carrera.'
  }

  const rolId = Number(
    formulario.rolId,
  )

  if (
    catalogosDisponibles &&
    (
      !Number.isInteger(rolId) ||
      rolId <= 0
    )
  ) {
    errores.rolId =
      'Selecciona un rol.'
  }

  const mesInicio = Number(
    formulario.mesInicio,
  )

  if (
    !Number.isInteger(mesInicio) ||
    mesInicio < 1 ||
    mesInicio > 12
  ) {
    errores.mesInicio =
      'Selecciona el mes de ingreso.'
  }

  const anioInicio = Number(
    formulario.anioInicio,
  )

  const anioActual =
    new Date().getFullYear()

  if (
    !Number.isInteger(anioInicio) ||
    anioInicio < 2000 ||
    anioInicio > anioActual
  ) {
    errores.anioInicio =
      `El año debe estar entre 2000 y ${anioActual}.`
  }

  return errores
}

function AdminPrincipalCreateStudent() {
  const navigate = useNavigate()

  const [
    formulario,
    setFormulario,
  ] = useState(FORMULARIO_INICIAL)

  const [
    errores,
    setErrores,
  ] = useState({})

  const [
    guardando,
    setGuardando,
  ] = useState(false)

  const [
    dialogoCancelarAbierto,
    setDialogoCancelarAbierto,
  ] = useState(false)

  const catalogoRolesDisponible =
    ROLES_DISPONIBLES.length > 0

  const catalogoCarrerasDisponible =
    CARRERAS_DISPONIBLES.length > 0

  const catalogosDisponibles =
    catalogoRolesDisponible &&
    catalogoCarrerasDisponible

  const formularioModificado =
    Object.values(formulario).some(
      (valor) =>
        String(valor).trim() !== '',
    )

  const rolSeleccionado =
    useMemo(
      () =>
        ROLES_DISPONIBLES.find(
          (rol) =>
            String(rol.id) ===
            formulario.rolId,
        ) ?? null,
      [formulario.rolId],
    )

  const carreraSeleccionada =
    useMemo(
      () =>
        CARRERAS_DISPONIBLES.find(
          (carrera) =>
            String(carrera.id) ===
            formulario.carreraId,
        ) ?? null,
      [formulario.carreraId],
    )

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

  function actualizarCampo(evento) {
    const {
      name,
      value,
    } = evento.target

    /*
     * La cuenta y el teléfono solamente aceptan
     * números antes de guardarlos en el estado.
     */
    const valorPreparado =
      name === 'numeroCuenta' ||
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
        catalogos: '',
      }),
    )
  }

  function regresarAlListado() {
    navigate(
      '/admin-principal/estudiantes',
    )
  }

  function cancelarCreacion() {
    if (!formularioModificado) {
      regresarAlListado()

      return
    }

    setDialogoCancelarAbierto(true)
  }

  function confirmarCancelacion() {
    setDialogoCancelarAbierto(false)
    regresarAlListado()
  }

  async function guardarEstudiante(
    evento,
  ) {
    evento.preventDefault()

    if (!catalogosDisponibles) {
      notificarInformacion({
        id:
          ID_CATALOGOS_PENDIENTES,
        titulo:
          'Catálogos pendientes',
        descripcion:
          'Debemos agregar los identificadores de roles y carreras antes de registrar estudiantes.',
      })

      return
    }

    const erroresEncontrados =
      validarFormulario(
        formulario,
        catalogosDisponibles,
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
          'Corrige los campos marcados antes de guardar al estudiante.',
      })

      return
    }

    if (
      !rolSeleccionado ||
      !carreraSeleccionada
    ) {
      notificarError({
        titulo:
          'Selección no válida',
        descripcion:
          'No fue posible identificar el rol o la carrera seleccionada.',
      })

      return
    }

    setGuardando(true)

    try {
      await crearEstudiante({
        credenciales: {
          rolId:
            Number(
              formulario.rolId,
            ),

          rol:
            rolSeleccionado.nombre,
        },

        datosPersonales: {
          numeroCuenta:
            formulario.numeroCuenta,

          primerNombre:
            formulario.primerNombre,

          segundoNombre:
            formulario.segundoNombre,

          primerApellido:
            formulario.primerApellido,

          segundoApellido:
            formulario.segundoApellido,

          correoInstitucional:
            formulario
              .correoInstitucional,

          correoPersonal:
            formulario.correoPersonal,

          telefono:
            formulario.telefono,

          carreraId:
            Number(
              formulario.carreraId,
            ),

          carrera:
            carreraSeleccionada.nombre,
        },

        datosBecario: {
          mesInicio:
            Number(
              formulario.mesInicio,
            ),

          anioInicio:
            Number(
              formulario.anioInicio,
            ),
        },
      })

      notificarExito({
        id: ID_ESTUDIANTE_CREADO,
        titulo:
          'Estudiante registrado',
        descripcion:
          'La cuenta fue creada y permanecerá inactiva hasta que el estudiante configure su contraseña.',
      })

      navigate(
        '/admin-principal/estudiantes',
        {
          replace: true,
        },
      )
    } catch (errorCreacion) {
      console.log(
        'Error al crear el estudiante: ',
        errorCreacion,
      )

      notificarError({
        id: ID_ERROR_CREACION,
        titulo:
          'No fue posible registrar al estudiante',
        descripcion:
          errorCreacion instanceof Error
            ? errorCreacion.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="admin-create-student-page">
      {/* Ruta de regreso al listado. */}
      <nav
        className="admin-create-student-breadcrumb"
        aria-label="Migas de navegación"
      >
        <Link to="/admin-principal/estudiantes">
        <ArrowLeft aria-hidden="true" />
          Volver a estudiantes
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span>
          Nuevo estudiante
        </span>
      </nav>

      {/* Encabezado de la vista. */}
      <header className="admin-create-student-heading">
        <div>
          <p className="admin-create-student-heading__eyebrow">
            Gestión de estudiantes
          </p>

          <h1>
            Añadir estudiante
          </h1>

          <p>
            Registra la información personal,
            académica y el rol que utilizará
            dentro del sistema.
          </p>
        </div>

        <span className="admin-create-student-heading__badge">
          <UserRound aria-hidden="true" />
          Nuevo registro
        </span>
      </header>

      {!catalogosDisponibles && (
        <section
          className="admin-create-student-catalog-notice"
          role="status"
        >
          <Info aria-hidden="true" />

          <div>
            <strong>
              Catálogos pendientes
            </strong>

            <p>
              Puedes revisar y completar la
              vista. El guardado se habilitará
              cuando agreguemos los IDs de
              roles y carreras.
            </p>
          </div>
        </section>
      )}

      <div className="admin-create-student-layout">
        <form
          className="admin-create-student-form"
          noValidate
          onSubmit={guardarEstudiante}
        >
          {/* Información personal. */}
          <fieldset className="admin-create-student-section">
            <legend>
              <span>
                <UserRound
                  aria-hidden="true"
                />
              </span>

              <span>
                <strong>
                  Información personal
                </strong>

                <small>
                  Datos generales del estudiante
                </small>
              </span>
            </legend>

            <div className="admin-create-student-fields">
              <div className="admin-create-student-field">
                <label htmlFor="estudiante-numero-cuenta">
                  Número de cuenta
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-create-student-input-icon">
                  <IdCard aria-hidden="true" />

                  <input
                    id="estudiante-numero-cuenta"
                    name="numeroCuenta"
                    type="text"
                    inputMode="numeric"
                    maxLength="11"
                    value={
                      formulario.numeroCuenta
                    }
                    placeholder="Ej. 20241001234"
                    aria-invalid={
                      Boolean(
                        errores.numeroCuenta,
                      )
                    }
                    onChange={
                      actualizarCampo
                    }
                  />
                </div>

                <div className="admin-create-student-field__support">
                  <small>
                    Debe contener 11 dígitos.
                  </small>

                  <small>
                    {
                      formulario
                        .numeroCuenta
                        .length
                    }
                    /11
                  </small>
                </div>

                {errores.numeroCuenta && (
                  <p className="admin-create-student-field__error">
                    {errores.numeroCuenta}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-primer-nombre">
                  Primer nombre
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <input
                  id="estudiante-primer-nombre"
                  name="primerNombre"
                  type="text"
                  maxLength="20"
                  value={
                    formulario.primerNombre
                  }
                  placeholder="Ej. María"
                  aria-invalid={
                    Boolean(
                      errores.primerNombre,
                    )
                  }
                  onChange={
                    actualizarCampo
                  }
                />

                {errores.primerNombre && (
                  <p className="admin-create-student-field__error">
                    {errores.primerNombre}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-segundo-nombre">
                  Segundo nombre
                  <small>
                    Opcional
                  </small>
                </label>

                <input
                  id="estudiante-segundo-nombre"
                  name="segundoNombre"
                  type="text"
                  maxLength="20"
                  value={
                    formulario.segundoNombre
                  }
                  placeholder="Ej. Fernanda"
                  onChange={
                    actualizarCampo
                  }
                />
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-primer-apellido">
                  Primer apellido
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <input
                  id="estudiante-primer-apellido"
                  name="primerApellido"
                  type="text"
                  maxLength="20"
                  value={
                    formulario.primerApellido
                  }
                  placeholder="Ej. López"
                  aria-invalid={
                    Boolean(
                      errores.primerApellido,
                    )
                  }
                  onChange={
                    actualizarCampo
                  }
                />

                {errores.primerApellido && (
                  <p className="admin-create-student-field__error">
                    {errores.primerApellido}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-segundo-apellido">
                  Segundo apellido
                  <small>
                    Opcional
                  </small>
                </label>

                <input
                  id="estudiante-segundo-apellido"
                  name="segundoApellido"
                  type="text"
                  maxLength="20"
                  value={
                    formulario.segundoApellido
                  }
                  placeholder="Ej. Martínez"
                  onChange={
                    actualizarCampo
                  }
                />
              </div>
            </div>
          </fieldset>

          {/* Información de contacto. */}
          <fieldset className="admin-create-student-section">
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

            <div className="admin-create-student-fields">
              <div className="admin-create-student-field">
                <label htmlFor="estudiante-correo-institucional">
                  Correo institucional
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-create-student-input-icon">
                  <Mail aria-hidden="true" />

                  <input
                    id="estudiante-correo-institucional"
                    name="correoInstitucional"
                    type="email"
                    maxLength="120"
                    value={
                      formulario
                        .correoInstitucional
                    }
                    placeholder="nombre@unah.hn"
                    autoComplete="off"
                    aria-invalid={
                      Boolean(
                        errores
                          .correoInstitucional,
                      )
                    }
                    onChange={
                      actualizarCampo
                    }
                  />
                </div>

                {errores.correoInstitucional && (
                  <p className="admin-create-student-field__error">
                    {
                      errores
                        .correoInstitucional
                    }
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-correo-personal">
                  Correo personal
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-create-student-input-icon">
                  <Mail aria-hidden="true" />

                  <input
                    id="estudiante-correo-personal"
                    name="correoPersonal"
                    type="email"
                    maxLength="120"
                    value={
                      formulario.correoPersonal
                    }
                    placeholder="correo@ejemplo.com"
                    autoComplete="off"
                    aria-invalid={
                      Boolean(
                        errores.correoPersonal,
                      )
                    }
                    onChange={
                      actualizarCampo
                    }
                  />
                </div>

                {errores.correoPersonal && (
                  <p className="admin-create-student-field__error">
                    {errores.correoPersonal}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-telefono">
                  Teléfono
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-create-student-input-icon">
                  <Phone aria-hidden="true" />

                  <input
                    id="estudiante-telefono"
                    name="telefono"
                    type="tel"
                    inputMode="numeric"
                    maxLength="8"
                    value={
                      formulario.telefono
                    }
                    placeholder="Ej. 99999999"
                    autoComplete="off"
                    aria-invalid={
                      Boolean(
                        errores.telefono,
                      )
                    }
                    onChange={
                      actualizarCampo
                    }
                  />
                </div>

                <div className="admin-create-student-field__support">
                  <small>
                    Máximo 8 dígitos.
                  </small>

                  <small>
                    {
                      formulario
                        .telefono
                        .length
                    }
                    /8
                  </small>
                </div>

                {errores.telefono && (
                  <p className="admin-create-student-field__error">
                    {errores.telefono}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Información académica y acceso. */}
          <fieldset className="admin-create-student-section">
            <legend>
              <span>
                <GraduationCap
                  aria-hidden="true"
                />
              </span>

              <span>
                <strong>
                  Información académica
                </strong>

                <small>
                  Carrera, ingreso y rol del sistema
                </small>
              </span>
            </legend>

            <div className="admin-create-student-fields">
              <div className="admin-create-student-field admin-create-student-field--wide">
                <label htmlFor="estudiante-carrera">
                  Carrera
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <select
                  id="estudiante-carrera"
                  name="carreraId"
                  value={
                    formulario.carreraId
                  }
                  disabled={
                    !catalogoCarrerasDisponible
                  }
                  aria-invalid={
                    Boolean(
                      errores.carreraId,
                    )
                  }
                  onChange={
                    actualizarCampo
                  }
                >
                  <option value="">
                    {catalogoCarrerasDisponible
                      ? 'Selecciona una carrera'
                      : 'Catálogo de carreras pendiente'}
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
                </select>

                {errores.carreraId && (
                  <p className="admin-create-student-field__error">
                    {errores.carreraId}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-rol">
                  Rol del sistema
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <select
                  id="estudiante-rol"
                  name="rolId"
                  value={
                    formulario.rolId
                  }
                  disabled={
                    !catalogoRolesDisponible
                  }
                  aria-invalid={
                    Boolean(
                      errores.rolId,
                    )
                  }
                  onChange={
                    actualizarCampo
                  }
                >
                  <option value="">
                    {catalogoRolesDisponible
                      ? 'Selecciona un rol'
                      : 'Catálogo de roles pendiente'}
                  </option>

                  {ROLES_DISPONIBLES.map(
                    (rol) => (
                      <option
                        key={rol.id}
                        value={rol.id}
                      >
                        {rol.nombre}
                      </option>
                    ),
                  )}
                </select>

                {errores.rolId && (
                  <p className="admin-create-student-field__error">
                    {errores.rolId}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-mes-inicio">
                  Mes de ingreso
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <select
                  id="estudiante-mes-inicio"
                  name="mesInicio"
                  value={
                    formulario.mesInicio
                  }
                  aria-invalid={
                    Boolean(
                      errores.mesInicio,
                    )
                  }
                  onChange={
                    actualizarCampo
                  }
                >
                  <option value="">
                    Selecciona un mes
                  </option>

                  {MESES.map((mes) => (
                    <option
                      key={mes.id}
                      value={mes.id}
                    >
                      {mes.nombre}
                    </option>
                  ))}
                </select>

                {errores.mesInicio && (
                  <p className="admin-create-student-field__error">
                    {errores.mesInicio}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-anio-inicio">
                  Año de ingreso
                  <span aria-hidden="true">
                    *
                  </span>
                </label>

                <div className="admin-create-student-input-icon">
                  <CalendarDays
                    aria-hidden="true"
                  />

                  <input
                    id="estudiante-anio-inicio"
                    name="anioInicio"
                    type="number"
                    min="2000"
                    max={
                      new Date()
                        .getFullYear()
                    }
                    step="1"
                    value={
                      formulario.anioInicio
                    }
                    placeholder={
                      String(
                        new Date()
                          .getFullYear(),
                      )
                    }
                    aria-invalid={
                      Boolean(
                        errores.anioInicio,
                      )
                    }
                    onChange={
                      actualizarCampo
                    }
                  />
                </div>

                {errores.anioInicio && (
                  <p className="admin-create-student-field__error">
                    {errores.anioInicio}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {errores.catalogos && (
            <p className="admin-create-student-form__catalog-error">
              {errores.catalogos}
            </p>
          )}

          <footer className="admin-create-student-form__actions">
            <button
              type="button"
              disabled={guardando}
              onClick={cancelarCreacion}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando ||
                !catalogosDisponibles
              }
              title={
                catalogosDisponibles
                  ? 'Guardar estudiante'
                  : 'Los catálogos todavía están pendientes'
              }
            >
              {guardando ? (
                <LoaderCircle
                  className="admin-create-student-form__loader"
                  aria-hidden="true"
                />
              ) : (
                <Plus aria-hidden="true" />
              )}

              {guardando
                ? 'Guardando...'
                : 'Guardar estudiante'}
            </button>
          </footer>
        </form>

        {/* Resumen de los datos ingresados. */}
        <aside
          className="admin-create-student-preview"
          aria-label="Resumen del estudiante"
        >
          <header className="admin-create-student-preview__header">
            <div>
              <p>Vista previa</p>
              <h2>Nuevo estudiante</h2>
            </div>

            <span>
              Inactivo
            </span>
          </header>

          <div className="admin-create-student-preview__identity">
            <span aria-hidden="true">
              {iniciales}
            </span>

            <div>
              <h3>
                {nombreCompleto ||
                  'Nombre del estudiante'}
              </h3>

              <p>
                {formulario.numeroCuenta ||
                  'Número de cuenta pendiente'}
              </p>
            </div>
          </div>

          <dl className="admin-create-student-preview__details">
            <div>
              <dt>
                <GraduationCap
                  aria-hidden="true"
                />
                Carrera
              </dt>

              <dd>
                {carreraSeleccionada
                  ?.nombre ||
                  'Pendiente'}
              </dd>
            </div>

            <div>
              <dt>
                <ShieldCheck
                  aria-hidden="true"
                />
                Rol
              </dt>

              <dd>
                {rolSeleccionado
                  ?.nombre ||
                  'Pendiente'}
              </dd>
            </div>

            <div>
              <dt>
                <CalendarDays
                  aria-hidden="true"
                />
                Periodo de ingreso
              </dt>

              <dd>
                {obtenerPeriodoDesdeMes(
                  formulario.mesInicio,
                )}

                {formulario.anioInicio
                  ? ` ${formulario.anioInicio}`
                  : ''}
              </dd>
            </div>

            <div>
              <dt>
                <Mail aria-hidden="true" />
                Correo institucional
              </dt>

              <dd>
                {formulario
                  .correoInstitucional
                  .trim() ||
                  'Pendiente'}
              </dd>
            </div>
          </dl>

          <div className="admin-create-student-preview__notice">
            <ShieldCheck
              aria-hidden="true"
            />

            <div>
              <strong>
                Activación pendiente
              </strong>

              <p>
                El estudiante deberá solicitar
                su PIN y crear una contraseña
                antes de ingresar al sistema.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmación antes de abandonar el formulario. */}
      <AlertDialog.Root
        open={dialogoCancelarAbierto}
        onOpenChange={
          setDialogoCancelarAbierto
        }
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-create-student-cancel-dialog__overlay" />

          <AlertDialog.Content className="admin-create-student-cancel-dialog__content">
            <div className="admin-create-student-cancel-dialog__icon">
              <TriangleAlert
                aria-hidden="true"
              />
            </div>

            <AlertDialog.Title className="admin-create-student-cancel-dialog__title">
              ¿Cancelar el registro?
            </AlertDialog.Title>

            <AlertDialog.Description className="admin-create-student-cancel-dialog__description">
              La información ingresada se
              perderá y no será posible
              recuperarla.
            </AlertDialog.Description>

            <div className="admin-create-student-cancel-dialog__actions">
              <AlertDialog.Cancel asChild>
                <button
                  className="admin-create-student-cancel-dialog__continue"
                  type="button"
                >
                  Continuar editando
                </button>
              </AlertDialog.Cancel>

              <button
                className="admin-create-student-cancel-dialog__confirm"
                type="button"
                onClick={
                  confirmarCancelacion
                }
              >
                Sí, cancelar
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

export default AdminPrincipalCreateStudent