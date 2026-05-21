const ciudad = document.getElementById("ciudad");
const temp = document.getElementById("temp");
const estado = document.getElementById("estado");
const humedad = document.getElementById("humedad");
const viento = document.getElementById("viento");
const uv = document.getElementById("uv");
const lluviaProb = document.getElementById("lluviaProb");
const pronostico = document.getElementById("pronostico");

let grafico;

// Coordenadas iniciales (Lobos, Buenos Aires)
let lat = -35.186;
let lon = -59.094;

async function cargarClima() {

    try {

        const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        const actual = datos.current;

        temp.textContent = Math.round(actual.temperature_2m);
        humedad.textContent = actual.relative_humidity_2m + " %";
        viento.textContent = actual.wind_speed_10m + " km/h";

        estado.textContent = descripcionClima(actual.weather_code);

        ciudad.textContent = "PRONÓSTICO-ZAP";

        uv.textContent = "Disponible próximamente";

        lluviaProb.textContent =
            datos.daily.precipitation_probability_max[0] + " %";

        cargarPronostico(datos);
        crearGrafico(datos);

    } catch (error) {

        estado.textContent = "Error al cargar datos";

        console.error(error);
    }
}

function descripcionClima(codigo){

    if(codigo === 0) return "☀️ Despejado";
    if(codigo <= 3) return "⛅ Parcialmente nublado";
    if(codigo <= 48) return "🌫️ Niebla";
    if(codigo <= 67) return "🌧️ Lluvia";
    if(codigo <= 77) return "❄️ Nieve";
    if(codigo <= 99) return "⛈️ Tormenta";

    return "Clima variable";
}

function cargarPronostico(datos){

    pronostico.innerHTML = "";

    const dias = datos.daily.time;

    for(let i=0;i<7;i++){

        const div = document.createElement("div");

        div.className = "dia";

        div.innerHTML = `
            <h3>${dias[i]}</h3>
            <p>🌡️ ${Math.round(datos.daily.temperature_2m_max[i])}°</p>
            <p>❄️ ${Math.round(datos.daily.temperature_2m_min[i])}°</p>
            <p>🌧️ ${datos.daily.precipitation_probability_max[i]}%</p>
        `;

        pronostico.appendChild(div);
    }
}

function crearGrafico(datos){

    const horas = datos.hourly.time.slice(0,24);
    const temperaturas = datos.hourly.temperature_2m.slice(0,24);

    const ctx = document.getElementById("graficoTemp");

    if(grafico){
        grafico.destroy();
    }

    grafico = new Chart(ctx,{
        type:"line",
        data:{
            labels:horas.map(h => h.substring(11,16)),
            datasets:[{
                label:"Temperatura °C",
                data:temperaturas,
                borderWidth:3,
                tension:0.4
            }]
        },
        options:{
            responsive:true
        }
    });
}

cargarClima();
setInterval(cargarClima,600000);