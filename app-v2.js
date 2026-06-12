// =====================================================
// PRONÓSTICO-ZAP AI V5.8 - EDICIÓN ANTIBLOQUEO
// ARREGLO DE EVENTOS DE CARGA + PROTOCOLO DE SEGURIDAD
// =====================================================

const estado = {
    lat: -35.186,
    lon: -59.094,
    ciudad: "Zapiola (Pueblo Rural)",
    unidad: "C",
    mapa: null,
    marcador: null,
    capaViento: null,
    capaNubes: null
};

let datosActuales = {};
let graficoTemperatura = null;
let graficoHistorial = null;

// CAMBIO CRÍTICO: Usamos "load" para esperar que Leaflet y Chart.js existan en el navegador
window.addEventListener("load", () => {
    // 1. PRIORIDAD ABSOLUTA: Apagar la pantalla de carga inmediatamente para no trabar la app
    ocultarPantallaCarga();
    
    // Por seguridad extrema, un segundo intento de apagado a los 2 segundos
    setTimeout(ocultarPantallaCarga, 2000);

    // 2. Ejecutar módulos de forma aislada para que si uno falla, no arrastre al resto
    try {
        iniciarMapa();
    } catch(e) { 
        console.error("Error al iniciar mapa:", e); 
    }

    try {
        iniciarGraficos();
    } catch(e) { 
        console.error("Error al iniciar gráficos:", e); 
    }

    // 3. Cargar flujo de datos meteorológicos
    actualizarHistorial();
    obtenerUbicacion();
    solicitarNotificaciones();
});

function ocultarPantallaCarga(){
    const pantalla = document.getElementById("pantallaCarga");
    if(pantalla && pantalla.style.display !== "none") {
        pantalla.style.opacity = "0";
        setTimeout(() => { 
            pantalla.style.display = "none"; 
        }, 400);
    }
}

async function obtenerUbicacion(){
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            (pos)=>{
                estado.lat = pos.coords.latitude;
                estado.lon = pos.coords.longitude;
                if(Math.abs(estado.lat - (-35.18)) < 0.2){
                    estado.ciudad = "Zapiola (Pueblo Rural)";
                } else {
                    estado.ciudad = "Zona Local";
                }
                actualizarClima();
            },
            ()=>{
                actualizarClima(); // Si el usuario rechaza la ubicación, usa Zapiola por defecto
            }
        );
    } else {
        actualizarClima();
    }
}

async function actualizarClima(){
    try{
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${estado.lat}&longitude=${estado.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        mostrarClima(datos);
        actualizarMapa();
        renderHoras(datos);
        render7Dias(datos);
        actualizarGraficoHoras(datos);
        guardarHistorialClima();
        mostrarHistorial();
    }
    catch(error){
        console.error("Error obteniendo clima de Open-Meteo:", error);
    }
}

function mostrarClima(datos){
    datosActuales = {
        temperature: datos.current.temperature_2m,
        humidity: datos.current.relative_humidity_2m,
        windspeed: datos.current.wind_speed_10m,
        weather: datos.current.weather_code
    };

    let etiquetaZona = "Zona Urbana / Ciudad";
    const ciudadMin = estado.ciudad.toLowerCase();
    
    if (ciudadMin.includes("zapiola") || ciudadMin.includes("lobos") || ciudadMin.includes("navarro") || ciudadMin.includes("monte")) {
        etiquetaZona = "🏡 Pueblo y Zonas Rurales";
    } else if (ciudadMin.includes("buenos aires") || ciudadMin.includes("capital") || ciudadMin.includes("federal") || ciudadMin.includes("baires")) {
        etiquetaZona = "🏙️ Área Urbana No Rural";
    } else {
        etiquetaZona = "🌱 Entorno Agro-Rural";
    }

    const ubicaContainer = document.getElementById("ubicacion");
    if(ubicaContainer) ubicaContainer.textContent = `📍 ${estado.ciudad} - ${etiquetaZona}`;

    const temperatura = document.getElementById("temperatura");
    const descripcion = document.getElementById("descripcion");

    if(temperatura) temperatura.textContent = Math.round(datos.current.temperature_2m) + "°";
    if(descripcion) descripcion.textContent = descripcionClima(datos.current.weather_code);

    const contenedorTarjetas = document.getElementById("tarjetas-detalles");
    if(contenedorTarjetas) {
        const probLluvia = datos.hourly.precipitation_probability[0] || 0;

        contenedorTarjetas.innerHTML = `
            <div class="tarjeta-mini">
                <span class="icon-mini">💧</span>
                <div class="info-mini">
                    <span class="titulo-mini">HUMEDAD</span>
                    <span class="valor-mini">${datos.current.relative_humidity_2m}%</span>
                </div>
            </div>
            <div class="tarjeta-mini">
                <span class="icon-mini">💨</span>
                <div class="info-mini">
                    <span class="titulo-mini">VIENTO</span>
                    <span class="valor-mini">${Math.round(datos.current.wind_speed_10m)} km/h</span>
                </div>
            </div>
            <div class="tarjeta-mini">
                <span class="icon-mini">🌧️</span>
                <div class="info-mini">
                    <span class="titulo-mini">LLUVIA</span>
                    <span class="valor-mini">${probLluvia}% Prob.</span>
                </div>
            </div>
            <div class="tarjeta-mini">
                <span class="icon-mini">📊</span>
                <div class="info-mini">
                    <span class="titulo-mini">EXTREMAS</span>
                    <div style="display:flex; gap:4px; margin-top:2px;">
                        <span style="color:#ff4757; font-weight:bold; font-size:0.85em;">▲${Math.round(datos.daily.temperature_2m_max[0])}°</span>
                        <span style="color:#00d2ff; font-weight:bold; font-size:0.85em;">▼${Math.round(datos.daily.temperature_2m_min[0])}°</span>
                    </div>
                </div>
            </div>
        `;
    }

    verificarAlertas();
}

function descripcionClima(codigo){
    const codigos = {
        0:"☀️ Despejado", 1:"🌤️ Mayormente despejado", 2:"⛅ Parcialmente nublado", 3:"☁️ Nublado",
        45:"🌫️ Niebla", 48:"🌫️ Niebla intensa", 51:"🌦️ Llovizna", 61:"🌧️ Lluvia", 71:"❄️ Nieve", 95:"⛈️ Tormenta"
    };
    return codigos[codigo] || "🌎 Condición variable";
}

function iniciarMapa(){
    const contenedor = document.getElementById("mapa");
    if(!contenedor || typeof L === "undefined") return; // Evita romper si Leaflet no bajó a tiempo
    
    estado.mapa = L.map("mapa", { zoomControl: true }).setView([estado.lat, estado.lon], 11);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap"
    }).addTo(estado.mapa);
    
    estado.capaViento = L.tileLayer("https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=d22d5da5210a5dced575cc3971cdcbf2", {
        opacity: 0.5,
        zIndex: 10
    }).addTo(estado.mapa);

    estado.capaNubes = L.tileLayer("https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=d22d5da5210a5dced575cc3971cdcbf2", {
        opacity: 0.3,
        zIndex: 9
    }).addTo(estado.mapa);

    estado.marcador = L.marker([estado.lat, estado.lon]).addTo(estado.mapa)
        .bindPopup("<b>Estación E.E.S N°3</b><br>Monitoreo Agropecuario.")
        .openPopup();
}

function actualizarMapa(){
    if(!estado.mapa) return;
    setTimeout(() => {
        estado.mapa.invalidateSize();
        estado.mapa.setView([estado.lat, estado.lon], 11);
        if(estado.marcador) {
            estado.marcador.setLatLng([estado.lat, estado.lon]);
        }
    }, 400); 
}

function activarRadar(){
    if(!estado.mapa) return;
    if(estado.radarLayer){
        estado.mapa.removeLayer(estado.radarLayer);
        estado.radarLayer = null;
        return;
    }
    estado.radarLayer = L.tileLayer("https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png", {
        opacity:0.7,
        zIndex: 15
    });
    estado.radarLayer.addTo(estado.mapa);
}

function iniciarGraficos(){
    const canvasTemp = document.getElementById("graficoTemperatura");
    if(!canvasTemp || typeof Chart === "undefined") return; // Evita romper si Chart.js no se cargó
    
    graficoTemperatura = new Chart(canvasTemp, {
        type:"line",
        data:{ labels:[], datasets:[{ label:"Temperatura °C", data:[], borderColor:"#00d2ff", backgroundColor:"rgba(0,210,255,0.1)", borderWidth:3, tension:0.4, fill:true }] },
        options: { responsive: true, scales: { y: { grid: { color: "rgba(255,255,255,0.1)" } } } }
    });

    const canvasHistorial = document.getElementById("graficoHistorial");
    if(canvasHistorial){
        graficoHistorial = new Chart(canvasHistorial, {
            type:"bar",
            data:{ labels:[], datasets:[{ label:"Registro Histórico °C", data:[], backgroundColor:"#ff4757" }] },
            options: { responsive: true }
        });
    }
}

function actualizarGraficoHoras(datos){
    if(!graficoTemperatura) return;
    const horas = datos.hourly.time.slice(0,12).map(h => {
        return h.includes("T") ? h.split("T")[1].substring(0,5) : h.substring(11,16);
    });
    const temperaturas = datos.hourly.temperature_2m.slice(0,12);
    graficoTemperatura.data.labels = horas;
    graficoTemperatura.data.datasets[0].data = temperaturas;
    graficoTemperatura.update();
}

function guardarHistorialClima(){
    if(!datosActuales.temperature) return;
    let historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    const horaActual = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if(historial.length > 0 && historial[historial.length - 1].fecha === horaActual) return;

    historial.push({ fecha: horaActual, temperatura: datosActuales.temperature, viento: datosActuales.windspeed });
    if(historial.length > 10) historial.shift();
    localStorage.setItem("historialClima", JSON.stringify(historial));
    actualizarHistorial();
}

function actualizarHistorial(){
    let historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    if(!graficoHistorial || historial.length === 0) return;
    graficoHistorial.data.labels = historial.map(item => item.fecha);
    graficoHistorial.data.datasets[0].data = historial.map(item => item.temperatura);
    graficoHistorial.update();
}

function mostrarHistorial(){
    const contenedor = document.getElementById("historial");
    if(!contenedor) return;
    const historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    contenedor.innerHTML = "";
    historial.slice().reverse().forEach(item=>{
        contenedor.innerHTML += `<div class="hist-item" style="padding:5px; border-bottom:1px solid rgba(255,255,255,0.1); font-size:0.85em;">⏱️ ${item.fecha} -> 🌡️ ${item.temperatura}°C | 💨 ${item.viento} km/h</div>`;
    });
}

function renderHoras(datos){
    const contenedor = document.getElementById("pronosticoHoras");
    if(!contenedor) return;
    contenedor.innerHTML = "";

    for(let i=0; i<12; i++){ 
        const crudoHora = datos.hourly.time[i];
        const horaLimpia = crudoHora.includes("T") ? crudoHora.split("T")[1].substring(0,5) : crudoHora.substring(11,16);
        
        const tarjeta = document.createElement("div");
        tarjeta.className = "hour-card-fija"; 
        tarjeta.innerHTML = `
            <div style="font-size: 0.85em; opacity: 0.8; font-weight: 600; font-family: 'Orbitron';">${horaLimpia} hs</div>
            <div style="margin: 4px 0; font-size: 1.1em;">🌡️</div>
            <div style="font-weight: bold; font-size: 1em; color: #00d2ff;">${Math.round(datos.hourly.temperature_2m[i])}°</div>
        `;
        contenedor.appendChild(tarjeta);
    }
}

function render7Dias(datos){
    const contenedor = document.getElementById("pronostico7dias");
    if(!contenedor) return;
    contenedor.innerHTML = "";

    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoy = new Date();

    for(let i=0; i<7; i++){
        const fechaDia = new Date(hoy);
        fechaDia.setDate(hoy.getDate() + i);
        const nombreDia = i === 0 ? "Hoy" : diasSemana[fechaDia.getDay()];

        const codigoClima = datos.daily.weather_code[i];
        let iconoExacto = "☀️";
        if(codigoClima >= 1 && codigoClima <= 3) iconoExacto = "🌤️";
        else if(codigoClima >= 45 && codigoClima <= 48) iconoExacto = "🌫️";
        else if(codigoClima >= 51 && codigoClima <= 65) iconoExacto = "🌧️";
        else if(codigoClima >= 71 && codigoClima <= 77) iconoExacto = "❄️";
        else if(codigoClima >= 95) iconoExacto = "⛈️";

        const tarjeta = document.createElement("div");
        tarjeta.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.95em;";
        tarjeta.innerHTML = `
            <div style="width: 90px; font-weight: 500;">${nombreDia}</div>
            <div style="font-size: 1.2em; width: 30px; text-align: center;">${iconoExacto}</div>
            <div style="text-align: right; font-family: 'Orbitron'; font-size: 0.9em;">
                <span style="color: #ff4757; font-weight: bold; margin-right: 8px;">${Math.round(datos.daily.temperature_2m_max[i])}°</span>
                <span style="color: #00d2ff;">${Math.round(datos.daily.temperature_2m_min[i])}°</span>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    }
}

function abrirBuscador(){
    const modal = document.getElementById("modalBusqueda");
    if(modal) modal.style.display = "flex";
}

function cerrarBusqueda(){
    const modal = document.getElementById("modalBusqueda");
    if(modal) modal.style.display = "none";
}

async function buscarCiudadTexto(texto){
    if(texto.length < 3) return;
    try{
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${texto}&count=5&language=es&format=json`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        mostrarResultados(datos.results || []);
    } catch(error){ console.error(error); }
}

function mostrarResultados(lista){
    const contenedor = document.getElementById("resultadosBusqueda");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    lista.forEach(ciudad=>{
        const item = document.createElement("div");
        item.style = "padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;";
        item.textContent = `${ciudad.name}, ${ciudad.country}`;
        item.onclick = ()=>{
            estado.lat = ciudad.latitude;
            estado.lon = ciudad.longitude;
            estado.ciudad = ciudad.name;
            actualizarMapa();
            actualizarClima();
            cerrarBusqueda();
        };
        contenedor.appendChild(item);
    });
}

function preguntarIA(){
    const pregunta = prompt("🤖 Pronóstico-Zap AI\n\n¿Qué quieres consultar sobre las variables climáticas o geográficas?");
    if(!pregunta) return;
    responderIA(pregunta.toLowerCase());
}

function responderIA(texto){
    let respuesta = "";
    
    if(texto.includes("rural") || texto.includes("zapiola") || texto.includes("buenos aires") || texto.includes("pueblo")){
        respuesta = "🌾 Distinción geográfica crítica de Pronóstico-Zap AI: Buenos Aires y todo el cordón del AMBA representan áreas puramente urbanas no rurales debido a su denso asfalto, edificación masiva y el claro efecto de isla de calor artificial. Por el contrario, nuestro pueblo de Zapiola y los campos del partido de Lobos son zonas netamente rurales y agropecuarias. El clima acá pega directo sobre el suelo, las pasturas y el ganado, haciendo vital este monitoreo para la producción.";
    }
    else if(texto.includes("lluvia") || texto.includes("agua") || texto.includes("llover")){
        respuesta = `🌧️ Monitoreo de precipitación en Pronóstico-Zap AI. Registramos actualmente una humedad de ${datosActuales.humidity}%. Para los caminos vecinales de tierra de nuestro pueblo rural, un milimetraje alto significa aislamiento temporal, mientras que una lluvia mansa es el motor de los cultivos estacionales. Seguimos la telemetría para anticipar cualquier tormenta brava.`;
    }
    else if(texto.includes("temperatura") || texto.includes("grados") || texto.includes("calor")){
        respuesta = `🌡️ El termómetro digital de Pronóstico-Zap AI acusa ${datosActuales.temperature}°C en este cuadrante. En el interior rural la amplitud térmica es muy marcada: al no haber edificios que retengan la radiación, el calor escapa rápido por la noche y las madrugadas son heladas comparadas con Buenos Aires.`;
    }
    else if(texto.includes("viento") || texto.includes("rafagas")){
        respuesta = `💨 Los sensores de corriente de Pronóstico-Zap AI marcan ráfagas a ${datosActuales.windspeed} km/h. En campo abierto esto define si las ventanas de trabajo agrícolas son seguras para aplicaciones o si hay peligro de erosión eólica sobre el suelo trabajado.`;
    }
    else if(texto.includes("escuela") || texto.includes("anexo") || texto.includes("colegio")){
        respuesta = "🏫 Este software avanzado de telemetría agro-meteorológica interactiva llamado Pronóstico-Zap AI es un desarrollo genuino de los alumnos del Anexo 3031 de la Escuela Secundaria N°3. Nuestro fin es dotar a nuestro pueblo de herramientas predictivas eficientes.";
    }
    else {
        respuesta = "🤖 Central integrada de Pronóstico-Zap AI. Estoy calibrado para darte respuestas bien extensas sobre el comportamiento atmospheric rural, humedades del suelo, ráfagas de viento o las marcadas diferencias productivas y climáticas con Buenos Aires.";
    }
    
    mostrarRespuestaIA(respuesta);
    hablar(respuesta);
}

function mostrarRespuestaIA(texto){
    const caja = document.getElementById("respuestaIA");
    if(caja) caja.innerHTML = `<div class="ia-msg" style="color:#00d2ff; font-weight:500; line-height: 1.5; text-align: justify;">${texto}</div>`;
}

function hablar(texto){
    if(!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "es-AR"; 
    voz.rate = 0.95;
    speechSynthesis.speak(voz);
}

function leerClima(){
    if(!datosActuales.temperature) return;
    const texto = `Reporte oficial de Pronóstico-Zap AI para la Escuela Secundaria Número Tres, Anexo 30 31. En Zapiola la temperatura ambiente se ubica en los ${datosActuales.temperature} grados, con ráfagas de viento corriendo a ${Math.round(datosActuales.windspeed)} kilómetros por hora.`;
    hablar(texto);
}

function solicitarNotificaciones(){
    if("Notification" in window && Notification.permission !== "granted") Notification.requestPermission();
}

function verificarAlertas(){
    if(!datosActuales.temperature) return;
    const alertaBox = document.getElementById("alertaMeteorologica");
    if(!alertaBox) return;

    if(datosActuales.temperature > 35){
        alertaBox.textContent = "⚠️ ALERTA: Ola de calor extremo detectada en la zona rural";
        alertaBox.style.background = "#ff4757";
        alertaBox.style.color = "#ffffff";
    } else if(datosActuales.windspeed > 50){
        alertaBox.textContent = "⚠️ ALERTA: Alerta por ráfagas intensas para el agro";
        alertaBox.style.background = "#ffa502";
        alertaBox.style.color = "#000000";
    } else {
        alertaBox.textContent = "✅ Pronóstico-Zap AI: Parámetros estables en el área del Anexo 3031";
        alertaBox.style.background = "#2ed573";
        alertaBox.style.color = "#0b1220";
    }
}

if("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
        navigator.serviceWorker.regist