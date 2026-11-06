import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  ExternalLink,
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
  useEffect,
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
  buscarEstudiantePorDato,
  listarCarrerasDisponibles,
} from '../services/adminEstudiantesService.js'

import '../styles/AdminPrincipalCreateStudent.css'

/*
 * El rol de los estudiantes se asigna automáticamente en el backend;
 * aquí solo se muestra como información de solo lectura.
 */
const ROL_BECARIO = 'Becario'

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
  errorCatalogoCarreras = '',
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
      errorCatalogoCarreras ||
      'El catálogo de carreras todavía no está disponible.'
  }

  const carreraId = Number(
    formulario.carreraId,
  )

  /*
   * La carrera es obligatoria únicamente si el catálogo cargó.
   * Se acepta cualquier id que exista en el catálogo, incluido 0:
   * algunas bases antiguas registraron carreras con ese id.
   */
  if (
    catalogosDisponibles &&
    (
      !String(formulario.carreraId).trim() ||
      !Number.isInteger(carreraId) ||
      carreraId < 0
    )
  ) {
    errores.carreraId =
      'Selecciona una carrera.'
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

  /*
   * Carreras activas para asignar al estudiante nuevo.
   */
  const [
    carreras,
    setCarreras,
  ] = useState([])

  const [
    cargandoCarreras,
    setCargandoCarreras,
  ] = useState(true)

  const [
    errorCarreras,
    setErrorCarreras,
  ] = useState('')

  useEffect(() => {
    let componenteMontado = true

    async function cargarCarreras() {
      setCargandoCarreras(true)
      setErrorCarreras('')

      try {
        const obtenidas =
          await listarCarrerasDisponibles()

        if (componenteMontado) {
          setCarreras(obtenidas)
        }
      } catch (errorCarga) {
        if (!componenteMontado) {
          return
        }

        console.log(
          'Error al cargar carreras: ',
          errorCarga,
        )

        setCarreras([])

        setErrorCarreras(
          errorCarga instanceof Error
            ? errorCarga.message
            : 'No fue posible cargar el catálogo de carreras.',
        )
      } finally {
        if (componenteMontado) {
          setCargandoCarreras(false)
        }
      }
    }

    cargarCarreras()

    return () => {
      componenteMontado = false
    }
  }, [])

  const catalogoCarrerasDisponible =
    carreras.length > 0

  const catalogosDisponibles =
    catalogoCarrerasDisponible

  const formularioModificado =
    Object.values(formulario).some(
      (valor) =>
        String(valor).trim() !== '',
    )

  const carreraSeleccionada =
    useMemo(
      () =>
        carreras.find(
          (carrera) =>
            String(carrera.id).trim() ===
            String(
              formulario.carreraId,
            ).trim(),
        ) ?? null,
      [carreras, formulario.carreraId],
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

  /*
   * Si la carrera ya es válida, el mensaje de error anterior
   * deja de aplicar. Sin esto el texto permanece visible aunque
   * el usuario ya haya corregido la selección.
   */
  const carreraValida =
    Boolean(carreraSeleccionada)

  useEffect(() => {
    if (!carreraValida) {
      return
    }

    setErrores((actuales) => {
      if (!actuales.carreraId) {
        return actuales
      }

      return {
        ...actuales,
        carreraId: '',
      }
    })
  }, [carreraValida])

  const iniciales =
    obtenerIniciales(
      formulario.primerNombre,
      formulario.primerApellido,
    )

  /*
   * Estado de la comprobación en vivo de cada dato único.
   * `estado`: 'inactivo' | 'verificando' | 'libre' | 'ocupado'.
   */
  const [
    verificacionCuenta,
    setVerificacionCuenta,
  ] = useState({
    estado: 'inactivo',
    estudiante: null,
  })

  const [
    verificacionCorreo,
    setVerificacionCorreo,
  ] = useState({
    estado: 'inactivo',
    estudiante: null,
  })

  const [
    duplicadoAlGuardar,
    setDuplicadoAlGuardar,
  ] = useState(null)

  const cuentaCompleta =
    /^\d{11}$/.test(
      formulario.numeroCuenta,
    )

  const correoCompleto =
    /^[^\s@]+@unah\.hn$/.test(
      formulario.correoInstitucional
        .trim()
        .toLowerCase(),
    )

  /*
   * Comprueba cada dato completo contra el backend mientras se escribe,
   * para avisar de un duplicado antes de llenar el resto del formulario.
   */
  useEffect(() => {
    if (!cuentaCompleta) {
      setVerificacionCuenta({
        estado: 'inactivo',
        estudiante: null,
      })

      return undefined
    }

    let consultaActiva = true

    setVerificacionCuenta({
      estado: 'verificando',
      estudiante: null,
    })

    const temporizador = window.setTimeout(
      async () => {
        try {
          const encontrado =
            await buscarEstudiantePorDato(
              'numeroCuenta',
              formulario.numeroCuenta,
            )

          if (consultaActiva) {
            setVerificacionCuenta({
              estado: encontrado
                ? 'ocupado'
                : 'libre',
              estudiante: encontrado,
            })
          }
        } catch {
          /* Es una ayuda: un fallo no debe bloquear el formulario. */
          if (consultaActiva) {
            setVerificacionCuenta({
              estado: 'inactivo',
              estudiante: null,
            })
          }
        }
      },
      450,
    )

    return () => {
      consultaActiva = false
      window.clearTimeout(temporizador)
    }
  }, [cuentaCompleta, formulario.numeroCuenta])

  useEffect(() => {
    if (!correoCompleto) {
      setVerificacionCorreo({
        estado: 'inactivo',
        estudiante: null,
      })

      return undefined
    }

    let consultaActiva = true

    setVerificacionCorreo({
      estado: 'verificando',
      estudiante: null,
    })

    const temporizador = window.setTimeout(
      async () => {
        try {
          const encontrado =
            await buscarEstudiantePorDato(
              'correoInstitucional',
              formulario.correoInstitucional,
            )

          if (consultaActiva) {
            setVerificacionCorreo({
              estado: encontrado
                ? 'ocupado'
                : 'libre',
              estudiante: encontrado,
            })
          }
        } catch {
          if (consultaActiva) {
            setVerificacionCorreo({
              estado: 'inactivo',
              estudiante: null,
            })
          }
        }
      },
      450,
    )

    return () => {
      consultaActiva = false
      window.clearTimeout(temporizador)
    }
  }, [correoCompleto, formulario.correoInstitucional])

  function abrirEstudianteExistente(estudiante) {
    const numeroCuenta =
      estudiante?.datosPersonales
        ?.numeroCuenta

    if (!numeroCuenta) {
      return
    }

    navigate(
      `/admin-principal/estudiantes/${encodeURIComponent(
        numeroCuenta,
      )}`,
    )
  }

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
          'Catálogo de carreras no disponible',
        descripcion:
          errorCarreras ||
          'No hay carreras activas para asignar. Registra una carrera e intenta de nuevo.',
      })

      return
    }

    /*
     * Si la comprobación en vivo ya encontró el dato, no se envía nada:
     * el usuario debe ir al registro existente o corregir el campo.
     */
    if (
      verificacionCuenta.estado === 'ocupado' ||
      verificacionCorreo.estado === 'ocupado'
    ) {
      const datosDuplicados =
        verificacionCuenta.estado === 'ocupado'
          ? verificacionCuenta
          : verificacionCorreo

      setDuplicadoAlGuardar({
        campo: datosDuplicados.estudiante?.campo,
        datosPersonales:
          datosDuplicados.estudiante
            ?.datosPersonales,
      })

      notificarError({
        id: ID_ERROR_CREACION,
        titulo: 'Datos ya registrados',
        descripcion:
          'Corrige el número de cuenta o el correo institucional, o abre la ficha del estudiante existente.',
      })

      return
    }

    const erroresEncontrados =
      validarFormulario(
        formulario,
        catalogosDisponibles,
        errorCarreras,
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
      !carreraSeleccionada
    ) {
      notificarError({
        titulo:
          'Selección no válida',
        descripcion:
          'No fue posible identificar la carrera seleccionada.',
      })

      return
    }

    setGuardando(true)
    setDuplicadoAlGuardar(null)

    try {
      await crearEstudiante({
        credenciales: {
          /*
           * El rol de becario lo resuelve el backend por nombre,
           * así que no se envía su identificador desde aquí.
           */
          rol:
            ROL_BECARIO,
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

      /*
       * El backend responde 409 con el campo repetido y el número
       * de cuenta del registro existente. Se ofrece ir a verlo.
       */
      const duplicado =
        errorCreacion?.detalles?.detail

      if (duplicado?.campo) {
        setDuplicadoAlGuardar({
          campo: duplicado.campo,
          datosPersonales: {
            numeroCuenta:
              duplicado.num_cuenta,
            nombreCompleto:
              duplicado.nombre_completo,
            correoInstitucional:
              duplicado
                .correo_institucional,
          },
        })
      }

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

  /*
   * Aviso reutilizable cuando el dato escrito ya pertenece a otro
   * estudiante: explica cuál se repite y ofrece ir a su ficha.
   */
  function renderAvisoDuplicado(campo) {
    const verificacion =
      campo === 'numeroCuenta'
        ? verificacionCuenta
        : verificacionCorreo

    const coincidencia =
      duplicadoAlGuardar?.campo === campo
        ? duplicadoAlGuardar
        : verificacion.estado === 'ocupado'
          ? verificacion.estudiante
          : null

    if (!coincidencia) {
      if (
        verificacion.estado === 'verificando' &&
        duplicadoAlGuardar?.campo !== campo
      ) {
        return (
          <p className="admin-create-student-field__check">
            <LoaderCircle
              className="admin-create-student-form__loader"
              aria-hidden="true"
            />
            Comprobando disponibilidad…
          </p>
        )
      }

      if (
        verificacion.estado === 'libre' &&
        !duplicadoAlGuardar
      ) {
        return (
          <p className="admin-create-student-field__check admin-create-student-field__check--free">
            <CircleCheck aria-hidden="true" />
            {campo === 'numeroCuenta'
              ? 'Número de cuenta disponible.'
              : 'Correo institucional disponible.'}
          </p>
        )
      }

      return null
    }

    const nombre =
      coincidencia.datosPersonales
        ?.nombreCompleto

    /*
     * Si vino del error del backend, el botón lleva a su ficha;
     * si vino de la comprobación previa, lleva al listado filtrando
     * por la cuenta, que es la vista pública de ese registro.
     */
    const esDuplicadoDelGuardado =
      duplicadoAlGuardar?.campo === campo

    return (
      <div
        className="admin-create-student-duplicate"
        role="status"
      >
        <TriangleAlert aria-hidden="true" />

        <div>
          <strong>
            {campo === 'numeroCuenta'
              ? 'Ese número de cuenta ya existe'
              : 'Ese correo institucional ya está en uso'}
            {nombre ? `: ${nombre}` : '.'}
          </strong>

          <p>
            Revisa su ficha antes de crear un
            registro nuevo.
          </p>

          <button
            type="button"
            onClick={() =>
              esDuplicadoDelGuardado
                ? abrirEstudianteExistente(
                    coincidencia,
                  )
                : navigate(
                    `/admin-principal/estudiantes?busqueda=${encodeURIComponent(
                      coincidencia
                        .datosPersonales
                        ?.numeroCuenta ?? '',
                    )}`,
                  )
            }
          >
            <ExternalLink aria-hidden="true" />
            Ver estudiante existente
          </button>
        </div>
      </div>
    )
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

                {renderAvisoDuplicado(
                  'numeroCuenta',
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

                {renderAvisoDuplicado(
                  'correoInstitucional',
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
                    {cargandoCarreras
                      ? 'Cargando carreras…'
                      : catalogoCarrerasDisponible
                        ? 'Selecciona una carrera'
                        : 'No hay carreras disponibles'}
                  </option>

                  {carreras.map(
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

                {!cargandoCarreras &&
                  errorCarreras && (
                  <p className="admin-create-student-field__error">
                    {errorCarreras}
                  </p>
                )}
              </div>

              <div className="admin-create-student-field">
                <label htmlFor="estudiante-rol">
                  Rol del sistema
                </label>

                {/*
                  * Todos los estudiantes creados aquí son becarios;
                  * el backend asigna ese rol automáticamente.
                  */}
                <input
                  id="estudiante-rol"
                  type="text"
                  value={ROL_BECARIO}
                  readOnly
                  disabled
                  aria-describedby="estudiante-rol-ayuda"
                />

                <p
                  id="estudiante-rol-ayuda"
                  className="admin-create-student-field__hint"
                >
                  Se asigna automáticamente al registrar al
                  estudiante.
                </p>
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
                {ROL_BECARIO}
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