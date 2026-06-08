<template>
  <div class="map-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Карта Алматы</h2>
        <p class="page-subtitle">Районы города и текущая геопозиция</p>
      </div>

      <section class="map-card">
        <button class="locate-btn" type="button" @click="locateMe">Мое местоположение</button>
        <div ref="mapEl" class="map-canvas"></div>
        <div class="map-note">Источник: OpenStreetMap (административные границы районов).</div>
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

@media (max-width: 980px) {
  .map-canvas {
    height: min(70vh, 620px);
  }
}
</style>
