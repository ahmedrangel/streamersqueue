<script setup lang="ts">
const { data: data } = await useFetch("/api/all/stats") as Record<string, any>;
const { data: champions_summary } = await useFetch("/api/lol/champion-summary") as Record<string, any>;
const best = data.value.stats.best;
const worst = data.value.stats.worst;

const best_kda = best.kda;
const worst_kda = worst.kda;
const best_pcwr = best.player_champion_wr;
const worst_pcwr = worst.player_champion_wr;
const shortest_matches = best.match_duration;
const longest_matches = worst.match_duration;

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
    <div id="stats" class="row gx-4">
      <div class="col-12 col-xl-6 text-center my-3">
        <TableKDA :body="best_kda" :positive="true" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TableKDA :body="worst_kda" :positive="false" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TablePCWR :body="best_pcwr" :champions-summary="champions_summary" :positive="true" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TablePCWR :body="worst_pcwr" :champions-summary="champions_summary" :positive="false" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TableMatchDuration :body="shortest_matches" :champions-summary="champions_summary" :positive="true" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TableMatchDuration :body="longest_matches" :champions-summary="champions_summary" :positive="false" />
      </div>
    </div>
  </main>
</template>