<template>
  <div class="app-layout">
    <aside class="sidebar">
      <SummitSidebar
        :couche-danger-selectionnee="coucheDangerSelectionnee"
        @selectionner-point="selectionnerPoint"
        @selectionner-couche-danger="selectionnerCoucheDanger"
      />
    </aside>

    <main class="main-panel">
      <section class="left-panel">
        <MapView
          :couche-danger-selectionnee="coucheDangerSelectionnee"
          :point-selectionne="pointSelectionne"
          @carte-cliquee="selectionnerPoint"
          @selectionner-avalanche="selectionnerAvalanche"
        />
      </section>

      <section class="right-panel">
        <ThreeDView
          :point-selectionne="pointSelectionne"
          :avalanche-selectionnee="avalancheSelectionnee"
          :couche-danger-selectionnee="coucheDangerSelectionnee"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { defineAsyncComponent, ref } from 'vue'
import MapView from './components/MapView.vue'
import SummitSidebar from './components/SummitSidebar.vue'

const ThreeDView = defineAsyncComponent(() => import('./components/ThreeDView.vue'))

const pointSelectionne = ref(null)
const avalancheSelectionnee = ref(null)
const coucheDangerSelectionnee = ref('avalanche')

function definirSelection({ point = null, avalanche = null }) {
  pointSelectionne.value = point
  avalancheSelectionnee.value = avalanche
}

function selectionnerPoint(point) {
  definirSelection({ point })
}

function selectionnerAvalanche(avalanche) {
  definirSelection({ avalanche })
}

function selectionnerCoucheDanger(coucheId) {
  coucheDangerSelectionnee.value = coucheId
}
</script>