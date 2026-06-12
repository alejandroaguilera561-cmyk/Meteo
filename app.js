// =====================================================
// PRONÓSTICO-ZAP AI V3.6
// APP.JS - DASHBOARD INDIVIDUALIZADO COMPLETO
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
    const descripcion = document.getElementById("descripcion");

    if(temperatura) temperatura.textContent = Math.round(datos.current.temperature_2m) + "°";
    if(descripcion) descripcion.textContent = descripcionClima(datos.current.weather_code);

    // --- RENDERIZADO DE LOS CUADRADITOS INDIVIDUALES DETERMINADOS ---
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
                    <span class="titulo-mini">TENDENCIA</span>
                    <span class="valor-mini">${probLluvia}% Lluvia</span>
                </div>
            </div>
            <div class="tarjeta-mini">
                <span class="icon-mini">📊</span>
                <div class="info-mini">
                    <span class="titulo-mini">EXTREMAS</span>
                    <div style="margin-top:2px;">
                        <span style="font-size:0.85em; font-weight:bold; color:#ff4757;">▲${Math.round(datos.daily.temperature_2m_max[0])}°</span>
                        <span style="font-size:0.85em; font-weight:bold; color:#00d2ff; margin-left:4px;">▼${Math.round(datos.daily.temperature_2m_min[0])}°</span>
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
        const horaFormateada = datos.hourly.time[i].substring(11,16);
        
        const tarjeta = document.createElement("div");
        tarjeta.className = "hour-card"; 
        tarjeta.style = "background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; min-width: 75px; text-align: center; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.1);";
        tarjeta.innerHTML = `
            <div style="font-size: 0.9em; opacity: 0.8; font-weight: 600; font-family: 'Orbitron';">${horaFormateada}</div>
            <div style="margin: 6px 0; font-size: 1.2em;">🌡️</div>
            <div style="font-weight: bold; font-size: 1.1em; color: #ff4757;">${Math.round(datos.hourly.temperature_2m[i])}°</div>
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
                <span style="color: #ff4757; font-weight: bold; margin-right: 8px;">${Math
