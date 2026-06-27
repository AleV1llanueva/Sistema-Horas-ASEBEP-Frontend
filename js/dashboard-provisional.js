/* Dashboard provisional ASEBEP */

const logoutButton = document.getElementById("logoutButton");


/* Obtiene los datos reales guardados por el login */
function getStoredUserData() {
    const storedUser = localStorage.getItem("asebepUser");

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch (error) {
        console.error("Error al leer los datos del usuario:", error);
        return null;
    }
}


function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = value ?? "---";
}


/* Convierte textos de la API a mayúsculas para mantener una vista uniforme */
function formatUpperText(value) {
    if (value === null || value === undefined || value === "") {
        return "---";
    }

    return String(value).toLocaleUpperCase("es-HN");
}


/* Convierte valores numéricos de la API en números seguros */
function parseNumber(value, fallback = 0) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return fallback;
    }

    return numberValue;
}


/* Construye el nombre completo del estudiante */
function getFullName(personalData) {
    const names = [
        personalData.p_nombre,
        personalData.s_nombre,
        personalData.p_apellido,
        personalData.s_apellido
    ];

    return names.filter(Boolean).join(" ") || "Estudiante";
}


/* Muestra la información real del estudiante en el dashboard */
function renderDashboard(userData) {
    const credentials = userData.credenciales || {};
    const personalData = userData.datos_personales || {};
    const scholarshipData = userData.datos_becario || {};

    const fullName = getFullName(personalData);

    setText("userRole", formatUpperText(credentials.rol || "Becario"));
    setText("userFullName", fullName);
    setText("scholarshipStatus", formatUpperText(scholarshipData.estado_beca || "Sin estado"));

    setText("missingHours", parseNumber(scholarshipData.horas_faltantes, 0));
    setText("pendingContributions", parseNumber(scholarshipData.meses_sin_pagar, 0));

    setText("accountNumber", personalData.num_cuenta);
    setText("career", personalData.carrera);
    setText("institutionalEmail", personalData.correo_inst);
    setText("personalEmail", personalData.correo_personal);
    //setText("phone", personalData.telefono);
    setText("phone", "Oculto por privacidad");

    setText("startPeriod", scholarshipData.periodo_inicio);
    setText("startYear", scholarshipData.anio_inicio);
    setText("scholarshipState", formatUpperText(scholarshipData.estado_beca));
}


/* Limpia los datos guardados por el login y regresa a la pantalla de acceso */
function logout() {
    localStorage.removeItem("asebepUser");
    localStorage.removeItem("asebepLoggedIn");
    localStorage.removeItem("asebepLoginTime");

    window.location.href = "login.html";
}


/* Inicializa el dashboard solo si existe información real guardada */
function initDashboard() {
    const userData = getStoredUserData();

    if (!userData) {
        window.location.href = "login.html";
        return;
    }

    renderDashboard(userData);
}


if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

initDashboard();