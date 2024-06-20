import es from "~/strings/es";
import en from "~/strings/en";
import { SITE } from "~/utils/site";

const locales = { es, en } as Record<string, Record<string, string>>;

class Locale {
  code: globalThis.Ref<string>;
  constructor (code: string) {
    this.code = ref(String(code).toLowerCase());
  }

  get (key: string) {
    return locales[this.code.value][key] || locales.es[key] || key;
  }

  setLanguage (code = SITE.lang) {
    this.code.value = String(code).toLowerCase();
  }

  getLanguage () {
    return this.code.value;
  }
}
export const locale = new Locale(SITE.lang);

export const t = (key: string) => {
  return locale.get(key);
};
