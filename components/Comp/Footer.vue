<template>
  <footer class="text-center py-4 border-top bg-footer text-muted">
    <h5 class="d-block mb-2">© {{ new Date().getFullYear() }} {{ SITE.name }}</h5>
    <h6 class="mb-2 small fw-light">
      Desarrollado por:
      <template v-for="(d, i) of SITE.developers" :key="i">
        <a target="_blank" class="fw-bold" :href="`https://github.com/${d.github}`" :style="{'color': '#' + d.color + '!important' }">
          {{ d.user }}
        </a>{{ i < SITE.developers.length - 1 ? ' & ' : '' }}
      </template>
    </h6>
  </footer>
</template>