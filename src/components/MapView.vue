<template>
  <div class="map-container">
    <h2 class="panel-title">Carte des dangers naturels en Valais</h2>
    <div class="map-toolbar">
      <button @click="centrerValais">Centrer sur le Valais</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <template v-if="popupMode === 'summit'">
        <strong>{{ popupData?.label }}</strong>
        <div>{{ popupData?.altitude ?? '—' }} m</div>
        <div>{{ popupData?.canton }}</div>
      </template>

      <template v-else-if="popupMode === 'avalanche'">
        <strong>Zone d’avalanche</strong>
        <div v-if="popupData?.dangerLabel">Danger : {{ popupData.dangerLabel }}</div>
        <div v-if="popupData?.commune">Commune : {{ popupData.commune }}</div>
        <div v-if="popupData?.id">Identifiant : {{ popupData.id }}</div>
      </template>
      <template v-else-if="popupMode === 'glissement'">
        <strong>Zone de glissement</strong>
        <div v-if="popupData?.dangerLabel">Danger : {{ popupData.dangerLabel }}</div>
        <div v-if="popupData?.commune">Commune : {{ popupData.commune }}</div>
        <div v-if="popupData?.id">Identifiant : {{ popupData.id }}</div>
      </template>

      <template v-else-if="popupMode === 'hydrologie'">
        <strong>Zone d'hydrologie</strong>
        <div v-if="popupData?.commune">Commune : {{ popupData.commune }}</div>
        <div v-if="popupData?.id">Identifiant : {{ popupData.id }}</div>
      </template>
      <template v-else-if="popupMode === 'point'">
        <strong>Point sélectionné</strong>
        <div>E : {{ Math.round(popupData?.x || 0) }}</div>
        <div>N : {{ Math.round(popupData?.y || 0) }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import { getCenter } from 'ol/extent'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Style, Stroke, Circle, Fill } from 'ol/style.js'
import { buildMap } from '../services/map.js'
import {
  webMercatorToLV95,
  lv95ToWebMercator
} from '../services/projection.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  },
  selectedDangerLayer: {
    type: String,
    default: null
  },
  clickedPoint: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'map-click'
])

const mapEl = ref(null)
const popupEl = ref(null)
const popupVisible = ref(false)
const popupData = ref(null)
const popupMode = ref(null)

let mapInstance = null
let popupOverlay = null
let mapReady = false
let avalancheLayer = null
let glissementLayer = null
let hydrologieLayer = null

let clickedPointSource = null
let clickedPointLayer = null

function dangerLabelFromValue(value) {
  const n = Number(value)
  if (n === 4) return 'élevé'
  if (n === 3) return 'moyen'
  if (n === 2) return 'faible'
  if (n === 1) return 'résiduel'
  if (n === 5) return 'indicatif'
  if (n === 0) return 'non exposé'
  return `${value ?? ''}`
}



function showFeaturePopup(coordinate, mode, data) {
  if (!popupOverlay) return
  popupVisible.value = true
  popupMode.value = mode
  popupData.value = data
  popupOverlay.setPosition(coordinate)
}

function showPointPopup(point) {
  const coord = fromLonLat([point.lon, point.lat])
  showFeaturePopup(coord, 'point', point)
}

function centrerValais() {
  if (!mapInstance) return

  const center = fromLonLat([7.45, 46.15])

  mapInstance.getView().animate({
    center,
    zoom: 10,
    duration: 700
  })

  popupVisible.value = false
  popupData.value = null
  popupMode.value = null
  popupOverlay?.setPosition(undefined)
}

function mettreAJourPointClique(point) {
  if (!clickedPointSource) return

  clickedPointSource.clear()

  if (!point) return

  const feature = new Feature({
    geometry: new Point(fromLonLat([point.lon, point.lat]))
  })

  clickedPointSource.addFeature(feature)
}

onMounted(async () => {
  await nextTick()

  const built = await buildMap(mapEl.value, popupEl.value)

  mapInstance = built.map
  popupOverlay = built.popupOverlay
  avalancheLayer = built.avalancheLayer
  glissementLayer = built.glissementLayer
  hydrologieLayer = built.hydrologieLayer
  mapReady = true

  updateDangerLayerVisibility(props.selectedDangerLayer)

  clickedPointSource = new VectorSource()
  clickedPointLayer = new VectorLayer({
    source: clickedPointSource,
    style: new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: '#dc2626' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    })
  })
  clickedPointLayer.setZIndex(400)
  mapInstance.addLayer(clickedPointLayer)

  mapInstance.updateSize()

  // Ajouter les click handlers pour les couches de danger
  const pointerMoveHandler = (evt) => {
    if (evt.dragging) {
      return
    }
    
    const pixel = mapInstance.getEventPixel(evt.originalEvent)
    let showPointer = false
    
    mapInstance.forEachFeatureAtPixel(pixel, (feature, layer) => {
      // Ne montrer le pointer que pour les sommets/points d'intérêt
      if (layer && layer.get('layerType') === 'summit') {
        showPointer = true
      }
    })
    
    if (showPointer) {
      mapInstance.getTargetElement().style.cursor = 'pointer'
    } else {
      mapInstance.getTargetElement().style.cursor = 'auto'
    }
  }
  
  mapInstance.on('pointermove', pointerMoveHandler)

  mapInstance.on('singleclick', (event) => {
    const [lon, lat] = toLonLat(event.coordinate)
    const [x, y] = webMercatorToLV95(event.coordinate[0], event.coordinate[1])
    const point = { lon, lat, x, y }

    // Émettre toujours un point cliqué, même sur les couches de danger
    emit('map-click', point)
  })

  if (props.clickedPoint) {
    mettreAJourPointClique(props.clickedPoint)
    showPointPopup(props.clickedPoint)
  }
})

function updateDangerLayerVisibility(layerId) {
  if (!avalancheLayer || !glissementLayer || !hydrologieLayer) return
  
  avalancheLayer.setVisible(layerId === 'avalanche')
  glissementLayer.setVisible(layerId === 'glissement')
  hydrologieLayer.setVisible(layerId === 'hydrologie')
}

function showSummitOnMap(summit) {
  if (!summit || !mapInstance) return

  const center = fromLonLat([summit.lon, summit.lat])
  
  mapInstance.getView().animate({
    center,
    zoom: 12,
    duration: 700
  })

  // Afficher le point
  if (clickedPointSource) {
    clickedPointSource.clear()
    const feature = new Feature({
      geometry: new Point(center)
    })
    clickedPointSource.addFeature(feature)
  }
}

watch(
  () => props.selectedSummit,
  (summit) => {
    if (!summit || !mapReady || props.clickedPoint) return
    showSummitOnMap(summit)
  }
)

watch(
  () => props.selectedDangerLayer,
  (layerId) => {
    updateDangerLayerVisibility(layerId)
  }
)

watch(
  () => props.clickedPoint,
  (point) => {
    mettreAJourPointClique(point)

    if (point) {
      showPointPopup(point)
    }
  },
  { deep: true }
)
</script>