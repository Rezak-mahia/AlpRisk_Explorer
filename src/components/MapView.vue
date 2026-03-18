<template>
  <div class="map-container">
    <div class="map-toolbar">
      <button @click="resetView">Recentrer la Suisse</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <strong>{{ popupData?.label }}</strong>
      <div>{{ popupData?.altitude }} m</div>
      <div>{{ popupData?.canton }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { fromLonLat } from 'ol/proj.js'
import { createSummitFeature, buildMap } from '../services/map.js'

const props = defineProps({
  summits: {
    type: Array,
    required: true
  },
  selectedSummit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-summit'])

const mapEl = ref(null)
const popupEl = ref(null)
const popupVisible = ref(false)
const popupData = ref(null)

let mapInstance = null
let popupOverlay = null
let mapReady = false

function summitToMapCoords(summit) {
  return fromLonLat([summit.lon, summit.lat])
}

function showSummitOnMap(summit) {
  if (!summit || !mapInstance || !popupOverlay) return

  const center = summitToMapCoords(summit)

  mapInstance.getView().animate({
    center,
    zoom: 11,
    duration: 800
  })

  popupVisible.value = true
  popupData.value = summit
  popupOverlay.setPosition(center)
}

function resetView() {
  if (!mapInstance) return

  mapInstance.getView().animate({
    center: fromLonLat([8.23, 46.82]),
    zoom: 8,
    duration: 700
  })

  popupVisible.value = false
  popupData.value = null
  popupOverlay?.setPosition(undefined)
}

onMounted(async () => {
  await nextTick()

  const features = props.summits.map(createSummitFeature)
  const built = await buildMap(mapEl.value, features, popupEl.value)

  mapInstance = built.map
  popupOverlay = built.popupOverlay
  mapReady = true

  mapInstance.updateSize()

  mapInstance.on('singleclick', (event) => {
    let found = false

    mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
      const summit = feature.get('summit')
      if (summit) {
        found = true
        emit('select-summit', summit)
      }
    })

    if (!found) {
      popupVisible.value = false
      popupData.value = null
      popupOverlay.setPosition(undefined)
    }
  })

  if (props.selectedSummit) {
    showSummitOnMap(props.selectedSummit)
  }
})

watch(
  () => props.selectedSummit,
  (summit) => {
    if (!summit || !mapReady) return
    showSummitOnMap(summit)
  }
)
</script>