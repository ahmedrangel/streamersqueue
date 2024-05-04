import { controls } from "~/utils/helpers";

export default defineEventHandler(() => {
  const routeRules = [] as Record<string, any>;
  const regions = Object.keys(controls);
  for (const r of regions) {
    const rules = [`/${r}`];
    for (const r of rules) {
      routeRules.push({ loc: r, lastmod: new Date().toISOString() });
    }
  }
  return routeRules;
});