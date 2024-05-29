import { SITE } from "./utils/site";

export default defineNuxtConfig({
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: SITE.title,
      htmlAttrs: {
        "data-bs-theme": "dark"
      },
      meta: [
        { name: "robots", content: "index, follow" }
      ],
      link : [
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "icon", type: "image/png", sizes: "512x512", href: "/android-chrome-512x512.png" },
        { rel: "icon", type: "image/png", sizes: "192x192", href: "/android-chrome-192x192.png" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#091428" },
      ]
    }
  },
  css: [
    "bootstrap/dist/css/bootstrap.min.css",
    "~/assets/css/main.css",
    "~/assets/css/transitions.css",
    "~/assets/css/theme.css",
    "~/assets/css/tables.css",
    "~/assets/css/popover.css",
    "~/assets/css/chart.css"
  ],
  modules: [
    "nuxt-icon",
    "@nuxtjs/sitemap",
    "@nuxtjs/google-fonts",
    "@nuxt/eslint",
    "nuxt-twemoji"
  ],
  runtimeConfig: {},
  features: {
    inlineStyles: false
  },
  site: {
    url: SITE.host
  },
  nitro: {
    prerender: {
      routes: ["/sitemap.xml"],
    }
  },
  sitemap: {
    dynamicUrlsApiEndpoint: "/__sitemap",
    xslColumns: [
      { label: "URL", width: "65%" },
      { label: "Priority", select: "sitemap:priority", width: "12.5%" },
      { label: "Last Modified", select: "sitemap:lastmod", width: "35%" }
    ]
  },
  routeRules: {
    "/": { sitemap: { priority: 1 } },
    "/*/**": { sitemap: { priority: 0.8, lastmod: new Date().toISOString() } }
  },
  googleFonts: {
    display: "swap",
    download: true,
    families: {
      "Mukta": [300, 400, 500, 600, 700],
    },
  }
});