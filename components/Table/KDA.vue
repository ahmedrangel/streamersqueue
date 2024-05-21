<script setup lang="ts">
const props = defineProps({
  body: { type: Object, required: true },
  positive: { type: Boolean, required: true}
});

const kda_head = [
  { id: "streamer" },
  { id: "account" },
  { id: "region" },
  { id: "KDA" }
];
</script>

<template>
  <h5 class="mb-2 fw-bold">
    <span v-if="props.positive" class="text-positive">{{ t("highest") }}</span>
    <span v-else class="text-negative">{{ t("lowest") }}</span>
    {{ t("kda_averages") }}
    <br>
    <span class="text-muted">({{ t("at_least") }} 10 {{ t("games_played") }})</span>
  </h5>
  <div class="overflow-auto">
    <table class="table table-striped table-borderless overflow-hidden rounded mb-1">
      <thead>
        <tr style="height: 40px;" class="align-middle text-center">
          <th v-for="(h, i) of kda_head" :key="i" class="user-select-none border">
            <small>{{ t(h.id) }}</small>
          </th>
        </tr>
      </thead>
      <tbody class="border">
        <tr v-for="(p, i) of props.body" :key="i" class="text-center align-middle">
          <td class="text-start">
            <div class="d-flex align-items-center gap-2 px-1">
              <div class="position-relative">
                <img class="rounded img-profile" :src="`https://static-cdn.jtvnw.net/${p.twitch_picture.replace('300x300', '70x70')}`">
              </div>
              <span v-if="p.country_flag" :title="getCountryName(p.country_flag)">
                <Twemoji :emoji="p.country_flag" size="1.2em" />
              </span>
              <a target="_blank" class="small" :href="`https://twitch.tv/${p.twitch_login}`">{{ p.twitch_display }}</a>
            </div>
          </td>
          <td class="text-start">
            <div class="d-flex align-items-center gap-2">
              <img class="rounded img-profile" :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${p.lol_picture}.jpg`">
              <a target="_blank" class="small text-nowrap" :href="`https://op.gg/summoners/${p.lol_region}/${p.riot_name}-${p.riot_tag}`">
                <strong>{{ p.riot_name }} <span class="text-muted"><br>#{{ p.riot_tag }}</span></strong>
              </a>
            </div>
          </td>
          <td scope="row" style="width: 90px;">
            <NuxtLink :to="p.lol_region">
              <strong class="text-uppercase text-nowrap small">{{ p.lol_region }}</strong>
            </NuxtLink>
          </td>
          <td>
            <div class="text-center">
              <h5 class="mb-0"><strong class="text-nowrap small d-block">{{ p.kda }} <span class="text-muted fw-normal">({{ p.total_games }})</span></strong></h5>
              <strong class="text-uppercase text-nowrap small d-block text-muted">
                <span class="text-positive">{{ p.avg_kills }}</span> / <span class="text-negative">{{ p.avg_deaths }}</span> / <span class="text-warning">{{ p.avg_assists }}</span>
              </strong>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>