<script setup lang="ts">
const props = defineProps({
  size: { type: String, required: true }
});

const spinner_size = ref({
  "--bs-spinner-width": props.size,
  "--bs-spinner-height": props.size
});
</script>

<template>
  <div class="d-flex justify-content-center align-items-center">
    <div class="spinner-border spinner-lg" role="status" :style="spinner_size">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
</template>
