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
        <div class="map-note">Границы районов показаны условно для визуальной навигации.</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import L from 'leaflet'

const mapEl = ref<HTMLElement | null>(null)
let mapInstance: L.Map | null = null
let userMarker: L.CircleMarker | null = null
let userRadius: L.Circle | null = null

const districts: Array<{
  name: string
  points: [number, number][]
  color: string
  summary: string
  details: string
}> = [
  {
    name: 'Алмалинский',
    color: '#9f6bff',
    summary: 'Центральный административный и культурный район.',
    details:
      'Центральный район с историческим ядром города. В описании границ упоминаются проспекты Назарбаева, Абая, Райымбека и район озера Сайран.',
    points: [
      [43.256, 76.90],
      [43.248, 76.905],
      [43.24, 76.895],
      [43.246, 76.88],
      [43.255, 76.883],
    ],
  },
  {
    name: 'Бостандыкский',
    color: '#4f9dff',
    summary: 'Современный южный район с деловыми и жилыми кварталами.',
    details:
      'Один из самых активных районов Алматы: бизнес-центры, университеты и плотная жилая застройка. Расположен в южной части между городской рекой и восточной границей города.',
    points: [
      [43.25, 76.95],
      [43.235, 76.97],
      [43.215, 76.95],
      [43.223, 76.91],
      [43.245, 76.915],
    ],
  },
  {
    name: 'Медеуский',
    color: '#2cb6c8',
    summary: 'Исторический и горный район, включая Медеу.',
    details:
      'Тянется от центральной части к югу и востоку, включает предгорья Заилийского Алатау и высокогорные зоны. Именно здесь расположены знаковые туристические локации.',
    points: [
      [43.24, 76.91],
      [43.225, 76.95],
      [43.2, 76.93],
      [43.19, 76.88],
      [43.215, 76.86],
    ],
  },
  {
    name: 'Ауэзовский',
    color: '#7ad65e',
    summary: 'Крупный жилой район в западной части Алматы.',
    details:
      'Западный район с плотной жилой застройкой. В описании границ упоминаются проспект Райымбека, Каргалинка и Большая Алматинка, а также соседство с Бостандыкским районом.',
    points: [
      [43.255, 76.87],
      [43.245, 76.88],
      [43.23, 76.86],
      [43.235, 76.83],
      [43.255, 76.835],
    ],
  },
  {
    name: 'Наурызбайский',
    color: '#f9b14a',
    summary: 'Новый район на юго-западе города.',
    details:
      'Один из самых новых районов, сформирован за счет присоединения пригородных территорий (в том числе Каргалы, Карагайлы, Акжар).',
    points: [
      [43.255, 76.835],
      [43.235, 76.83],
      [43.22, 76.79],
      [43.245, 76.77],
      [43.265, 76.8],
    ],
  },
  {
    name: 'Алатауский',
    color: '#f47f59',
    summary: 'Северный район индустриального и жилого развития.',
    details:
      'Развивающийся северный район с новыми жилыми кварталами и промышленными зонами, включая крупные современные проекты застройки.',
    points: [
      [43.275, 76.83],
      [43.255, 76.835],
      [43.255, 76.87],
      [43.275, 76.88],
      [43.29, 76.85],
    ],
  },
  {
    name: 'Жетысуский',
    color: '#e862a1',
    summary: 'Промышленно-жилой район северной части города.',
    details:
      'Северная часть Алматы с сочетанием производственных площадок и жилых массивов. Граничит с Турксибским и Алатауским районами.',
    points: [
      [43.28, 76.88],
      [43.255, 76.883],
      [43.255, 76.90],
      [43.275, 76.92],
      [43.29, 76.905],
    ],
  },
  {
    name: 'Турксибский',
    color: '#c56bff',
    summary: 'Восточный район, транспортный узел города.',
    details:
      'Восточная часть Алматы, известная транспортной инфраструктурой: аэропорт и железнодорожные узлы.',
    points: [
      [43.29, 76.905],
      [43.275, 76.92],
      [43.25, 76.95],
      [43.275, 76.98],
      [43.305, 76.95],
    ],
  },
]

const drawDistricts = (map: L.Map) => {
  districts.forEach((district) => {
    const polygon = L.polygon(district.points, {
      color: district.color,
      weight: 2,
      fillColor: district.color,
      fillOpacity: 0.18,
    })

    polygon.bindTooltip(district.name, {
      permanent: true,
      direction: 'center',
      className: 'district-label',
    })

    polygon.bindPopup(`<b>${district.name}</b><br/>Район Алматы`)
    polygon.bindPopup(
      `
      <div style="min-width:220px;line-height:1.45;">
        <b>${district.name}</b><br/>
        <span>${district.summary}</span>
        <hr style="border:none;border-top:1px solid rgba(160,170,220,0.35);margin:8px 0;" />
        <span>${district.details}</span>
      </div>
      `,
    )
    polygon.addTo(map)
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
