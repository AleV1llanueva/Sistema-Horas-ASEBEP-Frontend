// dashboard.js
const dashboardState = {

    totalHours: 20, // Total de horas requeridas

    completedHours: Math.floor(Math.random() * 21), // Simulación dinámica

    pendingHours: 0, // Horas pendientes calculadas

    progress: 0, // Porcentaje de progreso mensual

    status: "" // Estado actual del becario
};

// Actividades recientes simuladas
// Más adelante estos datos vendrán desde el backend
const recentActivities = [

    {
        id: 1,
        title: "Limpieza del Campus",
        date: "18 Mayo 2026",
        hours: 4,
        status: "Aprobada",
        type: "Voluntariado",
        icon: "🧹",
        description: "Participación en una jornada de limpieza dentro del campus universitario, apoyando en la organización de espacios comunes, recolección de residuos y mantenimiento básico de áreas utilizadas por estudiantes."
    },

    {
        id: 2,
        title: "Apoyo en Biblioteca",
        date: "21 Mayo 2026",
        hours: 3,
        status: "Pendiente",
        type: "Apoyo Administrativo",
        icon: "📚",
        description: "Apoyo en tareas administrativas dentro de la biblioteca, incluyendo organización de material, asistencia a estudiantes y colaboración en el control de recursos académicos."
    }

];

// Inicializador
// Esta función se ejecuta cuando carga la página
function initDashboard(){

    calculateValues(); // Calcula valores derivados

    renderDashboard(); // Renderiza en pantalla

    renderRecentActivities(); // Renderiza actividades recientes
}

// Calcula valores derivados
// Aquí calculamos horas pendientes, progreso y estado
function calculateValues(){

    // Calculamos horas pendientes
    dashboardState.pendingHours =
        dashboardState.totalHours - dashboardState.completedHours;

    // Evitamos que las horas pendientes sean negativas
    if (dashboardState.pendingHours < 0) {

        dashboardState.pendingHours = 0;
    }

    // Calculamos porcentaje de progreso
    dashboardState.progress =
        (dashboardState.completedHours / dashboardState.totalHours) * 100;

    // Evitamos que el progreso pase de 100%
    if (dashboardState.progress > 100) {

        dashboardState.progress = 100;
    }

    // Determinamos estado del usuario
    dashboardState.status = getStatus();
}

// Determina estado
// Define si el usuario está al día, en progreso o atrasado
function getStatus(){

    const { completedHours, totalHours } = dashboardState;

    if (completedHours >= totalHours) return "Al día";

    if (completedHours >= totalHours * 0.5) return "En progreso";

    return "Atrasado";
}

// Renderiza todo
// Inserta los datos en el HTML
function renderDashboard() {

    // Horas cumplidas
    document.getElementById("completed-hours").textContent =
        dashboardState.completedHours;

    // Horas pendientes
    document.getElementById("pending-hours").textContent =
        dashboardState.pendingHours;

    // Estado del usuario
    document.getElementById("status-text").textContent =
        dashboardState.status;

    // Actualizamos la barra de progreso
    updateProgressBar();
}

// Barra de progreso
// Actualiza visualmente el progreso
function updateProgressBar() {

    const fill =
        document.getElementById("progress-fill");

    // Verificamos que la barra exista
    if (!fill) return;

    // Cambiamos el ancho de la barra según el progreso
    fill.style.width =
        dashboardState.progress + "%";

    // Texto de porcentaje
    document.getElementById("progress-text").textContent =
        Math.round(dashboardState.progress) + "% completado";
}

// Renderiza actividades recientes
// Inserta actividades recientes dentro del dashboard
function renderRecentActivities() {

    // Contenedor principal
    const container =
        document.getElementById("recent-activities");

    // Verificamos que el contenedor exista
    if (!container) return;

    // Limpiamos el contenedor
    container.innerHTML = "";

    // Creamos timeline
    const timeline =
        document.createElement("div");

    timeline.classList.add("recent-timeline");

    // Recorremos actividades recientes
    recentActivities.forEach((activity, index) => {

        // Creamos item del timeline
        const timelineItem =
            document.createElement("div");

        timelineItem.classList.add("timeline-item");

        timelineItem.style.animationDelay =
            `${index * 0.12}s`;

        // Determinamos clase del estado
        const statusClass =
            activity.status === "Aprobada"
                ? "approved"
                : "pending";

        // HTML interno
        timelineItem.innerHTML = `

            <div class="timeline-marker">

                <span class="timeline-icon">
                    ${activity.icon}
                </span>

            </div>

            <article class="timeline-card">

                <div class="timeline-card-header">

                    <div>

                        <span class="timeline-type">
                            ${activity.type}
                        </span>

                        <h4>
                            ${activity.title}
                        </h4>

                    </div>

                    <span class="timeline-status ${statusClass}">
                        ${activity.status}
                    </span>

                </div>

                <div class="timeline-meta">

                    <span>
                        📅 ${activity.date}
                    </span>

                    <span>
                        ⏱ ${activity.hours} horas
                    </span>

                </div>

                <p class="timeline-description">
                    ${activity.description}
                </p>

                <button
                    class="timeline-toggle"
                    onclick="toggleRecentActivity(event, ${activity.id})"
                >
                    Ver descripción completa
                </button>

            </article>

        `;

        // Insertamos el item en el timeline
        timeline.appendChild(timelineItem);
    });

    // Insertamos el timeline en el contenedor
    container.appendChild(timeline);
}

// Expande o contrae una actividad reciente
function toggleRecentActivity(event, activityId) {

    // Buscamos el boton que fue presionado
    const button =
        event.target;

    // Buscamos la tarjeta más cercana
    const card =
        button.closest(".timeline-card");

    // Validamos que exista la tarjeta
    if (!card) return;

    // Alternamos clase expandida
    card.classList.toggle("expanded");

    // Cambiamos texto del botón
    if (card.classList.contains("expanded")) {

        button.textContent =
            "Ocultar descripción";

    } else {

        button.textContent =
            "Ver descripción completa";
    }
}

// Detectamos el navbar
const navbar =
    document.querySelector(".navbar");

// Evento de scroll
window.addEventListener("scroll", () => {

    // Verificamos que el navbar exista
    if (!navbar) return;

    // Si el usuario baja más de 50px
    if (window.scrollY > 50) {

        // Agregamos clase
        navbar.classList.add("scrolled");

    } else {

        // Quitamos clase
        navbar.classList.remove("scrolled");
    }
});

// Inicio
// Ejecuta todo cuando el DOM está listo
document.addEventListener("DOMContentLoaded", initDashboard);