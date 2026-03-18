<template>
  <aside class="sidebar">
    <h1 class="title">Observatoire des Sommets</h1>
    <p class="subtitle">
      Explore quelques sommets suisses en 2D, puis affiche leur profil d’altitude.
    </p>

    <input
      v-model="localSearch"
      class="search-box"
      type="text"
      placeholder="Filtrer les sommets..."
    />

    <div
      v-for="summit in filteredSummits"
      :key="summit.id"
      :class="['card', { active: selectedSummit?.id === summit.id }]"
    >
      <button class="summit-button" @click="$emit('select-summit', summit)">
        <strong>{{ summit.label }}</strong>
        <div class="meta">Altitude : {{ summit.altitude }} m</div>
        <div class="meta">Canton : {{ summit.canton }}</div>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  summits: {
    type: Array,
    required: true
  },
  selectedSummit: {
    type: Object,
    default: null
  }
})

defineEmits(['select-summit'])

const localSearch = ref('')

const filteredSummits = computed(() => {
  const q = localSearch.value.trim().toLowerCase()
  if (!q) return props.summits

  return props.summits.filter((s) => {
    return (
      s.label.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.canton.toLowerCase().includes(q)
    )
  })
})
</script>