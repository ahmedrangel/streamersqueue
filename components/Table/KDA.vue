<script setup lang="ts">
const props = defineProps({
  body: { type: Object, required: true },
  positive: { type: Boolean, required: true}
});

const head = [
  { id: "player" },
  { id: "region" },
  { id: "KDA" }
];

const body = ref({ all: props.body }) as Ref<Record<string, Record<string, any>>>;
const current_region = ref("all") as Ref<string>;
const loading = ref(false) as Ref<boolean>;

const table_name = `${props.positive ? "positive" : "negative"}-kda-table` as string;

const updateTable = async (region: string) => {
  if (!body.value[region]) {
    const table = document.querySelector("." + table_name) as HTMLElement;
    table.style.opacity = "0";
    loading.value = true;
    const { stats } = await $fetch(`/api/${region}/stats/kda-avg?order=${props.positive ? "desc" : "asc"}`).catch(() => null) as Record<string, any>;
    await sleep(100);
    loading.value = false;
    body.value[region] = stats?.kda;
    table.style.opacity = "1";
  }
};
</script>

<template>
  <h5 class="mb-2 fw-bold">
    {{ t("kda_averages") }}:
    <span v-if="props.positive" class="text-positive">{{ t("highest") }}</span>
    <span v-else class="text-negative">{{ t("lowest") }}</span>
    <br>
    <span class="text-muted small">({{ t("at_least") }} 10 {{ t("games_played") }})</span>
  </h5>
  <div class="input-group mb-2 justify-content-start mb-2">
    <label class="input-group-text bg-primary">{{ t("region") }}</label>
    <select v-model="current_region" class="form-select region-select bg-secondary" @change="updateTable(current_region)">
      <option v-for="(r, i) of available_regions" :key="i" :value="r.value">
        {{ r.name }}
      </option>
    </select>
  </div>
  <div class="overflow-auto">
    <table class="table table-striped table-borderless overflow-hidden rounded mb-0 bg-primary position-relative">
      <thead>
        <tr style="height: 40px;" class="align-middle text-center">
          <th v-for="(h, i) of head" :key="i" class="user-select-none border">
            <small>{{ t(h.id) }}</small>
          </th>
        </tr>
      </thead>
      <tbody class="border" :class="table_name">
        <tr v-for="(p, i) of body[current_region]" :key="i" class="text-center align-middle">
          <td class="text-start">
            <div class="d-flex align-items-center">
              <img class="rounded img-profile mx-1" :src="`https://static-cdn.jtvnw.net/${p.twitch_picture.replace('300x300', '70x70')}`">
              <div>
                <div class="d-flex align-items-center gap-2 px-1">
                  <span v-if="p.country_flag" data-bs-toggle="tooltip" :data-bs-original-title="getCountryName(p.country_flag)">
                    <Twemoji :emoji="p.country_flag" size="1.2em" />
                  </span>
                  <a target="_blank" class="small" :href="`https://twitch.tv/${p.twitch_login}`">{{ p.twitch_display }}</a>
                </div>
                <div class="d-flex align-items-center gap-2 px-1">
                  <img class="rounded img-profile" :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${p.lol_picture}.jpg`" style="width: 21px; height: 100%;">
                  <a target="_blank" class="small" :href="`https://op.gg/summoners/${p.lol_region}/${p.riot_name}-${p.riot_tag}`">
                    <strong>
                      <span class="text-nowrap">{{ p.riot_name }}</span>&nbsp;
                      <span class="text-muted">#{{ p.riot_tag }}</span>
                    </strong>
                  </a>
                </div>
              </div>
            </div>
          </td>
          <td scope="row" style="width: 90px;">
            <NuxtLink :to="p.lol_region">
              <strong class="text-uppercase text-nowrap small">{{ p.lol_region }}</strong>
            </NuxtLink>
          </td>
          <td>
            <div class="text-center">
              <h5 class="mb-0">
                <strong class="text-nowrap small d-block">
                  {{ p.kda }} <span class="text-muted fw-normal">({{ p.total_games }})</span>
                </strong>
              </h5>
              <strong class="text-uppercase text-nowrap small d-block text-muted">
                <span class="text-positive fw-bold">{{ p.avg_kills }}</span> / <span class="text-negative fw-bold">{{ p.avg_deaths }}</span> / <span class="text-warning fw-bold">{{ p.avg_assists }}</span>
              </strong>
            </div>
          </td>
        </tr>
      </tbody>
      <CompLoadingSpinner v-if="loading" class="position-absolute top-50 start-50 translate-middle" size="3rem" />
    </table>
  </div>
  <div v-if="!body[current_region]?.length && !loading" class="text-start text-negative">
    {{ t("there_is_not_enough_data_to_show_in_this_section") }}
  </div>
</template>