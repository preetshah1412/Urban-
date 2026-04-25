/* ===================================================================
   Urban Lens — Unified State Atom
   Single source-of-truth persisted in localStorage.
   Drives drone waypoints, city-map pins, and Kanban cards.
   =================================================================== */

const STORAGE_KEY = 'polis-nexus-state';

const defaultState = {
  issues: [
    { id: 1, title: 'Subterranean Network Breach', category: 'infrastructure', status: 'new', votes: 85, x: 10, z: 20 },
    { id: 2, title: 'Bio-Waste Leakage', category: 'sanitation', status: 'in-progress', votes: 34, x: -15, z: 5 },
    { id: 3, title: 'Rogue Drone Activity', category: 'safety', status: 'resolved', votes: 210, x: 25, z: -10 },
    { id: 4, title: 'Hydroponic Array Failure', category: 'greenery', status: 'new', votes: 45, x: -25, z: -25 },
  ],
  droneWaypoints: [
    { x: 0, y: 8, z: 30 },   // Start — high above, facing camera
    { x: -5, y: 4, z: 10 },  // Mid dive
    { x: 0, y: 2, z: 0 },    // Low pass over city
  ],
};

// --- Listeners ---
let listeners = [];

function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  listeners.forEach(fn => fn(getState()));
}

// --- CRUD ---
export function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt — reset */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  return { ...defaultState };
}

export function setState(updater) {
  const prev = getState();
  const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notify();
  return next;
}

export function addIssue(issue) {
  return setState(s => ({
    ...s,
    issues: [...s.issues, { ...issue, id: Date.now(), votes: 1, status: 'new' }],
  }));
}

export function upvoteIssue(id) {
  return setState(s => ({
    ...s,
    issues: s.issues.map(i => i.id === id ? { ...i, votes: i.votes + 1 } : i),
  }));
}

export function moveIssue(id, newStatus) {
  return setState(s => ({
    ...s,
    issues: s.issues.map(i => i.id === id ? { ...i, status: newStatus } : i),
  }));
}

export function usePolisState() {
  // Simple hook-like getter for non-React callers
  return getState();
}

export { subscribe, STORAGE_KEY };

export const COLOR_MAP = {
  infrastructure: '#00d2ff',
  sanitation: '#ffde00',
  safety: '#ff2a2a',
  greenery: '#00ff66',
};

export const COLOR_HEX = {
  infrastructure: 0x00d2ff,
  sanitation: 0xffde00,
  safety: 0xff2a2a,
  greenery: 0x00ff66,
};
