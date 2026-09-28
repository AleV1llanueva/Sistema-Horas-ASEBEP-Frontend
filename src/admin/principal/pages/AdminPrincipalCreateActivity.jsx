import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router'

import {
  limpiarNotificaciones,
  notificarError,
  notificarExito,
  solicitarConfirmacion,
} from '../../../services/notificationService.js'
import {
  crearActividad,
} from '../services/adminActividadesService.js'
import '../styles/AdminPrincipalCreateActivity.css'

const FORMULARIO_INICIAL = {
  titulo: '',
  descripcion: '',
  lugar: '',
  fecha: '',
  horaInicio: '',
  horaFinalizacion: '',
  cuposDisponibles: '',
  horasAcreditables: '',
}

const ID_CONFIRMACION_CANCELAR =
  'confirmacion-cancelar-actividad'

const ID_ACTIVIDAD_PUBLICADA =
  'actividad-publicada'

const ID_ERROR_PUBLICACION =
  'error-publicar-actividad'

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

function formatearFecha(fecha) {
  if (!fecha) {
    return 'Fecha pendiente'
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha.split('-').map(Number)

  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia,
  )

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(fechaLocal)
}

function formatearHora(hora) {
  if (!hora) {
    return ''
  }

  const [
    horas,
    minutos,
  ] = hora.split(':').map(Number)

  const fechaHora = new Date()

  fechaHora.setHours(
    horas,
    minutos,
    0,
    0,
  )

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    },
  ).format(fechaHora)
}

function validarFormulario(
  formulario,
) {
  const errores = {}

  if (!formulario.titulo.trim()) {
    errores.titulo =
      'El título es obligatorio.'
  }

  if (!formulario.descripcion.trim()) {
    errores.descripcion =
      'La descripción es obligatoria.'
  }

  if (!formulario.lugar.trim()) {
    errores.lugar =
      'El lugar es obligatorio.'
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

  const cupos = Number(
    formulario.cuposDisponibles,
  )

  if (
    !Number.isInteger(cupos) ||
    cupos < 1
  ) {
    errores.cuposDisponibles =
      'Los cupos deben ser un número entero mayor que cero.'
  }

  const horas = Number(
    formulario.horasAcreditables,
  )

  if (
    !Number.isInteger(horas) ||
    horas < 1 ||
    horas > 100
  ) {
    errores.horasAcreditables =
      'Las horas deben ser un número entero entre 1 y 100.'
  }

  return errores
}

function AdminPrincipalCreateActivity() {
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
    publicando,
    setPublicando,
  ] = useState(false)

  const formularioModificado =
    Object.values(formulario).some(
      (valor) =>
        String(valor).trim() !== '',
    )

  function actualizarCampo(evento) {
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

  function regresarAlListado() {
    limpiarNotificaciones(
      ID_CONFIRMACION_CANCELAR,
    )

    navigate(
      '/admin-principal/actividades',
    )
  }

  function cancelarCreacion() {
    if (!formularioModificado) {
      regresarAlListado()

      return
    }

    solicitarConfirmacion({
      id: ID_CONFIRMACION_CANCELAR,
      titulo: '¿Cancelar la actividad?',
      descripcion:
        'La información ingresada se perderá.',
      textoConfirmar: 'Sí, cancelar',
      textoCancelar: 'Continuar editando',
      alConfirmar:
        regresarAlListado,
    })
  }

  async function publicarActividad(
    evento,
  ) {
    evento.preventDefault()

    const erroresEncontrados =
      validarFormulario(formulario)

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
          'Corrige los campos marcados antes de publicar.',
      })

      return
    }

    setPublicando(true)

    try {
      await crearActividad({
        ...formulario,
      })

      notificarExito({
        id: ID_ACTIVIDAD_PUBLICADA,
        titulo:
          'Actividad publicada',
        descripcion:
          'La actividad fue guardada como programada.',
      })

      navigate(
        '/admin-principal/actividades',
        {
          replace: true,
        },
      )
    } catch (errorPublicacion) {
      console.log(errorPublicacion)
      notificarError({
        id: ID_ERROR_PUBLICACION,
        titulo:
          'No fue posible publicar',
        descripcion:
          errorPublicacion instanceof Error
            ? errorPublicacion.message
            : 'Ocurrió un error inesperado.',
      })
    } finally {
      setPublicando(false)
    }
  }

  return (
    <div className="admin-create-activity-page">
      <nav
        className="admin-create-activity-breadcrumb"
        aria-label="Migas de navegación"
      >
        <Link to="/admin-principal/actividades">
          <ArrowLeft aria-hidden="true" />
          Actividades
        </Link>

        <span aria-hidden="true">/</span>

        <span>Nueva actividad</span>
      </nav>

      <header className="admin-create-activity-heading">
        <h1>Crear actividad</h1>

        <p>
          Completa la información que verán
          los estudiantes.
        </p>
      </header>

      <div className="admin-create-activity-layout">
        <form
          className="admin-create-activity-form"
          noValidate
          onSubmit={publicarActividad}
        >
          <div className="admin-create-field admin-create-field--full">
            <label htmlFor="actividad-titulo">
              Título de la actividad
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-titulo"
              name="titulo"
              type="text"
              maxLength="120"
              value={formulario.titulo}
              placeholder="Ej. Jornada de reforestación"
              aria-invalid={
                Boolean(errores.titulo)
              }
              onChange={actualizarCampo}
            />

            <div className="admin-create-field__support">
              <small>
                El título será visible para
                los estudiantes.
              </small>

              <small>
                {formulario.titulo.length}/120
              </small>
            </div>

            {errores.titulo && (
              <p className="admin-create-field__error">
                {errores.titulo}
              </p>
            )}
          </div>

          <div className="admin-create-field admin-create-field--full">
            <label htmlFor="actividad-descripcion">
              Descripción
              <span aria-hidden="true">*</span>
            </label>

            <textarea
              id="actividad-descripcion"
              name="descripcion"
              rows="4"
              maxLength="500"
              value={
                formulario.descripcion
              }
              placeholder="Describe la actividad y sus objetivos"
              aria-invalid={
                Boolean(
                  errores.descripcion,
                )
              }
              onChange={actualizarCampo}
            />

            <div className="admin-create-field__support">
              <small>
                Explica brevemente en qué
                consiste la actividad.
              </small>

              <small>
                {
                  formulario.descripcion
                    .length
                }
                /500
              </small>
            </div>

            {errores.descripcion && (
              <p className="admin-create-field__error">
                {errores.descripcion}
              </p>
            )}
          </div>

          <div className="admin-create-field admin-create-field--full">
            <label htmlFor="actividad-lugar">
              Lugar
              <span aria-hidden="true">*</span>
            </label>

            <div className="admin-create-input-icon">
              <MapPin aria-hidden="true" />

              <input
                id="actividad-lugar"
                name="lugar"
                type="text"
                maxLength="160"
                value={formulario.lugar}
                placeholder="Ej. Biblioteca Central"
                aria-invalid={
                  Boolean(errores.lugar)
                }
                onChange={actualizarCampo}
              />
            </div>

            {errores.lugar && (
              <p className="admin-create-field__error">
                {errores.lugar}
              </p>
            )}
          </div>

          <div className="admin-create-field">
            <label htmlFor="actividad-fecha">
              Fecha
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-fecha"
              name="fecha"
              type="date"
              min={obtenerFechaHoy()}
              value={formulario.fecha}
              aria-invalid={
                Boolean(errores.fecha)
              }
              onChange={actualizarCampo}
            />

            {errores.fecha && (
              <p className="admin-create-field__error">
                {errores.fecha}
              </p>
            )}
          </div>

          <div className="admin-create-field">
            <label htmlFor="actividad-hora-inicio">
              Hora de inicio
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-hora-inicio"
              name="horaInicio"
              type="time"
              value={
                formulario.horaInicio
              }
              aria-invalid={
                Boolean(
                  errores.horaInicio,
                )
              }
              onChange={actualizarCampo}
            />

            {errores.horaInicio && (
              <p className="admin-create-field__error">
                {errores.horaInicio}
              </p>
            )}
          </div>

          <div className="admin-create-field">
            <label htmlFor="actividad-hora-finalizacion">
              Hora de finalización
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-hora-finalizacion"
              name="horaFinalizacion"
              type="time"
              value={
                formulario
                  .horaFinalizacion
              }
              aria-invalid={
                Boolean(
                  errores.horaFinalizacion,
                )
              }
              onChange={actualizarCampo}
            />

            {errores.horaFinalizacion && (
              <p className="admin-create-field__error">
                {
                  errores
                    .horaFinalizacion
                }
              </p>
            )}
          </div>

          <div className="admin-create-field admin-create-field--half">
            <label htmlFor="actividad-cupos">
              Cupos disponibles
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-cupos"
              name="cuposDisponibles"
              type="number"
              min="1"
              step="1"
              value={
                formulario
                  .cuposDisponibles
              }
              placeholder="Ej. 30"
              aria-invalid={
                Boolean(
                  errores.cuposDisponibles,
                )
              }
              onChange={actualizarCampo}
            />

            {errores.cuposDisponibles && (
              <p className="admin-create-field__error">
                {
                  errores
                    .cuposDisponibles
                }
              </p>
            )}
          </div>

          <div className="admin-create-field admin-create-field--half">
            <label htmlFor="actividad-horas">
              Horas acreditables
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="actividad-horas"
              name="horasAcreditables"
              type="number"
              min="1"
              max="100"
              step="1"
              value={
                formulario
                  .horasAcreditables
              }
              placeholder="Ej. 4"
              aria-invalid={
                Boolean(
                  errores.horasAcreditables,
                )
              }
              onChange={actualizarCampo}
            />

            {errores.horasAcreditables && (
              <p className="admin-create-field__error">
                {
                  errores
                    .horasAcreditables
                }
              </p>
            )}
          </div>

          <footer className="admin-create-activity-form__actions">
            <button
              type="button"
              onClick={cancelarCreacion}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={publicando}
            >
              <Plus aria-hidden="true" />

              {publicando
                ? 'Publicando...'
                : 'Publicar actividad'}
            </button>
          </footer>
        </form>

        <aside
          className="admin-create-activity-preview"
          aria-label="Vista previa de la actividad"
        >
          <header>
            <h2>Vista previa</h2>

            <span>Borrador</span>
          </header>

          <div className="admin-create-preview-content">
            <h3>
              {formulario.titulo.trim() ||
                'Título de la actividad'}
            </h3>

            <p className="admin-create-preview-description">
              {formulario.descripcion.trim() ||
                'La descripción de la actividad aparecerá en este espacio.'}
            </p>

            <ul>
              <li>
                <CalendarDays aria-hidden="true" />

                <span>
                  {formatearFecha(
                    formulario.fecha,
                  )}
                </span>
              </li>

              <li>
                <Clock3 aria-hidden="true" />

                <span>
                  {formulario.horaInicio &&
                    formulario.horaFinalizacion
                    ? `${formatearHora(
                      formulario.horaInicio,
                    )} – ${formatearHora(
                      formulario.horaFinalizacion,
                    )}`
                    : 'Horario pendiente'}
                </span>
              </li>

              <li>
                <MapPin aria-hidden="true" />

                <span>
                  {formulario.lugar.trim() ||
                    'Lugar pendiente'}
                </span>
              </li>
            </ul>

            <footer>
              <div>
                <UsersRound aria-hidden="true" />

                <span>
                  {formulario.cuposDisponibles ||
                    '0'}{' '}
                  cupos
                </span>
              </div>

              <div>
                <Clock3 aria-hidden="true" />

                <span>
                  {formulario.horasAcreditables ||
                    '0'}{' '}
                  horas acreditables
                </span>
              </div>
            </footer>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default AdminPrincipalCreateActivity
