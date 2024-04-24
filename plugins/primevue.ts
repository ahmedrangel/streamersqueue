
import PrimeVue from "primevue/config";
import Chart from "primevue/chart";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue);
  nuxtApp.vueApp.component("Chart", Chart);
});