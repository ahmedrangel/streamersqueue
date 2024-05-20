<script setup lang="ts">
const { data: data } = await useFetch("/api/all/stats") as Record<string, any>;
const best = data.value.stats.best;
const worst = data.value.stats.worst;

const best_kda = best.kda;
const worst_kda = worst.kda;

useSeoMeta({
  title: `${SITE.title}`,
  description: SITE.description,
  keywords: SITE.keywords,
  // Open Graph
  ogType: "website",
  ogTitle: `${SITE.title}`,
  ogSiteName: SITE.name,
  ogDescription: SITE.description,
  ogUrl: SITE.host,
  ogImage: SITE.host + "/" + SITE.banner,
  // Twitter
  twitterCard: "summary_large_image",
  twitterTitle: `${SITE.title}`,
  twitterDescription: SITE.description
});

useHead({
  link: [
    { rel: "canonical", href: SITE.host }
  ]
});
</script>

<template>
  <main>
    <div class="row gx-4">
      <div class="col-12 col-xl-6 text-center my-3">
        <h5 class="mb-3 fw-bold"><span class="text-positive">{{ t("best") }} KDA</span> ({{ t("with_at_least") }} 10 {{ t("games_played") }})</h5>
        <table id="index-table" class="table table-striped table-borderless overflow-hidden rounded mb-1">
          <thead>
            <tr style="height: 40px;" class="align-middle text-center">
              <th class="user-select-none border">
                <small>{{ t("streamer") }}</small>
              </th>
              <th class="user-select-none border">
                <small>{{ t("account") }}</small>
              </th>
              <th class="user-select-none border">
                <small>{{ t("region") }}</small>
              </th>
              <th class="user-select-none border">
                <small>KDA</small>
              </th>
            </tr>
          </thead>
          <tbody class="border">
            <tr v-for="(p, i) of best_kda" :key="i" class="text-center align-middle">
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
                    <strong>{{ p.riot_name }} <span class="text-muted">#{{ p.riot_tag }}</span></strong>
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
      <div class="col-12 col-xl-6 text-center my-3">
        <h5 class="mb-3 fw-bold"><span class="text-negative">{{ t("worst") }} KDA</span> ({{ t("with_at_least") }} 10 {{ t("games_played") }})</h5>
        <table  id="participants-table" class="table table-striped table-borderless overflow-hidden rounded mb-1">
          <thead>
            <tr style="height: 40px;" class="align-middle text-center">
              <th class="user-select-none border">
                <small>Streamer</small>
              </th>
              <th class="user-select-none border">
                <small>Account</small>
              </th>
              <th class="user-select-none border">
                <small>Region</small>
              </th>
              <th class="user-select-none border">
                <small>KDA</small>
              </th>
            </tr>
          </thead>
          <tbody class="border">
            <tr v-for="(p, i) of worst_kda" :key="i" class="text-center align-middle">
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
                    <strong>{{ p.riot_name }} <span class="text-muted">#{{ p.riot_tag }}</span></strong>
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
                  <strong class="text-nowrap small d-block text-muted">
                    <span class="text-positive">{{ p.avg_kills }}</span> / <span class="text-negative">{{ p.avg_deaths }}</span> / <span class="text-warning">{{ p.avg_assists }}</span>
                  </strong>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>