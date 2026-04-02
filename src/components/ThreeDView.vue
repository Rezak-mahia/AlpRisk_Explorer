<template>
  <div class="three-d-container">
    <h2 class="panel-title">Visualisation 3D des zones de dangers naturels</h2>
    <div ref="viewerEl" class="three-d-view"></div>
    <p v-if="status" class="status">{{ status }}</p>

    <div v-if="pickedInfo" class="info-box">
      <strong>Zone d’avalanche</strong>
      <div v-if="pickedInfo.dangerLabel">Danger : {{ pickedInfo.dangerLabel }}</div>
      <div v-if="pickedInfo.commune">Commune : {{ pickedInfo.commune }}</div>
      <div v-if="pickedInfo.id">Identifiant : {{ pickedInfo.id }}</div>
    </div>
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
  HeightReference,
  GeoJsonDataSource,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  ClassificationType,
  Cesium3DTileset
} from 'cesium'
import { lv95ToLonLat } from '../services/projection.js'
import {
  SWISSTOPO_TERRAIN_URL,
  SWISSTOPO_BUILDINGS_URL,
  CESIUM_ION_TOKEN,
  fetchAllValaisAvalancheGeoJson
} from '../services/geoAdmin.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  },
  clickedPoint: {
    type: Object,
    default: null
  },
  selectedAvalanche: {
    type: Object,
    default: null
  },
  selectedDangerLayer: {
    type: String,
    default: null
  }
})

const viewerEl = ref(null)
const status = ref('Initialisation de Cesium...')
const pickedInfo = ref(null)

let viewer = null
let buildingsTileset = null
let activePointEntity = null
let avalancheDataSource = null
let clickHandler = null

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

function extractAvalancheDataFromEntity(entity) {
  const props = entity?.properties || {}

  const read = (key) => {
    const value = props[key]
    if (value && typeof value.getValue === 'function') {
      return value.getValue()
    }
    return value ?? null
  }

  const danger = read('DEGRE_DANGER')

  return {
    dangerValue: danger,
    dangerLabel: dangerLabelFromValue(danger),
    commune:
      read('COMMUNE') ||
      read('NOM_COMMUNE') ||
      read('COMMUNE_NOM') ||
      read('COMMNAME') ||
      null,
    id: read('OBJECTID') || read('FID') || read('ID') || null
  }
}

function getCesiumAvalancheStyle(entity) {
  const info = extractAvalancheDataFromEntity(entity)
  const danger = Number(info.dangerValue)

  if (danger === 4) {
    return {
      material: Color.fromBytes(255, 93, 81, 178),
      outline: Color.fromBytes(104, 104, 104, 255)
    }
  }

  if (danger === 3) {
    return {
      material: Color.fromBytes(85, 142, 213, 178),
      outline: Color.fromBytes(104, 104, 104, 255)
    }
  }

  if (danger === 2) {
    return {
      material: Color.fromBytes(255, 248, 103, 178),
      outline: Color.fromBytes(104, 104, 104, 255)
    }
  }

  if (danger === 1) {
    return {
      material: Color.fromBytes(255, 248, 103, 100),
      outline: Color.fromBytes(255, 248, 103, 255)
    }
  }

  if (danger === 5) {
    return {
      material: Color.fromBytes(255, 170, 0, 178),
      outline: Color.fromBytes(104, 104, 104, 255)
    }
  }

  if (danger === 0) {
    return {
      material: Color.fromBytes(255, 255, 255, 70),
      outline: Color.fromBytes(104, 104, 104, 150)
    }
  }

  return {
    material: Color.GRAY.withAlpha(0.35),
    outline: Color.DARKGRAY
  }
}

function styliserAvalanches(dataSource) {
  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue

    const style = getCesiumAvalancheStyle(entity)
    entity.polygon.material = style.material
    entity.polygon.outline = true
    entity.polygon.outlineColor = style.outline
    entity.polygon.classificationType = ClassificationType.TERRAIN
  }
}

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

function seDeplacerVersAvalanche(avalanche) {
  if (!viewer || !avalanche) return

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(avalanche.lon, avalanche.lat, 9000),
    duration: 2.5
  })

  pickedInfo.value = avalanche
}


function mettreAJourPointActif() {
  if (!viewer) return

  if (props.selectedAvalanche) {
    seDeplacerVersAvalanche(props.selectedAvalanche)
    return
  }

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

async function chargerAvalanches3D() {
  if (!viewer) return

  const geojson = await fetchAllValaisAvalancheGeoJson()

  avalancheDataSource = await GeoJsonDataSource.load(geojson, {
    clampToGround: true
  })

  styliserAvalanches(avalancheDataSource)
  viewer.dataSources.add(avalancheDataSource)
  mettreAJourDangerLayer3D(props.selectedDangerLayer)
}

function mettreAJourDangerLayer3D(layerId) {
  if (!avalancheDataSource) return
  avalancheDataSource.show = layerId === 'avalanche' || !layerId
}

async function chargeBuildings3D() {
  if (!viewer) return

  buildingsTileset = await Cesium3DTileset.fromUrl(SWISSTOPO_BUILDINGS_URL)
  buildingsTileset.shadows = true
  viewer.scene.primitives.add(buildingsTileset)
}

function installerClickInfo3D() {
  if (!viewer) return

  clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

  clickHandler.setInputAction((movement) => {
    pickedInfo.value = null

    const picked = viewer.scene.pick(movement.position)
    if (!picked || !picked.id) return

    const entity = picked.id
    if (!entity?.properties) return

    const info = extractAvalancheDataFromEntity(entity)
    if (info.dangerValue == null) return

    pickedInfo.value = info
  }, ScreenSpaceEventType.LEFT_CLICK)
}

onMounted(async () => {
  try {
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      SWISSTOPO_TERRAIN_URL,
      {
        requestVertexNormals: true
      }
    )

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

    await chargerAvalanches3D()
    await chargeBuildings3D()
    installerClickInfo3D()
    mettreAJourPointActif()

    status.value = ''
  } catch (error) {
    console.error(error)
    status.value = error?.message || "Erreur d'initialisation Cesium"
  }
})

watch(
  [
    () => props.selectedSummit,
    () => props.clickedPoint,
    () => props.selectedAvalanche
  ],
  () => {
    mettreAJourPointActif()
  },
  { deep: true }
)

watch(
  () => props.selectedDangerLayer,
  (layerId) => {
    mettreAJourDangerLayer3D(layerId)
  }
)

onBeforeUnmount(() => {
  if (clickHandler) {
    clickHandler.destroy()
    clickHandler = null
  }

  if (buildingsTileset && viewer?.scene?.primitives) {
    viewer.scene.primitives.remove(buildingsTileset)
    buildingsTileset = null
  }

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
  position: relative;
}

.three-d-view {
  width: 100%;
  height: 100%;
  min-height: 360px;
}

.info-box {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.75rem;
  min-width: 220px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
}
</style>