import countries_json from "../content/countries.json";

export const getPercentage = (wins: number, losses: number) => {
  if (!wins && !losses) return 0;
  const winrate = wins / (wins + losses) * 100;
  const formatted = winrate % 1 === 0 ? winrate.toFixed(0) : winrate.toFixed(1);
  return formatted;
};

export const table_head = [
  {
    id: "rank",
    name: "Rank",
    sortable: true
  },
  {
    id: "position_change",
    name: "Cambio de posición",
    sortable: false
  },
  {
    id: "is_live",
    name: "En vivo",
    sortable: true,
    custom_class: "live_sort"
  },
  {
    id: "streamer",
    name: "Streamer",
    title: "Streamer",
    icon: "simple-icons:twitch",
    icon_class: "twitch",
    sortable: true
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "simple-icons:instagram",
    sortable: false
  },
  {
    id: "twitter",
    name: "Twitter X",
    icon: "simple-icons:x",
    sortable: false
  },
  {
    id: "is_ingame",
    name: "En partida",
    sortable: true,
    custom_class: "ingame_sort"
  },
  {
    id: "account",
    name: "Cuenta",
    title: "Cuenta",
    svg: "/images/opgg.svg",
    sortable: true
  },
  {
    id: "region",
    name: "Región",
    title: "Región",
    sortable: false
  },
  {
    id: "elo",
    name: "Elo",
    title: "Elo",
    sortable: true
  },
  {
    id: "matches",
    name: "Partidas",
    title: "Partidas",
    sortable: true
  },
  {
    id: "v_d",
    name: "V - D",
    title: "V - D",
    sortable: true
  },
  {
    id: "winrate",
    name: "Winrate",
    title: "Winrate",
    sortable: true
  }
];

export const getTimeUnitsFromISODate = (ISO: string) => {
  const targetDate = new Date(ISO);

  const today = new Date();

  const msdiff = Number(today) - Number(targetDate);

  const unMinuto = 60 * 1000;
  const unaHora = unMinuto * 60;
  const unDia = unaHora * 24;
  const unMes = unDia * 30.4375;
  const unAnio = unDia * 365.242189;

  const anios = Math.floor(msdiff / unAnio);
  const meses = Math.floor((msdiff % unAnio) / unMes);
  const dias = Math.floor((msdiff % unMes) / unDia);
  const horas = Math.floor((msdiff % unDia) / unaHora);
  const minutos = Math.floor(msdiff % unaHora / unMinuto);
  const segundos = Math.floor(msdiff % unMinuto / 1000);
  const unidades = [];

  if (anios > 0) unidades.push(`${anios} ${t(`year${anios !== 1 ? "s" : ""}`)}`);
  if (meses > 0) unidades.push(`${meses} ${t(`month${meses !== 1 ? "s" : ""}`)}`);
  if (dias > 0) unidades.push(`${dias} ${t(`day${dias !== 1 ? "s" : ""}`)}`);
  if (horas > 0) unidades.push(`${horas} ${t(`hour${horas !== 1 ? "s" : ""}`)}`);
  if (minutos > 0 && anios === 0) unidades.push(`${minutos} ${t(`minute${minutos !== 1 ? "s" : ""}`)}`);
  if (segundos >= 0 && anios === 0 && meses === 0 && dias === 0 && horas === 0 && minutos === 0) unidades.push(`${segundos} ${t(`second${segundos !== 1 ? "s" : ""}`)}`);

  const result = unidades.join(", ");
  return { result, outdated: msdiff >= 360000 ? true : false };
};

export const capitalizeFirst = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const controls = {
  lan: 1,
  las: 2,
  na: 3,
  euw: 4,
} as Record<string, number>;

export const getCountryName = (emoji: string) => {
  const countries = countries_json.countries;
  const lang = locale.getLanguage();
  const country_obj = countries.find(country => country.emoji === emoji) as Record<string, any>;
  if (country_obj) return country_obj[`name_${lang}`];
  else return country_obj["name_en"];
};

export const available_languages = [
  {
    name: "English",
    native: "English",
    code: "en"
  },
  {
    name: "Spanish",
    native: "Español",
    code: "es"
  }
];

export const cookieMaxAge = { maxAge: 365 * 24 * 60 * 60 };