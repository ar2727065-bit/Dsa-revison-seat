// DSA Revision Roadmap Interactive Engine

document.addEventListener('DOMContentLoaded', () => {
  initSections();
  initNotesModal();
  initCheckboxes();
  initProgress();
  initSearch();
});

// --- Section Expand / Collapse ---
function initSections() {
  const sections = document.querySelectorAll('.pattern-section-card');
  const storedStates = JSON.parse(localStorage.getItem('dsa_section_states') || '{}');

  sections.forEach(section => {
    const sectionId = section.getAttribute('id');
    const header = section.querySelector('.pattern-header');
    
    // Restore state from localStorage if available
    if (sectionId && storedStates[sectionId] !== undefined) {
      if (storedStates[sectionId]) {
        section.classList.remove('is-collapsed');
      } else {
        section.classList.add('is-collapsed');
      }
    }

    if (header) {
      header.addEventListener('click', (e) => {
        // Prevent toggle if clicking directly on a link or button inside header
        if (e.target.closest('a')) return;
        
        section.classList.toggle('is-collapsed');
        
        // Save state
        if (sectionId) {
          const states = JSON.parse(localStorage.getItem('dsa_section_states') || '{}');
          states[sectionId] = !section.classList.contains('is-collapsed');
          localStorage.setItem('dsa_section_states', JSON.stringify(states));
        }

        updateToggleBtnText(section);
      });
      updateToggleBtnText(section);
    }
  });

  const expandAllBtn = document.getElementById('expand-all-btn');
  const collapseAllBtn = document.getElementById('collapse-all-btn');

  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pattern-section-card').forEach(s => {
        s.classList.remove('is-collapsed');
        updateToggleBtnText(s);
      });
      saveAllSectionStates(true);
    });
  }

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pattern-section-card').forEach(s => {
        s.classList.add('is-collapsed');
        updateToggleBtnText(s);
      });
      saveAllSectionStates(false);
    });
  }
}

function updateToggleBtnText(section) {
  const btnText = section.querySelector('.toggle-section-btn .toggle-text');
  if (btnText) {
    btnText.textContent = section.classList.contains('is-collapsed') ? 'Open Section' : 'Close Section';
  }
}

function saveAllSectionStates(isOpen) {
  const states = {};
  document.querySelectorAll('.pattern-section-card').forEach(s => {
    const id = s.getAttribute('id');
    if (id) states[id] = isOpen;
  });
  localStorage.setItem('dsa_section_states', JSON.stringify(states));
}

// --- Note Modal & LocalStorage ---
let activeNoteSlug = null;
let saveTimeout = null;

function initNotesModal() {
  const modalOverlay = document.getElementById('note-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const textarea = document.getElementById('note-textarea');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const clearBtn = document.getElementById('modal-clear-btn');
  const saveStatus = document.getElementById('save-status');

  // Attach click handlers to all note buttons
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.note-btn');
    if (btn) {
      const slug = btn.getAttribute('data-slug');
      const title = btn.getAttribute('data-title') || 'Question Note';
      openNoteModal(slug, title);
    }
  });

  function openNoteModal(slug, title) {
    activeNoteSlug = slug;
    modalTitle.textContent = `📝 Notes: ${title}`;
    modalSubtitle.textContent = `Saved in Browser Memory (localStorage: dsa_note_${slug})`;
    
    // Load existing note
    const existingNote = localStorage.getItem(`dsa_note_${slug}`) || '';
    textarea.value = existingNote;
    saveStatus.textContent = existingNote ? 'Loaded saved note' : 'Auto-saves as you type...';

    modalOverlay.classList.add('is-active');
    setTimeout(() => textarea.focus(), 100);
  }

  function closeNoteModal() {
    modalOverlay.classList.remove('is-active');
    activeNoteSlug = null;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeNoteModal);
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeNoteModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('is-active')) {
      closeNoteModal();
    }
  });

  // Auto-save on textarea input
  textarea.addEventListener('input', () => {
    if (!activeNoteSlug) return;
    saveStatus.textContent = 'Saving...';
    clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(() => {
      const val = textarea.value.trim();
      if (val) {
        localStorage.setItem(`dsa_note_${activeNoteSlug}`, val);
        saveStatus.textContent = '✓ Saved to browser memory';
      } else {
        localStorage.removeItem(`dsa_note_${activeNoteSlug}`);
        saveStatus.textContent = 'Note cleared';
      }
      updateNoteButtonState(activeNoteSlug);
      updateStatsCounters();
    }, 300);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!activeNoteSlug) return;
      textarea.value = '';
      localStorage.removeItem(`dsa_note_${activeNoteSlug}`);
      saveStatus.textContent = 'Note cleared';
      updateNoteButtonState(activeNoteSlug);
      updateStatsCounters();
    });
  }

  // Initial update of all note buttons
  updateAllNoteButtons();
}

function updateNoteButtonState(slug) {
  const note = localStorage.getItem(`dsa_note_${slug}`);
  document.querySelectorAll(`.note-btn[data-slug="${slug}"]`).forEach(btn => {
    if (note && note.trim().length > 0) {
      btn.classList.add('has-note');
      btn.innerHTML = '📝 Note ✨';
    } else {
      btn.classList.remove('has-note');
      btn.innerHTML = '📝 Note';
    }
  });
}

function updateAllNoteButtons() {
  document.querySelectorAll('.note-btn').forEach(btn => {
    const slug = btn.getAttribute('data-slug');
    if (slug) updateNoteButtonState(slug);
  });
}

// --- Checkboxes & Progress ---
function initCheckboxes() {
  const completed = JSON.parse(localStorage.getItem('dsa_completed_slugs') || '{}');

  document.body.addEventListener('change', (e) => {
    if (e.target.classList.contains('question-checkbox')) {
      const slug = e.target.getAttribute('data-slug');
      const isChecked = e.target.checked;

      if (slug) {
        if (isChecked) {
          completed[slug] = true;
        } else {
          delete completed[slug];
        }

        // Sync all checkboxes with the same data-slug across the page
        document.querySelectorAll(`.question-checkbox[data-slug="${slug}"]`).forEach(cb => {
          cb.checked = isChecked;
          const item = cb.closest('.question-item');
          if (item) {
            if (isChecked) item.classList.add('is-completed');
            else item.classList.remove('is-completed');
          }
        });

        localStorage.setItem('dsa_completed_slugs', JSON.stringify(completed));
      } else {
        const item = e.target.closest('.question-item');
        if (item) {
          if (isChecked) item.classList.add('is-completed');
          else item.classList.remove('is-completed');
        }
      }

      updateProgress();
    }
  });

  // Restore checkbox states
  document.querySelectorAll('.question-checkbox').forEach(cb => {
    const slug = cb.getAttribute('data-slug');
    if (slug && completed[slug]) {
      cb.checked = true;
      const item = cb.closest('.question-item');
      if (item) item.classList.add('is-completed');
    }
  });
}

function initProgress() {
  updateProgress();
  updateStatsCounters();
}

function updateProgress() {
  const completed = JSON.parse(localStorage.getItem('dsa_completed_slugs') || '{}');
  const completedCount = Object.keys(completed).length;
  
  // Count unique problem slugs to get true total questions count (197)
  const uniqueSlugs = new Set();
  document.querySelectorAll('.question-checkbox[data-slug]').forEach(cb => {
    const slug = cb.getAttribute('data-slug');
    if (slug) uniqueSlugs.add(slug);
  });
  const totalQuestions = uniqueSlugs.size > 0 ? uniqueSlugs.size : 197;

  const countEl = document.getElementById('completed-count');
  const totalEl = document.getElementById('total-count');
  const fillEl = document.getElementById('progress-bar-fill');

  if (countEl) countEl.textContent = completedCount;
  if (totalEl) totalEl.textContent = totalQuestions;

  if (fillEl && totalQuestions > 0) {
    const pct = Math.round((completedCount / totalQuestions) * 100);
    fillEl.style.width = `${pct}%`;
  }
}

function updateStatsCounters() {
  let notesCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('dsa_note_')) {
      notesCount++;
    }
  }
  const notesEl = document.getElementById('notes-saved-count');
  if (notesEl) notesEl.textContent = notesCount;
}

// --- Realtime Search Filter ---
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    document.querySelectorAll('.pattern-section-card').forEach(section => {
      let hasMatch = false;

      // Check section title
      const titleEl = section.querySelector('.pattern-header h2, .pattern-header h3');
      const titleText = titleEl ? titleEl.textContent.toLowerCase() : '';

      if (query === '' || titleText.includes(query)) {
        hasMatch = true;
      }

      // Check questions inside section
      section.querySelectorAll('.question-item').forEach(item => {
        const itemText = item.textContent.toLowerCase();
        if (query === '' || itemText.includes(query)) {
          item.style.display = 'flex';
          hasMatch = true;
        } else {
          item.style.display = 'none';
        }
      });

      if (hasMatch) {
        section.style.display = 'block';
        if (query !== '') {
          section.classList.remove('is-collapsed');
        }
      } else {
        section.style.display = 'none';
      }
    });
  });
}
