/* Dashboard provisional ASEBEP
Lee datos desde localStorage y los muestra en pantalla */

const ENABLE_VIEW_DEMO_DATA = true;
const logoutButton = document.getElementById("logoutButton");

/*Datos temporales solo para diseñar y probar la vista */
function getDemoUserData() {
    return {
        credenciales: {
            rol: "Becario",
            active: true
        },

        datos_personales: {
            num_cuenta: "20241002020",
            p_nombre: "Roberto",
            s_nombre: "Carlos",
            p_apellido: "Mendoza",
            s_apellido: "Rodriguez",
            correo_personal: "correo.personal@example.com",
            correo_inst: "roberto.carlos@unah.hn",
            carrera: "Trabajo Social",
            telefono: "00000000"
        },

        datos_becario: {
            periodo_inicio: "IIPAC",
            anio_inicio: 2024,
            horas_acumuladas: 0,
            horas_faltantes: 20,
            meses_sin_pagar: 0,
            estado_beca: "Activo"
        }
    };
}

/* Obtiene los datos guardados por el login */
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

/* Escribe texto en un elemento del HTML */
function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = value ?? "---";
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

/* Muestra toda la información en el dashboard */
function renderDashboard(userData) {
    const credentials = userData.credenciales || {};
    const personalData = userData.datos_personales || {};
    const scholarshipData = userData.datos_becario || {};

    const fullName = getFullName(personalData);
    const activeText = credentials.active ? "Activa" : "Inactiva";

    setText("userRole", credentials.rol || "Rol no definido");
    setText("userFullName", fullName);
    setText("scholarshipStatus", scholarshipData.estado_beca || "Sin estado");

    setText("completedHours", scholarshipData.horas_acumuladas ?? 0);
    setText("missingHours", scholarshipData.horas_faltantes ?? 0);
    setText("unpaidMonths", scholarshipData.meses_sin_pagar ?? 0);

    setText("accountNumber", personalData.num_cuenta);
    setText("career", personalData.carrera);
    setText("institutionalEmail", personalData.correo_inst);
    setText("personalEmail", personalData.correo_personal);
    setText("phone", personalData.telefono);

    setText("startPeriod", scholarshipData.periodo_inicio);
    setText("startYear", scholarshipData.anio_inicio);
    setText("scholarshipState", scholarshipData.estado_beca);
    setText("activeStatus", activeText);
}


/* Elimina la sesión temporal y regresa al login */
function logout() {
    localStorage.removeItem("asebepUser");
    localStorage.removeItem("asebepLoggedIn");
    localStorage.removeItem("asebepLoginTime");

    window.location.href = "login.html";
}


/* Inicializa la vista */
function initDashboard() {
    let userData = getStoredUserData();

    if (!userData && ENABLE_VIEW_DEMO_DATA) {
        userData = getDemoUserData();
    }

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