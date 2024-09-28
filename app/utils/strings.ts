import es from "~/strings/es";
import en from "~/strings/en";
import { SITE } from "~/utils/site";

type AvailableLocales = "en" | "es";
const locales = { es, en } as Record<AvailableLocales, Record<string, string>>;

class Locale {
  code: globalThis.Ref<AvailableLocales>;
  constructor (code: AvailableLocales) {
    this.code = ref(String(code).toLowerCase() as AvailableLocales);
  }

  get (key: string) {
    return locales[this.code.value][key] || locales.es[key] || key;
  }

  setLanguage (code = SITE.lang) {
    this.code.value = String(code).toLowerCase() as AvailableLocales;
  }

  getLanguage () {
    return this.code.value;
  }
}
export const locale = new Locale(SITE.lang as AvailableLocales);

export const t = (key: string) => {
  return locale.get(key);
};
