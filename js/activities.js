// activities.js

// Actividad seleccionada actualmente
let selectedActivityId = null;

// Actividades simuladas
// Más adelante estos datos vendrán desde el backend, esto solo es para mostrar a los miembros de ASEBEP cómo se verá la sección de actividades disponibles para inscripción.
const activities = [

    {
        id: 1,
        title: "Limpieza del Campus",
        hours: 4,
        date: "20 Mayo 2026",
        type: "Voluntariado",
        image: "https://picsum.photos/500/300?random=1",
        status: "Disponible",
        enrolled: false,
        description: "Actividad orientada a apoyar la limpieza y el orden de espacios comunes dentro del campus universitario."
    },

    {
        id: 2,
        title: "Apoyo en Biblioteca",
        hours: 3,
        date: "24 Mayo 2026",
        type: "Apoyo Administrativo",
        image: "https://picsum.photos/500/300?random=2",
        status: "Disponible",
        enrolled: false,
        description: "Actividad de apoyo en organización, atención y control básico dentro de áreas administrativas o académicas."
    },

    {
        id: 3,
        title: "Apoyo en Evento Institucional",
        hours: 5,
        date: "28 Mayo 2026",
        type: "Evento administrativo",
        image: "https://picsum.photos/500/300?random=3",
        status: "Disponible",
        enrolled: false,
        description: "Participación en logística, registro y acompañamiento durante eventos organizados por la asociación o la universidad."
    }

];

// Renderiza actividades
function renderActivities() {

    // Contenedor principal
    const container =
        document.getElementById("activities-container");

    // Verificamos que el contenedor exista
    if (!container) return;

    // Limpiamos contenido
    container.innerHTML = "";

    // Recorremos actividades
    activities.forEach((activity, index) => {

        // Creamos card
        const card =
            document.createElement("article");

        card.classList.add("activity-card");

        // Delay de animacion
        card.style.animationDelay =
            `${index * 0.1}s`;

        // Estado visual de inscripción
        const buttonText =
            activity.enrolled
                ? "Inscrito ✓"
                : "Inscribirse";

        const visibleStatus =
            activity.enrolled
                ? "Inscrito"
                : activity.status;

        // HTML interno
        card.innerHTML = `

            <div class="activity-image-area">

                <img
                    src="${activity.image}"
                    alt="${activity.title}"
                    class="activity-image"
                >

                <span class="activity-number">
                    0${index + 1}
                </span>

                <span class="activity-image-badge">
                    ${activity.type}
                </span>

            </div>

            <div class="activity-content">

                <div class="activity-header">

                    <span class="activity-status">
                        ${visibleStatus}
                    </span>

                    <span class="activity-hours">
                        ${activity.hours}h
                    </span>

                </div>

                <h3 class="activity-title">
                    ${activity.title}
                </h3>

                <p class="activity-description">
                    ${activity.description}
                </p>

                <div class="activity-meta">

                    <span>
                        📅 ${activity.date}
                    </span>

                    <span>
                        ⏱ ${activity.hours} horas acreditables
                    </span>

                </div>

                <div class="activity-footer">

                    <button
                        class="activity-button
                        ${activity.enrolled ? 'enrolled' : ''}"

                        onclick="openModal(${activity.id})"
                    >
                        ${buttonText}
                    </button>

                </div>

            </div>

        `;

        // Insertamos card
        container.appendChild(card);
    });
}
// Modal principal
const modal =
    document.getElementById("enrollment-modal");

// Formulario
const enrollmentForm =
    document.getElementById("enrollment-form");

// Abrir modal
function openModal(activityId) {

    // Guardamos actividad seleccionada
    selectedActivityId = activityId;

    // Buscamos actividad
    const activity =
        activities.find(activity => activity.id === activityId);

    // Validamos que exista actividad
    if (!activity) return;

    // Cargamos informacion en el modal
    document.getElementById("modal-activity-title").textContent =
        activity.title;

    document.getElementById("modal-activity-image").src =
        activity.image;

    document.getElementById("modal-activity-image").alt =
        activity.title;

    document.getElementById("modal-activity-description").textContent =
        activity.description;

    document.getElementById("modal-activity-date").textContent =
        activity.date;

    document.getElementById("modal-activity-hours").textContent =
        `${activity.hours} horas`;

    document.getElementById("modal-activity-type").textContent =
        activity.type;

    // Activamos modal
    modal.classList.add("active");

    // Bloqueamos el scroll de la pagina
    document.body.classList.add("modal-open");
}

// Funcion para cerrar el modal
function closeModal() {

    // Cerramos modal
    modal.classList.remove("active");

    document.body.classList.remove("modal-open");

    // Limpiamos errores visuales
    clearAllErrors();
}

// Mostrar error
function showError(inputId, message) {

    const input =
        document.getElementById(inputId);

    if (!input) return;

    const formGroup =
        input.parentElement;

    const errorText =
        formGroup.querySelector(".input-error");

    formGroup.classList.add("error");

    errorText.textContent =
        message;
}

// Limpiar error
function clearError(inputId) {

    const input =
        document.getElementById(inputId);

    if (!input) return;

    const formGroup =
        input.parentElement;

    const errorText =
        formGroup.querySelector(".input-error");

    formGroup.classList.remove("error");

    errorText.textContent =
        "";
}

// Limpiar todos los errores
function clearAllErrors() {

    clearError("full-name");
    clearError("account-number");
    clearError("phone-number");
    clearError("career");
    clearError("institutional-email");
    clearError("personal-email");
}

// Evento submit
if (enrollmentForm) {

    enrollmentForm.addEventListener("submit", function(event) {

        // Evita recargar pagina
        event.preventDefault();

        // Inputs
        const fullName =
            document.getElementById("full-name");

        const accountNumber =
            document.getElementById("account-number");

        const phoneNumber =
            document.getElementById("phone-number");

        const career =
            document.getElementById("career");

        const institutionalEmail =
            document.getElementById("institutional-email");

        const personalEmail =
            document.getElementById("personal-email");

        // Estado validacion
        let isValid =
            true;

        // Limpiamos errores
        clearAllErrors();

        // Validacion nombre
        if (fullName.value.trim().length < 5) {

            showError(
                "full-name",
                "Ingrese un nombre válido"
            );

            isValid = false;
        }

        // Validacion numero de cuenta
        if (accountNumber.value.trim().length < 8) {

            showError(
                "account-number",
                "Número de cuenta inválido"
            );

            isValid = false;
        }

        // Validacion telefono
        if (phoneNumber.value.trim().length < 8) {

            showError(
                "phone-number",
                "Número de teléfono inválido"
            );

            isValid = false;
        }

        // Validacion carrera
        if (career.value.trim().length < 4) {

            showError(
                "career",
                "Ingrese una carrera válida"
            );

            isValid = false;
        }

        // Validacion correo institucional
        if (!institutionalEmail.value.includes("@unah.hn")) {

            showError(
                "institutional-email",
                "Debe usar correo institucional"
            );

            isValid = false;
        }

        // Validacion correo personal
        if (!personalEmail.value.includes("@")) {

            showError(
                "personal-email",
                "Correo inválido"
            );

            isValid = false;
        }

        // Detenemos si hay error
        if (!isValid) return;

        // Buscamos actividad
        const activity =
            activities.find(activity => activity.id === selectedActivityId);

        // Validamos actividad
        if (!activity) return;

        // Cambiamos estado
        activity.enrolled =
            true;

        activity.status =
            "Inscrito";

        // Re-renderizamos actividades
        renderActivities();

        // Reseteamos formulario
        enrollmentForm.reset();

        // Cerramos modal
        closeModal();

        // Feedback temporal
        alert("Inscripción realizada correctamente");
    });
}

// Cerrar modal al hacer click afuera
window.addEventListener("click", function(event) {

    if (event.target === modal) {

        closeModal();
    }
});

// Inicio
document.addEventListener(
    "DOMContentLoaded",
    renderActivities
);

// Cerrar modal con tecla Escape, para facilidad del usuario
document.addEventListener("keydown", function(event) {

    // Si se presiona Escape y el modal esta activo
    if (
        event.key === "Escape" &&
        modal.classList.contains("active")
    ) {

        closeModal();
    }
});