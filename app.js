// =====================================================
// PRONOSTICO-ZAP AI
// APP.JS
// =====================================================

// Estado global
const estado = {
  lat: -35.186,
  lon: -59.094,
  ciudad: "Lobos",
  unidad: "C",
  mapa: null,
  marcador: null
};

// =====================================================
// INICIO
// =====================================================

window.addEventListener("load", () => {

  iniciarMapa();

  obtenerUbicacion();

  iniciarGraficos();

  ocultarPantallaCarga();

});

// =====================================================
// PANTALLA DE CARGA
// =====================================================

function ocultarPantallaCarga() {

  setTimeout(() => {

    const pantalla =
      document.getElementById("pantallaCarga");

    if (pantalla) {
      pantalla.style.display = "none";
    }

  }, 2000);

}

// =====================================================
// UBICACIÓN
// =====================================================

function obtenerUbicacion() {

  if (!navigator.geolocation) {

    actualizarClima();

    return;

  }

  navigator.geolocation.getCurrentPosition(

    posicion => {

      estado.lat =
        posicion.coords.latitude;

      estado.lon =
        posicion.coords.longitude;

      actualizarClima();

    },

    () => {

      actualizarClima();

    }

  );

}

// =====================================================
// CLIMA OPEN-METEO
// =====================================================

async function actualizarClima() {

  try {

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${estado.lat}&longitude=${estado.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

    const respuesta =
      await fetch(url);

    const datos =
      await respuesta.json();

    mostrarClima(datos);

  }

  catch(error) {

    console.error(error);

  }

}

// =====================================================
// MOSTRAR DATOS
// =====================================================

function mostrarClima(datos) {

  document.getElementById("temperatura")
    .textContent =
    Math.round(
      datos.current.temperature_2m
    ) + "°";

  document.getElementById("humedad")
    .textContent =
    datos.current.relative_humidity_2m + "%";

  document.getElementById("viento")
    .textContent =
    Math.round(
      datos.current.wind_speed_10m
    ) + " km/h";

  document.getElementById("descripcion")
    .textContent =
    descripcionClima(
      datos.current.weather_code
    );

  document.getElementById("maxima")
    .textContent =
    Math.round(
      datos.daily.temperature_2m_max[0]
    ) + "°";

  document.getElementById("minima")
    .textContent =
    Math.round(
      datos.daily.temperature_2m_min[0]
    ) + "°";

}

// =====================================================
// DESCRIPCIÓN CLIMA
// =====================================================

function descripcionClima(codigo) {

  const codigos = {

    0:"Despejado ☀️",
    1:"Mayormente despejado 🌤️",
    2:"Parcialmente nublado ⛅",
    3:"Nublado ☁️",

    45:"Niebla 🌫️",
    48:"Niebla 🌫️",

    51:"Llovizna 🌦️",
    61:"Lluvia 🌧️",

    71:"Nieve ❄️",

    95:"Tormenta ⛈️"

  };

  return codigos[codigo]
    || "Condición variable";

}