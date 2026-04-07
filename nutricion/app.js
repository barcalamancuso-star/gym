const STORAGE_DB_KEY = "ariadna_nutricion_db_v1";
const STORAGE_FOODS_KEY = "ariadna_nutricion_foods_v1";
const RECOVERED_FOODS_URLS = [
  "./food-codex/alimentos.base.es.json",
  "./food%20codex/alimentos.base.es.json",
  "../food%20codex/alimentos.base.es.json",
];
const SLOT_LABELS = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
  colacion: "Colacion",
  postentreno: "Post entreno",
};
const PHASE_FACTOR = {
  hipertrofia: 1.12,
  mantenimiento: 1,
  definicion: 0.85,
};
const NUTRIENT_LABELS = {
  kcal: "Kcal",
  p: "Proteina",
  c: "Carbos",
  g: "Grasas",
  f: "Fibra",
};
const DEFAULT_FOODS = [
  {
    id: "arroz_blanco",
    nombre: "Arroz blanco",
    categoria: "Carbohidrato",
    modos: {
      cocido: { kcal: 130, p: 2.7, c: 28.2, g: 0.3, f: 0.4 },
      crudo: { kcal: 360, p: 6.7, c: 79.2, g: 0.6, f: 1.3 },
    },
  },
  {
    id: "avena",
    nombre: "Avena",
    categoria: "Carbohidrato",
    modos: {
      crudo: { kcal: 389, p: 16.9, c: 66.3, g: 6.9, f: 10.6 },
    },
  },
  {
    id: "banana",
    nombre: "Banana",
    categoria: "Fruta",
    modos: {
      unidad: { kcal: 105, p: 1.3, c: 27, g: 0.4, f: 3.1 },
      crudo: { kcal: 89, p: 1.1, c: 22.8, g: 0.3, f: 2.6 },
    },
  },
  {
    id: "batata",
    nombre: "Batata",
    categoria: "Carbohidrato",
    modos: {
      cocido: { kcal: 90, p: 2, c: 20.7, g: 0.2, f: 3.3 },
    },
  },
  {
    id: "carne_picada_magra",
    nombre: "Carne picada magra",
    categoria: "Proteina",
    modos: {
      cocido: { kcal: 217, p: 26, c: 0, g: 12, f: 0 },
    },
  },
  {
    id: "huevo",
    nombre: "Huevo",
    categoria: "Proteina",
    modos: {
      unidad: { kcal: 72, p: 6.3, c: 0.4, g: 4.8, f: 0 },
      cocido: { kcal: 155, p: 13, c: 1.1, g: 11, f: 0 },
    },
  },
  {
    id: "lentejas",
    nombre: "Lentejas",
    categoria: "Legumbre",
    modos: {
      cocido: { kcal: 116, p: 9, c: 20.1, g: 0.4, f: 7.9 },
    },
  },
  {
    id: "leche_entera",
    nombre: "Leche entera",
    categoria: "Lacteo",
    modos: {
      ml: { kcal: 0.64, p: 0.033, c: 0.048, g: 0.034, f: 0 },
    },
  },
  {
    id: "papa",
    nombre: "Papa",
    categoria: "Carbohidrato",
    modos: {
      cocido: { kcal: 87, p: 1.9, c: 20.1, g: 0.1, f: 1.8 },
    },
  },
  {
    id: "pechuga_pollo",
    nombre: "Pechuga de pollo",
    categoria: "Proteina",
    modos: {
      cocido: { kcal: 165, p: 31, c: 0, g: 3.6, f: 0 },
    },
  },
  {
    id: "whey",
    nombre: "Whey protein",
    categoria: "Suplemento",
    modos: {
      scoop: { kcal: 120, p: 24, c: 3, g: 2, f: 0 },
      crudo: { kcal: 400, p: 80, c: 10, g: 6.6, f: 0 },
    },
  },
  {
    id: "yogur_griego",
    nombre: "Yogur griego",
    categoria: "Lacteo",
    modos: {
      crudo: { kcal: 97, p: 9, c: 3.9, g: 5, f: 0 },
    },
  },
  {
    id: "aceite_oliva",
    nombre: "Aceite de oliva",
    categoria: "Grasa",
    modos: {
      ml: { kcal: 8.2, p: 0, c: 0, g: 0.91, f: 0 },
    },
  },
];

let DB = normalizeDb(loadStoredJson(STORAGE_DB_KEY, buildInitialDb()));
let foodCatalog = [];
let foodSourceLabel = "fallback";

const $ = (id) => document.getElementById(id);

function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((num(value) + Number.EPSILON) * factor) / factor;
}

function fmt(value, digits = 1) {
  return round(value, digits).toLocaleString("es-AR", {
    minimumFractionDigits: digits === 0 ? 0 : 0,
    maximumFractionDigits: digits,
  });
}

function stripBom(text) {
  return typeof text === "string" ? text.replace(/^\uFEFF/, "") : "";
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

function saveDb() {
  DB.timestamps.updatedAt = nowIso();
  localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(DB));
}

function saveFoods() {
  localStorage.setItem(STORAGE_FOODS_KEY, JSON.stringify(foodCatalog));
}

function buildInitialDb() {
  return {
    version: "nutrition_db_v1",
    profile: {
      personId: "cris",
      displayName: "Cris",
      sex: "m",
      age: 30,
      heightCm: 175,
      currentWeightKg: 80,
      goalPhase: "hipertrofia",
      activityFactor: 1.35,
    },
    goals: {
      mode: "auto",
      proteinPerKg: 1.8,
      carbsPerKg: 3.2,
      fatPerKg: 0.9,
      fiberTarget: 30,
      manualKcalTarget: null,
    },
    bodyMetrics: {
      weightHistory: [],
    },
    dailyLogs: {},
    activityImports: [],
    customFoods: [],
    recipes: [],
    mealTemplates: [],
    integrations: {
      omega: {
        enabled: false,
        personId: "cris",
        lastImportAt: null,
        externalRefs: [],
      },
      biometrics: {
        enabled: false,
        personId: "cris",
        lastImportAt: null,
        externalRefs: [],
      },
    },
    settings: {
      theme: "olive-ember",
    },
    timestamps: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  };
}

function normalizeFood(raw) {
  const source = raw && raw.source ? String(raw.source) : "catalog";
  const item = {
    id: String(raw?.id || uid("food")),
    nombre: String(raw?.nombre || "Sin nombre"),
    categoria: String(raw?.categoria || "General"),
    source,
    modos: {},
  };
  Object.entries(raw?.modos || {}).forEach(([mode, nutrients]) => {
    item.modos[mode] = {
      kcal: num(nutrients?.kcal),
      p: num(nutrients?.p ?? nutrients?.proteina),
      c: num(nutrients?.c ?? nutrients?.carbos),
      g: num(nutrients?.g ?? nutrients?.grasas),
      f: num(nutrients?.f ?? nutrients?.fibra),
    };
  });
  return item;
}

function normalizeFoods(list, source = "catalog") {
  return (Array.isArray(list) ? list : [])
    .map((item) => normalizeFood({ ...item, source: item?.source || source }))
    .filter((item) => item.nombre && Object.keys(item.modos).length);
}

function normalizeEntry(raw) {
  return {
    id: String(raw?.id || uid("entry")),
    foodId: String(raw?.foodId || ""),
    foodName: String(raw?.foodName || raw?.nombre || "Sin nombre"),
    source: String(raw?.source || "catalog"),
    mode: String(raw?.mode || "cocido"),
    quantity: num(raw?.quantity),
    unit: String(raw?.unit || "g"),
    nutrients: {
      kcal: num(raw?.nutrients?.kcal),
      p: num(raw?.nutrients?.p),
      c: num(raw?.nutrients?.c),
      g: num(raw?.nutrients?.g),
      f: num(raw?.nutrients?.f),
    },
    note: String(raw?.note || ""),
    createdAt: String(raw?.createdAt || nowIso()),
  };
}

function normalizeMeal(raw) {
  const slot = String(raw?.slot || "colacion");
  return {
    id: String(raw?.id || uid("meal")),
    slot,
    label: SLOT_LABELS[slot] || slot,
    entries: (Array.isArray(raw?.entries) ? raw.entries : []).map(normalizeEntry),
  };
}

function normalizeDay(raw, date) {
  return {
    date,
    meals: (Array.isArray(raw?.meals) ? raw.meals : []).map(normalizeMeal),
    notes: String(raw?.notes || ""),
    importedActivityIds: Array.isArray(raw?.importedActivityIds)
      ? raw.importedActivityIds.map(String)
      : [],
  };
}

function normalizeDb(raw) {
  const base = buildInitialDb();
  const src = raw && typeof raw === "object" ? raw : {};
  const out = { ...base, ...src };
  out.profile = { ...base.profile, ...(src.profile || {}) };
  out.goals = { ...base.goals, ...(src.goals || {}) };
  out.bodyMetrics = {
    weightHistory: Array.isArray(src?.bodyMetrics?.weightHistory)
      ? src.bodyMetrics.weightHistory
          .map((item) => ({
            date: String(item?.date || localIsoDate()),
            weightKg: num(item?.weightKg),
            source: String(item?.source || "manual"),
            note: String(item?.note || ""),
          }))
          .filter((item) => item.weightKg > 0)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      : [],
  };
  const days = {};
  Object.entries(src.dailyLogs || {}).forEach(([date, day]) => {
    days[date] = normalizeDay(day, date);
  });
  out.dailyLogs = days;
  out.activityImports = Array.isArray(src.activityImports)
    ? src.activityImports.map((item) => ({
        id: String(item?.id || uid("evt")),
        date: String(item?.date || localIsoDate()),
        activityType: String(item?.activityType || item?.activity_type || "actividad"),
        durationMin: num(item?.durationMin ?? item?.duration_min),
        kcalActive: num(item?.kcalActive ?? item?.kcal_active),
        source: String(item?.source || "manual"),
        externalRef: String(item?.externalRef || ""),
      }))
    : [];
  out.customFoods = Array.isArray(src.customFoods) ? src.customFoods : [];
  out.recipes = Array.isArray(src.recipes) ? src.recipes : [];
  out.mealTemplates = Array.isArray(src.mealTemplates) ? src.mealTemplates : [];
  out.integrations = {
    omega: { ...base.integrations.omega, ...(src.integrations?.omega || {}) },
    biometrics: {
      ...base.integrations.biometrics,
      ...(src.integrations?.biometrics || {}),
    },
  };
  out.settings = { ...base.settings, ...(src.settings || {}) };
  out.timestamps = { ...base.timestamps, ...(src.timestamps || {}) };
  return out;
}

function ensureDay(date) {
  if (!DB.dailyLogs[date]) DB.dailyLogs[date] = normalizeDay({}, date);
  return DB.dailyLogs[date];
}

function currentDateValue() {
  return $("day-date").value || localIsoDate();
}

function parseFoodCsv(text) {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const get = (headersRow, row, key) => row[headersRow.indexOf(key)] || "";
  const byId = {};
  lines.slice(1).forEach((line, index) => {
    const row = line.split(",").map((item) => item.trim());
    const id = get(headers, row, "id") || `csv_${index + 1}`;
    const item = byId[id] || {
      id,
      nombre: get(headers, row, "nombre") || "Sin nombre",
      categoria: get(headers, row, "categoria") || "General",
      modos: {},
    };
    const mode = get(headers, row, "modo") || "cocido";
    item.modos[mode] = {
      kcal: num(get(headers, row, "kcal")),
      p: num(get(headers, row, "p")) || num(get(headers, row, "proteina")),
      c: num(get(headers, row, "c")) || num(get(headers, row, "carbos")),
      g: num(get(headers, row, "g")) || num(get(headers, row, "grasas")),
      f: num(get(headers, row, "f")) || num(get(headers, row, "fibra")),
    };
    byId[id] = item;
  });
  return Object.values(byId);
}

function parseActivityCsv(text) {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const get = (row, keyA, keyB = "") => {
    const idxA = headers.indexOf(keyA);
    const idxB = keyB ? headers.indexOf(keyB) : -1;
    if (idxA >= 0) return row[idxA] || "";
    if (idxB >= 0) return row[idxB] || "";
    return "";
  };
  return lines.slice(1).map((line, index) => {
    const row = line.split(",").map((item) => item.trim());
    return {
      id: get(row, "id") || `evt_${index + 1}`,
      date: get(row, "date") || localIsoDate(),
      activityType: get(row, "activity_type", "actividad") || "actividad",
      durationMin: num(get(row, "duration_min")),
      kcalActive: num(get(row, "kcal_active")),
      source: get(row, "source") || "manual",
      externalRef: "",
    };
  });
}

function factorForMode(mode, quantity) {
  if (mode === "unidad" || mode === "ml" || mode === "scoop") return num(quantity);
  return num(quantity) / 100;
}

function computeNutrients(base, mode, quantity) {
  const factor = factorForMode(mode, quantity);
  return {
    kcal: round(num(base?.kcal) * factor, 1),
    p: round(num(base?.p) * factor, 1),
    c: round(num(base?.c) * factor, 1),
    g: round(num(base?.g) * factor, 1),
    f: round(num(base?.f) * factor, 1),
  };
}

function latestWeight() {
  const first = DB.bodyMetrics.weightHistory[0];
  return first?.weightKg || num(DB.profile.currentWeightKg) || 80;
}

function goalsForToday() {
  const weight = latestWeight();
  const profile = DB.profile;
  const goals = DB.goals;
  const baseMetabolic =
    10 * weight + 6.25 * num(profile.heightCm) - 5 * num(profile.age) + (profile.sex === "m" ? 5 : -161);
  const activityFactor = Math.max(num(profile.activityFactor) || 1.35, 1);
  const phaseFactor = PHASE_FACTOR[profile.goalPhase] || 1;
  const kcalAuto = round(baseMetabolic * activityFactor * phaseFactor, 0);
  return {
    kcal:
      goals.mode === "manual" && num(goals.manualKcalTarget) > 0
        ? round(num(goals.manualKcalTarget), 0)
        : kcalAuto,
    p: round(weight * num(goals.proteinPerKg), 1),
    c: round(weight * num(goals.carbsPerKg), 1),
    g: round(weight * num(goals.fatPerKg), 1),
    f: round(num(goals.fiberTarget), 1),
  };
}

function totalsForDate(date) {
  const day = ensureDay(date);
  return day.meals.reduce(
    (acc, meal) => {
      meal.entries.forEach((entry) => {
        acc.kcal += num(entry.nutrients.kcal);
        acc.p += num(entry.nutrients.p);
        acc.c += num(entry.nutrients.c);
        acc.g += num(entry.nutrients.g);
        acc.f += num(entry.nutrients.f);
      });
      return acc;
    },
    { kcal: 0, p: 0, c: 0, g: 0, f: 0 }
  );
}

function activitiesForDate(date) {
  return DB.activityImports.filter((event) => event.date === date);
}

function activitySummary(date) {
  const events = activitiesForDate(date);
  return events.reduce(
    (acc, event) => {
      acc.kcalActive += num(event.kcalActive);
      acc.durationMin += num(event.durationMin);
      return acc;
    },
    { kcalActive: 0, durationMin: 0, count: events.length }
  );
}

function sortedFoods() {
  const query = $("food-search").value.trim().toLowerCase();
  return foodCatalog
    .filter((food) => food.nombre.toLowerCase().includes(query))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function syncImportedActivitiesToDays() {
  Object.values(DB.dailyLogs).forEach((day) => {
    day.importedActivityIds = Array.isArray(day.importedActivityIds) ? day.importedActivityIds : [];
  });
  DB.activityImports.forEach((event) => {
    const day = ensureDay(event.date);
    if (!day.importedActivityIds.includes(event.id)) day.importedActivityIds.push(event.id);
  });
}

function updateProfileFromInputs() {
  DB.profile.personId = $("person-id").value.trim() || "cris";
  DB.profile.displayName = $("display-name").value.trim() || DB.profile.personId;
  DB.profile.sex = $("sex").value;
  DB.profile.age = num($("age").value) || DB.profile.age;
  DB.profile.heightCm = num($("height-cm").value) || DB.profile.heightCm;
  DB.profile.currentWeightKg = num($("weight-kg").value) || DB.profile.currentWeightKg;
  DB.profile.goalPhase = $("goal-phase").value;
  DB.profile.activityFactor = num($("activity-factor").value) || 1.35;
  DB.goals.mode = $("goal-mode").value;
  DB.goals.proteinPerKg = num($("protein-per-kg").value) || DB.goals.proteinPerKg;
  DB.goals.carbsPerKg = num($("carbs-per-kg").value) || DB.goals.carbsPerKg;
  DB.goals.fatPerKg = num($("fat-per-kg").value) || DB.goals.fatPerKg;
  DB.goals.fiberTarget = num($("fiber-target").value) || DB.goals.fiberTarget;
  DB.goals.manualKcalTarget = num($("manual-kcal-target").value) || null;
  DB.integrations.omega.personId = DB.profile.personId;
  DB.integrations.biometrics.personId = DB.profile.personId;
}

function renderProfileInputs() {
  $("person-id").value = DB.profile.personId || "cris";
  $("display-name").value = DB.profile.displayName || DB.profile.personId || "Cris";
  $("day-date").value = $("day-date").value || localIsoDate();
  $("weight-kg").value = latestWeight();
  $("height-cm").value = DB.profile.heightCm;
  $("age").value = DB.profile.age;
  $("sex").value = DB.profile.sex;
  $("goal-phase").value = DB.profile.goalPhase;
  $("activity-factor").value = DB.profile.activityFactor;
  $("goal-mode").value = DB.goals.mode;
  $("protein-per-kg").value = DB.goals.proteinPerKg;
  $("carbs-per-kg").value = DB.goals.carbsPerKg;
  $("fat-per-kg").value = DB.goals.fatPerKg;
  $("fiber-target").value = DB.goals.fiberTarget;
  $("manual-kcal-target").value = DB.goals.manualKcalTarget || "";
}

function renderFoodSelect() {
  const list = sortedFoods();
  const select = $("food-select");
  if (!list.length) {
    select.innerHTML = "<option value=\"\">Sin alimentos</option>";
    $("food-mode").innerHTML = "";
    return;
  }
  const current = select.value;
  select.innerHTML = list
    .map((food) => `<option value="${food.id}">${food.nombre} · ${food.categoria}</option>`)
    .join("");
  if (list.some((food) => food.id === current)) select.value = current;
  renderFoodModes();
}

function renderFoodModes() {
  const select = $("food-select");
  const food = foodCatalog.find((item) => item.id === select.value);
  const modeSelect = $("food-mode");
  if (!food) {
    modeSelect.innerHTML = "";
    return;
  }
  const modes = Object.keys(food.modos);
  modeSelect.innerHTML = modes
    .map((mode) => `<option value="${mode}">${mode}</option>`)
    .join("");
  if (modes.includes("cocido")) modeSelect.value = "cocido";
  const activeMode = modeSelect.value;
  $("food-quantity").value =
    activeMode === "unidad" || activeMode === "ml" || activeMode === "scoop" ? 1 : 100;
}

function renderSummary(date) {
  const totals = totalsForDate(date);
  const goals = goalsForToday();
  const activity = activitySummary(date);
  const net = totals.kcal - activity.kcalActive;
  const summaryCards = [
    {
      key: "kcal",
      label: "Kcal",
      value: totals.kcal,
      goal: goals.kcal,
      suffix: "",
      precision: 0,
    },
    {
      key: "p",
      label: "Proteina",
      value: totals.p,
      goal: goals.p,
      suffix: "g",
      precision: 1,
    },
    {
      key: "c",
      label: "Carbos",
      value: totals.c,
      goal: goals.c,
      suffix: "g",
      precision: 1,
    },
    {
      key: "g",
      label: "Grasas",
      value: totals.g,
      goal: goals.g,
      suffix: "g",
      precision: 1,
    },
  ];
  $("summary-cards").innerHTML = summaryCards
    .map((card) => {
      const progress = Math.max(0, Math.min((card.value / Math.max(card.goal, 1)) * 100, 140));
      return `
        <article class="summary-card">
          <span class="summary-name">${card.label}</span>
          <strong>${fmt(card.value, card.precision)}${card.suffix}</strong>
          <span class="summary-meta">Objetivo ${fmt(card.goal, card.precision)}${card.suffix}</span>
          <div class="bar"><span style="width:${progress}%"></span></div>
        </article>
      `;
    })
    .join("");

  const goalsList = ["kcal", "p", "c", "g", "f"];
  $("goal-lines").innerHTML = goalsList
    .map((key) => {
      const value = totals[key];
      const goal = goals[key];
      const progress = Math.max(0, Math.min((value / Math.max(goal, 1)) * 100, 140));
      const unit = key === "kcal" ? "" : " g";
      return `
        <div class="goal-line">
          <div class="line-head">
            <span>${NUTRIENT_LABELS[key]}</span>
            <b>${fmt(value, key === "kcal" ? 0 : 1)} / ${fmt(goal, key === "kcal" ? 0 : 1)}${unit}</b>
          </div>
          <div class="bar"><span style="width:${progress}%"></span></div>
        </div>
      `;
    })
    .join("");

  $("goal-note").textContent =
    DB.goals.mode === "manual"
      ? "Metas manuales activas."
      : `Objetivos automaticos segun peso ${fmt(latestWeight(), 1)} kg y fase ${DB.profile.goalPhase}.`;
  $("activity-today").textContent = `${fmt(activity.kcalActive, 0)} kcal`;
  $("activity-today-meta").textContent =
    activity.count > 0
      ? `${activity.count} eventos importados · ${fmt(activity.durationMin, 0)} min activos.`
      : "Sin eventos importados para hoy.";
  $("bridge-status").textContent = DB.integrations.omega.enabled ? "Omega enlazado" : "Omega apagado";
  $("bridge-meta").textContent = `personId ${DB.profile.personId} · date ${date} · biometria ${DB.integrations.biometrics.enabled ? "on" : "off"}.`;
  $("hero-date").textContent = date;
  $("hero-weight").textContent = `Peso ${fmt(latestWeight(), 1)} kg`;
  $("hero-balance").textContent = `${fmt(net, 0)} kcal netas`;
  $("hero-protein").textContent = `${fmt(totals.p, 1)} g proteina`;
  $("hero-bridge").textContent = DB.integrations.omega.enabled ? "Omega on" : "Omega off";
}

function renderMealLog(date) {
  const day = ensureDay(date);
  const orderedMeals = [...day.meals].sort((a, b) => {
    const order = Object.keys(SLOT_LABELS);
    return order.indexOf(a.slot) - order.indexOf(b.slot);
  });
  const container = $("meal-log");
  if (!orderedMeals.length) {
    container.innerHTML = `<div class="empty">Todavia no registraste comidas para ${date}.</div>`;
    return;
  }
  container.innerHTML = orderedMeals
    .map((meal) => {
      const mealTotals = meal.entries.reduce(
        (acc, entry) => {
          acc.kcal += entry.nutrients.kcal;
          acc.p += entry.nutrients.p;
          return acc;
        },
        { kcal: 0, p: 0 }
      );
      return `
        <article class="meal-group">
          <div class="meal-group-head">
            <strong>${meal.label}</strong>
            <span>${fmt(mealTotals.kcal, 0)} kcal · ${fmt(mealTotals.p, 1)} g P</span>
          </div>
          <div class="entry-list">
            ${meal.entries
              .map(
                (entry) => `
                  <div class="entry-row">
                    <div>
                      <strong>${entry.foodName}</strong>
                      <p>${entry.quantity} ${entry.unit} · modo ${entry.mode}</p>
                      <p>${fmt(entry.nutrients.kcal, 0)} kcal · P ${fmt(entry.nutrients.p, 1)} g · C ${fmt(entry.nutrients.c, 1)} g · G ${fmt(entry.nutrients.g, 1)} g</p>
                      <p>${entry.note || "Sin nota"} · fuente ${entry.source}</p>
                    </div>
                    <button type="button" data-remove-entry="${meal.id}:${entry.id}">Quitar</button>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-remove-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const [mealId, entryId] = button.dataset.removeEntry.split(":");
      const dayLog = ensureDay(date);
      dayLog.meals = dayLog.meals
        .map((meal) =>
          meal.id === mealId
            ? { ...meal, entries: meal.entries.filter((entry) => entry.id !== entryId) }
            : meal
        )
        .filter((meal) => meal.entries.length);
      saveDb();
      renderAll();
    });
  });
}

function renderWeightLog() {
  const container = $("weight-log");
  const list = DB.bodyMetrics.weightHistory;
  if (!list.length) {
    container.innerHTML = `<div class="empty">Sin historial de peso todavia.</div>`;
    return;
  }
  container.innerHTML = list
    .slice(0, 8)
    .map(
      (item) => `
        <article class="weight-item">
          <strong>${fmt(item.weightKg, 1)} kg</strong>
          <span>${item.date} · fuente ${item.source}${item.note ? ` · ${item.note}` : ""}</span>
        </article>
      `
    )
    .join("");
}

function renderActivityLog(date) {
  const events = [...DB.activityImports]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
  const container = $("activity-log");
  if (!events.length) {
    container.innerHTML = `<div class="empty">Todavia no importaste actividad externa.</div>`;
    return;
  }
  container.innerHTML = events
    .map(
      (event) => `
        <article class="activity-item">
          <strong>${event.activityType}</strong>
          <span>${event.date}${event.date === date ? " · dia activo" : ""} · ${fmt(event.durationMin, 0)} min · ${fmt(event.kcalActive, 0)} kcal · ${event.source}</span>
        </article>
      `
    )
    .join("");
}

function renderCatalogStatus() {
  $("food-catalog-status").textContent = `${foodCatalog.length} alimentos`;
  const sourceText =
    foodSourceLabel === "recovered"
      ? "cargados desde el rescate recuperado"
      : foodSourceLabel === "manual"
      ? "cargados manualmente"
      : "catalogo semilla embebido";
  $("food-catalog-meta").textContent = sourceText;
  $("activity-status").textContent = DB.activityImports.length
    ? `${DB.activityImports.length} eventos guardados`
    : "Sin importar";
  $("activity-meta").textContent =
    DB.activityImports.length > 0
      ? "Actividad lista para descontar gasto del dia."
      : "Importa JSON o CSV para sumar gasto activo.";
}

function renderAll() {
  const date = currentDateValue();
  renderProfileInputs();
  renderFoodSelect();
  renderSummary(date);
  renderMealLog(date);
  renderWeightLog();
  renderActivityLog(date);
  renderCatalogStatus();
}

function updateStatus(message) {
  $("profile-status").textContent = message;
}

async function loadFoodCatalog() {
  const cached = normalizeFoods(loadStoredJson(STORAGE_FOODS_KEY, []), "manual");
  if (cached.length) {
    foodCatalog = cached;
    foodSourceLabel = "manual";
    return;
  }
  for (const url of RECOVERED_FOODS_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const recovered = normalizeFoods(await response.json(), "recovered");
      if (!recovered.length) continue;
      foodCatalog = recovered;
      foodSourceLabel = "recovered";
      saveFoods();
      return;
    } catch (_err) {}
  }
  foodCatalog = normalizeFoods(DEFAULT_FOODS, "seed");
  foodSourceLabel = "fallback";
  saveFoods();
}

function addWeightEntry() {
  updateProfileFromInputs();
  const weight = num($("weight-kg").value);
  if (weight <= 0) {
    updateStatus("El peso debe ser mayor a cero.");
    return;
  }
  const date = currentDateValue();
  const note = $("weight-note").value.trim();
  const existing = DB.bodyMetrics.weightHistory.find((item) => item.date === date);
  if (existing) {
    existing.weightKg = weight;
    existing.note = note;
    existing.source = "manual";
  } else {
    DB.bodyMetrics.weightHistory.push({
      date,
      weightKg: weight,
      source: "manual",
      note,
    });
  }
  DB.bodyMetrics.weightHistory.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  DB.profile.currentWeightKg = weight;
  saveDb();
  updateStatus(`Pesaje guardado para ${date}.`);
  renderAll();
}

function saveProfile() {
  updateProfileFromInputs();
  saveDb();
  updateStatus("Perfil y metas guardados.");
  renderAll();
}

function addFoodEntry() {
  const date = currentDateValue();
  ensureDay(date);
  const food = foodCatalog.find((item) => item.id === $("food-select").value);
  const mode = $("food-mode").value;
  const quantity = num($("food-quantity").value);
  if (!food || !mode || quantity <= 0) {
    updateStatus("Elegi un alimento, un modo y una cantidad valida.");
    return;
  }
  const slot = $("meal-slot").value;
  const day = ensureDay(date);
  let meal = day.meals.find((item) => item.slot === slot);
  if (!meal) {
    meal = normalizeMeal({ slot, label: SLOT_LABELS[slot], entries: [] });
    day.meals.push(meal);
  }
  meal.entries.push({
    id: uid("entry"),
    foodId: food.id,
    foodName: food.nombre,
    source: food.source || "catalog",
    mode,
    quantity,
    unit: mode === "unidad" || mode === "scoop" ? mode : mode === "ml" ? "ml" : "g",
    nutrients: computeNutrients(food.modos[mode], mode, quantity),
    note: $("entry-note").value.trim(),
    createdAt: nowIso(),
  });
  saveDb();
  $("entry-note").value = "";
  updateStatus(`${food.nombre} agregado a ${SLOT_LABELS[slot] || slot}.`);
  renderAll();
}

function clearActiveDay() {
  const date = currentDateValue();
  DB.dailyLogs[date] = normalizeDay({}, date);
  saveDb();
  updateStatus(`Dia ${date} reiniciado.`);
  renderAll();
}

async function importFoods(file) {
  if (!file) return;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const text = stripBom(await file.text());
  let loaded = [];
  if (ext === "json") {
    const parsed = JSON.parse(text);
    loaded = normalizeFoods(Array.isArray(parsed) ? parsed : parsed.foodCatalog || [], "manual");
  } else if (ext === "csv") {
    loaded = normalizeFoods(parseFoodCsv(text), "manual");
  }
  if (!loaded.length) {
    updateStatus("No pude cargar alimentos desde ese archivo.");
    return;
  }
  foodCatalog = loaded;
  foodSourceLabel = "manual";
  saveFoods();
  updateStatus(`Catalogo cargado manualmente: ${loaded.length} alimentos.`);
  renderAll();
}

async function importActivities(file) {
  if (!file) return;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const text = stripBom(await file.text());
  let events = [];
  if (ext === "json") {
    const parsed = JSON.parse(text);
    events = Array.isArray(parsed.events) ? parsed.events : Array.isArray(parsed) ? parsed : [];
  } else if (ext === "csv") {
    events = parseActivityCsv(text);
  }
  const normalized = normalizeDb({ activityImports: events }).activityImports;
  if (!normalized.length) {
    updateStatus("No pude cargar actividad desde ese archivo.");
    return;
  }
  const merged = new Map(DB.activityImports.map((item) => [item.id, item]));
  normalized.forEach((event) => merged.set(event.id, event));
  DB.activityImports = Array.from(merged.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  syncImportedActivitiesToDays();
  saveDb();
  updateStatus(`Actividad importada: ${normalized.length} eventos.`);
  renderAll();
}

async function importBundle(file) {
  if (!file) return;
  const text = stripBom(await file.text());
  const parsed = JSON.parse(text);
  if (parsed?.db) {
    DB = normalizeDb(parsed.db);
    foodCatalog = normalizeFoods(parsed.foodCatalog || foodCatalog, "manual");
    foodSourceLabel = parsed.foodCatalog?.length ? "manual" : foodSourceLabel;
  } else {
    DB = normalizeDb(parsed);
  }
  saveDb();
  if (foodCatalog.length) saveFoods();
  syncImportedActivitiesToDays();
  updateStatus("Bundle importado.");
  renderAll();
}

function exportBundle() {
  const bundle = {
    version: "nutrition_bundle_v1",
    exportedAt: nowIso(),
    db: DB,
    foodCatalog,
  };
  downloadJson(`nutricion_bundle_${currentDateValue()}.json`, bundle);
  updateStatus("Bundle exportado.");
}

function bindEvents() {
  $("save-profile").addEventListener("click", saveProfile);
  $("add-weight").addEventListener("click", addWeightEntry);
  $("export-bundle").addEventListener("click", exportBundle);
  $("add-entry").addEventListener("click", addFoodEntry);
  $("clear-day").addEventListener("click", clearActiveDay);
  $("food-search").addEventListener("input", renderFoodSelect);
  $("food-select").addEventListener("change", renderFoodModes);
  $("goal-mode").addEventListener("change", () => {
    updateProfileFromInputs();
    renderAll();
  });
  $("day-date").addEventListener("change", renderAll);
  $("foods-file").addEventListener("change", async (event) => {
    await importFoods(event.target.files?.[0]);
    event.target.value = "";
  });
  $("activity-file").addEventListener("change", async (event) => {
    await importActivities(event.target.files?.[0]);
    event.target.value = "";
  });
  $("bundle-file").addEventListener("change", async (event) => {
    await importBundle(event.target.files?.[0]);
    event.target.value = "";
  });
}

async function init() {
  $("day-date").value = localIsoDate();
  syncImportedActivitiesToDays();
  await loadFoodCatalog();
  bindEvents();
  renderAll();
}

init();
