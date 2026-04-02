<template>
  <div class="three-d-container">
    <h2 class="panel-title">Visualisation 3D des zones de dangers naturels</h2>
    <div ref="elementVue3D" class="three-d-view"></div>
    <p v-if="messageEtat" class="status">{{ messageEtat }}</p>

    <div v-if="infosCliquees" class="info-box">
      <strong>Zone d’avalanche</strong>
      <div v-if="infosCliquees.libelleDanger">Danger : {{ infosCliquees.libelleDanger }}</div>
      <div v-if="infosCliquees.commune">Commune : {{ infosCliquees.commune }}</div>
      <div v-if="infosCliquees.identifiant">Identifiant : {{ infosCliquees.identifiant }}</div>
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
import { extraireInfosAvalanche } from '../services/avalanche.js'
import {
  SWISSTOPO_TERRAIN_URL,
  SWISSTOPO_BUILDINGS_URL,
  CESIUM_ION_TOKEN,
  fetchAllValaisAvalancheGeoJson as recupererToutesLesAvalanchesValaisGeoJson
} from '../services/geoAdmin.js'

const props = defineProps({
  pointSelectionne: {
    type: Object,
    default: null
  },
  avalancheSelectionnee: {
    type: Object,
    default: null
  },
  coucheDangerSelectionnee: {
    type: String,
    default: null
  }
})

const elementVue3D = ref(null)
const messageEtat = ref('Initialisation de Cesium...')
const infosCliquees = ref(null)

let visionneuse = null
let tuilesBatiments = null
let entitePointActive = null
let sourceAvalanches = null
let gestionnaireClic = null

function obtenirStyleCesiumAvalanche(entite) {
  const { niveauDanger } = extraireInfosAvalanche(entite?.properties || {})
  const danger = Number(niveauDanger)

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

function styliserAvalanches(sourceDonnees) {
  for (const entite of sourceDonnees.entities.values) {
    if (!entite.polygon) continue

    const style = obtenirStyleCesiumAvalanche(entite)
    entite.polygon.material = style.material
    entite.polygon.outline = true
    entite.polygon.outlineColor = style.outline
    entite.polygon.classificationType = ClassificationType.TERRAIN
  }
}

function retirerPointActif() {
  if (!visionneuse || !entitePointActive) return

  visionneuse.entities.remove(entitePointActive)
  entitePointActive = null
}

function seDeplacerVersPoint(lon, lat, label = 'Point sélectionné') {
  if (!visionneuse) return

  retirerPointActif()

  entitePointActive = visionneuse.entities.add({
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

  visionneuse.flyTo(entitePointActive, {
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(20),
      CesiumMath.toRadians(-35),
      7000
    ),
    duration: 2.5
  })
}

function seDeplacerVersAvalanche(avalanche) {
  if (!visionneuse || !avalanche) return

  retirerPointActif()

  visionneuse.camera.flyTo({
    destination: Cartesian3.fromDegrees(avalanche.lon, avalanche.lat, 9000),
    duration: 2.5
  })

  infosCliquees.value = avalanche
}

function mettreAJourSelectionActive() {
  if (!visionneuse) return

  if (props.avalancheSelectionnee) {
    seDeplacerVersAvalanche(props.avalancheSelectionnee)
    return
  }

  infosCliquees.value = null

  if (props.pointSelectionne) {
    seDeplacerVersPoint(props.pointSelectionne.lon, props.pointSelectionne.lat)
    return
  }

  retirerPointActif()
}

async function chargerAvalanches3D() {
  if (!visionneuse) return

  const geojson = await recupererToutesLesAvalanchesValaisGeoJson()

  sourceAvalanches = await GeoJsonDataSource.load(geojson, {
    clampToGround: true
  })

  styliserAvalanches(sourceAvalanches)
  visionneuse.dataSources.add(sourceAvalanches)
  mettreAJourVisibiliteCoucheDanger(props.coucheDangerSelectionnee)
}

function mettreAJourVisibiliteCoucheDanger(coucheId) {
  if (!sourceAvalanches) return

  const visible = coucheId === 'avalanche' || !coucheId
  sourceAvalanches.show = visible

  if (!visible && !props.avalancheSelectionnee) {
    infosCliquees.value = null
  }
}

async function chargerBatiments3D() {
  if (!visionneuse) return

  tuilesBatiments = await Cesium3DTileset.fromUrl(SWISSTOPO_BUILDINGS_URL)
  tuilesBatiments.shadows = true
  visionneuse.scene.primitives.add(tuilesBatiments)
}

function installerSelection3D() {
  if (!visionneuse) return

  gestionnaireClic = new ScreenSpaceEventHandler(visionneuse.scene.canvas)

  gestionnaireClic.setInputAction((mouvement) => {
    infosCliquees.value = null

    const objetClique = visionneuse.scene.pick(mouvement.position)
    if (!objetClique || !objetClique.id) return

    const entite = objetClique.id
    if (!entite?.properties) return

    const info = extraireInfosAvalanche(entite.properties)
    if (info.niveauDanger == null) return

    infosCliquees.value = info
  }, ScreenSpaceEventType.LEFT_CLICK)
}

onMounted(async () => {
  try {
    Ion.defaultAccessToken = CESIUM_ION_TOKEN

    const fournisseurTerrain = await CesiumTerrainProvider.fromUrl(
      SWISSTOPO_TERRAIN_URL,
      {
        requestVertexNormals: true
      }
    )

    visionneuse = new Viewer(elementVue3D.value, {
      terrainProvider: fournisseurTerrain,
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
    await chargerBatiments3D()
    installerSelection3D()
    mettreAJourSelectionActive()

    messageEtat.value = ''
  } catch (error) {
    console.error(error)
    messageEtat.value = error?.message || "Erreur d'initialisation Cesium"
  }
})

watch(
  [
    () => props.pointSelectionne,
    () => props.avalancheSelectionnee
  ],
  () => {
    mettreAJourSelectionActive()
  }
)

watch(
  () => props.coucheDangerSelectionnee,
  (coucheId) => {
    mettreAJourVisibiliteCoucheDanger(coucheId)
  }
)

onBeforeUnmount(() => {
  if (gestionnaireClic) {
    gestionnaireClic.destroy()
    gestionnaireClic = null
  }

  if (tuilesBatiments && visionneuse?.scene?.primitives) {
    visionneuse.scene.primitives.remove(tuilesBatiments)
    tuilesBatiments = null
  }

  if (visionneuse) {
    visionneuse.destroy()
    visionneuse = null
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