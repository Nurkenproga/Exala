import fs from 'node:fs/promises'
import osmtogeojson from 'osmtogeojson'

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'
const USER_AGENT = 'ExalaMapGenerator/1.0 (student project contact: local)'

const DISTRICTS = [
  { relationId: 3072807, name: 'Алмалинский', slug: 'almaly', color: '#9f6bff' },
  { relationId: 3072808, name: 'Ауэзовский', slug: 'auezov', color: '#7ad65e' },
  { relationId: 3390291, name: 'Бостандыкский', slug: 'bostandyk', color: '#4f9dff' },
  { relationId: 3072217, name: 'Медеуский', slug: 'medeu', color: '#2cb6c8' },
  { relationId: 3072216, name: 'Алатауский', slug: 'alatau', color: '#f47f59' },
  { relationId: 3072130, name: 'Жетысуский', slug: 'zhetysu', color: '#e862a1' },
  { relationId: 3072001, name: 'Турксибский', slug: 'turksib', color: '#c56bff' },
  { relationId: 5460063, name: 'Наурызбайский', slug: 'nauryzbay', color: '#f9b14a' },
]

const relationQuery = DISTRICTS.map((district) => `relation(${district.relationId});`).join('\n  ')

const query = `
[out:json][timeout:300];
(
  ${relationQuery}
);
out body;
>;
out skel qt;
`

const response = await fetch(OVERPASS_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'User-Agent': USER_AGENT,
  },
  body: new URLSearchParams({ data: query }),
})

if (!response.ok) {
  const text = await response.text()
  throw new Error(`Overpass error ${response.status}: ${text.slice(0, 400)}`)
}

const osmJson = await response.json()
const rawGeo = osmtogeojson(osmJson)

const districtByRelationId = new Map(DISTRICTS.map((district) => [district.relationId, district]))

const features = (rawGeo.features || [])
  .filter((feature) => feature?.properties?.type === 'boundary')
  .map((feature) => {
    const relationKey = String(feature?.properties?.id || '')
    const relationId = Number(relationKey.replace('relation/', ''))
    return { feature, relationId }
  })
  .filter(({ relationId }) => Number.isInteger(relationId) && districtByRelationId.has(relationId))
  .map(({ feature, relationId }) => {
    const district = districtByRelationId.get(relationId)
    const sourceName = feature.properties?.['name:ru'] || feature.properties?.name

    if (!district) {
      return null
    }

    return {
      type: 'Feature',
      properties: {
        name: district.name,
        slug: district.slug,
        color: district.color,
        osm_name: sourceName,
        osm_id: relationId,
      },
      geometry: feature.geometry,
    }
  })
  .filter((feature) => feature && (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'))

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'ru'))

const out = {
  type: 'FeatureCollection',
  name: 'almaty_districts_osm',
  features,
}

await fs.mkdir('src/data', { recursive: true })
await fs.writeFile('src/data/almaty-districts.osm.json', JSON.stringify(out, null, 2), 'utf-8')

console.log(`Saved ${features.length} district features to src/data/almaty-districts.osm.json`)
