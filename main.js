const DATA_URL = "trees.json";
const DEFAULT_CENTER = [45.52, -122.67];
const DEFAULT_ZOOM = 12;

const LEFT_CATEGORICAL_FIELDS = ["Condition", "Native", "Size"];

const RIGHT_CATEGORICAL_FIELDS = ["Common_name"];

const CATEGORICAL_FIELDS = [
  ...LEFT_CATEGORICAL_FIELDS,
  ...RIGHT_CATEGORICAL_FIELDS,
];

const NUMERIC_FIELDS = [
  "TreeHeight",
  "CrownBaseHeight",
  "Structural_Value",
  "Carbon_Storage_lb",
  "Carbon_Storage_value",
  "Carbon_Sequestration_lb",
  "Carbon_Sequestration_value",
  "Stormwater_ft",
  "Stormwater_value",
  "Pollution_Removal_value",
  "Pollution_Removal_oz",
  "Total_Annual_Benefits",
];

const statusEl = document.getElementById("status");
const countPill = document.getElementById("countPill");

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidLatLon(lat, lon) {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

function prettyLabel(field) {
  const spaced = String(field)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  const KEEP_UPPER = new Set([
    "lb",
    "ft",
    "oz",
    "dbh",
    "id",
    "gps",
    "ns",
    "ew",
  ]);

  return spaced
    .split(" ")
    .map((w) => {
      const lower = w.toLowerCase();
      if (KEEP_UPPER.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getSelectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions).map((o) => o.value);
}

function setAllSelected(selectEl, selected) {
  for (const opt of selectEl.options) opt.selected = selected;
}

function uniqueSorted(values) {
  const arr = Array.from(
    new Set(
      values.filter(
        (v) => v !== null && v !== undefined && String(v).trim() !== ""
      )
    )
  );
  if (arr.every((v) => !isNaN(Number(v))))
    return arr.sort((a, b) => Number(a) - Number(b));
  return arr.sort((a, b) => String(a).localeCompare(String(b)));
}

function inventoryYear(tree) {
  const s = tree.Inventory_Date;
  if (!s) return null;
  const m = String(s).match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function normalize(val, min, max) {
  if (val === null || val === undefined) return null;
  if (max === min) return 1;
  const x = (val - min) / (max - min);
  return Math.max(0, Math.min(1, x));
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const map = L.map("map", { preferCanvas: true }).setView(
  DEFAULT_CENTER,
  DEFAULT_ZOOM
);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let heatLayer = null;

let allTrees = [];
let filteredTrees = [];
const numericStats = {};

function populateSelect(selectEl, values) {
  selectEl.innerHTML = "";
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    selectEl.appendChild(opt);
  }
}

function buildCategoricalControlsFromData(data) {
  for (const field of CATEGORICAL_FIELDS) {
    const selectEl = el(field);
    if (!selectEl) continue;

    const vals = data
      .map((t) => t[field])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    populateSelect(selectEl, uniqueSorted(vals));
  }
}

const numericRangesHost = document.getElementById("numericRanges");

function computeNumericStats(data) {
  for (const field of NUMERIC_FIELDS) {
    let min = Infinity,
      max = -Infinity,
      seen = 0;
    for (const t of data) {
      const v = toNumber(t[field]);
      if (v === null) continue;
      seen++;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    numericStats[field] = seen
      ? { min: Number(min.toFixed(3)), max: Number(max.toFixed(3)) }
      : { min: null, max: null };
  }
}

function buildNumericRangeControls() {
  numericRangesHost.innerHTML = "";

  for (const field of NUMERIC_FIELDS) {
    const stats = numericStats[field] || { min: null, max: null };

    const wrap = document.createElement("div");
    wrap.className = "group";
    wrap.style.margin = "10px 0 0 0";
    wrap.style.padding = "10px";
    wrap.style.background = "rgba(255,255,255,0.65)";

    const hdr = document.createElement("div");
    hdr.className = "inline";
    hdr.innerHTML = `
          <div style="font-weight:700;font-size:12px;color:#111;">${escapeHtml(
            prettyLabel(field)
          )}</div>
          <div class="pill">${stats.min ?? "?"} – ${stats.max ?? "?"}</div>
        `;
    wrap.appendChild(hdr);

    const grid = document.createElement("div");
    grid.className = "rangeGrid";
    grid.innerHTML = `
          <div>
            <label for="${field}_min">Min</label>
            <input id="${field}_min" type="number" step="any" placeholder="(no min)">
          </div>
          <div>
            <label for="${field}_max">Max</label>
            <input id="${field}_max" type="number" step="any" placeholder="(no max)">
          </div>
        `;
    wrap.appendChild(grid);

    numericRangesHost.appendChild(wrap);
  }
}

function readFilters() {
  const categorical = {};
  for (const field of CATEGORICAL_FIELDS) {
    const s = el(field);
    if (!s) continue;
    const selected = getSelectedValues(s);
    categorical[field] = selected;
  }

  const yearMin = toNumber(el("YearMin").value);
  const yearMax = toNumber(el("YearMax").value);

  const numeric = {};
  for (const field of NUMERIC_FIELDS) {
    numeric[field] = {
      min: toNumber(el(`${field}_min`)?.value),
      max: toNumber(el(`${field}_max`)?.value),
    };
  }

  return { categorical, numeric, yearMin, yearMax };
}

function passesFilters(tree, filters) {
  for (const [field, selected] of Object.entries(filters.categorical)) {
    if (!selected || selected.length === 0) continue;
    const v = tree[field];
    if (v === null || v === undefined || String(v).trim() === "") return false;
    if (!selected.includes(String(v))) return false;
  }

  if (filters.yearMin !== null || filters.yearMax !== null) {
    const y = inventoryYear(tree);
    if (y === null) return false;
    if (filters.yearMin !== null && y < filters.yearMin) return false;
    if (filters.yearMax !== null && y > filters.yearMax) return false;
  }

  for (const [field, { min, max }] of Object.entries(filters.numeric)) {
    if (min === null && max === null) continue;
    const v = toNumber(tree[field]);
    if (v === null) return false;
    if (min !== null && v < min) return false;
    if (max !== null && v > max) return false;
  }

  return true;
}

function rebuildHeatLayer() {
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }

  const radius = Math.max(5, Math.min(80, Number(el("radius").value) || 22));
  const blur = Math.max(0, Math.min(60, Number(el("blur").value) || 18));
  const maxZoom = Math.max(1, Math.min(20, Number(el("maxZoom").value) || 16));

  const points = [];
  const latlngs = [];

  for (const t of filteredTrees) {
    const lat = toNumber(t.lat);
    const lon = toNumber(t.lon);
    if (!isValidLatLon(lat, lon)) continue;

    points.push([lat, lon, 1]);
    latlngs.push([lat, lon]);
  }

  if (points.length === 0) {
    countPill.textContent = `0 / ${allTrees.length.toLocaleString()}`;
    window.__filteredBounds = null;
    return;
  }

  heatLayer = L.heatLayer(points, { radius, blur, maxZoom }).addTo(map);

  countPill.textContent = `${points.length.toLocaleString()} / ${allTrees.length.toLocaleString()}`;
  window.__filteredBounds = L.latLngBounds(latlngs);
}

function applyFiltersAndRender() {
  const filters = readFilters();
  filteredTrees = allTrees.filter((t) => passesFilters(t, filters));
  rebuildHeatLayer();
}

function resetAllFilters() {
  for (const field of CATEGORICAL_FIELDS) {
    const s = el(field);
    if (s) setAllSelected(s, false);
  }

  el("YearMin").value = "";
  el("YearMax").value = "";

  for (const field of NUMERIC_FIELDS) {
    const a = el(`${field}_min`);
    const b = el(`${field}_max`);
    if (a) a.value = "";
    if (b) b.value = "";
  }

  el("radius").value = 22;
  el("blur").value = 18;
  el("maxZoom").value = 16;

  applyFiltersAndRender();
}

function computeYearBounds(data) {
  let minY = Infinity,
    maxY = -Infinity,
    seen = 0;
  for (const t of data) {
    const y = inventoryYear(t);
    if (y === null) continue;
    seen++;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return seen ? { minY, maxY } : { minY: null, maxY: null };
}

async function loadTrees() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok)
      throw new Error(`Failed to fetch ${DATA_URL} (HTTP ${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data))
      throw new Error("Expected JSON array of tree objects.");

    const cleaned = [];
    const latlngs = [];
    for (const t of data) {
      const lat = toNumber(t.lat);
      const lon = toNumber(t.lon);
      if (!isValidLatLon(lat, lon)) continue;
      cleaned.push(t);
      latlngs.push([lat, lon]);
    }
    if (cleaned.length === 0)
      throw new Error("No valid points found (missing numeric lat/lon).");

    allTrees = cleaned;
    filteredTrees = cleaned;

    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });

    computeNumericStats(allTrees);
    buildNumericRangeControls();
    buildCategoricalControlsFromData(allTrees);

    const { minY, maxY } = computeYearBounds(allTrees);
    if (minY !== null) el("YearMin").placeholder = String(minY);
    if (maxY !== null) el("YearMax").placeholder = String(maxY);

    for (const field of CATEGORICAL_FIELDS) {
      const s = el(field);
      if (s) s.addEventListener("change", applyFiltersAndRender);
    }

    const debounced = debounce(applyFiltersAndRender, 150);

    for (const field of NUMERIC_FIELDS) {
      el(`${field}_min`)?.addEventListener("input", debounced);
      el(`${field}_max`)?.addEventListener("input", debounced);
    }
    el("YearMin").addEventListener("input", debounced);
    el("YearMax").addEventListener("input", debounced);

    el("radius").addEventListener("input", applyFiltersAndRender);
    el("blur").addEventListener("input", applyFiltersAndRender);
    el("maxZoom").addEventListener("input", applyFiltersAndRender);

    el("resetBtn").addEventListener("click", resetAllFilters);
    el("fitBtn").addEventListener("click", () => {
      if (window.__filteredBounds)
        map.fitBounds(window.__filteredBounds, { padding: [30, 30] });
    });

    countPill.textContent = `${allTrees.length.toLocaleString()} / ${allTrees.length.toLocaleString()}`;

    rebuildHeatLayer();
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="error">Error:</span> ${escapeHtml(
      err.message
    )}`;
  }
}

loadTrees();
