<script setup lang="ts">
setScrollBehavior();
const lang = useCookie("lang", { ...cookieMaxAge });
lang.value = lang.value ? lang.value : locale.getLanguage();
locale.setLanguage(lang.value);
useHead({
  htmlAttrs: {
    lang: lang.value
  }
});
</script>

<template>
  <NuxtLoadingIndicator :throttle="0" />
  <CompNavbar />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
