<template>
  <aside class="sidebar">
    <h1 class="title">Analyse des dangers naturels en Valais</h1>
    
    <!-- Section 1: Bulle "Choisir un point d'intérêt" -->
    <div class="info-box">
      <p>📍 <strong>Choisir un point d'intérêt :</strong></p>
      <ul>
        <li>Saisissez des coordonnées <strong>MN95</strong></li>
        <li><strong>Cliquez</strong> sur la carte 2D</li>
      </ul>
    </div>

    <!-- Section 2: Recherche MN95 -->
    <div class="mn95-section">
      <h2 class="section-label">Recherche MN95 (LV95)</h2>
      <div class="input-grid">
        <div class="field">
          <label>Est (E)</label>
          <input v-model.number="mn95E" type="number" placeholder="ex: 2600000" class="no-spinner" />
        </div>
        <div class="field">
          <label>Nord (N)</label>
          <input v-model.number="mn95N" type="number" placeholder="ex: 1200000" class="no-spinner" />
        </div>
      </div>
      <button class="btn-primary" @click="goToMN95">Localiser la saisie</button>
    </div>

    <!-- Section 3: Bulle "Choisir une couche" -->
    <div class="info-box">
      <p>📍 <strong>Choisir une couche :</strong></p>
      <ul>
        <li>Choisissez un danger naturel dans le menu déroulant</li>
        <li>Les zones d'avalanche, de glissement ou d'hydrologie s'afficheront sur la carte</li>
      </ul>
    </div>

    <!-- Section 4: Sélection de la couche de danger -->
    <div class="layer-select-section">
      <h2 class="section-label">Couche de danger naturel</h2>
      <select v-model="selectedLayerId" @change="selectDangerLayer">
        <option v-for="layer in dangerLayers" :key="layer.id" :value="layer.id">
          {{ layer.label }}
        </option>
      </select>
    </div>

    <hr class="divider" />
  </aside>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import proj4 from 'proj4'

const props = defineProps({
  selectedSummit: { type: Object, default: null },
  selectedDangerLayer: { type: String, default: null }
})

const emit = defineEmits(['select-summit', 'select-danger-layer'])

const dangerLayers = [
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'glissement', label: 'Glissement' },
  { id: 'hydrologie', label: 'Hydrologie' }
]

const selectedLayerId = ref(props.selectedDangerLayer || dangerLayers[0].id)

watch(
  () => props.selectedDangerLayer,
  (next) => {
    if (next) {
      selectedLayerId.value = next
    }
  }
)

onMounted(() => {
  if (!props.selectedDangerLayer) {
    selectDangerLayer()
  }
})

const mn95E = ref(null)
const mn95N = ref(null)

function selectDangerLayer() {
  emit('select-danger-layer', selectedLayerId.value)
}

function goToMN95() {
  if (!mn95E.value || !mn95N.value) return
  const [lon, lat] = proj4('EPSG:2056', 'EPSG:4326', [mn95E.value, mn95N.value])
  emit('select-summit', {
    id: 'mn95-' + Date.now(),
    label: `Saisie MN95: ${mn95E.value} / ${mn95N.value}`,
    lon,
    lat,
    x: mn95E.value,
    y: mn95N.value
  })
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  padding: 20px;
  background: #f8fafc;
  height: 100vh;
  overflow: hidden;
  border-right: 1px solid #e2e8f0;
}

.title {
  font-size: 1.4rem;
  margin-bottom: 15px;
  color: #1e293b;
  font-weight: bold;
}

.info-box {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.info-box ul {
  margin: 5px 0 0 18px;
  padding: 0;
}

.mn95-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 600;
}

.input-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.field label {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: bold;
}

.field input {
  width: 100%;
  padding: 8px;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

.layer-select-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.layer-select-section .section-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.layer-select-section select {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.95rem;
}

/* Suppression des flèches (spinners) pour les inputs number */
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.no-spinner {
  appearance: textfield;
  -moz-appearance: textfield;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 20px 0;
}
</style>
