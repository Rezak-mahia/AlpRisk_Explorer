<template>
  <aside class="sidebar">
    <h1 class="title">Analyse des dangers d'avalanche en Valais</h1>
    
    <div class="info-box">
      <p>📍 <strong>Choisir un point :</strong></p>
      <ul>
        <li>Saisissez des coordonnées <strong>MN95</strong></li>
        <li><strong>Cliquez</strong> sur la carte 2D</li>
      </ul>
    </div>

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

    <hr class="divider" />
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import proj4 from 'proj4'

const props = defineProps({
  summits: { type: Array, required: true }
})

const emit = defineEmits(['select-point'])
const mn95E = ref(null)
const mn95N = ref(null)

function goToMN95() {
  if (!mn95E.value || !mn95N.value) return
  const [lon, lat] = proj4('EPSG:2056', 'EPSG:4326', [mn95E.value, mn95N.value])
  emit('select-point', {
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
.sidebar { width: 300px; padding: 20px; background: #f8fafc; height: 100vh; overflow-y: auto; border-right: 1px solid #e2e8f0; }
.title { font-size: 1.4rem; margin-bottom: 15px; color: #1e293b; font-weight: bold; }
.info-box { background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px; color: #475569; border: 1px solid #e2e8f0; }
.info-box ul { margin: 5px 0 0 18px; padding: 0; }
.mn95-section { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
.section-label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; margin-bottom: 10px; font-weight: 600; }
.input-grid { display: flex; gap: 8px; margin-bottom: 10px; }
.field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field label { font-size: 0.65rem; color: #94a3b8; font-weight: bold; }
.field input { width: 100%; padding: 8px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; }

/* --- SUPPRESSION DES FLÈCHES (SPINNERS) --- */
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield; /* Pour Firefox */
}

.btn-primary { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.search-input { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #cbd5e1; border-radius: 4px; }
.divider { margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; }
.card.active { border-color: #2563eb; background: #eff6ff; }
.card-btn { width: 100%; text-align: left; background: none; border: none; padding: 12px; cursor: pointer; }
.details { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
</style>