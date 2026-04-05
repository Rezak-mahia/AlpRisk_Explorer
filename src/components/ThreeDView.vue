<template>
  <div class="three-d-container">
    <h2 class="panel-title">Visualisation 3D des zones de dangers naturels</h2>

    <div ref="viewerEl" class="three-d-view"></div>

    <p v-if="status" class="status">{{ status }}</p>

    <div v-if="pickedInfo" class="three-d-info-box">
      <strong class="popup-title">{{ pickedInfo.title }}</strong>
      <div v-if="pickedInfo.dangerLabel" class="popup-danger">
        Danger : {{ pickedInfo.dangerLabel }}
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
  fetchAllValaisAvalancheGeoJson,
  fetchAllValaisGlissementGeoJson,
  fetchAllValaisHydrologieGeoJson
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
const status = ref('Initialisation de Cesium...')
const pickedInfo = ref(null)

let viewer = null
let buildingsTileset = null
let activePointEntity = null
let avalancheDataSource = null
let glissementDataSource = null
let hydrologieDataSource = null
let clickHandler = null

const SWITZERLAND_RECTANGLE = Rectangle.fromDegrees(5.95, 45.80, 10.55, 47.85)

const MAP_3D_STYLES = {
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

const LAYER_CONFIG = {
  avalanche: {
    title: "Zone d'avalanche",
    dangerKey: 'DEGRE_DANGER',
    fetcher: fetchAllValaisAvalancheGeoJson
  },
  glissement: {
    title: 'Zone de glissement',
    dangerKey: 'DANGER',
    fetcher: fetchAllValaisGlissementGeoJson
  },
  hydrologie: {
    title: "Zone d'hydrologie",
    dangerKey: 'DEGRE_DANGER_CODE',
    fetcher: fetchAllValaisHydrologieGeoJson
  }
}

function addSwisstopoOrthophoto() {
  if (!viewer) return

  const swissimageProvider = new WebMapTileServiceImageryProvider({
    url: SWISSTOPO_SWISSIMAGE_WMTS_URL,
    layer: 'ch.swisstopo.swissimage',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: '3857',
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 19,
    credit: '© swisstopo'
  })

  viewer.imageryLayers.addImageryProvider(swissimageProvider)
}

function setInitialViewOnSwitzerland() {
  if (!viewer) return

  Camera.DEFAULT_VIEW_RECTANGLE = SWITZERLAND_RECTANGLE

  viewer.camera.flyTo({
    destination: SWITZERLAND_RECTANGLE,
    duration: 0
  })
}

function getPropertyValue(entity, key) {
  const value = entity?.properties?.[key]
  return value && typeof value.getValue === 'function'
    ? value.getValue()
    : value ?? null
}

function dangerLabelFromValue(value, layerId = null) {
  const n = Number(value)

  if (layerId === 'hydrologie') {
    if (n === 42) return 'élevé dynamique'
    if (n === 41) return 'élevé statique'
    if (n === 4) return 'élevé'
    if (n === 3) return 'moyen'
    if (n === 2) return 'faible'
    if (n === 1) return 'résiduel'
    if (n === 0) return 'non exposé'
    return `${value ?? ''}`
  }

  if (n === 4) return 'élevé'
  if (n === 3) return 'moyen'
  if (n === 2) return 'faible'
  if (n === 1) return 'résiduel'
  if (n === 5) return 'indicatif'
  if (n === 0) return 'non exposé'
  return `${value ?? ''}`
}

function buildPickedInfo(entity, layerId) {
  const config = LAYER_CONFIG[layerId]
  const dangerValue = getPropertyValue(entity, config.dangerKey)

  if (dangerValue == null) {
    return null
  }

  return {
    title: config.title,
    dangerLabel: dangerLabelFromValue(dangerValue, layerId)
  }
}

function getCesiumStyle(layerId, dangerValue) {
  const layerStyles = MAP_3D_STYLES[layerId]
  const style =
    layerStyles?.[Number(dangerValue)] ||
    layerStyles?.default || {
      fill: [160, 160, 160, 90],
      outline: [104, 104, 104, 255]
    }

  return {
    material: Color.fromBytes(...style.fill),
    outline: Color.fromBytes(...style.outline)
  }
}

function styleDataSourcePolygons(dataSource, layerId) {
  const dangerKey = LAYER_CONFIG[layerId].dangerKey

  for (const entity of dataSource.entities.values) {
    if (!entity.polygon) continue

    const dangerValue = getPropertyValue(entity, dangerKey)
    const style = getCesiumStyle(layerId, dangerValue)

    entity.polygon.material = style.material
    entity.polygon.outline = true
    entity.polygon.outlineColor = style.outline
    entity.polygon.classificationType = ClassificationType.TERRAIN
  }
}

async function loadDangerDataSource(layerId) {
  const config = LAYER_CONFIG[layerId]
  const geojson = await config.fetcher()

  const dataSource = await GeoJsonDataSource.load(geojson, {
    clampToGround: true
  })

  styleDataSourcePolygons(dataSource, layerId)
  viewer.dataSources.add(dataSource)

  return dataSource
}

function updateDangerLayer3D(layerId) {
  if (avalancheDataSource) avalancheDataSource.show = layerId === 'avalanche'
  if (glissementDataSource) glissementDataSource.show = layerId === 'glissement'
  if (hydrologieDataSource) hydrologieDataSource.show = layerId === 'hydrologie'
}

function flyToPoint(lon, lat, label = 'Point sélectionné') {
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

function updateActivePoint() {
  if (props.clickedPoint) {
    flyToPoint(
      props.clickedPoint.lon,
      props.clickedPoint.lat,
      'Point sélectionné'
    )
    return
  }

  if (props.selectedLocation) {
    flyToPoint(
      props.selectedLocation.lon,
      props.selectedLocation.lat,
      'Point localisé'
    )
  }
}

async function loadBuildings3D() {
  buildingsTileset = await Cesium3DTileset.fromUrl(SWISSTOPO_BUILDINGS_URL)
  viewer.scene.primitives.add(buildingsTileset)
}

function install3DClickHandler() {
  clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

  clickHandler.setInputAction((movement) => {
    pickedInfo.value = null

    const picked = viewer.scene.pick(movement.position)
    const entity = picked?.id

    if (!entity?.properties) return

    for (const layerId of ['avalanche', 'glissement', 'hydrologie']) {
      const info = buildPickedInfo(entity, layerId)

      if (info) {
        pickedInfo.value = info
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
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false
    })

    addSwisstopoOrthophoto()
    setInitialViewOnSwitzerland()

    avalancheDataSource = await loadDangerDataSource('avalanche')
    glissementDataSource = await loadDangerDataSource('glissement')
    hydrologieDataSource = await loadDangerDataSource('hydrologie')

    await loadBuildings3D()
    install3DClickHandler()
    updateDangerLayer3D(props.selectedDangerLayer)
    updateActivePoint()

    status.value = ''
  } catch (error) {
    console.error(error)
    status.value = error?.message || "Erreur d'initialisation Cesium"
  }
})

watch(
  () => props.selectedDangerLayer,
  (layerId) => {
    updateDangerLayer3D(layerId)
  }
)

watch(
  [() => props.selectedLocation, () => props.clickedPoint],
  () => {
    updateActivePoint()
  },
  { deep: true }
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