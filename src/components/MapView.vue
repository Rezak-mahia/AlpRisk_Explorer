<template>
  <div class="map-container">
    <div ref="mapEl" class="map-view"></div>
    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <div v-if="popupData">
        <strong>{{ popupData.label }}</strong>
        <div v-if="popupData.altitude && popupData.altitude !== '?'">{{ popupData.altitude }} m</div>
        <div v-else class="popup-sub">{{ popupData.canton }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { toLonLat, fromLonLat } from 'ol/proj.js'
import { createSummitFeature, buildMap } from '../services/map.js'

const props = defineProps({
  summits: { type: Array, required: true },
  selectedSummit: { type: Object, default: null }
})

const emit = defineEmits(['select-summit'])
const mapEl = ref(null)
const popupEl = ref(null)
const popupVisible = ref(false)
const popupData = ref(null)

let mapInstance = null
let popupOverlay = null

onMounted(async () => {
  await nextTick()
  const features = props.summits.map(createSummitFeature)
  const built = await buildMap(mapEl.value, features, popupEl.value)
  mapInstance = built.map
  popupOverlay = built.popupOverlay

  mapInstance.on('singleclick', (event) => {
    let feature = mapInstance.forEachFeatureAtPixel(event.pixel, f => f)
    if (feature) {
      emit('select-summit', feature.get('summit'))
    } else {
      const coords = toLonLat(event.coordinate)
      emit('select-summit', {
        id: 'click-' + Date.now(),
        label: "Point sélectionné par clic",
        lon: coords[0], lat: coords[1], altitude: null, canton: 'Sélection libre'
      })
    }
  })

  if (props.selectedSummit) moveMap(props.selectedSummit)
})

function moveMap(s) {
  if (!mapInstance || !s) return
  const center = fromLonLat([s.lon, s.lat])
  mapInstance.getView().animate({ center, zoom: 12, duration: 800 })
  popupData.value = s
  popupVisible.value = true
  popupOverlay.setPosition(center)
}

watch(() => props.selectedSummit, s => moveMap(s))
</script>

<style scoped>
.map-container { width: 100%; height: 100%; position: relative; }
.map-view { width: 100%; height: 100%; }
.map-popup { background: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; min-width: 160px; }
.popup-sub { font-size: 0.8rem; color: #64748b; margin-top: 4px; font-style: italic; }
</style>