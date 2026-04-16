<template>
  <div class="sidebar-wrapper" :class="{ collapsed }">
    <button
      class="sidebar-toggle"
      type="button"
      @click="$emit('toggle-sidebar')"
      :aria-label="collapsed ? 'Ouvrir la sidebar' : 'Fermer la sidebar'"
    >
      {{ collapsed ? '→' : '«' }}
    </button>

    <div class="sidebar-content">
      <div class="sidebar-header">
        <img class="sidebar-logo" :src="logo" alt="AlpRisk Explorer" />
      </div>
    <div class="info-box">
      <p><strong>Bienvenue sur AlpRisk Explorer, l'explorateur des zones de dangers naturels en Valais !</strong></p>
      <p>📍 <strong>Pour commencer, choisissez un point d'intérêt de la façon suivante :</strong></p>
      <ul>
        <li>Saisissez des coordonnées <strong>MN95</strong></li>
        <li><strong>Cliquez</strong> sur la carte 2D</li>
      </ul>
    </div>

      <div class="search-section">
        <h2 class="section-label">Recherche de point en MN95 (LV95)</h2>
        <div class="input-grid">
          <div class="field">
            <label>Est (E)</label>
            <input
              v-model.number="mn95Easting"
              type="number"
              placeholder="ex: 2600000"
              class="no-spinner"
            />
          </div>

          <div class="field">
            <label>Nord (N)</label>
            <input
              v-model.number="mn95Northing"
              type="number"
              placeholder="ex: 1200000"
              class="no-spinner"
            />
          </div>
        </div>

        <button class="btn-primary" @click="searchLocationByMN95">
          Localiser la saisie sur la carte
        </button>
      </div>

    <div class="info-box">
      <p>📍 <strong>Puis, choisissez une couche :</strong></p>
      <ul>
        <li>Choisissez un type de danger naturel dans le menu déroulant ci-dessous</li>
        <li>Les données disponibles sont les zones d'avalanche, de glissement ou d'hydrologie (Rhône)</li>
      </ul>
    </div>

    <div class="hazard-layer-section">
      <h2 class="section-label">Couche affichée</h2>
      <select v-model="selectedHazardType" @change="selectHazardType">
        <option v-for="layer in hazardLayerOptions" :key="layer.id" :value="layer.id">
          {{ layer.label }}
        </option>
      </select>
    </div>
     <div class="info-box">
      <p><strong>Vous pouvez maintenant rétracter cette fenêtre afin d'agrandir les cartes en utilisant le bouton ci-contre !</strong></p>
    </div>
    <hr class="divider" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { convertLV95ToLonLat } from '../services/projection.js'
import logo from '../assets/Explorateur AlpRisk et risques naturels.png'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  selectedDangerLayer: {
    type: String,
    default: 'avalanche'
  }
})

const emit = defineEmits(['toggle-sidebar', 'select-location', 'select-danger-layer'])

const hazardLayerOptions = [
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'glissement', label: 'Glissement de terrain' },
  { id: 'hydrologie', label: 'Hydrologie (Rhône)' }
]

const selectedHazardType = ref(props.selectedDangerLayer)
const mn95Easting = ref(null)
const mn95Northing = ref(null)

watch(
  () => props.selectedDangerLayer,
  (newHazardType) => {
    if (newHazardType) {
      selectedHazardType.value = newHazardType
    }
  }
)

onMounted(() => {
  selectHazardType()
})

function selectHazardType() {
  emit('select-danger-layer', selectedHazardType.value)
}

async function searchLocationByMN95() {
  if (mn95Easting.value == null || mn95Northing.value == null) return

  try {
    const { lon, lat } = await convertLV95ToLonLat(mn95Easting.value, mn95Northing.value)

    emit('select-location', {
      id: `mn95-${Date.now()}`,
      label: `MN95 ${mn95Easting.value} / ${mn95Northing.value}`,
      lon,
      lat,
      x: mn95Easting.value,
      y: mn95Northing.value
    })
  } catch (error) {
    console.error('Error searching location by MN95:', error)
  }
}
</script>

<style scoped>
.sidebar-wrapper {
  position: relative;
  height: 100%;
}

.sidebar-toggle {
  position: fixed;
  top: 50%;
  right: auto;
  left: 320px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: white;
  color: #334155;
  cursor: pointer;
  transition: left 0.3s ease, background 0.2s ease;
  transform: translateY(-50%);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
  z-index: 1000;
}

.sidebar-toggle:hover {
  background: #f8fafc;
}

.sidebar-content {
  width: 100%;
  padding: 0;
  background: transparent;
  height: 100%;
  overflow: visible;
  border-right: none;
}

.sidebar-wrapper.collapsed .sidebar-content {
  display: none;
}

.sidebar-wrapper.collapsed .sidebar-toggle {
  left: 40px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sidebar-logo {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border-radius: 40px;
  background: #fff;
  border: 2px solid #e2e8f0;
  padding: 12px;
}

.title {
  font-size: 1.4rem;
  margin-bottom: 0;
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

.search-section {
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

.hazard-layer-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.hazard-layer-section .section-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.hazard-layer-section select {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.95rem;
}

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