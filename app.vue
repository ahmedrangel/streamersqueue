<script setup lang="ts">
setScrollBehavior();
const lang = useCookie("lang");
lang.value = lang.value ? lang.value : locale.getLanguage();
locale.setLanguage(lang.value);
</script>

<template>
  <NuxtLoadingIndicator :throttle="0" />
  <CompNavbar />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
