// =====================================================
// PRONÓSTICO-ZAP AI V3.5
// APP.JS - OPTIMIZADO PARA VERCEL
// =====================================================

const estado = {
    lat: -35.186,
    lon: -59.094,
    ciudad: "Lobos",
    unidad: "C",
    mapa: null,
    marcador: null,
    radarLayer: null
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

    const ubicaContainer = document.getElementById("ubicacion");
    if(ubicaContainer) ubicaContainer.textContent = `📍 ${estado.ciudad} (Zona Rural)`;

    const temperatura = document.getElementById("temperatura");
    const humedad = document.getElementById("humedad");
    const viento = document.getElementById("viento");
    const descripcion = document.getElementById("descripcion");
    const maxima = document.getElementById("maxima");
    const minima = document.getElementById("minima");

    if(temperatura) temperatura.textContent = Math.round(datos.current.temperature_2m) + "°C";
    if(humedad) humedad.textContent = datos.current.relative_humidity_2m + "%";
    if(viento) viento.textContent = Math.round(datos.current.wind_speed_10m) + " km/h";
    if(descripcion) descripcion.textContent = descripcionClima(datos.current.weather_code);
    if(maxima) maxima.textContent = Math.round(datos.daily.temperature_2m_max[0]) + "°C";
    if(minima) minima.textContent = Math.round(datos.daily.temperature_2m_min[0]) + "°C";

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
    if(!contenedor) return;
    estado.mapa = L.map("mapa").setView([estado.lat, estado.lon], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap"
    }).addTo(estado.mapa);
    estado.marcador = L.marker([estado.lat, estado.lon]).addTo(estado.mapa);
}

function actualizarMapa(){
    if(!estado.mapa) return;
    estado.mapa.setView([estado.lat, estado.lon], 10);
    estado.marcador.setLatLng([estado.lat, estado.lon]);
}

function activarRadar(){
    if(!estado.mapa) return;
    if(estado.radarLayer){
        estado.mapa.removeLayer(estado.radarLayer);
        estado.radarLayer = null;
        return;
    }
    estado.radarLayer = L.tileLayer("https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png", {
        opacity:0.6
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
            data:{ labels:[], datasets:[{ label:"Registro Historico °C", data:[], backgroundColor:"#ff4757" }] },
            options: { responsive: true }
        });
    }
}

function actualizarGraficoHoras(datos){
    if(!graficoTemperatura) return;
    const horas = datos.hourly.time.slice(0,24).map(h => h.substring(11,16));
    const temperaturas = datos.hourly.temperature_2m.slice(0,24);
    graficoTemperatura.data.labels = horas;
    graficoTemperatura.data.datasets[0].data = temperaturas;
    graficoTemperatura.update();
}

function guardarHistorialClima(){
    if(!datosActuales.temperature) return;
    let historial = JSON.parse(localStorage.getItem("historialClima") || "[]");
    historial.push({ fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), temperatura: datosActuales.temperature, viento: datosActuales.windspeed });
    if(historial.length > 10) historial.shift(); // Reducido para no saturar vista
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
    for(let i=0; i<12; i++){ // Mostramos 12 para evitar desborde visual largo
        const tarjeta = document.createElement("div");
        tarjeta.style = "background:rgba(255,255,255,0.05); padding:10px; border-radius:5px; min-width:70px; text-align:center; font-size:0.85em;";
        tarjeta.innerHTML = `
            <div>${datos.hourly.time[i].substring(11,16)}</div>
            <div style="margin:5px 0;">🌡️</div>
            <div style="font-weight:bold;">${Math.round(datos.hourly.temperature_2m[i])}°</div>
        `;
        contenedor.appendChild(tarjeta);
    }
}

function render7Dias(datos){
    const contenedor = document.getElementById("pronostico7dias");
    if(!contenedor) return;
    contenedor.innerHTML = "";
    for(let i=0;i<7;i++){
        const tarjeta = document.createElement("div");
        tarjeta.style = "display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9em;";
        tarjeta.innerHTML = `
            <div>Día ${i+1}</div>
            <div>☀️</div>
            <div><span style="color:#ff4757">${Math.round(datos.daily.temperature_2m_max[i])}°</span> / <span style="color:#00d2ff">${Math.round(datos.daily.temperature_2m_min[i])}°</span></div>
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
    const pregunta = prompt("🤖 Pronóstico-Zap (E.E.S N°3)\n\n¿Qué quieres preguntar al nodo rural?");
    if(!pregunta) return;
    responderIA(pregunta.toLowerCase());
}

function responderIA(texto){
    let respuesta = "";
    if(texto.includes("lluvia") || texto.includes("agua")){
        respuesta = "🌧️ Analizando la presión y nubes: Alta probabilidad de inestabilidad climática local.";
    }
    else if(texto.includes("temperatura") || texto.includes("grados")){
        respuesta = `🌡️ El nodo térmico registra actualmente ${datosActuales.temperature}°C en la zona de cobertura.`;
    }
    else if(texto.includes("viento")){
        respuesta = `💨 El viento corre a unos ${datosActuales.windspeed} km/h, ideal para medir dispersión en el campo.`;
    }
    else if(texto.includes("escuela") || texto.includes("anexo") || texto.includes("colegio")){
        respuesta = "🏫 Sistema desarrollado con orgullo por los estudiantes de la Escuela Secundaria N°3 - ANEXO 3031.";
    }
    else if(texto.includes("humedad")){
        respuesta = `💧 Sensores de ambiente marcan un ${datosActuales.humidity}% de humedad relativa en el aire.`;
    }
    else if(texto.includes("frio") || texto.includes("helada")){
        respuesta = "🥶 Alerta agropecuaria: Temperaturas en descenso durante las madrugadas rurales.";
    }
    else {
        respuesta = "🤖 Nodo Pronóstico-Zap activo. Consultas admitidas: temperatura, escuela, lluvia, humedad o viento.";
    }
    mostrarRespuestaIA(respuesta);
    hablar(respuesta);
}

function mostrarRespuestaIA(texto){
    const caja = document.getElementById("respuestaIA");
    if(caja) caja.innerHTML = `<div class="ia-msg" style="color:#00d2ff; font-weight:500;">${texto}</div>`;
}

function hablar(texto){
    if(!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "es-AR"; 
    speechSynthesis.speak(voz);
}

function leerClima(){
    if(!datosActuales.temperature) return;
    const texto = `Reporte para la Escuela Anexo 30 31. La temperatura actual es de ${datosActuales.temperature} grados, con humedad del ${datosActuales.humidity} por ciento.`;
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
        alertaBox.textContent = "⚠️ ALERTA: Calor Extremo en la Región Pampeana";
        alertaBox.style.background = "#ff4757";
        notificar("🔥 Alerta de calor extremo");
    } else if(datosActuales.windspeed > 50){
        alertaBox.textContent = "⚠️ ALERTA: Vientos fuertes para actividades agrícolas";
        alertaBox.style.background = "#ffa502";
        notificar("🌪️ Vientos fuertes detectados");
    } else {
        alertaBox.textContent = "✅ Condiciones estables en el área del Anexo 3031";
        alertaBox.style.background = "#2ed573";
    }
}

function notificar(texto){
    if(Notification.permission === "granted") new Notification("Pronóstico-Zap AI", { body:texto });
}

if("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
        navigator.serviceWorker.register("sw.js")
        .then(()=>{ console.log("PWA: Service Worker Activo para uso Offline"); })
        .catch(err=>{ console.error(err); });
    });
}

setInterval(()=>{ actualizarClima(); }, 300000);
