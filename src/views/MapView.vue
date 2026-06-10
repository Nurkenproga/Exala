<template>
  <div class="map-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Карта Алматы</h2>
        <p class="page-subtitle">Районы города, кинотеатры и текущая геопозиция</p>
      </div>

      <section class="map-card">
        <button class="locate-btn" type="button" @click="locateMe">Мое местоположение</button>
        <div class="cinema-counter">16 кинотеатров</div>
        <div ref="mapEl" class="map-canvas"></div>
        <div class="map-note">
          Источник карты: OpenStreetMap. Нажмите на фиолетовый маркер, чтобы посмотреть кинотеатр.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import L from 'leaflet'
import districtsGeoJson from '@/data/almaty-districts.osm.json'

const mapEl = ref<HTMLElement | null>(null)
let mapInstance: L.Map | null = null
let userMarker: L.CircleMarker | null = null
let userRadius: L.Circle | null = null

type DistrictProperties = {
  name: string
  slug: string
  color: string
}

type DistrictFeature = GeoJSON.Feature<GeoJSON.Geometry, DistrictProperties>

type CinemaLocation = {
  name: string
  coordinates: [number, number]
  description: string
}

const cinemas: CinemaLocation[] = [
  {
    name: 'Chaplin Cinemas Mega Park',
    coordinates: [43.263925, 76.928762],
    description: 'Кинотеатр сети Chaplin в торговом центре Mega Park.',
  },
  {
    name: 'Kinopark Esentai',
    coordinates: [43.218444, 76.927607],
    description: 'Кинотеатр Kinopark в районе Esentai.',
  },
  {
    name: 'Kinopark Globus',
    coordinates: [43.240595, 76.90581],
    description: 'Кинотеатр Kinopark в торговом центре Globus.',
  },
  {
    name: 'Kinoplexx',
    coordinates: [43.228789, 76.857967],
    description: 'Кинотеатр Kinoplexx в западной части Алматы.',
  },
  {
    name: 'Арман MART',
    coordinates: [43.335356, 76.953836],
    description: 'Кинотеатр сети Арман в районе торгового комплекса MART.',
  },
  {
    name: 'Chaplin ADK',
    coordinates: [43.232885, 76.880084],
    description: 'Кинотеатр Chaplin в торговом центре ADK.',
  },
  {
    name: 'Kinopark Atakent',
    coordinates: [43.224639, 76.908888],
    description: 'Кинотеатр Kinopark рядом с выставочным комплексом Atakent.',
  },
  {
    name: 'Kinopark East',
    coordinates: [43.315522, 77.025293],
    description: 'Кинотеатр Kinopark в восточной части города.',
  },
  {
    name: 'Арман Asia Park',
    coordinates: [43.24445, 76.835364],
    description: 'Кинотеатр сети Арман в торговом центре Asia Park.',
  },
  {
    name: 'Kinopark Moskva',
    coordinates: [43.226905, 76.863458],
    description: 'Кинотеатр Kinopark в торговом центре Moskva Metropolitan.',
  },
  {
    name: 'Kinopark Sputnik',
    coordinates: [43.212835, 76.841901],
    description: 'Кинотеатр Kinopark в торговом центре Sputnik.',
  },
  {
    name: 'Kinoforum',
    coordinates: [43.23410023563499, 76.934922404383],
    description: 'Городской кинотеатр в центральной части Алматы.',
  },
  {
    name: 'Dostyk Plaza Cinemax',
    coordinates: [43.23347706983339, 76.95621952619027],
    description: 'Кинотеатр Cinemax в торговом центре Dostyk Plaza.',
  },
  {
    name: 'Арман',
    coordinates: [43.242731330633106, 76.95750698646607],
    description: 'Кинотеатр сети Арман в центральной части города.',
  },
  {
    name: 'Chaplin Mega Alma-Ata',
    coordinates: [43.203419, 76.892385],
    description: 'Кинотеатр Chaplin в торговом центре MEGA Alma-Ata.',
  },
  {
    name: 'Almaty Mall Kinoplexx',
    coordinates: [43.207447, 76.858664],
    description: 'Кинотеатр Kinoplexx в торговом центре Almaty Mall.',
  },
]

const getDistrictStyle = (feature?: DistrictFeature): L.PathOptions => {
  const color = feature?.properties?.color || '#7d4dff'
  return {
    color,
    weight: 2,
    fillColor: color,
    fillOpacity: 0.18,
  }
}

const highlightStyle: L.PathOptions = {
  weight: 3,
  fillOpacity: 0.28,
}

const onEachDistrict = (feature: DistrictFeature, layer: L.Layer) => {
  const polygon = layer as L.Path

  layer.bindTooltip(feature.properties.name, {
    sticky: true,
    className: 'district-label',
    direction: 'top',
  })

  layer.bindPopup(
    `
    <div style="min-width:220px;line-height:1.45;">
      <b>${feature.properties.name}</b>
    </div>
    `,
  )

  layer.on('mouseover', () => {
    polygon.setStyle(highlightStyle)
  })

  layer.on('mouseout', () => {
    polygon.setStyle(getDistrictStyle(feature))
  })
}

const drawDistricts = (map: L.Map) => {
  const districtLayer = L.geoJSON(districtsGeoJson as GeoJSON.FeatureCollection, {
    style: (feature) => getDistrictStyle(feature as DistrictFeature),
    onEachFeature: (feature, layer) => onEachDistrict(feature as DistrictFeature, layer),
  })

  districtLayer.addTo(map)
  map.fitBounds(districtLayer.getBounds(), { padding: [12, 12] })
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] || character,
  )

const openCinemaRoute = (latitude: number, longitude: number) => {
  const destination = `${latitude},${longitude}`
  const openDestination = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  if (!navigator.geolocation) {
    openDestination()
    return
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const origin = `${coords.latitude},${coords.longitude}`
      const routeUrl =
        'https://www.google.com/maps/dir/?api=1' +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(destination)}` +
        '&travelmode=driving'

      window.open(routeUrl, '_blank', 'noopener,noreferrer')
    },
    openDestination,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    },
  )
}

const drawCinemas = (map: L.Map) => {
  const cinemaIcon = L.divIcon({
    className: 'cinema-marker-shell',
    html: '<div class="cinema-marker"><span></span></div>',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  })

  const cinemaLayer = L.layerGroup()

  cinemas.forEach((cinema) => {
    const [latitude, longitude] = cinema.coordinates

    L.marker(cinema.coordinates, { icon: cinemaIcon })
      .bindTooltip(cinema.name, {
        direction: 'top',
        offset: [0, -32],
        className: 'cinema-label',
      })
      .bindPopup(`
        <article class="cinema-popup">
          <p class="cinema-popup-type">Кинотеатр</p>
          <h3>${escapeHtml(cinema.name)}</h3>
          <p>${escapeHtml(cinema.description)}</p>
          <small>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>
          <button
            class="cinema-route-btn"
            type="button"
            data-latitude="${latitude}"
            data-longitude="${longitude}"
          >
            Построить маршрут
          </button>
        </article>
      `)
      .addTo(cinemaLayer)
  })

  cinemaLayer.addTo(map)
  L.control.layers(undefined, { Кинотеатры: cinemaLayer }, { collapsed: false }).addTo(map)

  map.on('popupopen', ({ popup }) => {
    const button = popup.getElement()?.querySelector<HTMLButtonElement>('.cinema-route-btn')
    if (!button) return

    button.onclick = () => {
      const latitude = Number(button.dataset.latitude)
      const longitude = Number(button.dataset.longitude)
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        openCinemaRoute(latitude, longitude)
      }
    }
  })
}

const locateMe = () => {
  const map = mapInstance
  if (!map) {
    return
  }

  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается в вашем браузере')
    return
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const point: [number, number] = [coords.latitude, coords.longitude]

      if (userMarker) {
        userMarker.remove()
      }
      if (userRadius) {
        userRadius.remove()
      }

      userMarker = L.circleMarker(point, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#4f9dff',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('Вы находитесь здесь')

      userRadius = L.circle(point, {
        radius: Math.max(coords.accuracy, 60),
        color: '#4f9dff',
        weight: 1,
        fillColor: '#4f9dff',
        fillOpacity: 0.15,
      }).addTo(map)

      map.setView(point, 13)
      userMarker.openPopup()
    },
    () => {
      alert('Не удалось получить геолокацию')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
  )
}

onMounted(() => {
  if (!mapEl.value) {
    return
  }

  mapInstance = L.map(mapEl.value, {
    center: [43.2389, 76.8897],
    zoom: 11,
    zoomControl: true,
    preferCanvas: true,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  }).addTo(mapInstance)

  drawDistricts(mapInstance)
  drawCinemas(mapInstance)
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
.map-view {
  min-height: calc(100vh - 80px);
  padding: 2rem 0;
}

.container {
  width: min(1240px, 92vw);
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 1.3rem;
}

.page-title {
  font-size: clamp(2rem, 4.2vw, 2.8rem);
  letter-spacing: -0.03em;
  font-weight: 800;
  color: #edf2ff;
}

.page-subtitle {
  margin-top: 0.45rem;
  color: #a8b4de;
}

.map-card {
  position: relative;
  background: linear-gradient(180deg, rgba(18, 23, 45, 0.96), rgba(11, 14, 27, 0.95));
  border: 1px solid rgba(167, 179, 235, 0.22);
  border-radius: 18px;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.32);
  padding: 0.55rem;
}

.locate-btn {
  position: absolute;
  top: 0.95rem;
  left: 0.95rem;
  z-index: 600;
  border: none;
  border-radius: 999px;
  padding: 0.48rem 0.9rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
  box-shadow: 0 10px 18px rgba(125, 77, 255, 0.28);
  cursor: pointer;
}

.locate-btn:hover {
  transform: translateY(-1px);
}

.cinema-counter {
  position: absolute;
  top: 0.95rem;
  left: 12.5rem;
  z-index: 600;
  padding: 0.48rem 0.8rem;
  border: 1px solid rgba(167, 179, 235, 0.3);
  border-radius: 999px;
  background: rgba(10, 15, 31, 0.9);
  color: #d9e1ff;
  font-size: 0.82rem;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.map-canvas {
  width: 100%;
  height: min(77vh, 760px);
  border-radius: 14px;
  overflow: hidden;
}

.map-note {
  margin-top: 0.55rem;
  text-align: right;
  font-size: 0.82rem;
  color: #9db0f0;
}

:deep(.leaflet-popup-content-wrapper) {
  background: rgba(9, 15, 31, 0.96);
  color: #e8efff;
  border: 1px solid rgba(167, 179, 235, 0.28);
}

:deep(.leaflet-popup-tip) {
  background: rgba(9, 15, 31, 0.96);
}

:deep(.leaflet-control-zoom a) {
  background: rgba(11, 16, 32, 0.92);
  color: #eef2ff;
  border-color: rgba(167, 179, 235, 0.25);
}

:deep(.leaflet-control-zoom a:hover) {
  background: rgba(125, 77, 255, 0.9);
}

:deep(.leaflet-control-attribution) {
  background: rgba(11, 16, 32, 0.8);
  color: #b4c1ea;
}

:deep(.district-label) {
  background: rgba(8, 14, 30, 0.85);
  border: 1px solid rgba(167, 179, 235, 0.4);
  color: #e9efff;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

:deep(.cinema-marker-shell) {
  background: transparent;
  border: none;
}

:deep(.cinema-marker) {
  position: relative;
  width: 34px;
  height: 34px;
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 12%;
  background: linear-gradient(135deg, #9b5cff, #6158ff);
  box-shadow: 0 7px 18px rgba(81, 58, 255, 0.48);
  transform: rotate(-45deg);
}

:deep(.cinema-marker span) {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #fff;
}

:deep(.cinema-label) {
  background: rgba(8, 14, 30, 0.92);
  border: 1px solid rgba(155, 92, 255, 0.55);
  border-radius: 999px;
  color: #f2efff;
  font-size: 0.74rem;
  font-weight: 700;
}

:deep(.cinema-popup) {
  min-width: 230px;
}

:deep(.cinema-popup-type) {
  margin: 0 0 0.2rem;
  color: #9e8cff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:deep(.cinema-popup h3) {
  margin: 0 0 0.4rem;
  color: #fff;
  font-size: 1rem;
}

:deep(.cinema-popup p) {
  margin: 0 0 0.55rem;
  color: #c9d3f4;
}

:deep(.cinema-popup small) {
  display: block;
  margin-bottom: 0.65rem;
  color: #8f9bc5;
}

:deep(.cinema-route-btn) {
  display: inline-block;
  padding: 0.4rem 0.65rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

:deep(.cinema-route-btn:hover) {
  filter: brightness(1.12);
}

:deep(.leaflet-control-layers) {
  border: 1px solid rgba(167, 179, 235, 0.25);
  background: rgba(10, 15, 31, 0.92);
  color: #e8efff;
}

@media (max-width: 980px) {
  .map-canvas {
    height: min(70vh, 620px);
  }

  .cinema-counter {
    display: none;
  }
}
</style>
