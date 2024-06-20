<script setup lang="ts">
const props = defineProps({
  data: { type: Object, required: true }
});

const participants = ref(props.data) as Ref<Record<string, any>>;
const lang = ref(locale.getLanguage()) as Ref<string>;

watchEffect(() => {
  participants.value = props.data;
  lang.value = locale.getLanguage();
});

const sort = (type: string, order: string) => {
  const sorters: Record<string, (a: any, b: any) => number> = {
    rank: (a, b) => order === "desc" ? b.position - a.position : a.position - b.position,
    is_live: (a, b) => order === "desc" ? b.twitch_is_live - a.twitch_is_live : a.twitch_is_live - b.twitch_is_live,
    streamer: (a, b) => order === "desc" ? b.twitch_login.localeCompare(a.twitch_login) : a.twitch_login.localeCompare(b.twitch_login),
    is_ingame: (a, b) => order === "desc" ? b.is_ingame - a.is_ingame : a.is_ingame - b.is_ingame,
    account: (a, b) => order === "desc" ? b.riot_name.localeCompare(a.riot_name) : a.riot_name.localeCompare(b.riot_name),
    region: (a, b) => order === "desc" ? b.lol_region.localeCompare(a.lol_region) : a.lol_region.localeCompare(b.lol_region),
    elo: (a, b) => order === "desc" ? a.position - b.position : b.position - a.position,
    matches: (a, b) => order === "desc" ? (b.wins + b.losses) - (a.wins + a.losses) : (a.wins + a.losses) - (b.wins + b.losses),
    v_d: (a, b) => order === "desc" ? b.wins - a.wins : a.wins - b.wins,
    winrate: (a, b) => order === "desc" ? (b.wins / (b.wins + b.losses) * 100) - (a.wins / (a.wins + a.losses) * 100) : (a.wins / (a.wins + a.losses) * 100) - (b.wins / (b.wins + b.losses) * 100)
  };
  if (!type && order === "init") {
    participants.value.sort((a: Record<string, number>, b: Record<string, number>) => {
      if (!a.position || !b.position) {
        if (!a.position && !b.position) return a.raw_position - b.raw_position;
        if (!a.position) return 1;
        if (!b.position) return -1;
      }
      return a.position - b.position;
    });
  }
  else if (sorters[type]) {
    participants.value.sort(sorters[type]).sort((a: Record<string, number>, b: Record<string, number>) => {
      if (!a.position || !b.position) {
        if (!a.position) return 1;
        if (!b.position) return -1;
      }
    });
  }
};

const removeSort = (currentId: string) => {
  document.querySelectorAll(".desc").forEach((el) => {
    if (el.id !== currentId) el.classList.remove("desc");
  });
  document.querySelectorAll(".asc").forEach((el) => {
    if (el.id !== currentId) el.classList.remove("asc");
  });
};

const toggleClass = (head: HTMLElement) => {
  if (!head.classList.contains("desc") && !head.classList.contains("asc")) {
    head.classList.add("desc");
  }
  else if (head.classList.contains("desc")) {
    head.classList.remove("desc");
    head.classList.add("asc");
  }
  else if (head.classList.contains("asc")) {
    head.classList.remove("asc");
  }
};

const clickHandler = (head: HTMLElement) => {
  removeSort(head.id);
  toggleClass(head);
  head.classList.contains("desc") ? sort(head.id, "desc") : head.classList.contains("asc") ? sort(head.id, "asc") : sort("", "init");
};

const sorterHandler = (type: string) => {
  for (const el of table_head) {
    const head = document.querySelector("#" + el.id) as HTMLElement;
    if (head) {
      if (type === "add") {
        head.addEventListener("click", () => clickHandler(head));
      }
      else {
        head.removeEventListener("click", () => clickHandler(head));
      }
    }
  }
};

onMounted(async () => {
  sorterHandler("add");
});

onBeforeUnmount(() => {
  sorterHandler("remove");
});

const matches_per_day = 10;
const date_init = new Date("2024-03-01T00:00:00");
const now = new Date();
const nowInCDMX = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_city" }));
const remainMatchesToday = (total: number) => {
  const daysPassed = Math.floor((Number(nowInCDMX) - Number(date_init)) / (1000 * 3600 * 24)) + 1; // Calcular días pasados desde la fecha inicial
  const totalAvailableMatches = daysPassed * matches_per_day; // Calcular el total de matches disponibles hasta hoy
  const remainingMatches = totalAvailableMatches - total; // Calcular los matches que quedan hoy
  if (Number(nowInCDMX.getMonth()) + 1 !== 3) return 0 as number;
  return (Number(nowInCDMX.getDate()) === 31 || Number(nowInCDMX.getDate()) === 30) && Number(nowInCDMX.getMonth()) + 1 === 3 ? "∞" : remainingMatches;
};
</script>

<template>
  <div class="overflow-auto">
    <table id="participants-table" class="table table-striped table-borderless overflow-hidden rounded mb-1">
      <thead>
        <tr style="height: 40px;" class="align-middle text-center">
          <template v-for="(h, i) of table_head" :key="i">
            <th :id="h.id" scope="col" :class="`${h.sortable ? 'sortable' : ''} ${h.custom_class ? h.custom_class : ''}`" class="user-select-none border" :title="t(h.id)">
              <div v-if="h.sortable" class="d-flex align-items-center justify-content-evenly">
                <div v-if="h.title" class="d-flex align-items-center">
                  <Icon v-if="h.icon" :class="`${h.icon_class ? h.icon_class : ''}`" :name="`${h.icon ? h.icon : ''}`" />
                  <img v-if="h.svg" :src="h.svg" width="20px">
                    &nbsp;&nbsp;
                  <small>{{ t(h.id) }}</small>
                </div>
                <span class="arrows" />
              </div>
              <div v-else>
                <span v-if="h.icon">
                  <Icon :name="h.icon" />
                </span>
                <div v-if="h.title" class="d-flex align-items-center justify-content-evenly">
                  <small>{{ t(h.id) }}</small>
                </div>
              </div>
            </th>
          </template>
        </tr>
      </thead>
      <tbody class="border">
        <tr v-for="p of participants" :key="p.raw_position" class="text-center align-middle" :class="`p-row-${p.raw_position}`">
          <th scope="row"><small>{{ p.position }}</small></th>
          <th scope="row" style="width: 40px;">
            <div class="d-flex align-items-center justify-content-center gap-1 px-1" :class="`${p.position_change > 0 ? 'text-positive' : p.position_change < 0 ? 'text-negative' : 'text-muted'}`">
              <Icon :name="`${p.position_change > 0 ? 'solar:alt-arrow-up-bold' : p.position_change < 0 ? 'solar:alt-arrow-down-bold' : 'bi:dash-lg'}`" />
              <small v-if="Math.abs(p.position_change) > 0">
                <strong>{{ Math.abs(p.position_change) }}</strong>
              </small>
            </div>
          </th>
          <th scope="row" style="width: 30px;">
            <span class="d-flex align-items-center justify-content-center" :class="`${p.twitch_is_live ? 'live' : 'not-live'}`" data-bs-toggle="tooltip" :data-bs-original-title="p.twitch_is_live ? t('live_em') : ''">
              <Icon name="ph:circle-fill" />
            </span>
          </th>
          <td class="text-start">
            <div class="d-flex align-items-center gap-2 px-1">
              <div class="position-relative">
                <img class="rounded img-profile" :class="`${p.position === 1 ? 'border-winner-1' : p.position === 2 ? 'border-winner-2' : p.position === 3 ? 'border-winner-3' : ''}`" :src="`https://static-cdn.jtvnw.net/${p.twitch_picture.replace('300x300', '70x70')}`">
                <Icon v-if="p.position === 1" class="position-absolute top-0 start-50 translate-middle crown-1" name="ph:crown-fill" />
                <Icon v-if="p.position === 2" class="position-absolute top-0 start-50 translate-middle crown-2" name="ph:crown-fill" />
                <Icon v-if="p.position === 3" class="position-absolute top-0 start-50 translate-middle crown-3" name="ph:crown-fill" />
              </div>
              <span v-if="p.country_flag" data-bs-toggle="tooltip" :data-bs-original-title="getCountryName(p.country_flag)">
                <Twemoji :emoji="p.country_flag" size="1.2em" />
              </span>
              <a target="_blank" class="small" :href="`https://twitch.tv/${p.twitch_login}`">{{ p.twitch_display }}</a>
            </div>
          </td>
          <th scope="row" style="width: 40px;">
            <a v-if="p.instagram" target="_blank" :href="`https://instagram.com/${p.instagram}`" :title="p.instagram" class="p-2 bg-instagram rounded d-inline-flex align-items-center text-white"><Icon name="simple-icons:instagram" /></a>
          </th>
          <th scope="row" style="width: 40px;">
            <a v-if="p.twitter" target="_blank" :href="`https://x.com/${p.twitter}`" :title="p.twitter" class="p-2 bg-black rounded d-inline-flex align-items-center text-white"><Icon name="simple-icons:x" /></a>
          </th>
          <th scope="row" style="width: 30px;">
            <span class="d-flex align-items-center justify-content-center" :class="`${p.is_ingame ? 'ingame' : 'not-ingame'}`" data-bs-toggle="tooltip" :data-bs-original-title="p.is_ingame ? t('ingame_em') : ''">
              <Icon name="ph:circle-fill" />
            </span>
          </th>
          <td class="text-start">
            <div class="d-flex align-items-center gap-2">
              <img class="rounded img-profile" :src="`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${p.lol_picture}.jpg`">
              <a target="_blank" class="small text-wrap" :href="`https://op.gg/summoners/${p.lol_region}/${p.riot_name}-${p.riot_tag}`">
                <strong>{{ p.riot_name }} <span class="text-muted">#{{ p.riot_tag }}</span></strong>
              </a>
            </div>
          </td>
          <td scope="row" style="width: 90px;">
            <strong class="text-uppercase text-nowrap small">{{ p.lol_region }}</strong>
          </td>
          <td>
            <div v-if="p.elo" class="py-1">
              <small class="text-nowrap" data-bs-toggle="tooltip" :data-bs-original-title="`${capitalizeFirst(p.elo)} ${p.tier} · ${p.lp} LP`"><img :src="`/images/lol/${p.elo}.png`" height="36px"> {{ p.tier }}</small>
              <small class="d-block text-nowrap">
                <strong>{{ p.lp }} LP</strong>
              </small>
            </div>
            <div v-else>
              <small class="text-nowrap" data-bs-toggle="tooltip" data-bs-original-title="Unranked"><img :src="`/images/lol/unranked.png`" height="30px"></small>
            </div>
          </td>
          <td>
            <div class="" data-bs-toggle="popover" :title="p.twitch_display" :data-bs-content="`Total jugadas: <strong>${p.wins + p.losses}</strong><br>Restantes hoy: <b ${Number(remainMatchesToday(p.wins + p.losses)) <= 0 ? 'class=\'text-negative\'' : ''}'>${remainMatchesToday(p.wins + p.losses)}</b>`">
              <small role="">
                <strong>{{ p.wins + p.losses }}</strong>
              </small>
            </div>
          </td>
          <td>
            <div class="d-flex flex-column align-items-center">
              <small class="text-nowrap fw-bold">
                <span class="text-positive">{{ p.wins }}</span>
                <span class="text-muted">&nbsp;{{ t("w") }}</span>
                <span class="text-muted">&nbsp;|&nbsp;</span>
                <span class="text-negative">{{ p.losses }}</span>
                <span class="text-muted">&nbsp;{{ t("l") }}</span>
              </small>
              <div class="progress mt-2 rounded-1 winrate-progress">
                <div class="progress-bar bg-positive" role="progressbar" :style="{ width: (p.wins || p.losses ? p.wins/(p.wins + p.losses) * 100 : 0) + '%' }" />
                <div class="progress-bar bg-negative" role="progressbar" :style="{ width: (p.wins || p.losses ? p.losses/(p.wins + p.losses) * 100 : 0) + '%' }" />
              </div>
            </div>
          </td>
          <td>
            <small>
              <strong>{{ getPercentage(p.wins, p.losses) }}%</strong>
            </small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
