import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Info,
  LoaderCircle,
  MapPin,
  Save,
  TriangleAlert,
  UsersRound,
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
  limpiarNotificaciones,
  notificarError,
  notificarExito,
  solicitarConfirmacion,
} from '../../../services/notificationService.js'

import {
  actualizarActividad,
  obtenerActividad,
} from '../services/adminActividadesService.js'

import '../styles/AdminPrincipalEditActivity.css'


// Valores utilizados mientras se carga la actividad.
const FORMULARIO_VACIO = {
  titulo: '',
  descripcion: '',
  fecha: '',
  horaInicio: '',
  horaFinalizacion: '',
  lugar: '',
  horasAcreditables: '',
  cuposTotales: '',
}


// Evitan que se acumulen notificaciones iguales.
const ID_CONFIRMACION_CANCELAR =
  'confirmacion-cancelar-edicion-actividad'

const ID_ACTIVIDAD_ACTUALIZADA =
  'actividad-actualizada'

const ID_ERROR_ACTUALIZACION =
  'error-actualizar-actividad'


// Obtiene la fecha actual sin alterarla por la zona horaria.
function obtenerFechaHoy() {
  const fechaActual = new Date()

  const anio =
    fechaActual.getFullYear()

  const mes = String(
    fechaActual.getMonth() + 1,
  ).padStart(2, '0')

  const dia = String(
    fechaActual.getDate(),
  ).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}


// Convierte la actividad al formato que utilizan los inputs.
function prepararFormulario(
  actividad,
) {
  return {
    titulo:
      String(
        actividad?.titulo ?? '',
      ),

    descripcion:
      String(
        actividad?.descripcion ?? '',
      ),

    fecha:
      String(
        actividad?.fecha ?? '',
      ),

    horaInicio:
      String(
        actividad?.horaInicio ?? '',
      ),

    horaFinalizacion:
      String(
        actividad?.horaFinalizacion ??
          '',
      ),

    lugar:
      String(
        actividad?.lugar ?? '',
      ),

    horasAcreditables:
      String(
        actividad
          ?.horasAcreditables ?? '',
      ),

    cuposTotales:
      String(
        actividad?.cuposTotales ?? '',
      ),
  }
}


// Prepara el estado para utilizarlo como clase CSS.
function prepararEstado(
  estado,
) {
  return String(
    estado ?? '',
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}


// Devuelve el nombre que se mostrará en la insignia.
function formatearEstado(
  estado,
) {
  const nombres = {
    programada: 'Programada',
    'en-curso': 'En curso',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }

  const estadoPreparado =
    prepararEstado(estado)

  return (
    nombres[estadoPreparado] ??
    'Sin estado'
  )
}


// Aplica el color correspondiente al estado de la actividad.
function obtenerClaseEstado(
  estado,
) {
  const estadoPreparado =
    prepararEstado(estado)

  const estadosPermitidos = [
    'programada',
    'en-curso',
    'finalizada',
    'cancelada',
  ]

  if (
    !estadosPermitidos.includes(
      estadoPreparado,
    )
  ) {
    return 'admin-edit-activity-status'
  }

  return (
    'admin-edit-activity-status ' +
    `admin-edit-activity-status--${estadoPreparado}`
  )
}


// Comprueba si el administrador modificó algún campo.
function formularioTieneCambios(
  formulario,
  formularioOriginal,
) {
  if (!formularioOriginal) {
    return false
  }

  return Object.keys(
    FORMULARIO_VACIO,
  ).some(
    (campo) =>
      formulario[campo] !==
      formularioOriginal[campo],
  )
}


// Valida únicamente los datos aceptados por el contrato actual.
function validarFormulario(
  formulario,
  estudiantesInscritos,
) {
  const errores = {}

  const titulo =
    formulario.titulo.trim()

  const descripcion =
    formulario.descripcion.trim()

  const lugar =
    formulario.lugar.trim()

  if (!titulo) {
    errores.titulo =
      'El título es obligatorio.'
  } else if (titulo.length > 120) {
    errores.titulo =
      'El título no puede superar los 120 caracteres.'
  }

  if (!descripcion) {
    errores.descripcion =
      'La descripción es obligatoria.'
  } else if (
    descripcion.length > 500
  ) {
    errores.descripcion =
      'La descripción no puede superar los 500 caracteres.'
  }

  if (!lugar) {
    errores.lugar =
      'El lugar es obligatorio.'
  } else if (lugar.length > 160) {
    errores.lugar =
      'El lugar no puede superar los 160 caracteres.'
  }

  if (!formulario.fecha) {
    errores.fecha =
      'La fecha es obligatoria.'
  } else if (
    formulario.fecha <
    obtenerFechaHoy()
  ) {
    errores.fecha =
      'La fecha no puede ser anterior a hoy.'
  }

  if (!formulario.horaInicio) {
    errores.horaInicio =
      'La hora de inicio es obligatoria.'
  }

  if (!formulario.horaFinalizacion) {
    errores.horaFinalizacion =
      'La hora de finalización es obligatoria.'
  }

  if (
    formulario.horaInicio &&
    formulario.horaFinalizacion &&
    formulario.horaFinalizacion <=
      formulario.horaInicio
  ) {
    errores.horaFinalizacion =
      'Debe ser posterior a la hora de inicio.'
  }

  const horasAcreditables =
    Number(
      formulario.horasAcreditables,
    )

  if (
    !Number.isInteger(
      horasAcreditables,
    ) ||
    horasAcreditables < 1 ||
    horasAcreditables > 100
  ) {
    errores.horasAcreditables =
      'Las horas deben ser un número entero entre 1 y 100.'
  }

  const cuposTotales =
    Number(
      formulario.cuposTotales,
    )

  if (
    !Number.isInteger(
      cuposTotales,
    ) ||
    cuposTotales < 1
  ) {
    errores.cuposTotales =
      'Los cupos deben ser un número entero mayor que cero.'
  } else if (
    cuposTotales <
    estudiantesInscritos
  ) {
    errores.cuposTotales =
      `No puedes establecer menos de ${estudiantesInscritos} cupos porque ya existen estudiantes inscritos.`
  }

  return errores
}


function AdminPrincipalEditActivity() {
  const { actividadId } =
    useParams()

  const navigate =
    useNavigate()


  // Actividad recuperada desde el mock o la API.
  const [
    actividad,
    setActividad,
  ] = useState(null)


  // Datos que actualmente aparecen en el formulario.
  const [
    formulario,
    setFormulario,
  ] = useState(
    FORMULARIO_VACIO,
  )


  // Copia utilizada para detectar cambios sin guardar.
  const [
    formularioOriginal,
    setFormularioOriginal,
  ] = useState(null)

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


  /*
   * Recupera la actividad cuando se abre la vista.
   * El servicio decide si utiliza el mock o la API.
   */
  useEffect(() => {
    let componenteMontado = true

    async function cargarActividad() {
      setCargando(true)
      setErrorCarga('')

      try {
        const actividadObtenida =
          await obtenerActividad(
            actividadId,
          )

        if (!componenteMontado) {
          return
        }

        if (!actividadObtenida) {
          setActividad(null)

          setErrorCarga(
            'No encontramos la actividad que deseas editar.',
          )

          return
        }

        const datosFormulario =
          prepararFormulario(
            actividadObtenida,
          )

        setActividad(
          actividadObtenida,
        )

        setFormulario(
          datosFormulario,
        )

        setFormularioOriginal({
          ...datosFormulario,
        })
      } catch (error) {
        if (!componenteMontado) {
          return
        }

        setActividad(null)

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la actividad.',
        )
      } finally {
        if (componenteMontado) {
          setCargando(false)
        }
      }
    }

    cargarActividad()

    return () => {
      componenteMontado = false
    }
  }, [
    actividadId,
    recarga,
  ])


  /*
   * La cantidad de inscritos se obtiene comparando
   * los cupos totales con los cupos disponibles.
   */
  const estudiantesInscritos =
    useMemo(() => {
      const cuposTotales =
        Number(
          actividad?.cuposTotales,
        )

      const cuposDisponibles =
        Number(
          actividad
            ?.cuposDisponibles,
        )

      if (
        !Number.isFinite(
          cuposTotales,
        ) ||
        !Number.isFinite(
          cuposDisponibles,
        )
      ) {
        return 0
      }

      return Math.max(
        0,
        cuposTotales -
          cuposDisponibles,
      )
    }, [
      actividad,
    ])


  // Habilita el guardado solo cuando existe un cambio.
  const formularioModificado =
    useMemo(
      () =>
        formularioTieneCambios(
          formulario,
          formularioOriginal,
        ),
      [
        formulario,
        formularioOriginal,
      ],
    )


  function obtenerRutaDetalle() {
    return (
      '/admin-principal/actividades/' +
      encodeURIComponent(
        actividadId,
      )
    )
  }


  // Actualiza el campo escrito y limpia su error anterior.
  function actualizarCampo(
    evento,
  ) {
    const {
      name,
      value,
    } = evento.target

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [name]: value,
      }),
    )

    setErrores(
      (erroresActuales) => ({
        ...erroresActuales,
        [name]: '',
      }),
    )
  }


  function regresarAVistaAnterior() {
    limpiarNotificaciones(
      ID_CONFIRMACION_CANCELAR,
    )

    navigate(-1)
  }

  
  function volverAlListado() {
    navigate(
      '/admin-principal/actividades',
    )
  }

/*
* Si existen cambios se solicita confirmación
* antes de regresar a la pantalla anterior.
*/
function cancelarEdicion() {
  if (guardando) {
    return
  }

  if (!formularioModificado) {
    regresarAVistaAnterior()

    return
  }

  solicitarConfirmacion({
    id: ID_CONFIRMACION_CANCELAR,

    titulo:
      '¿Descartar los cambios?',

    descripcion:
      'La información modificada no se guardará.',

    textoConfirmar:
      'Sí, descartar',

    textoCancelar:
      'Continuar editando',

    alConfirmar:
      regresarAVistaAnterior,
  })
}
  function reintentarCarga() {
    setRecarga(
      (valorActual) =>
        valorActual + 1,
    )
  }


  // Valida y envía los cambios al servicio administrativo.
  async function guardarCambios(
    evento,
  ) {
    evento.preventDefault()

    if (
      guardando ||
      !formularioModificado
    ) {
      return
    }

    const erroresEncontrados =
      validarFormulario(
        formulario,
        estudiantesInscritos,
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
          'Corrige los campos marcados antes de guardar.',
      })

      return
    }

    setGuardando(true)

    try {
      const nuevosCuposTotales =
        Number(
          formulario.cuposTotales,
        )

      /*
       * En el mock también mantenemos actualizados los
       * espacios restantes de la actividad.
       */
      await actualizarActividad(
        actividadId,
        {
          titulo:
            formulario.titulo.trim(),

          descripcion:
            formulario
              .descripcion
              .trim(),

          fecha:
            formulario.fecha,

          horaInicio:
            formulario.horaInicio,

          horaFinalizacion:
            formulario
              .horaFinalizacion,

          lugar:
            formulario.lugar.trim(),

          horasAcreditables:
            Number(
              formulario
                .horasAcreditables,
            ),

          cuposTotales:
            nuevosCuposTotales,

          cuposDisponibles:
            nuevosCuposTotales -
            estudiantesInscritos,
        },
      )

      notificarExito({
        id:
          ID_ACTIVIDAD_ACTUALIZADA,

        titulo:
          'Actividad actualizada',

        descripcion:
          'Los cambios se guardaron correctamente.',
      })

      navigate(
        obtenerRutaDetalle(),
        {
          replace: true,
        },
      )
    } catch (error) {
      console.log(error)

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


  // Estado mostrado mientras se consulta la actividad.
  if (cargando) {
    return (
      <div className="admin-edit-activity-page">
        <section
          className="admin-edit-activity-state"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="admin-edit-activity-state__content">
            <span
              className="admin-edit-activity-state__loader"
              aria-hidden="true"
            />

            <h2>Cargando actividad</h2>

            <p>
              Estamos preparando la información
              que podrás editar.
            </p>
          </div>
        </section>
      </div>
    )
  }


  // Estado mostrado cuando la actividad no está disponible.
  if (
    errorCarga ||
    !actividad
  ) {
    return (
      <div className="admin-edit-activity-page">
        <section
          className="admin-edit-activity-state"
          role="alert"
        >
          <div className="admin-edit-activity-state__content">
            <span
              className="admin-edit-activity-state__icon"
              aria-hidden="true"
            >
              <TriangleAlert />
            </span>

            <h2>
              No pudimos cargar la actividad
            </h2>

            <p>
              {errorCarga ||
                'La actividad solicitada no está disponible.'}
            </p>

            <div className="admin-edit-activity-state__actions">
              <button
                type="button"
                className="admin-edit-activity-cancel"
                onClick={volverAlListado}
              >
                <ArrowLeft aria-hidden="true" />
                Volver a actividades
              </button>

              <button
                type="button"
                className="admin-edit-activity-submit"
                onClick={reintentarCarga}
              >
                <LoaderCircle aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }


  return (
    <div className="admin-edit-activity-page">
      {/* Regresa a la pantalla desde donde se abrio la edicion. */}
      <nav
        className="admin-edit-activity-breadcrumb"
        aria-label="Migas de navegación"
      >
        <button
          type="button"
          onClick={cancelarEdicion}
        >
          <ArrowLeft aria-hidden="true" />
          Volver
        </button>

        <span
          className="admin-edit-activity-breadcrumb__separator"
          aria-hidden="true"
        >
          /
        </span>

        <span>Editar actividad</span>
      </nav>


      {/* Título de la vista y estado actual de la actividad. */}
      <header className="admin-edit-activity-heading">
        <div className="admin-edit-activity-heading__title">
          <h1>Editar actividad</h1>

          <span
            className={obtenerClaseEstado(
              actividad.estado,
            )}
          >
            <CalendarDays aria-hidden="true" />

            {formatearEstado(
              actividad.estado,
            )}
          </span>
        </div>

        <p>
          Actualiza únicamente la información
          necesaria de la actividad.
        </p>
      </header>


      {/* Formulario principal de edición. */}
      <form
        className="admin-edit-activity-form"
        noValidate
        onSubmit={guardarCambios}
      >
        <div className="admin-edit-activity-form__grid">
          {/* Información principal de la actividad. */}
          <div className="admin-edit-field admin-edit-field--full">
            <label htmlFor="editar-actividad-titulo">
              Nombre de la actividad
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.titulo
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon admin-edit-control__icon--navy"
                aria-hidden="true"
              >
                <FileText />
              </span>

              <input
                id="editar-actividad-titulo"
                name="titulo"
                type="text"
                maxLength="120"
                value={formulario.titulo}
                placeholder="Nombre de la actividad"
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.titulo,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            <p className="admin-edit-field__support">
              {formulario.titulo.length}/120
              caracteres
            </p>

            {errores.titulo && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.titulo}
              </p>
            )}
          </div>


          <div className="admin-edit-field admin-edit-field--full">
            <label htmlFor="editar-actividad-descripcion">
              Descripción
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.descripcion
                  ? 'admin-edit-control admin-edit-control--textarea admin-edit-control--error'
                  : 'admin-edit-control admin-edit-control--textarea'
              }
            >
              <span
                className="admin-edit-control__icon"
                aria-hidden="true"
              >
                <FileText />
              </span>

              <textarea
                id="editar-actividad-descripcion"
                name="descripcion"
                rows="4"
                maxLength="500"
                value={
                  formulario.descripcion
                }
                placeholder="Descripción de la actividad"
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.descripcion,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            <p className="admin-edit-field__support">
              {formulario.descripcion.length}/500
              caracteres
            </p>

            {errores.descripcion && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.descripcion}
              </p>
            )}
          </div>


          {/* Fecha y horario en que se realizará la actividad. */}
          <div className="admin-edit-field admin-edit-field--wide">
            <label htmlFor="editar-actividad-fecha">
              Fecha de la actividad
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.fecha
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon"
                aria-hidden="true"
              >
                <CalendarDays />
              </span>

              <input
                id="editar-actividad-fecha"
                name="fecha"
                type="date"
                min={obtenerFechaHoy()}
                value={formulario.fecha}
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.fecha,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.fecha && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.fecha}
              </p>
            )}
          </div>


          <div className="admin-edit-field">
            <label htmlFor="editar-actividad-hora-inicio">
              Hora de inicio
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.horaInicio
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon admin-edit-control__icon--gold"
                aria-hidden="true"
              >
                <Clock3 />
              </span>

              <input
                id="editar-actividad-hora-inicio"
                name="horaInicio"
                type="time"
                value={
                  formulario.horaInicio
                }
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.horaInicio,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.horaInicio && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.horaInicio}
              </p>
            )}
          </div>


          <div className="admin-edit-field">
            <label htmlFor="editar-actividad-hora-finalizacion">
              Hora de finalización
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.horaFinalizacion
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon admin-edit-control__icon--gold"
                aria-hidden="true"
              >
                <Clock3 />
              </span>

              <input
                id="editar-actividad-hora-finalizacion"
                name="horaFinalizacion"
                type="time"
                value={
                  formulario
                    .horaFinalizacion
                }
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores
                      .horaFinalizacion,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.horaFinalizacion && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />

                {
                  errores
                    .horaFinalizacion
                }
              </p>
            )}
          </div>


          {/* Lugar, horas y capacidad total publicada. */}
          <div className="admin-edit-field admin-edit-field--wide">
            <label htmlFor="editar-actividad-lugar">
              Lugar
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.lugar
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon admin-edit-control__icon--green"
                aria-hidden="true"
              >
                <MapPin />
              </span>

              <input
                id="editar-actividad-lugar"
                name="lugar"
                type="text"
                maxLength="160"
                value={formulario.lugar}
                placeholder="Lugar de la actividad"
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.lugar,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.lugar && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.lugar}
              </p>
            )}
          </div>


          <div className="admin-edit-field">
            <label htmlFor="editar-actividad-horas">
              Horas acreditables
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.horasAcreditables
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon"
                aria-hidden="true"
              >
                <Clock3 />
              </span>

              <input
                id="editar-actividad-horas"
                name="horasAcreditables"
                type="number"
                min="1"
                max="100"
                step="1"
                value={
                  formulario
                    .horasAcreditables
                }
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores
                      .horasAcreditables,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.horasAcreditables && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />

                {
                  errores
                    .horasAcreditables
                }
              </p>
            )}
          </div>


          <div className="admin-edit-field">
            <label htmlFor="editar-actividad-cupos">
              Cupos totales
              <span
                className="admin-edit-field__required"
                aria-hidden="true"
              >
                {' '}*
              </span>
            </label>

            <div
              className={
                errores.cuposTotales
                  ? 'admin-edit-control admin-edit-control--error'
                  : 'admin-edit-control'
              }
            >
              <span
                className="admin-edit-control__icon admin-edit-control__icon--navy"
                aria-hidden="true"
              >
                <UsersRound />
              </span>

              <input
                id="editar-actividad-cupos"
                name="cuposTotales"
                type="number"
                min={Math.max(
                  1,
                  estudiantesInscritos,
                )}
                step="1"
                value={
                  formulario.cuposTotales
                }
                disabled={guardando}
                aria-invalid={
                  Boolean(
                    errores.cuposTotales,
                  )
                }
                onChange={actualizarCampo}
              />
            </div>

            <p className="admin-edit-field__support">
              {estudiantesInscritos === 1
                ? 'Actualmente hay 1 estudiante inscrito.'
                : `Actualmente hay ${estudiantesInscritos} estudiantes inscritos.`}
            </p>

            {errores.cuposTotales && (
              <p className="admin-edit-field__error">
                <TriangleAlert aria-hidden="true" />
                {errores.cuposTotales}
              </p>
            )}
          </div>
        </div>


        {/* Aviso sobre el alcance de los cambios realizados. */}
        <div className="admin-edit-activity-note">
          <span
            className="admin-edit-activity-note__icon"
            aria-hidden="true"
          >
            <Info />
          </span>

          <span>
            Los cambios se reflejarán en la
            actividad publicada para los
            estudiantes.
          </span>
        </div>


        {/* Acciones finales del formulario. */}
        <footer className="admin-edit-activity-form__actions">
          <button
            type="button"
            className="admin-edit-activity-cancel"
            disabled={guardando}
            onClick={cancelarEdicion}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="admin-edit-activity-submit"
            disabled={
              guardando ||
              !formularioModificado
            }
          >
            {guardando ? (
              <span
                className="admin-edit-activity-submit__loader"
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
    </div>
  )
}

export default AdminPrincipalEditActivity