<template>
  <div class="map-container">
    <h2 class="panel-title">Carte des dangers naturels en Valais</h2>
    <div class="map-toolbar">
      <button @click="centrerSurValais">Centrer sur le Valais</button>
    </div>

    <div ref="elementCarte" class="map"></div>

    <div ref="elementPopup" class="map-popup" v-show="popupVisible">
      <template v-if="modePopup === 'avalanche'">
        <strong>Zone d’avalanche</strong>
        <div v-if="donneesPopup?.libelleDanger">Danger : {{ donneesPopup.libelleDanger }}</div>
        <div v-if="donneesPopup?.commune">Commune : {{ donneesPopup.commune }}</div>
        <div v-if="donneesPopup?.identifiant">Identifiant : {{ donneesPopup.identifiant }}</div>
      </template>

      <template v-else-if="modePopup === 'point'">
        <strong>Point sélectionné</strong>
        <div>E : {{ Math.round(donneesPopup?.x || 0) }}</div>
        <div>N : {{ Math.round(donneesPopup?.y || 0) }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getCenter } from 'ol/extent'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import { Circle as CercleStyle, Fill, Stroke, Style } from 'ol/style.js'
import { unByKey } from 'ol/Observable.js'
import { extraireInfosAvalanche } from '../services/avalanche.js'
import { buildMap as construireCarte } from '../services/map.js'
import { webMercatorToLV95 } from '../services/projection.js'

const props = defineProps({
  coucheDangerSelectionnee: {
    type: String,
    default: null
  },
  pointSelectionne: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['carte-cliquee', 'selectionner-avalanche'])

const elementCarte = ref(null)
const elementPopup = ref(null)
const popupVisible = ref(false)
const donneesPopup = ref(null)
const modePopup = ref(null)

let carte = null
let superpositionPopup = null
let coucheAvalanches = null
let sourcePointSelectionne = null
let couchePointSelectionne = null
let ecouteurClicCarte = null

const CENTRE_VALAIS = fromLonLat([7.45, 46.15])

function fermerPopup() {
  popupVisible.value = false
  donneesPopup.value = null
  modePopup.value = null
  superpositionPopup?.setPosition(undefined)
}

function afficherPopup(coordonnee, mode, donnees) {
  if (!superpositionPopup) return

  popupVisible.value = true
  modePopup.value = mode
  donneesPopup.value = donnees
  superpositionPopup.setPosition(coordonnee)
}

function construireDonneesPoint(coordonneeCarte) {
  const [lon, lat] = toLonLat(coordonneeCarte)
  const [est, nord] = webMercatorToLV95(coordonneeCarte[0], coordonneeCarte[1])

  return {
    lon,
    lat,
    x: est,
    y: nord
  }
}

function construireSelectionAvalanche(feature) {
  const geometrie = feature.getGeometry()
  const centre3857 = getCenter(geometrie.getExtent())
  const [lon, lat] = toLonLat(centre3857)

  return {
    ...extraireInfosAvalanche(feature.getProperties()),
    lon,
    lat
  }
}

function afficherPopupAvalanche(feature, coordonneeCarte) {
  const avalanche = construireSelectionAvalanche(feature)
  afficherPopup(coordonneeCarte, 'avalanche', avalanche)
  emit('selectionner-avalanche', avalanche)
}

function centrerSurValais() {
  if (!carte) return

  carte.getView().animate({
    center: CENTRE_VALAIS,
    zoom: 10,
    duration: 700
  })

  fermerPopup()
}

function mettreAJourPointSelectionne(point) {
  if (!sourcePointSelectionne) return

  sourcePointSelectionne.clear()

  if (!point) return

  const pointAffiche = new Feature({
    geometry: new Point(fromLonLat([point.lon, point.lat]))
  })

  sourcePointSelectionne.addFeature(pointAffiche)
}

function afficherPointSelectionne(point) {
  mettreAJourPointSelectionne(point)

  if (!point) {
    if (modePopup.value === 'point') {
      fermerPopup()
    }
    return
  }

  afficherPopup(fromLonLat([point.lon, point.lat]), 'point', point)

  if (!carte) return

  const vue = carte.getView()
  const zoomActuel = vue.getZoom() ?? 10

  vue.animate({
    center: fromLonLat([point.lon, point.lat]),
    zoom: Math.max(zoomActuel, 13),
    duration: 700
  })
}

function mettreAJourVisibiliteCoucheDanger(coucheId) {
  if (!coucheAvalanches) return

  const visible = coucheId === 'avalanche' || !coucheId
  coucheAvalanches.setVisible(visible)

  if (!visible && modePopup.value === 'avalanche') {
    fermerPopup()
  }
}

function gererClicCarte(evenement) {
  if (!carte) return

  const avalancheCliquee = carte.forEachFeatureAtPixel(
    evenement.pixel,
    (feature, couche) => (couche === coucheAvalanches ? feature : null)
  )

  if (avalancheCliquee) {
    afficherPopupAvalanche(avalancheCliquee, evenement.coordinate)
    return
  }

  emit('carte-cliquee', construireDonneesPoint(evenement.coordinate))
}

onMounted(async () => {
  await nextTick()

  const resultat = await construireCarte(elementCarte.value, elementPopup.value)

  carte = resultat.map
  superpositionPopup = resultat.popupOverlay
  coucheAvalanches = resultat.avalancheLayer

  mettreAJourVisibiliteCoucheDanger(props.coucheDangerSelectionnee)

  sourcePointSelectionne = new VectorSource()
  couchePointSelectionne = new VectorLayer({
    source: sourcePointSelectionne,
    style: new Style({
      image: new CercleStyle({
        radius: 7,
        fill: new Fill({ color: '#dc2626' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    })
  })
  couchePointSelectionne.setZIndex(400)
  carte.addLayer(couchePointSelectionne)

  carte.updateSize()
  ecouteurClicCarte = carte.on('singleclick', gererClicCarte)

  if (props.pointSelectionne) {
    afficherPointSelectionne(props.pointSelectionne)
  }
})

watch(
  () => props.coucheDangerSelectionnee,
  (coucheId) => {
    mettreAJourVisibiliteCoucheDanger(coucheId)
  }
)

watch(
  () => props.pointSelectionne,
  (point) => {
    afficherPointSelectionne(point)
  }
)

onBeforeUnmount(() => {
  if (ecouteurClicCarte) {
    unByKey(ecouteurClicCarte)
    ecouteurClicCarte = null
  }

  if (carte) {
    carte.setTarget(undefined)
    carte = null
  }
})
</script>