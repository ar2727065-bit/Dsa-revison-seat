// DSA Sheet — RisingBrain-style Interactive Engine
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  countDifficulties();
  restoreCheckboxes();
  restoreAccordionStates();
  updateAllProgress();
  updateAllNoteButtons();
  initAccordions();
  initNoteModal();
  initSearch();
  initDiffFilter();
});

// ============================================================
// DIFFICULTY COUNTERS
// ============================================================
function countDifficulties() {
  const easy = document.querySelectorAll('.question-row[data-difficulty="easy"]').length;
  const medium = document.querySelectorAll('.question-row[data-difficulty="medium"]').length;
  const hard = document.querySelectorAll('.question-row[data-difficulty="hard"]').length;

  const el = (id) => document.getElementById(id);
  if (el('cnt-easy')) el('cnt-easy').textContent = easy;
  if (el('cnt-medium')) el('cnt-medium').textContent = medium;
  if (el('cnt-hard')) el('cnt-hard').textContent = hard;
}

// ============================================================
// ACCORDION
// ============================================================
function initAccordions() {
  document.querySelectorAll('.pattern-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.closest('.pattern-accordion');
      acc.classList.toggle('open');
      const id = acc.id;
      const states = getLocalJSON('dsa_acc_states', {});
      states[id] = acc.classList.contains('open');
      setLocalJSON('dsa_acc_states', states);
    });
  });
}

function restoreAccordionStates() {
  const states = getLocalJSON('dsa_acc_states', {});
  document.querySelectorAll('.pattern-accordion').forEach(acc => {
    if (states[acc.id] === true) acc.classList.add('open');
  });
}

// ============================================================
// CHECKBOXES & PROGRESS
// ============================================================
function restoreCheckboxes() {
  const completed = getLocalJSON('dsa_completed', {});
  document.querySelectorAll('.q-checkbox').forEach(cb => {
    const slug = cb.dataset.slug;
    if (completed[slug]) {
      cb.checked = true;
      const row = cb.closest('.question-row');
      if (row) row.classList.add('completed');
    }
  });

  // Attach change listeners
  document.querySelectorAll('.q-checkbox').forEach(cb => {
    cb.addEventListener('change', onCheckboxChange);
  });
}

function onCheckboxChange(e) {
  const cb = e.currentTarget;
  const slug = cb.dataset.slug;
  const row = cb.closest('.question-row');
  const completed = getLocalJSON('dsa_completed', {});

  if (cb.checked) {
    completed[slug] = true;
    if (row) row.classList.add('completed');
  } else {
    delete completed[slug];
    if (row) row.classList.remove('completed');
  }

  setLocalJSON('dsa_completed', completed);
  updateAllProgress();
}

function updateAllProgress() {
  const completed = getLocalJSON('dsa_completed', {});
  const allSlugs = [...document.querySelectorAll('.q-checkbox')].map(cb => cb.dataset.slug);
  const totalAll = allSlugs.length;
  const doneAll = allSlugs.filter(s => completed[s]).length;

  // Sheet progress bar
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;
  setEl('sheet-done', doneAll);
  setEl('sheet-pct', pct + '%');
  setWidth('sheet-progress-fill', pct);

  // Donut
  const circumference = 175.93;
  setEl('donut-pct', pct + '%');
  setEl('donut-label', `${doneAll}/${totalAll}`);
  const circle = document.getElementById('donut-circle');
  if (circle) {
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  }

  // Difficulty rows
  ['easy', 'medium', 'hard'].forEach(diff => {
    const diffRows = document.querySelectorAll(`.question-row[data-difficulty="${diff}"] .q-checkbox`);
    const total = diffRows.length;
    const done = [...diffRows].filter(cb => completed[cb.dataset.slug]).length;
    const pctDiff = total > 0 ? Math.round((done / total) * 100) : 0;

    const progEl = document.getElementById(`${diff}-progress`);
    if (progEl) progEl.textContent = `${done}/${total} ${pctDiff}%`;
    setWidth(`${diff}-fill`, pctDiff);
  });

  // Per-accordion progress pills
  document.querySelectorAll('.pattern-accordion').forEach(acc => {
    const pill = acc.querySelector('.pattern-progress-pill');
    const checkboxes = acc.querySelectorAll('.q-checkbox');
    const total = checkboxes.length;
    const done = [...checkboxes].filter(cb => completed[cb.dataset.slug]).length;
    if (pill) pill.textContent = `${done}/${total}`;
  });
}

// ============================================================
// NOTE MODAL
// ============================================================
let activeNoteSlug = null;
let saveTimer = null;

function initNoteModal() {
  const modal = document.getElementById('note-modal');
  const closeBtn = document.getElementById('modal-close');
  const clearBtn = document.getElementById('modal-clear');
  const textarea = document.getElementById('note-textarea');

  // Open modal via event delegation
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.note-btn');
    if (!btn) return;
    const slug = btn.dataset.slug;
    const title = btn.dataset.title || slug;
    openModal(slug, title);
  });

  function openModal(slug, title) {
    activeNoteSlug = slug;
    setEl('modal-title', title);
    setEl('modal-slug', `dsa_note_${slug}`);
    textarea.value = localStorage.getItem(`dsa_note_${slug}`) || '';
    modal.classList.add('open');
    setTimeout(() => textarea.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove('open');
    activeNoteSlug = null;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  textarea.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!activeNoteSlug) return;
      const val = textarea.value.trim();
      if (val) {
        localStorage.setItem(`dsa_note_${activeNoteSlug}`, val);
      } else {
        localStorage.removeItem(`dsa_note_${activeNoteSlug}`);
      }
      updateNoteButton(activeNoteSlug);
    }, 350);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!activeNoteSlug) return;
      textarea.value = '';
      localStorage.removeItem(`dsa_note_${activeNoteSlug}`);
      updateNoteButton(activeNoteSlug);
    });
  }
}

function updateNoteButton(slug) {
  const hasNote = !!(localStorage.getItem(`dsa_note_${slug}`) || '').trim();
  document.querySelectorAll(`.note-btn[data-slug="${slug}"]`).forEach(btn => {
    btn.classList.toggle('note-active', hasNote);
    btn.title = hasNote ? 'View/Edit Note' : 'Add Note';
  });
}

function updateAllNoteButtons() {
  document.querySelectorAll('.note-btn').forEach(btn => {
    updateNoteButton(btn.dataset.slug);
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', applyFilters);
}

// ============================================================
// DIFFICULTY FILTER
// ============================================================
let currentDiff = 'all';

function initDiffFilter() {
  const filterBtn = document.getElementById('diff-filter-btn');
  const dropdown = document.getElementById('diff-dropdown');

  if (filterBtn) {
    filterBtn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', () => dropdown.classList.remove('open'));

  if (dropdown) {
    dropdown.querySelectorAll('.filter-option').forEach(opt => {
      opt.addEventListener('click', () => {
        currentDiff = opt.dataset.value;
        dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        filterBtn.classList.toggle('active', currentDiff !== 'all');
        dropdown.classList.remove('open');
        applyFilters();
      });
    });
  }
}

function applyFilters() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  document.querySelectorAll('.pattern-accordion').forEach(acc => {
    let accHasVisibleRow = false;

    acc.querySelectorAll('.question-row').forEach(row => {
      const titleEl = row.querySelector('.q-title');
      const title = (titleEl ? titleEl.textContent : '').toLowerCase();
      const diff = row.dataset.difficulty;

      const matchesDiff = currentDiff === 'all' || diff === currentDiff;
      const matchesQuery = !query || title.includes(query);

      const visible = matchesDiff && matchesQuery;
      row.classList.toggle('hidden', !visible);
      if (visible) accHasVisibleRow = true;
    });

    acc.classList.toggle('hidden', !accHasVisibleRow);
    if (query && accHasVisibleRow) acc.classList.add('open');
  });
}

// ============================================================
// HELPERS
// ============================================================
function getLocalJSON(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; }
  catch { return def; }
}

function setLocalJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${pct}%`;
}
