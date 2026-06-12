// =====================================================
// SCRIPT DE LOGICA GENERAL - PRONÓSTICO-ZAP AI
// =====================================================

const estado = {
    lat: -35.186,
    lon: -59.094,
    ciudad: "Zapiola (Pueblo Rural)",
    mapa: null,
    marcador: null
};

let datosActuales = {};
let graficoTemperatura = null;
let graficoHistorial = null;

// Remoción de pantalla de carga inmediata una vez procesado el DOM
window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const pantalla = document.getElementById("pantallaCarga");
        if(pantalla) {
            pantalla.style.transition = "opacity 0.3s ease";
            pantalla.style.opacity = "0";
            setTimeout(() => { pantalla.remove(); }, 300);
            console.log("Pantalla de carga removida de la interfaz.");
        }
    }, 600);
});

// Inicialización de servicios al cargar la ventana
window.addEventListener("load", () => {
    iniciarMapa();
    iniciarGraficos();
    obtenerUbicacion();
});

function obtenerUbicacion(){
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            (pos)=>{
                estado.lat = pos.coords.latitude;
                estado.lon = pos.coords.longitude;
                estado.ciudad = (Math.abs(estado.lat - (-35.18)) < 0.2) ? "Zapiola (Pueblo Rural)" : "Zona Local";
                actualizarClima();
            },
            ()=>{ actualizarClima(); }
        );
    } else {
        actualizarClima();
    }
}

async function actualizarClima(){
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${estado.lat}&longitude=${estado.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        const datos = await res.json();

        datosActuales = {
            temperature: datos.current.temperature_2m,
            humidity: datos.current.relative_humidity_2m,
            windspeed: datos.current.wind_speed_10m
        };

        // Renderizado de datos del Hero
        document.getElementById("ubicacion").textContent = `📍 ${estado.ciudad}`;
        document.getElementById("temperatura").textContent = Math.round(datos.current.temperature_2m) + "°";
        document.getElementById("descripcion").textContent = descripcionClima(datos.current.weather_code);

        // Renderizado de las Mini Tarjetas
        const probLluvia = datos.hourly.precipitation_probability[0] || 0;
        document.getElementById("tarjetas-detalles").innerHTML = `
            <div class="tarjeta-mini"><span style="color:#00d2ff">💧</span><div class="info-mini"><span class="titulo-mini">HUMEDAD</span><span class="valor-mini">${datos.current.relative_humidity_2m}%</span></div></div>
            <div class="tarjeta-mini"><span style="color:#00d2ff">💨</span><div class="info-mini"><span class="titulo-mini">VIENTO</span><span class="valor-mini">${Math.round(datos.current.wind_speed_10m)} km/h</span></div></div>
            <div class="tarjeta-mini"><span style="color:#00d2ff">🌧️</span><div class="info-mini"><span class="titulo-mini">LLUVIA</span><span class="valor-mini">${probLluvia}%</span></div></div>
            <div class="tarjeta-mini"><span style="color:#ff4757">▲▼</span><div class="info-mini"><span class="titulo-mini">EXTREMAS</span><span class="valor-mini" style="font-size:0.8em; color:#ff4757;">Max: ${Math.round(datos.daily.temperature_2m_max[0])}°</span></div></div>
        `;

        actualizarMapa();
        renderHoras(datos);
        render7Dias(datos);
        actualizarGraficosData(datos);
        guardarHistorial();
        verificarAlertas();

    } catch (e) {
        console.error("Error obteniendo telemetría climática: ", e);
    }
}

function descripcionClima(codigo){
    const codigos = { 0:"☀️ Despejado", 1:"🌤️ Algo Nublado", 2:"⛅ Parcialmente Nublado", 3:"☁️ Nublado", 51:"🌦️ Llovizna", 61:"🌧️ Lluvia", 95:"⛈️ Tormenta" };
    return codigos[codigo] || "🍃 Variable";
}

function iniciarMapa(){
    const contenedor = document.getElementById("mapa");
    if(!contenedor || typeof L === "undefined") return;
    estado.mapa = L.map("mapa", {zoomControl: false}).setView([estado.lat, estado.lon], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(estado.mapa);
    estado.marcador = L.marker([estado.lat, estado.lon]).addTo(estado.mapa).bindPopup("<b>Estación E.E.S N°3</b>").openPopup();
}

function actualizarMapa(){
    if(!estado.mapa) return;
    estado.mapa.invalidateSize();
    estado.mapa.setView([estado.lat, estado.lon], 12);
    if(estado.marcador) estado.marcador.setLatLng([estado.lat, estado.lon]);
}

function iniciarGraficos(){
    const ctxT = document.getElementById("graficoTemperatura");
    if(ctxT && typeof Chart !== "undefined") {
        graficoTemperatura = new Chart(ctxT, {
            type: "line",
            data: { labels: [], datasets: [{ label: "Temperatura (°C)", data: [], borderColor: "#00d2ff", tension: 0.3, fill: false }] },
            options: { responsive: true }
        });
    }
    const ctxH = document.getElementById("graficoHistorial");
    if(ctxH && typeof Chart !== "undefined") {
        graficoHistorial = new Chart(ctxH, {
            type: "bar",
            data: { labels: [], datasets: [{ label: "Registro Térmico", data: [], backgroundColor: "#ff4757" }] },
            options: { responsive: true }
        });
    }
}

function actualizarGraficosData(datos){
    if(!graficoTemperatura) return;
    graficoTemperatura.data.labels = datos.hourly.time.slice(0, 8).map(t => t.substring(11, 16) + " hs");
    graficoTemperatura.data.datasets[0].data = datos.hourly.temperature_2m.slice(0, 8);
    graficoTemperatura.update();
}

function renderHoras(datos){
    const container = document.getElementById("pronosticoHoras");
    if(!container) return;
    container.innerHTML = "";
    for(let i=0; i<8; i++){
        container.innerHTML += `
            <div class="hour-card-fija">
                <div style="font-size:0.8em; opacity:0.7;">${datos.hourly.time[i].substring(11,16)}</div>
                <div style="margin:5px 0;">🌡️</div>
                <div style="font-weight:bold; color:#00d2ff;">${Math.round(datos.hourly.temperature_2m[i])}°</div>
            </div>`;
    }
}

function render7Dias(datos){
    const container = document.getElementById("pronostico7dias");
    if(!container) return;
    container.innerHTML = "";
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoy = new Date();
    
    for(let i=0; i<7; i++){
        const f = new Date(hoy);
        f.setDate(hoy.getDate() + i);
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9em;">
                <div>${i === 0 ? 'Hoy' : dias[f.getDay()]}</div>
                <div style="color:#ff4757; font-weight:bold;">${Math.round(datos.daily.temperature_2m_max[i])}° <span style="color:#00d2ff; font-weight:normal;">/ ${Math.round(datos.daily.temperature_2m_min[i])}°</span></div>
            </div>`;
    }
}

function guardarHistorial(){
    let hist = JSON.parse(localStorage.getItem("historialZap") || "[]");
    const hora = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if(hist.length === 0 || hist[hist.length - 1].hora !== hora) {
        hist.push({ hora, temp: datosActuales.temperature });
        if(hist.length > 6) hist.shift();
        localStorage.setItem("historialZap", JSON.stringify(hist));
    }

    const lista = document.getElementById("historial");
    if(lista) {
        lista.innerHTML = "";
        hist.slice().reverse().forEach(item => {
            lista.innerHTML += `<div style="font-size:0.85em; opacity:0.7; padding:4px 0;">⏱️ ${item.hora} -> 🌡️ ${item.temp}°C</div>`;
        });
    }

    if(graficoHistorial) {
        graficoHistorial.data.labels = hist.map(h => h.hora);
        graficoHistorial.data.datasets[0].data = hist.map(h => h.temp);
        graficoHistorial.update();
    }
}

function verificarAlertas(){
    const box = document.getElementById("alertaMeteorologica");
    if(!box) return;
    if(datosActuales.temperature > 35) {
        box.textContent = "⚠️ Alerta: Ola de calor extrema en el sector agropecuario";
        box.style.background = "#ff4757";
        box.style.color = "#ffffff";
    } else {
        box.textContent = "✅ Parámetros estables en el área del Anexo 3031";
        box.style.background = "#2ed573";
        box.style.color = "#0b1220";
    }
}

function abrirBuscador() { document.getElementById("modalBusqueda").style.display = "flex"; }
function cerrarBusqueda() { document.getElementById("modalBusqueda").style.display = "none"; }
async function buscarCiudadTexto(txt){
    if(txt.length < 3) return;
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${txt}&count=3&language=es&format=json`);
    const datos = await res.json();
    const caja = document.getElementById("resultadosBusqueda");
    caja.innerHTML = "";
    (datos.results || []).forEach(c => {
        const d = document.createElement("div");
        d.style = "padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;";
        d.textContent = `${c.name}, ${c.country}`;
        d.onclick = () => {
            estado.lat = c.latitude; estado.lon = c.longitude; estado.ciudad = c.name;
            actualizarClima(); cerrarBusqueda();
        };
        caja.appendChild(d);
    });
}

function preguntarIA(){
    const p = prompt("🤖 Pronóstico-Zap AI\n¿Qué deseas consultar sobre el entorno climático rural?");
    if(!p) return;
    let r = "🤖 Pronóstico-Zap AI: Sistema interactivo desarrollado por los alumnos del Anexo 3031 de la Escuela Secundaria N°3 de Zapiola para el monitoreo productivo y agro-meteorológico.";
    document.getElementById("respuestaIA").textContent = r;
    if(window.speechSynthesis) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(r));
    }
}

function leerClima(){
    if(!datosActuales.temperature) return;
    const t = `Reporte meteorológico oficial. En la zona de cobertura de la Escuela Secundaria Número Tres la temperatura actual es de ${datosActuales.temperature} grados.`;
    if(window.speechSynthesis) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(t));
    }
}
