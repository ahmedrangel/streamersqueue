export default defineEventHandler(async (event) => {
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json").catch(() => null);
  }

  const { cloudflare } = event.context;
  const { href: reqURL } = getRequestURL(event);
  let cacheManager = {
    cache: null as any,
    cacheKey: null as Request | null
  };

  // Check cache
  if (!import.meta.dev) {
    const cacheKey = new Request(reqURL, cloudflare.req);
    // @ts-expect-error
    const cache = caches.default;
    cacheManager = { cache, cacheKey };
    const response = await cache.match(cacheKey);

    if (response) {
      console.info("Found in cache!");
      return response;
    }
  }

  const data = await $fetch<Record<string, any>>("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json").catch(() => null);

  const response = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "s-maxage=432000" // 5d cache
    }
  });

  if (data && !import.meta.dev) {
    console.info("Stored in cache!");
    cloudflare.context.waitUntil(cacheManager.cache.put(cacheManager.cacheKey, response.clone()));
  }
});