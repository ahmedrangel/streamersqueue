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
    <div id="stats" class="row gx-4">
      <div class="col-12 col-xl-6 text-center my-3">
        <TableKDA :body="best_kda" :positive="true" />
      </div>
      <div class="col-12 col-xl-6 text-center my-3">
        <TableKDA :body="worst_kda" :positive="false" />
      </div>
    </div>
  </main>
</template>