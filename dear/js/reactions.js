const KEY = "dear-super-dad-reactions-v1";

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (err) {
    return {};
  }
}

function save(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch (err) {
    /* ignore quota / private mode */
  }
}

export function isOn(id, key) {
  const list = load()[id];
  return Array.isArray(list) && list.includes(key);
}

export function displayCount(entry, key) {
  const base = Number(entry.reactions?.[key]) || 0;
  return base + (isOn(entry.id, key) ? 1 : 0);
}

export function toggleReaction(id, key) {
  const map = load();
  const list = Array.isArray(map[id]) ? map[id].slice() : [];
  const index = list.indexOf(key);
  let on;
  if (index >= 0) {
    list.splice(index, 1);
    on = false;
  } else {
    list.push(key);
    on = true;
  }
  if (list.length) map[id] = list;
  else delete map[id];
  save(map);
  return on;
}
