<template>
  <div class="three-d-container">
    <h2 class="panel-title">Vue 3D</h2>

    <div class="three-d-placeholder" v-if="!selectedSummit">
      <div>
        <strong>Vue 3D prête</strong>
        <p>Sélectionne un sommet pour préparer le centrage 3D.</p>
      </div>
    </div>

    <div class="three-d-placeholder" v-else>
      <div>
        <strong>{{ selectedSummit.label }}</strong>
        <p>
          Ici tu pourras brancher Giro3D avec le terrain swisstopo et centrer la caméra sur
          le sommet sélectionné.
        </p>
        <p>
          Coordonnées LV95 : {{ selectedSummit.x }}, {{ selectedSummit.y }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedSummit: {
    type: Object,
    default: null
  }
})
</script>