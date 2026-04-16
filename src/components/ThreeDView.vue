<template>
  <div class="three-d-container">
    <h2 class="panel-title">Visualisation 3D des zones de dangers naturels</h2>

    <div ref="viewerEl" class="three-d-view"></div>

    <p v-if="initializationStatus" class="status">{{ initializationStatus }}</p>

    <div v-if="selectedHazardInfo" class="three-d-info-box">
      <strong class="popup-title">{{ selectedHazardInfo.title }}</strong>
      <div v-if="selectedHazardInfo.dangerLabel" class="popup-danger">
        Risque : {{ selectedHazardInfo.dangerLabel }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
  Viewer,
  Ion,
  Camera,
  Rectangle,
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
  Cesium3DTileset,
  WebMapTileServiceImageryProvider,
  WebMercatorTilingScheme
} from 'cesium'

import {
  SWISSTOPO_TERRAIN_URL,
  SWISSTOPO_BUILDINGS_URL,
  SWISSTOPO_SWISSIMAGE_WMTS_URL,
  CESIUM_ION_TOKEN,
  fetchValaisAvalancheGeoJson,
  fetchValaisGlissementGeoJson,
  fetchValaisHydrologieGeoJson
} from '../services/geoAdmin.js'

const props = defineProps({
  selectedLocation: {
    type: Object,
    default: null
  },
  clickedPoint: {
    type: Object,
    default: null
  },
  selectedDangerLayer: {
    type: String,
    default: 'avalanche'
  }
})

const viewerEl = ref(null)
const initializationStatus = ref('Initializing Cesium...')
const selectedHazardInfo = ref(null)

let viewer = null
let buildings3DTileset = null
let activeMarkerEntity = null
let avalancheHazardDataSource = null
let landslideHazardDataSource = null
let hydrologicalHazardDataSource = null
let sceneClickHandler = null

const SWITZERLAND_BOUNDS = Rectangle.fromDegrees(5.95, 45.80, 10.55, 47.85)
const VALAIS_BOUNDS = Rectangle.fromDegrees(7.0, 45.75, 8.4, 46.55)

const HAZARD_3D_STYLES = {
  avalanche: {
    0: { fill: [255, 255, 255, 70], outline: [104, 104, 104, 150] },
    1: { fill: [255, 248, 103, 100], outline: [255, 248, 103, 255] },
    2: { fill: [255, 248, 103, 178], outline: [104, 104, 104, 255] },
    3: { fill: [85, 142, 213, 178], outline: [104, 104, 104, 255] },
    4: { fill: [255, 93, 81, 178], outline: [104, 104, 104, 255] },
    5: { fill: [255, 170, 0, 178], outline: [104, 104, 104, 255] }
  },
  glissement: {
    0: { fill: [189, 195, 199, 70], outline: [127, 140, 141, 150] },
    1: { fill: [241, 196, 15, 100], outline: [241, 196, 15, 255] },
    2: { fill: [241, 196, 15, 178], outline: [183, 149, 11, 255] },
    3: { fill: [230, 126, 34, 178], outline: [152, 76, 0, 255] },
    4: { fill: [204, 85, 0, 178], outline: [102, 43, 0, 255] }
  },
  hydrologie: {
    1: { fill: [102, 153, 255, 100], outline: [102, 153, 255, 255] },
    2: { fill: [102, 153, 255, 178], outline: [51, 102, 204, 255] },
    3: { fill: [255, 102, 0, 178], outline: [204, 51, 0, 255] },
    4: { fill: [204, 0, 0, 178], outline: [102, 0, 0, 255] },
    41: { fill: [153, 0, 0, 178], outline: [102, 0, 0, 255] },
    42: { fill: [128, 0, 128, 178], outline: [80, 0, 80, 255] },
    default: { fill: [173, 216, 230, 140], outline: [51, 102, 204, 200] }
  }
}

const HAZARD_LAYER_CONFIG = {
  avalanche: {
    title: 'Danger : Avalanche',
    dangerPropertyKey: 'DEGRE_DANGER',
    fetcher: fetchValaisAvalancheGeoJson
  },
  glissement: {
    title: 'Danger : Glissement de terrain',
    dangerPropertyKey: 'DANGER',
    fetcher: fetchValaisGlissementGeoJson
  },
  hydrologie: {
    title: 'Danger : Hydrologie (Rhône)',
    dangerPropertyKey: 'DEGRE_DANGER_CODE',
    fetcher: fetchValaisHydrologieGeoJson
  }
}

function displaySwisstopoOrthophoto() {
  if (!viewer) return

  const orthophotoProvider = new WebMapTileServiceImageryProvider({
    url: SWISSTOPO_SWISSIMAGE_WMTS_URL,
    layer: 'ch.swisstopo.swissimage',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: '3857',
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 19,
    credit: '© swisstopo'
  })

  viewer.imageryLayers.addImageryProvider(orthophotoProvider)
}

function centerViewOnSwitzerland() {
  if (!viewer) return

  Camera.DEFAULT_VIEW_RECTANGLE = SWITZERLAND_BOUNDS
  viewer.camera.flyTo({
    destination: VALAIS_BOUNDS,
    duration: 0
  })
}

function extractEntityProperty(entity, propertyKey) {
  const propertyValue = entity?.properties?.[propertyKey]
  return propertyValue && typeof propertyValue.getValue === 'function'
    ? propertyValue.getValue()
    : propertyValue ?? null
}

function translateDangerLevel(dangerValue, hazardType = null) {
  const numValue = Number(dangerValue)

  if (hazardType === 'hydrologie') {
    if (numValue === 42) return 'élevé dynamique'
    if (numValue === 41) return 'élevé statique'
    if (numValue === 4) return 'élevé'
    if (numValue === 3) return 'moyen'
    if (numValue === 2) return 'faible'
    if (numValue === 1) return 'résiduel'
    if (numValue === 0) return 'non exposé'
    return `${dangerValue ?? ''}`
  }

  if (numValue === 4) return 'élevé'
  if (numValue === 3) return 'moyen'
  if (numValue === 2) return 'faible'
  if (numValue === 1) return 'résiduel'
  if (numValue === 5) return 'indicatif'
  if (numValue === 0) return 'non exposé'
  return `${dangerValue ?? ''}`
}

function buildHazardInfo(entity, hazardType) {
  const config = HAZARD_LAYER_CONFIG[hazardType]
  const dangerValue = extractEntityProperty(entity, config.dangerPropertyKey)

  if (dangerValue == null) return null

  return {
    title: config.title,
    dangerLabel: translateDangerLevel(dangerValue, hazardType)
  }
}

function resolveHazardStyle(hazardType, dangerValue) {
  const hazardStyles = HAZARD_3D_STYLES[hazardType]
  const style =
    hazardStyles?.[Number(dangerValue)] ||
    hazardStyles?.default || {
      fill: [160, 160, 160, 90],
      outline: [104, 104, 104, 255]
    }

  return {
    material: Color.fromBytes(...style.fill),
    outline: Color.fromBytes(...style.outline)
  }
}

function applyHazardStyling(dataSource, hazardType) {
  const dangerPropertyKey = HAZARD_LAYER_CONFIG[hazardType].dangerPropertyKey

  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue

    const dangerValue = extractEntityProperty(entity, dangerPropertyKey)
    const style = resolveHazardStyle(hazardType, dangerValue)

    entity.polygon.material = style.material
    entity.polygon.outline = true
    entity.polygon.outlineColor = style.outline
    entity.polygon.classificationType = ClassificationType.TERRAIN
  }
}

async function loadHazardDataSource(hazardType) {
  const config = HAZARD_LAYER_CONFIG[hazardType]
  const geoJson = await config.fetcher()

  const dataSource = await GeoJsonDataSource.load(geoJson, {
    clampToGround: true
  })

  applyHazardStyling(dataSource, hazardType)
  viewer.dataSources.add(dataSource)

  return dataSource
}

function synchronizeHazardLayerVisibility(activeHazardType) {
  if (avalancheHazardDataSource) avalancheHazardDataSource.show = activeHazardType === 'avalanche'
  if (landslideHazardDataSource) landslideHazardDataSource.show = activeHazardType === 'glissement'
  if (hydrologicalHazardDataSource) hydrologicalHazardDataSource.show = activeHazardType === 'hydrologie'
}

function animateCameraToMarker(lon, lat, markerLabel = 'Selected Point') {
  if (!viewer) return

  if (activeMarkerEntity) {
    viewer.entities.remove(activeMarkerEntity)
  }

  activeMarkerEntity = viewer.entities.add({
    name: markerLabel,
    position: Cartesian3.fromDegrees(lon, lat),
    point: {
      pixelSize: 12,
      color: Color.RED,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND
    }
  })

  viewer.flyTo(activeMarkerEntity, {
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(20),
      CesiumMath.toRadians(-35),
      7000
    ),
    duration: 2.5
  })
}

function synchronizeMarkerPosition() {
  if (props.clickedPoint) {
    animateCameraToMarker(props.clickedPoint.lon, props.clickedPoint.lat, 'Selected Point')
    return
  }

  if (props.selectedLocation) {
    animateCameraToMarker(props.selectedLocation.lon, props.selectedLocation.lat, 'Located Point')
  }
}

async function load3DBuildings() {
  buildings3DTileset = await Cesium3DTileset.fromUrl(SWISSTOPO_BUILDINGS_URL)
  viewer.scene.primitives.add(buildings3DTileset)
}

function setupClickHandler() {
  sceneClickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

  sceneClickHandler.setInputAction((movement) => {
    selectedHazardInfo.value = null

    const pickedObject = viewer.scene.pick(movement.position)
    const entity = pickedObject?.id

    if (!entity?.properties) return

    for (const hazardType of ['avalanche', 'glissement', 'hydrologie']) {
      const hazardInfo = buildHazardInfo(entity, hazardType)
      if (hazardInfo) {
        selectedHazardInfo.value = hazardInfo
        return
      }
    }
  }, ScreenSpaceEventType.LEFT_CLICK)
}

onMounted(async () => {
  try {
    Ion.defaultAccessToken = CESIUM_ION_TOKEN

    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      SWISSTOPO_TERRAIN_URL,
      { requestVertexNormals: true }
    )

    viewer = new Viewer(viewerEl.value, {
      terrainProvider,
      baseLayer: false,
      timeline: false,
      animation: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: true
    })

    displaySwisstopoOrthophoto()
    centerViewOnSwitzerland()

    avalancheHazardDataSource = await loadHazardDataSource('avalanche')
    landslideHazardDataSource = await loadHazardDataSource('glissement')
    hydrologicalHazardDataSource = await loadHazardDataSource('hydrologie')

    await load3DBuildings()
    setupClickHandler()
    synchronizeHazardLayerVisibility(props.selectedDangerLayer)
    synchronizeMarkerPosition()

    initializationStatus.value = ''
  } catch (error) {
    console.error('Error initializing 3D viewer:', error)
    initializationStatus.value = error?.message || 'Cesium initialization error'
  }
})

watch(
  () => props.selectedDangerLayer,
  (hazardType) => {
    synchronizeHazardLayerVisibility(hazardType)
  }
)

watch(
  [() => props.selectedLocation, () => props.clickedPoint],
  () => {
    synchronizeMarkerPosition()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (sceneClickHandler) {
    sceneClickHandler.destroy()
    sceneClickHandler = null
  }

  if (buildings3DTileset && viewer?.scene?.primitives) {
    viewer.scene.primitives.remove(buildings3DTileset)
    buildings3DTileset = null
  }

  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
.three-d-info-box {
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

.popup-title {
  display: block;
  margin-bottom: 6px;
}

.popup-danger {
  font-weight: 500;
}
</style>