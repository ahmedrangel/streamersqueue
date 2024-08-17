<script setup lang="ts">
import type { Tooltip } from "bootstrap";

const { params } = useRoute();
const region = String(params.region).toLowerCase();

if (!Object.keys(controls).includes(region)) {
  throw createError({
    statusCode: 404,
    message: `Region not found: '${region}'`,
    fatal: true
  });
}

const { data: data } = await useFetch(`/api/${region}/participants`) as Record<string, any>;
const participants = ref(data.value?.participants) as Ref<Record<string, any>>;
const participants_last_updated = ref(data.value?.last_updated) as Ref<string>;
const renewal_last_updated = ref() as Ref<string>;
const is_renewing = ref(false) as Ref<boolean>;
const cooldown = ref(true) as Ref<boolean>;
const api_error = ref(false) as Ref<boolean>;
const remaining = ref() as Ref<number>;
const interval = ref() as Ref<NodeJS.Timeout>;
const interval2 = ref() as Ref<NodeJS.Timeout>;
let tooltipInstances = [] as Tooltip[];
const controller = ref(new AbortController()) as Ref<AbortController>;

useSeoMeta({
  title: `${region.toUpperCase()} | ${SITE.name}`,
  description: SITE.description,
  keywords: SITE.keywords,
  // Open Graph
  ogType: "website",
  ogTitle: `${region.toUpperCase()} | ${SITE.name}`,
  ogSiteName: SITE.name,
  ogDescription: SITE.description,
  ogUrl: SITE.host,
  ogImage: SITE.host + SITE.card,
  // Twitter
  twitterCard: "summary_large_image",
  twitterTitle: `${region.toUpperCase()} | ${SITE.name}`,
  twitterDescription: SITE.description
});

useHead({
  link: [
    { rel: "canonical", href: `${SITE.host}/${region}` }
  ]
});

const remainingForRenew = () => {
  const defined_cooldown = 240; // in seconds
  const date = Number(new Date(participants_last_updated.value) as Date);
  const now = Number(new Date() as Date);
  remaining.value = Math.ceil(((defined_cooldown * 1000) - (now - date)) / 1000);
};

const { $Tooltip, $bootstrap } = useNuxtApp() as Record<string, any>;

const reinitializeTooltips = () => {
  const showingTooltips = document.querySelectorAll(".tooltip.bs-tooltip-auto.show") as NodeListOf<HTMLElement>;
  for (const t of showingTooltips) t?.remove();
  for (const i of tooltipInstances) i?.dispose();
  tooltipInstances = [];
  const new_elements = document.querySelectorAll("[data-bs-toggle=\"tooltip\"]") as NodeListOf<HTMLElement>;
  [...new_elements].map((e) => {
    const instance = new $Tooltip(e, { trigger: "hover", placement: "top" });
    tooltipInstances.push(instance);
  });
};

const checkAndFetch = async (updatingToast: HTMLElement, updatingTable: HTMLElement) => {
  const { last_updated, renewing } = await $fetch(`/api/${region}/renewal-status`).catch(() => null) as Record<string, any>;
  renewal_last_updated.value = last_updated;
  if (!renewing) {
    const data = await $fetch(`/api/${region}/participants`).catch(() => null) as Record<string, any>;
    participants.value = data?.participants;
    participants_last_updated.value = data?.last_updated;
    is_renewing.value = false;
    remainingForRenew();
    if (interval2.value) clearInterval(interval2.value);
    $bootstrap.hideToast(updatingToast);
    updatingTable.classList.remove("updating");
    return true;
  }
  return false;
};

const checkRenewal = async (updatingToast: HTMLElement, updatingTable: HTMLElement) => {
  const checked = await checkAndFetch(updatingToast, updatingTable);
  if (!checked) {
    interval2.value = setInterval(async () => {
      await checkAndFetch(updatingToast, updatingTable);
    }, 6000);
  }
};

const renew = async () => {
  api_error.value = false;
  const updatingTable = document.querySelector("#participants-table tbody") as HTMLElement;
  const first_last_updated = Number(new Date(participants_last_updated.value) as Date);
  const updatingToast = document.querySelector("#updatingToast") as HTMLElement;
  is_renewing.value = true;
  const { renewing, last_updated } = await $fetch(`/api/${region}/renewal-status`).catch(() => null) as Record<string, any>;
  renewal_last_updated.value = last_updated;
  const last_last_updated = Number(new Date(last_updated) as Date);
  const dif = Math.ceil((last_last_updated - first_last_updated) / 1000);
  if (!renewing && remaining.value < 0 && dif === 0) {
    $bootstrap.showToast(updatingToast);
    updatingTable.classList.add("updating");
    is_renewing.value = remaining.value >= 0 ? false : true;
    const signal = controller.value.signal;
    const update = await $fetch(`${SITE.worker}/${region}/renewal`, { signal }).catch(() => null) as Record<string, any>;
    if (update?.status_code === 200) {
      const data = await $fetch(`/api/${region}/participants`).catch(() => null) as Record<string, any>;
      participants.value = data?.participants;
      participants_last_updated.value = data?.last_updated;
      cooldown.value = true;
      is_renewing.value = false;
      remainingForRenew();
      $bootstrap.hideToast(updatingToast);
      updatingTable.classList.remove("updating");
      reinitializeTooltips();
    }
    else if (update?.status_code === 429) {
      is_renewing.value = false;
      $bootstrap.hideToast(updatingToast);
      updatingTable.classList.remove("updating");
    }
    else if (update?.status_code === 400) {
      api_error.value = true;
      is_renewing.value = false;
      $bootstrap.hideToast(updatingToast);
      updatingTable.classList.remove("updating");
    }
  }
  else {
    is_renewing.value = false;
  }

  if ((remaining.value < 0 && dif > 0) || renewing) {
    console.info("checking latest renewal");
    is_renewing.value = true;
    $bootstrap.showToast(updatingToast);
    updatingTable.classList.add("updating");
    await checkRenewal(updatingToast, updatingTable);
  }
};

onMounted(async () => {
  $bootstrap.initializeTooltip();
  remainingForRenew();
  await renew();
  interval.value = setInterval(() => {
    if (remaining.value >= 0) {
      cooldown.value = true;
      remainingForRenew();
    }
    else {
      cooldown.value = false;
    }
  }, 200);
});

onBeforeUnmount(() => {
  clearInterval(interval.value);
});
</script>

<template>
  <main>
    <div class="text-center my-2">
      <h3 class="text-uppercase mb-0 fw-bold">{{ region }} Ranking</h3>
    </div>
    <div class="d-flex justify-content-end align-items-center mb-2">
      <button class="btn bg-tertiary text-dark fw-bold d-flex align-items-center gap-1" :disabled="is_renewing || cooldown" @click="renew()">
        <Icon v-if="!is_renewing" name="ph:arrows-clockwise-bold" />
        <CompLoadingSpinner v-else size="1rem" />
        <span>{{ is_renewing ? t("updating") : t("update") }}</span>
      </button>
    </div>
    <span v-if="api_error" class="d-flex justify-content-end align-items-center text-negative"><b>{{ t("api_error_message") }}</b></span>
    <span v-if="cooldown && remaining >= 0" class="d-flex justify-content-end align-items-center text-muted"><i>{{ t("available_in") }}: {{ remaining }} {{ t("seconds") }}</i></span>
    <!-- Cantidad de participantes -->
    <CompParticipantsCounter :data="participants" :last-updated="participants_last_updated" />
    <!-- Tabla de clasificación -->
    <CompRanking v-if="participants" :data="participants" />
    <div class="justify-content-start align-items-center d-flex gap-2 small mt-1">
      <Icon name="ph:info-bold" class="h4 mb-0" />
      <div>
        <span>{{ t("info_message_1") }}</span>
      </div>
    </div>
    <!--
    <hr class="mt-5 mb-4">
    <CompChart />
    -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div id="updatingToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
        <div class="toast-header py-4 border-0 bg-tertiary text-dark px-3 rounded">
          <CompLoadingSpinner class="me-2 h6 mb-0" size="1rem" />
          <h6 class="me-auto mb-0">{{ t("updating_data") }}...</h6>
          <button type="button" class="btn p-0 text-dark" data-bs-dismiss="toast" aria-label="Close">
            <Icon name="ph:x-bold" />
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
