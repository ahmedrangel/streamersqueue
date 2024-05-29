<template>
  <footer class="text-center py-4 border-top bg-footer text-muted">
    <img :src="`/${SITE.icon}`" width="70" class="my-3">
    <h5 class="d-block mb-2 text-white">© {{ new Date().getFullYear() }} {{ SITE.name }}</h5>
    <h6 class="mb-2 small fw-light">
      {{ t("developed_by") }}:
      <template v-for="(d, i) of SITE.developers" :key="i">
        <a target="_blank" class="fw-bold text-tertiary" :href="`https://github.com/${d.github}`">
          {{ d.user }}
        </a>{{ i < SITE.developers.length - 1 ? ' & ' : '' }}
      </template>
    </h6>
  </footer>
</template>