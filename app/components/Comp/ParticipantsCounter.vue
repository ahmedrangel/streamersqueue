<script setup lang="ts">
const props = defineProps({
  data: { type: Object, required: true },
  lastUpdated: { type: String, required: true }
});

const last_updated = ref(props.lastUpdated);
const data = ref(props.data);
const lang = ref(locale.getLanguage());

watchEffect(() => {
  last_updated.value = props.lastUpdated;
  data.value = props.data;
  lang.value = locale.getLanguage();
});

/* const getServerTime = () => new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", hour12: false, minute: "2-digit", second: "2-digit" });
const serverTime = ref(getServerTime());
*/
const last_updated_time = ref(getTimeUnitsFromISODate(last_updated.value));
const interval = ref();

onMounted(() => {
  interval.value = setInterval(() => {
    last_updated_time.value = getTimeUnitsFromISODate(last_updated.value);
  }, 200);
});

onBeforeUnmount(() => {
  clearInterval(interval.value);
});
</script>

<template>
  <div class="mb-1">
    <!--
    <div class="d-lg-flex d-block align-items-center justify-content-end gap-3">
      <div class="d-flex gap-1 align-items-center text-nowrap text-muted">
        <Icon name="ph:clock-bold" />
        <span>Hora server:
          <ClientOnly>{{ serverTime }}</ClientOnly>
        </span>
      </div>
    </div>
    -->
    <div class="d-lg-flex d-block align-items-center justify-content-between gap-3">
      <div class="d-flex gap-1 align-items-center text-nowrap">
        <Icon name="fa6-solid:user-group" />
        <span>{{ data.length ? data.length : 0 }} {{ t("accounts") }}</span>
      </div>
      <div v-if="props.lastUpdated" class="d-flex gap-1 align-items-center text-nowrap">
        <Icon name="ph:clock-clockwise-bold" />
        <span>{{ t("updated") }}:</span>
        <span v-if="lang === 'es'">{{ t("ago") }} {{ last_updated_time.result }}</span>
        <span v-if="lang === 'en'">{{ last_updated_time.result }} {{ t("ago") }}</span>
      </div>
    </div>
  </div>
</template>
