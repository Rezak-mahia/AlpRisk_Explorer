<template>
  <div class="three-d-container">
    <h2 class="panel-title">Vue 3D (Cesium + swisstopo)</h2>
    <div ref="viewerEl" class="three-d-view"></div>
    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Viewer,
  Ion,
  Cartesian3,
  Math as CesiumMath,
  HeadingPitchRange,
  Color,
  CesiumTerrainProvider
} from 'cesium'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  }
})

const viewerEl = ref(null)
const status = ref('Initialisation de Cesium...')
let viewer = null
let summitEntity = null

// swisstopo terrain metadata
const SWISSTOPO_TERRAIN_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'

function flyToSummit(summit) {
  if (!viewer || !summit) return

  if (summitEntity) {
    viewer.entities.remove(summitEntity)
  }

  summitEntity = viewer.entities.add({
    name: summit.label,
    position: Cartesian3.fromDegrees(
      summit.lon,
      summit.lat,
      summit.altitude || 0
    ),
    point: {
      pixelSize: 12,
      color: Color.RED,
      outlineColor: Color.WHITE,
      outlineWidth: 2
    }
  })

  viewer.flyTo(summitEntity, {
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(20),
      CesiumMath.toRadians(-35),
      7000
    ),
    duration: 2.5
  })
}

onMounted(async () => {
  try {
    // Garde un token Cesium ion valide pour le viewer / imagerie éventuelle.
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

    const swisstopoTerrainProvider =
      await CesiumTerrainProvider.fromUrl(SWISSTOPO_TERRAIN_URL, {
        requestVertexNormals: true
      })

    viewer = new Viewer(viewerEl.value, {
      terrainProvider: swisstopoTerrainProvider,
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false
    })

    if (props.selectedSummit) {
      flyToSummit(props.selectedSummit)
    }

    status.value = ''
  } catch (error) {
    console.error(error)
    status.value =
      error?.message || "Erreur d'initialisation Cesium / swisstopo"
  }
})

watch(
  () => props.selectedSummit,
  (summit) => {
    if (!viewer || !summit) return
    flyToSummit(summit)
  }
)

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
.three-d-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.three-d-view {
  width: 100%;
  height: 100%;
  min-height: 360px;
}
</style>