<script setup lang="ts">
const { data: data } = await useFetch("/api/participants") as Record<string, any>;
const participants = ref(data.value?.participants) as Ref<Record<string, any>>;
const participants_last_updated = ref(data.value?.last_updated) as Ref<string>;
const renewal_last_updated = ref();
const is_renewing = ref();
const cooldown = ref(true);
const remaining = ref();
const interval = ref();
const interval2 = ref();

useSeoMeta({
  title: SITE.title,
  description: SITE.description,
  keywords: SITE.keywords,
  // Open Graph
  ogType: "website",
  ogTitle: SITE.title,
  ogSiteName: SITE.name,
  ogDescription: SITE.description,
  ogUrl: SITE.host,
  ogImage: SITE.host + "/" + SITE.banner,
  // Twitter
  twitterCard: "summary_large_image",
  twitterTitle: SITE.title,
  twitterDescription: SITE.description
});

useHead({
  link: [
    { rel: "canonical", href: SITE.host }
  ]
});

const remainingForRenew = () => {
  const date = Number(new Date(participants_last_updated.value) as Date);
  const now = Number(new Date() as Date);
  remaining.value = Math.ceil((120000 - (now - date)) / 1000);
};

const checkRenewal = async () => {
  interval2.value = setInterval(async() => {
    if (participants_last_updated.value === renewal_last_updated.value) {
      const { last_updated } = await $fetch("/api/renewal-status").catch(() => null) as Record<string, any>;
      renewal_last_updated.value = last_updated;
    } else {
      const data = await $fetch("/api/participants").catch(() => null) as Record<string, any>;
      participants.value = data?.participants;
      participants_last_updated.value = data?.last_updated;
      is_renewing.value = false;
      remainingForRenew();
      clearInterval(interval2.value);
    }
  }, 6000);
};

const renew = async() => {
  is_renewing.value = true;
  const { renewing, last_updated } = await $fetch("/api/renewal-status").catch(() => null) as Record<string, any>;
  renewal_last_updated.value = last_updated;
  if (!renewing && remaining.value < 0) {
    remaining.value >= 0 ? is_renewing.value = false : is_renewing.value = true;
    const update = await $fetch(SITE.worker + "/renewal").catch(() => null) as Record<string, any>;
    if (update?.status_code === 200) {
      const data = await $fetch("/api/participants").catch(() => null) as Record<string, any>;
      participants.value = data?.participants;
      participants_last_updated.value = data?.last_updated;
      cooldown.value = true;
      is_renewing.value = false;
      remainingForRenew();
    } else if (update?.status_code === 429) {
      is_renewing.value = false;
    }
  } else {
    is_renewing.value = false;
  }

  if (remaining.value < 0) {
    console.info("checking latest renewal");
    is_renewing.value = true;
    await checkRenewal();
  }
};

onMounted(async() => {
  remainingForRenew();
  await renew();
  interval.value = setInterval(() => {
    if (remaining.value >= 0) {
      cooldown.value = true;
      remainingForRenew();
    } else {
      cooldown.value = false;
    }
  }, 200);
});

onBeforeUnmount(() => {
  clearInterval(interval.value);
});
</script>

<template>
  <!-- Pages: keep single root, everything goes inside 'main' -->
  <main>
    <div class="text-center my-3">
      <h5 class="text-uppercase mb-0 fw-bold">{{ SITE.name }}</h5>
    </div>
    <div class="d-flex justify-content-end align-items-center mb-2">
      <button class="btn bg-tertiary text-dark fw-bold d-flex align-items-center gap-1" :disabled="is_renewing || cooldown" @click="renew()">
        <Icon v-if="!is_renewing" name="ph:arrows-clockwise-bold" />
        <CompLoadingSpinner v-else />
        <span>{{ is_renewing ? "Actualizando" : "Actualizar" }}</span>
      </button>
    </div>
    <span v-if="cooldown && remaining >= 0" class="d-flex justify-content-end align-items-center text-muted"><i>Disponible en: {{ remaining }} segundos</i></span>
    <!-- Cantidad de participantes -->
    <CompParticipantsCounter :data="participants" :last-updated="participants_last_updated" />
    <!-- Tabla de clasificación -->
    <CompRanking v-if="participants" :data="participants" />
    <div class="justify-content-start align-items-center d-flex gap-2 small mt-1">
      <Icon name="ph:info-bold" class="h4 mb-0" />
      <div>
        <span>Los cambios de posición se restauran a las 00:00 GMT-6.</span>
      </div>
    </div>
    <hr class="mt-5 mb-4">
    <!--
    <CompChart />
    -->
  </main>
</template>
