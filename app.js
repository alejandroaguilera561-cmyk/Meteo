// =====================================================
// METEOMAX PRO V3.0
// APP.JS - PARTE 1
// =====================================================

// ----------------------------
// ESTADO GLOBAL
// ----------------------------

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

// ----------------------------
// INICIO
// ----------------------------

window.addEventListener("load", async () => {

    iniciarMapa();

    iniciarGraficos();

    actualizarHistorial();

    await obtenerUbicacion();

    ocultarPantallaCarga();

    solicitarNotificaciones();

});

// ----------------------------
// PANTALLA DE CARGA
// ----------------------------

function ocultarPantallaCarga(){

    const pantalla =
        document.getElementById("pantallaCarga");

    if(!pantalla) return;

    setTimeout(() => {

        pantalla.style.opacity = "0";

        setTimeout(() => {
            pantalla.style.display = "none";
        },500);

    },1500);

}

// ----------------------------
// UBICACIÓN
// ----------------------------

async function obtenerUbicacion(){

    return new Promise((resolve)=>{

        if(!navigator.geolocation){

            actualizarClima();
            resolve();
            return;
        }

        navigator.geolocation.getCurrentPosition(

            (pos)=>{

                estado.lat =
                    pos.coords.latitude;

                estado.lon =
                    pos.coords.longitude;

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

// ----------------------------
// API OPEN-METEO
// ----------------------------

async function actualizarClima(){

    try{

        const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${estado.lat}&longitude=${estado.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

        const respuesta =
            await fetch(url);

        const datos =
            await respuesta.json();

        mostrarClima(datos);

        actualizarMapa();

        renderHoras(datos);

        render7Dias(datos);

        actualizarGraficoHoras(datos);

        guardarHistorialClima();

        mostrarHistorial();

    }
    catch(error){

        console.error(
            "Error obteniendo clima:",
            error
        );

    }

}

// ----------------------------
// MOSTRAR DATOS
// ----------------------------

function mostrarClima(datos){

    datosActuales = {

        temperature:
            datos.current.temperature_2m,

        humidity:
            datos.current.relative_humidity_2m,

        windspeed:
            datos.current.wind_speed_10m,

        weather:
            datos.current.weather_code

    };

    const temperatura =
        document.getElementById("temperatura");

    const humedad =
        document.getElementById("humedad");

    const viento =
        document.getElementById("viento");

    const descripcion =
        document.getElementById("descripcion");

    const maxima =
        document.getElementById("maxima");

    const minima =
        document.getElementById("minima");

    if(temperatura)
        temperatura.textContent =
        Math.round(datos.current.temperature_2m) + "°";

    if(humedad)
        humedad.textContent =
        datos.current.relative_humidity_2m + "%";

    if(viento)
        viento.textContent =
        Math.round(datos.current.wind_speed_10m)
        + " km/h";

    if(descripcion)
        descripcion.textContent =
        descripcionClima(
            datos.current.weather_code
        );

    if(maxima)
        maxima.textContent =
        Math.round(
            datos.daily.temperature_2m_max[0]
        ) + "°";

    if(minima)
        minima.textContent =
        Math.round(
            datos.daily.temperature_2m_min[0]
        ) + "°";

    verificarAlertas();

}

// ----------------------------
// DESCRIPCIÓN DEL CLIMA
// ----------------------------

function descripcionClima(codigo){

    const codigos = {

        0:"☀️ Despejado",
        1:"🌤️ Mayormente despejado",
        2:"⛅ Parcialmente nublado",
        3:"☁️ Nublado",

        45:"🌫️ Niebla",
        48:"🌫️ Niebla intensa",

        51:"🌦️ Llovizna",
        61:"🌧️ Lluvia",

        71:"❄️ Nieve",

        95:"⛈️ Tormenta"

    };

    return codigos[codigo]
        || "🌎 Condición variable";
}

// =====================================================
// MAPA LEAFLET
// =====================================================

function iniciarMapa(){

    const contenedor =
        document.getElementById("mapa");

    if(!contenedor) return;

    estado.mapa = L.map("mapa").setView(
        [estado.lat, estado.lon],
        10
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:"© OpenStreetMap"
        }
    ).addTo(estado.mapa);

    estado.marcador =
        L.marker([
            estado.lat,
            estado.lon
        ]).addTo(estado.mapa);

}

// =====================================================
// ACTUALIZAR MAPA
// =====================================================

function actualizarMapa(){

    if(!estado.mapa) return;

    estado.mapa.setView(
        [estado.lat, estado.lon],
        10
    );

    estado.marcador.setLatLng([
        estado.lat,
        estado.lon
    ]);

}

// =====================================================
// RADAR METEOROLÓGICO
// =====================================================

function activarRadar(){

    if(!estado.mapa) return;

    if(estado.radarLayer){

        estado.mapa.removeLayer(
            estado.radarLayer
        );

        estado.radarLayer = null;

        return;
    }

    estado.radarLayer =
    L.tileLayer(
        "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png",
        {
            opacity:0.6
        }
    );

    estado.radarLayer.addTo(
        estado.mapa
    );

}

// =====================================================
// GRÁFICOS CHART.JS
// =====================================================

function iniciarGraficos(){

    const canvasTemp =
        document.getElementById(
            "graficoTemperatura"
        );

    if(canvasTemp){

        graficoTemperatura =
        new Chart(
            canvasTemp,
            {
                type:"line",
                data:{
                    labels:[],
                    datasets:[
                        {
                            label:"Temperatura °C",
                            data:[],
                            borderWidth:3,
                            tension:0.4,
                            fill:true
                        }
                    ]
                }
            }
        );

    }

    const canvasHistorial =
        document.getElementById(
            "graficoHistorial"
        );

    if(canvasHistorial){

        graficoHistorial =
        new Chart(
            canvasHistorial,
            {
                type:"bar",
                data:{
                    labels:[],
                    datasets:[
                        {
                            label:"Historial",
                            data:[]
                        }
                    ]
                }
            }
        );

    }

}

// =====================================================
// ACTUALIZAR GRÁFICO HORARIO
// =====================================================

function actualizarGraficoHoras(datos){

    if(!graficoTemperatura) return;

    const horas =
    datos.hourly.time
    .slice(0,24)
    .map(h =>
        h.substring(11,16)
    );

    const temperaturas =
    datos.hourly.temperature_2m
    .slice(0,24);

    graficoTemperatura.data.labels =
        horas;

    graficoTemperatura
    .data
    .datasets[0]
    .data =
        temperaturas;

    graficoTemperatura.update();

}

// =====================================================
// HISTORIAL CLIMÁTICO
// =====================================================

function guardarHistorialClima(){

    if(!datosActuales.temperature)
        return;

    let historial =
    JSON.parse(
        localStorage.getItem(
            "historialClima"
        ) || "[]"
    );

    historial.push({

        fecha:
            new Date()
            .toLocaleString(),

        temperatura:
            datosActuales.temperature,

        viento:
            datosActuales.windspeed

    });

    if(historial.length > 100){

        historial.shift();

    }

    localStorage.setItem(
        "historialClima",
        JSON.stringify(historial)
    );

    actualizarHistorial();

}

// =====================================================
// ACTUALIZAR HISTORIAL
// =====================================================

function actualizarHistorial(){

    let historial =
    JSON.parse(
        localStorage.getItem(
            "historialClima"
        ) || "[]"
    );

    if(!graficoHistorial) return;

    graficoHistorial.data.labels =
    historial.map(
        item => item.fecha
    );

    graficoHistorial.data.datasets[0].data =
    historial.map(
        item => item.temperatura
    );

    graficoHistorial.update();

}

// =====================================================
// MOSTRAR HISTORIAL
// =====================================================

function mostrarHistorial(){

    const contenedor =
    document.getElementById(
        "historial"
    );

    if(!contenedor) return;

    const historial =
    JSON.parse(
        localStorage.getItem(
            "historialClima"
        ) || "[]"
    );

    contenedor.innerHTML = "";

    historial
    .slice()
    .reverse()
    .forEach(item=>{

        contenedor.innerHTML += `
        <div class="hist-item">

            🌡️ ${item.temperatura}°C

            💨 ${item.viento} km/h

            <br>

            <small>
                ${item.fecha}
            </small>

        </div>
        `;

    });

}

// =====================================================
// PRONÓSTICO POR HORAS
// =====================================================

function renderHoras(datos){

    const contenedor =
    document.getElementById(
        "pronosticoHoras"
    );

    if(!contenedor) return;

    contenedor.innerHTML = "";

    for(let i=0;i<24;i++){

        const tarjeta =
        document.createElement("div");

        tarjeta.className =
        "hour-card";

        tarjeta.innerHTML = `

            <div class="hora">
                ${datos.hourly.time[i]
                .substring(11,16)}
            </div>

            <div class="icono">
                🌡️
            </div>

            <div class="temperatura">
                ${Math.round(
                    datos.hourly
                    .temperature_2m[i]
                )}°
            </div>

        `;

        contenedor.appendChild(
            tarjeta
        );

    }

}

// =====================================================
// PRONÓSTICO 7 DÍAS
// =====================================================

function render7Dias(datos){

    const contenedor =
    document.getElementById(
        "pronostico7dias"
    );

    if(!contenedor) return;

    contenedor.innerHTML = "";

    for(let i=0;i<7;i++){

        const tarjeta =
        document.createElement("div");

        tarjeta.className =
        "day-card";

        tarjeta.innerHTML = `

            <div class="dia">
                Día ${i+1}
            </div>

            <div class="icono">
                ☀️
            </div>

            <div class="max">
                ${Math.round(
                    datos.daily
                    .temperature_2m_max[i]
                )}°
            </div>

            <div class="min">
                ${Math.round(
                    datos.daily
                    .temperature_2m_min[i]
                )}°
            </div>

        `;

        contenedor.appendChild(
            tarjeta
        );

    }

}

// =====================================================
// BUSCADOR DE CIUDADES
// =====================================================

function abrirBuscador(){

    const modal =
    document.getElementById(
        "modalBusqueda"
    );

    if(modal){
        modal.style.display =
        "flex";
    }

}

function cerrarBusqueda(){

    const modal =
    document.getElementById(
        "modalBusqueda"
    );

    if(modal){
        modal.style.display =
        "none";
    }

}

async function buscarCiudadTexto(texto){

    if(texto.length < 3) return;

    try{

        const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${texto}&count=5&language=es&format=json`;

        const respuesta =
        await fetch(url);

        const datos =
        await respuesta.json();

        mostrarResultados(
            datos.results || []
        );

    }
    catch(error){

        console.error(error);

    }

}

function mostrarResultados(lista){

    const contenedor =
    document.getElementById(
        "resultadosBusqueda"
    );

    if(!contenedor) return;

    contenedor.innerHTML = "";

    lista.forEach(ciudad=>{

        const item =
        document.createElement("div");

        item.className =
        "resultadoCiudad";

        item.textContent =
        `${ciudad.name}, ${ciudad.country}`;

        item.onclick = ()=>{

            estado.lat =
            ciudad.latitude;

            estado.lon =
            ciudad.longitude;

            estado.ciudad =
            ciudad.name;

            actualizarMapa();

            actualizarClima();

            cerrarBusqueda();

        };

        contenedor.appendChild(item);

    });

}

// =====================================================
// IA PRONOSTICO-ZAP
// =====================================================

function preguntarIA(){

    const pregunta =
    prompt(
        "🤖 Pronóstico-Zap\n\n¿Qué quieres preguntar?"
    );

    if(!pregunta) return;

    responderIA(
        pregunta.toLowerCase()
    );

}

function responderIA(texto){

    let respuesta = "";

    if(texto.includes("lluvia")){

        respuesta =
        "🌧️ Existe probabilidad de lluvia según el pronóstico actual.";

    }

    else if(texto.includes("temperatura")){

        respuesta =
        `🌡️ Actualmente hay ${datosActuales.temperature}°C.`;

    }

    else if(texto.includes("viento")){

        respuesta =
        `💨 El viento sopla a ${datosActuales.windspeed} km/h.`;

    }

    else if(texto.includes("humedad")){

        respuesta =
        `💧 La humedad actual es ${datosActuales.humidity}%.`;

    }

    else if(texto.includes("frio")){

        respuesta =
        "🥶 Se esperan temperaturas bajas durante la madrugada.";

    }

    else if(texto.includes("calor")){

        respuesta =
        "☀️ La temperatura aumentará durante la tarde.";

    }

    else if(texto.includes("tormenta")){

        respuesta =
        "⛈️ No se detectan tormentas severas actualmente.";

    }

    else if(texto.includes("hola")){

        respuesta =
        "👋 Hola, soy Pronóstico-Zap. Puedo ayudarte con el clima.";

    }

    else{

        respuesta =
        "🤖 Todavía estoy aprendiendo. Pregúntame sobre temperatura, lluvia, viento o humedad.";

    }

    mostrarRespuestaIA(
        respuesta
    );

    hablar(
        respuesta
    );

}

function mostrarRespuestaIA(texto){

    const caja =
    document.getElementById(
        "respuestaIA"
    );

    if(caja){

        caja.innerHTML =
        `<div class="ia-msg">${texto}</div>`;

    }

}

// =====================================================
// VOZ
// =====================================================

function hablar(texto){

    if(!window.speechSynthesis)
        return;

    speechSynthesis.cancel();

    const voz =
    new SpeechSynthesisUtterance(
        texto
    );

    voz.lang = "es-ES";
    voz.rate = 1;

    speechSynthesis.speak(
        voz
    );

}

function leerClima(){

    if(!datosActuales.temperature)
        return;

    const texto =
    `La temperatura actual es de ${datosActuales.temperature} grados Celsius con viento de ${datosActuales.windspeed} kilómetros por hora.`;

    hablar(texto);

}

// =====================================================
// ALERTAS
// =====================================================

function solicitarNotificaciones(){

    if(
        "Notification" in window &&
        Notification.permission !== "granted"
    ){

        Notification.requestPermission();

    }

}

function verificarAlertas(){

    if(!datosActuales.temperature)
        return;

    if(datosActuales.temperature > 35){

        notificar(
            "🔥 Alerta de calor extremo"
        );

    }

    if(datosActuales.windspeed > 60){

        notificar(
            "🌪️ Vientos fuertes detectados"
        );

    }

}

function notificar(texto){

    if(
        Notification.permission ===
        "granted"
    ){

        new Notification(
            "MeteoMAX PRO",
            {
                body:texto
            }
        );

    }

}

// =====================================================
// SERVICE WORKER
// =====================================================

if("serviceWorker" in navigator){

    window.addEventListener(
        "load",
        ()=>{

            navigator
            .serviceWorker
            .register("sw.js")
            .then(()=>{

                console.log(
                    "Service Worker activo"
                );

            })
            .catch(error=>{

                console.error(error);

            });

        }
    );

}

// =====================================================
// ACTUALIZACIÓN AUTOMÁTICA
// =====================================================

setInterval(()=>{

    actualizarClima();

},300000);

// =====================================================
// FIN APP.JS
// =====================================================