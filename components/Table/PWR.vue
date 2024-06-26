<script setup lang="ts">
const props = defineProps({
  body: { type: Object, required: true },
  positive: { type: Boolean, required: true }
});

const head = [
  { id: "player" },
  { id: "region" },
  { id: "elo" },
  { id: "winrate" }
];

const body = ref({ all: props.body }) as Ref<Record<string, Record<string, any>>>;
const current_region = ref("all") as Ref<string>;
const loading = ref(false) as Ref<boolean>;

const table_name = `${props.positive ? "positive" : "negative"}-pwr-table` as string;

const updateTable = async (region: string) => {
  if (!body.value[region]) {
    const table = document.querySelector("." + table_name) as HTMLElement;
    table.style.opacity = "0";
    loading.value = true;
    const { stats } = await $fetch(`/api/${region}/stats/player-winrate?order=${props.positive ? "desc" : "asc"}`).catch(() => null) as Record<string, any>;
    await sleep(100);
    loading.value = false;
    body.value[region] = stats?.player_wr;
    table.style.opacity = "1";
  }
};
</script>

<template>
  <h5 class="mb-2 fw-bold">
    {{ t("player_winrates") }}:
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
        <tr v-for="(p, i) of body[current_region] || body.all" :key="i" class="text-center align-middle">
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
            <div v-if="p.elo" class="py-1">
              <small class="text-nowrap" data-bs-toggle="tooltip" :data-bs-original-title="`${capitalizeFirst(p.elo)} ${p.tier} · ${p.lp} LP`"><img :src="`/images/lol/${p.elo}.png`" height="30px"> {{ p.tier }}</small>
              <small class="d-block text-nowrap">
                <strong>{{ p.lp }} LP</strong>
              </small>
            </div>
            <div v-else>
              <small class="text-nowrap" data-bs-toggle="tooltip" data-bs-original-title="Unranked"><img :src="`/images/lol/unranked.png`" height="30px"></small>
            </div>
          </td>
          <td class="text-start">
            <div class="d-flex justify-content-center align-items-center gap-2">
              <div class="d-flex flex-column justify-content-center align-items-center">
                <h5 class="mb-0">
                  <strong class="text-nowrap small d-block">
                    {{ p.winrate }}%
                  </strong>
                </h5>
                <small class="text-nowrap fw-bold h6 mb-0">
                  <span class="text-positive">{{ p.wins }}</span>
                  <span class="text-muted">&nbsp;{{ t("w") }}</span>
                  <span class="text-muted">&nbsp;-&nbsp;</span>
                  <span class="text-negative">{{ p.losses }}</span>
                  <span class="text-muted">&nbsp;{{ t("l") }}</span>
                </small>
              </div>
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
