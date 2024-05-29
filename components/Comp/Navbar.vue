<script setup lang="ts">
const tabs: Record<string, any> = [
  {
    id: "home",
    name: "Inicio",
    type: "link",
    route: "/",
    icon: "ph:house-bold"
  },
  {
    id: "na",
    name: "NA",
    type: "link",
    route: "/na",
  },
  {
    id: "euw",
    name: "EUW",
    type: "link",
    route: "/euw",
  },
  {
    id: "lan",
    name: "LAN",
    type: "link",
    route: "/lan",
  },
  {
    id: "las",
    name: "LAS",
    type: "link",
    route: "/las",
  },
  {
    id: "lang",
    name: "Language",
    type: "dropdown",
    icon: "ph:globe-simple-duotone",
    subtabs: available_languages
  },
  /*
  {
    id: "premios",
    name: "Premios",
    type: "link",
    route: "/premios",
    icon: "fa6-solid:award"
  }*/
];

const { currentRoute, beforeEach } = useRouter();
const canonical = computed(() => SITE.host + currentRoute.value.path. replace(/\/+$/, ""));

useHead({
  link: [
    { rel: "canonical", href: canonical }
  ]
});

beforeEach(({ name }) => {
  currentRoute.value.name = name;
});

const setLang = (code: string) => {
  locale.setLanguage(code);
  const lang_cookie = useCookie("lang", { ...cookieMaxAge });
  lang_cookie.value = code;
  useHead({
    htmlAttrs: {
      lang: code
    }
  });
};
</script>

<template>
  <nav class="navbar navbar-expand-lg sticky-top navbar-dark bg-secondary shadow-lg" data-bs-theme="dark">
    <div class="container-xl px-xl-5">
      <button class="navbar-toggler border-0 rounded-pill" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon" />
      </button>
      <div class="navbar-brand ms-2 ms-lg-0 me-auto d-flex align-items-center gap-1 text-decoration-none">
        <NuxtLink to="/" class="text-decoration-none text-white">
          <img :src="`/${SITE.icon}`" width="40" class="me-2"><strong>{{ SITE.name }}</strong>
        </NuxtLink>
      </div>
      <div id="offcanvasNavbar" class="offcanvas offcanvas-start bg-secondary" tabindex="-1" aria-labelledby="offcanvasNavbarLabel">
        <div class="offcanvas-header px-4 pt-4 pb-0">
          <strong width="45">{{ SITE.name }}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div class="offcanvas-body">
          <ul class="navbar-nav justify-content-end flex-grow-1 gap-1 fw-bold">
            <template v-for="(tab, i) of tabs" :key="i">
              <li v-if="tab.type === 'link'" class="nav-item px-1" data-bs-dismiss="offcanvas">
                <NuxtLink  class="nav-link d-flex align-items-center gap-1 position-relative overflow-hidden rounded px-3" aria-current="page" :to="tab.route">
                  <Icon v-if="tab.icon" :name="tab.icon" />
                  <span class="text-uppercase">{{ t(tab.id) }}</span>
                </NuxtLink>
              </li>
              <li v-else-if="tab.type === 'dropdown'" class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <Icon :name="tab.icon" />
                  <span>{{ locale.getLanguage().toUpperCase() }}</span>
                </a>
                <ul class="dropdown-menu bg-secondary">
                  <template v-for="(subtab, j) of tab.subtabs" :key="j">
                    <li data-bs-dismiss="offcanvas">
                      <button v-if="tab.id === 'lang'" class="dropdown-item" @click="setLang(subtab.code)">{{ subtab.native }}</button>
                    </li>
                  </template>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>