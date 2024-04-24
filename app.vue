<script setup lang="ts">
setScrollBehavior();
</script>

<template>
  <NuxtLoadingIndicator :throttle="0" />
  <CompNavbar />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
