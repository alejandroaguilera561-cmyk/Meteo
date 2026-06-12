// =====================================================
// PRONÓSTICO-ZAP AI V4.5
// APP-V2.JS - MODO RURAL CORREGIDO + CAPA DE VIENTO + IA AVANZADA
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

window.addEventListener("load", async () => {
    iniciarMapa();
    iniciarGraficos();
    actualizarHistorial();
    await obtenerUbicacion();
    ocultarPantallaCarga();
    solicitarNotificaciones();
});

function ocultarPantallaCarga(){
    const pantalla = document.getElementById("pantallaCarga");
    if(!pantalla) return;
    setTimeout(() => {
        pantalla.style.opacity = "0";
        setTimeout(() => { pantalla.style.display = "none"; }, 500);
    }, 1500);
}

async function obtenerUbicacion(){
    return new Promise((resolve)=>{
        if(!navigator.geolocation){
            actualizarClima();
            resolve();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos)=>{
                estado.lat = pos.coords.latitude;
                estado.lon = pos.coords.longitude;
                // Si está cerca de Lobos/Zapiola forzamos la identidad de pueblo rural
                if(Math.abs(estado.lat - (-35.18)) < 0.2){
                    estado.ciudad = "Zapiola (Pueblo Rural)";
                } else {
                    estado.ciudad = "Zona Local";
                }
                actualizarClima();
                resolve();
            },
            ()=>{
                actualizarClima();
                resolve();
            }
        );
    });
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
        console.error("Error obteniendo clima:", error);
    }
}

function mostrarClima(datos){
    datosActuales = {
        temperature: datos.current.temperature_2m,
        humidity: datos.current.relative_humidity_2m,
        windspeed: datos.current.wind_speed_10m,
        weather: datos.current.weather_code
    };

    // Filtro inteligente de etiquetas para diferenciar lo urbano de lo rural
    let etiquetaZona = "Zona Urbana / Ciudad";
    if (estado.ciudad.toLowerCase().includes("zapiola") || estado.ciudad.toLowerCase().includes("lobos") || estado.ciudad.toLowerCase().includes("navarro") || estado.ciudad.toLowerCase().includes("monte")) {
        etiquetaZona = "🏡 Pueblo y Zonas Rurales";
    } else if (estado.ciudad.toLowerCase().includes("buenos aires") || estado.ciudad.toLowerCase().includes("capital") || estado.ciudad.toLowerCase().includes("federal")) {
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

// INICIAR MAPA CON CAPA METEOROLÓGICA DE VIENTO EN VIVO
function iniciarMapa(){
    const contenedor = document.getElementById("mapa");
    if(!contenedor) return;
    
    estado.mapa = L.map("mapa").setView([estado.lat, estado.lon], 11);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap"
    }).addTo(estado.mapa);
    
    // Agregamos la capa dinámica interactiva para ver corrientes de viento y nubes
    estado.capaViento = L.tileLayer("https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=d22d5da5210a5dced575cc3971cdcbf2", {
        opacity: 0.6,
        zIndex: 10
    }).addTo(estado.mapa);

    estado.capaNubes = L.tileLayer("https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=d22d5da5210a5dced575cc3971cdcbf2", {
        opacity: 0.4,
        zIndex: 9
    }).addTo(estado.mapa);

    estado.marcador = L.marker([estado.lat, estado.lon]).addTo(estado.mapa)
        .bindPopup("<b>Estación E.E.S N°3</b><br>Monitoreo Agropecuario.")
        .openPopup();
}

function actualizarMapa(){
    if(!estado.mapa) return;
    estado.mapa.setView([estado.lat, estado.lon], 11);
    estado.marcador.setLatLng([estado.lat, estado.lon]);
}

// BOTÓN RADAR ACTIVA EL RADAR TRADICIONAL DE PRECIPITACIONES DE RESPUESTA RÁPIDA
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
    if(canvasTemp){
        graficoTemperatura = new Chart(canvasTemp, {
            type:"line",
            data:{ labels:[], datasets:[{ label:"Temperatura °C", data:[], borderColor:"#00d2ff", backgroundColor:"rgba(0,210,255,0.1)", borderWidth:3, tension:0.4, fill:true }] },
            options: { responsive: true, scales: { y: { grid: { color: "rgba(255,255,255,0.1)" } } } }
        });
    }

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
    const horas = datos.hourly.time.slice(0,12).map(h => h.substring(11,16));
    const temperaturas = datos.hourly.temperature_2m.slice(0,12);
    graficoTemperatura.data.labels = horas;
    graficoTemperatura.data.datasets[0].data = temperaturas;
    graficoTemperatura.update();
}

function guardarHistorialClima(){
    if(!datosActuales.temperature) return;
    let historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    historial.push({ fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), temperatura: datosActuales.temperature, viento: datosActuales.windspeed });
    if(historial.length > 10) historial.shift();
    localStorage.setItem("historialClima", JSON.stringify(historial));
    actualizarHistorial();
}

function actualizarHistorial(){
    let historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    if(!graficoHistorial) return;
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
            <div style="font-size: 0.85em; opacity: 0.8; font-weight: 600; font-family: 'Orbitron';">${horaLimpia}</div>
            <div style="margin: 4px 0; font-size: 1.1em;">🌡️</div>
            <div style="font-weight: bold; font-size: 1em; color: #ff4757;">${Math.round(datos.hourly.temperature_2m[i])}°</div>
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
    const pregunta = prompt("🤖 Pronóstico-Zap (E.E.S N°3)\n\n¿Qué quieres consultar sobre las variables climáticas o geográficas?");
    if(!pregunta) return;
    responderIA(pregunta.toLowerCase());
}

// LA IA AHORA HABLA MUCHO MÁS, EXPANDE Y DETALLA LA REALIDAD AGRO-RURAL
function responderIA(texto){
    let respuesta = "";
    
    if(texto.includes("rural") || texto.includes("zapiola") || texto.includes("buenos aires") || texto.includes("pueblo")){
        respuesta = "🌾 Distinción geográfica crítica del nodo Zap-AI: Buenos Aires (el área metropolitana) es puramente de asfalto y cemento, catalogado como área urbana no rural debido a su efecto de isla de calor. En contraste, pueblos como Zapiola o los campos del partido de Lobos son zonas netamente rurales y de producción agropecuaria. El clima acá impacta directo sobre el suelo, las pasturas y el ganado, por eso nuestro monitoreo se enfoca de lleno en dar soporte a las decisiones del campo.";
    }
    else if(texto.includes("lluvia") || texto.includes("agua") || texto.includes("llover")){
        respuesta = `🌧️ Evaluando el mapa dinámico y las capas satelitales en tiempo real. Actualmente registramos una probabilidad inmediata y un porcentaje de humedad del ${datosActuales.humidity}%. Para los pueblos rurales esto es vital: un milimetraje adecuado estabiliza los rindes de siembra, mientras que tormentas fuertes complican los caminos vecinales de tierra. Mantenemos el monitoreo de radar encendido para alertar cualquier celda convectiva inestable.`;
    }
    else if(texto.includes("temperatura") || texto.includes("grados") || texto.includes("calor")){
        respuesta = `🌡️ Los sensores térmicos registran exactamente ${datosActuales.temperature}°C en este cuadrante. En las zonas de campo abierto y pueblos rurales, la amplitud térmica suele ser mucho mayor que en Buenos Aires porque no hay edificios que retengan el calor. Esto significa que las tardes pueden ser muy cálidas pero las madrugadas bajan de golpe afectando la energía térmica de la biomasa.`;
    }
    else if(texto.includes("viento") || texto.includes("rafagas")){
        respuesta = `💨 El mapa dinámico de corrientes marca ráfagas activas a ${datosActuales.windspeed} km/h. En los entornos de chacras y campos, el viento causa erosión eólica directa y define las ventanas de trabajo para pulverizaciones agrícolas o aplicaciones aéreas. Si las velocidades superan el umbral crítico de 50 kilómetros por hora, nuestro nodo activa alertas de resguardo automáticas para estructuras rurales.`;
    }
    else if(texto.includes("escuela") || texto.includes("anexo") || texto.includes("colegio")){
        respuesta = "🏫 Esta plataforma de telemetría meteorológica interactiva y avanzada fue diseñada y programada con orgullo por el equipo de estudiantes del Anexo 3031 de la Escuela Educación Secundaria N°3. Nuestro propósito es dotar a nuestro pueblo de tecnología predictiva de vanguardia para demostrar el potencial técnico y científico que tenemos en el interior de la provincia.";
    }
    else if(texto.includes("humedad")){
        respuesta = `静态 El higrómetro marca un valor de ${datosActuales.humidity}% de humedad relativa. En nuestro pueblo rural, altos niveles combinados con bajas temperaturas generan los bancos de niebla matinales que reducen la visibilidad en las rutas, mientras que en verano niveles altos predisponen la aparición de plagas fúngicas en los cultivos locales.`;
    }
    else {
        respuesta = "🤖 Saludo del nodo Pronóstico-Zap AI. Estoy calibrado para darte respuestas bien extensas sobre el clima en los pueblos rurales. Podés preguntarme con detalle sobre la humedad de los campos, la velocidad del viento, tormentas entrantes, o pedirme que te explique la diferencia climática entre Buenos Aires y nuestra zona de Zapiola.";
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
    voz.rate = 0.95; // Un poquito más pausado para que se entienda ideal en el stand
    speechSynthesis.speak(voz);
}

function leerClima(){
    if(!datosActuales.temperature) return;
    const texto = `Reporte oficial de telemetría para la Escuela Secundaria Número Tres, Anexo 30 31. En nuestro entorno rural, la temperatura ambiente se ubica en los ${datosActuales.temperature} grados, con ráfagas de viento corriendo a ${Math.round(datosActuales.windspeed)} kilómetros por hora.`;
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
        notificar("🔥 Alerta de calor extremo");
    } else if(datosActuales.windspeed > 50){
        alertaBox.textContent = "⚠️ ALERTA: Alerta por ráfagas inte