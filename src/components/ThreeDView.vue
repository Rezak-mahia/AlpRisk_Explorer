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
  CesiumTerrainProvider,
  HeightReference
} from 'cesium'
import { lv95ToLonLat } from '../services/projection.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  },
  clickedPoint: {
    type: Object,
    default: null
  },
  drawnLine: {
    type: Array,
    default: null
  }
})

const viewerEl = ref(null)
const status = ref('Initialisation de Cesium...')
let viewer = null
let activePointEntity = null
let profileLineEntity = null

const SWISSTOPO_TERRAIN_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'

function seDeplacerVers(lon, lat, label = 'Point') {
  if (!viewer) return

  if (activePointEntity) {
    viewer.entities.remove(activePointEntity)
  }

  activePointEntity = viewer.entities.add({
    name: label,
    position: Cartesian3.fromDegrees(lon, lat),
    point: {
      pixelSize: 12,
      color: Color.RED,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND
    }
  })

  viewer.flyTo(activePointEntity, {
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(20),
      CesiumMath.toRadians(-35),
      7000
    ),
    duration: 2.5
  })
}

function mettreAJourPointActif() {
  if (!viewer) return

  if (props.clickedPoint) {
    seDeplacerVers(
      props.clickedPoint.lon,
      props.clickedPoint.lat,
      'Point sélectionné'
    )
    return
  }

  if (props.selectedSummit) {
    seDeplacerVers(
      props.selectedSummit.lon,
      props.selectedSummit.lat,
      props.selectedSummit.label
    )
  }
}

function mettreAJourLigneProfil3D(line) {
  if (!viewer) return

  if (profileLineEntity) {
    viewer.entities.remove(profileLineEntity)
    profileLineEntity = null
  }

  if (!line || line.length < 2) return

  const positions = line.map(([x, y]) => {
    const { lon, lat } = lv95ToLonLat(x, y)
    return Cartesian3.fromDegrees(lon, lat)
  })

  profileLineEntity = viewer.entities.add({
    polyline: {
      positions,
      width: 4,
      material: Color.BLUE,
      clampToGround: true
    }
  })
}

onMounted(async () => {
  try {
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

    const terrainProvider =
      await CesiumTerrainProvider.fromUrl(SWISSTOPO_TERRAIN_URL, {
        requestVertexNormals: true
      })

    viewer = new Viewer(viewerEl.value, {
      terrainProvider,
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false
    })

    mettreAJourPointActif()
    mettreAJourLigneProfil3D(props.drawnLine)

    status.value = ''
  } catch (error) {
    console.error(error)
    status.value = error?.message || "Erreur d'initialisation Cesium"
  }
})

watch(
  [() => props.selectedSummit, () => props.clickedPoint],
  () => {
    mettreAJourPointActif()
  },
  { deep: true }
)

watch(
  () => props.drawnLine,
  mettreAJourLigneProfil3D,
  { deep: true }
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