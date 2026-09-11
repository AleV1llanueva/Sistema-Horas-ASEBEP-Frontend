import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
    CalendarCheck2,
    LoaderCircle,
    TriangleAlert,
} from 'lucide-react'

import '../styles/ActivityConfirmationDialog.css'

// Define las diferencias visuales y textuales entre la inscripcion y la cancelacion.
const CONFIGURACION_VARIANTES = Object.freeze({
    inscripcion: Object.freeze({
        clase: 'activity-confirmation-dialog--enrollment',
        titulo: '¿Confirmar inscripción?',
        textoConfirmar: 'Confirmar inscripción',
        Icono: CalendarCheck2,
    }),

    cancelacion: Object.freeze({
        clase: 'activity-confirmation-dialog--cancellation',
        titulo: '¿Cancelar inscripción?',
        textoConfirmar: 'Cancelar inscripción',
        Icono: TriangleAlert,
    }),
})

function ActivityConfirmationDialog({
    abierto,
    variante = 'inscripcion',
    titulo,
    descripcion,
    textoConfirmar,
    textoCancelar = 'Volver',
    procesando = false,
    onConfirmar,
    onCancelar,
}) {
    const configuracion =
        CONFIGURACION_VARIANTES[variante] ?? CONFIGURACION_VARIANTES.inscripcion

    const {
        clase,
        titulo: tituloPredeterminado,
        textoConfirmar: textoConfirmarPredeterminado,
        Icono,
    } = configuracion

    // Radix informa mediante onOpenChange cuando el usuario cancela con el boton o con ESC.
    function manejarCambioApertura(
        siguienteEstado,
    ) {
        if (
            !siguienteEstado && !procesando && typeof onCancelar === 'function'
        ) {
            onCancelar()
        }
    }

    /*
    * Evitamos que Radix cierre inmediatamente el dialogo.
    * La vista padre lo cerrara cuando la operacion asincronica haya terminado correctamente.
    */
   function manejarConfirmacion(evento) {
    evento.preventDefault()

    if (procesando || typeof onConfirmar !== 'function') {
        return
    }

    onConfirmar()
   }

   // Mientras se procesa la operacion no permitimos cerrar accidentalmente el dialogo con ESC.
   function manejarEscape(evento) {
    if (procesando) {
        evento.preventDefault()
    }
   }

   return (
    <AlertDialog.Root
      open={abierto}
      onOpenChange={manejarCambioApertura}
    >
      <AlertDialog.Portal>
        {/* Fondo que bloquea la interacción con la página. */}
        <AlertDialog.Overlay
          className="activity-confirmation-overlay"
        />

        <AlertDialog.Content
          className={
            `activity-confirmation-dialog ${clase}`
          }
          aria-busy={procesando}
          onEscapeKeyDown={manejarEscape}
        >
          {/* Identidad visual correspondiente a la acción. */}
          <span
            className="activity-confirmation-dialog__icon"
            aria-hidden="true"
          >
            <Icono />
          </span>

          <AlertDialog.Title
            className="activity-confirmation-dialog__title"
          >
            {titulo || tituloPredeterminado}
          </AlertDialog.Title>

          <AlertDialog.Description
            className="activity-confirmation-dialog__description"
          >
            {descripcion}
          </AlertDialog.Description>

          {/* Acciones explícitas requeridas para cerrar el diálogo. */}
          <div className="activity-confirmation-dialog__actions">
            <AlertDialog.Cancel asChild>
              <button
                className="activity-confirmation-dialog__button activity-confirmation-dialog__button--secondary"
                type="button"
                disabled={procesando}
              >
                {textoCancelar}
              </button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <button
                className="activity-confirmation-dialog__button activity-confirmation-dialog__button--primary"
                type="button"
                disabled={procesando}
                onClick={manejarConfirmacion}
              >
                {procesando && (
                  <LoaderCircle
                    className="activity-confirmation-dialog__loader"
                    aria-hidden="true"
                  />
                )}

                <span>
                  {procesando
                    ? 'Procesando...'
                    : textoConfirmar ||
                      textoConfirmarPredeterminado}
                </span>
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export default ActivityConfirmationDialog