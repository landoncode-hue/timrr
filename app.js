// timrr – Optimized Advanced Monochromatic App Logic

// State Management
let timers = JSON.parse(localStorage.getItem('timers')) || [];

// Ensure Default timer exists
if (!timers.find(t => t.id === 'default-5m')) {
    timers.unshift({ id: 'default-5m', title: 'Default', duration: 300, remaining: 300, isRunning: false, isPermanent: true });
}

let activeTimerId = timers[0]?.id || null;
let isEditing = false;

// DOM Elements
const focusArea = document.getElementById('focus-area');
const timersContainer = document.getElementById('timers-container');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const addBtn = document.getElementById('add-btn');
const themeToggle = document.getElementById('theme-toggle');
const modalOverlay = document.getElementById('modal-overlay');
const helpOverlay = document.getElementById('help-overlay');
const addTimerForm = document.getElementById('add-timer-form');
const cancelBtn = document.getElementById('cancel-btn');
const helpToggle = document.getElementById('help-toggle');
const helpCloseBtn = document.getElementById('help-close-btn');

// Web Audio API for subtle chime
let audioCtx;
function playChime() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Theme Management
let theme = localStorage.getItem('theme') || 'system';
applyTheme(theme);

function applyTheme(t) {
    if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', t);
    }
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', document.body.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }
}

themeToggle.addEventListener('click', () => {
    theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    applyTheme(theme);
});

// Sidebar Management
menuToggle.addEventListener('click', () => {
    sidebar.classList.remove('hidden');
    sidebarOverlay.classList.remove('hidden');
    renderSidebar(); // Refresh sidebar content when opening
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    sidebarOverlay.classList.add('hidden');
});

// Logic
function saveTimers() {
    localStorage.setItem('timers', JSON.stringify(timers));
}

function render() {
    renderFocusShell();
    renderSidebar();
}

/**
 * Renders the static shell of the focus area.
 * Elements that update frequently (tick) are given IDs for direct access.
 */
function renderFocusShell() {
    const timer = timers.find(t => t.id === activeTimerId) || timers[0];
    if (!timer) {
        focusArea.innerHTML = '<div class="empty-state">No active timers</div>';
        return;
    }

    focusArea.innerHTML = `
        <div id="focus-timer-container" class="focus-timer">
            <div id="display-container" class="focus-display" onclick="startEditing()">
                <span id="timer-readout"></span>
            </div>
            <div class="focus-controls">
                <div class="control-buttons">
                    <button id="toggle-btn" class="focus-btn" onclick="toggleTimer('${timer.id}')"></button>
                    <button class="focus-btn" onclick="resetTimer('${timer.id}')">RESET</button>
                </div>
                <div class="add-time-group">
                    <button class="add-time-btn" onclick="addTime(1)">+1m</button>
                    <button class="add-time-btn" onclick="addTime(5)">+5m</button>
                </div>
            </div>
        </div>
        <div class="focus-progress-container">
            <div id="focus-progress-bar" class="focus-progress-bar"></div>
        </div>
    `;
    updateFocusUI();
}

/**
 * Surgical updates for the focus UI elements.
 */
function updateFocusUI() {
    const timer = timers.find(t => t.id === activeTimerId) || timers[0];
    if (!timer) return;

    // 1. Update Readout (unless editing)
    const readout = document.getElementById('timer-readout');
    if (readout && !isEditing) {
        readout.textContent = formatTime(timer.remaining);
    }

    // 2. Update Progress Bar
    const progressBar = document.getElementById('focus-progress-bar');
    if (progressBar) {
        const progress = (timer.remaining / timer.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // 3. Update Toggle Button Text
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
        toggleBtn.textContent = timer.isRunning ? 'PAUSE' : 'START';
    }

    // 4. Update Container States (Completion/Finished)
    const container = document.getElementById('focus-timer-container');
    if (container) {
        const isNearCompletion = timer.remaining <= 10 && timer.remaining > 0;
        const isFinished = timer.remaining === 0;
        container.classList.toggle('near-completion', isNearCompletion);
        container.classList.toggle('finished', isFinished);
    }

    // 5. Update Document Title (Tab Title)
    if (timer.isRunning && !isEditing) {
        document.title = `${formatTime(timer.remaining)} | timrr`;
    } else {
        document.title = 'timrr – Minimalist Timer';
    }
}

function renderSidebar() {
    timersContainer.innerHTML = '';
    timers.forEach(timer => {
        const div = document.createElement('div');
        div.className = `timer-card ${timer.id === activeTimerId ? 'active' : ''}`;
        div.setAttribute('data-id', timer.id);
        div.innerHTML = `
            <div onclick="setActive('${timer.id}')">
                <strong>${timer.title}</strong>
                <div>${formatTime(timer.remaining)}</div>
            </div>
            <button class="icon-btn" onclick="deleteTimer(event, '${timer.id}')" style="margin-top: 0.5rem">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        timersContainer.appendChild(div);
    });

    // Handle Deletion logic for permanent timers
    document.querySelectorAll('.timer-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const timer = timers.find(t => t.id === id);
        if (timer && timer.isPermanent) {
            const delBtn = card.querySelector('.icon-btn');
            if (delBtn) delBtn.style.display = 'none';
        }
    });

    lucide.createIcons();
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [
        h > 0 ? h.toString().padStart(2, '0') : null,
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].filter(x => x !== null);
    if (parts.length === 1) parts.unshift('00');
    return parts.join(':');
}

function parseTime(str) {
    const parts = str.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return parts[0] || 0;
}

window.startEditing = () => {
    if (isEditing) return;
    const timer = timers.find(t => t.id === activeTimerId);
    if (timer && timer.isRunning) timer.isRunning = false;
    isEditing = true;

    const container = document.getElementById('display-container');
    if (container) {
        container.classList.add('editing');
        const currentValue = formatTime(timer.remaining);
        container.innerHTML = `<input type="text" class="edit-input" id="time-edit" value="${currentValue}" autofocus onblur="stopEditing()" onkeydown="handleEditKey(event)">`;
        const input = document.getElementById('time-edit');
        input.focus();
        input.setSelectionRange(0, input.value.length);
    }
};

window.stopEditing = () => {
    if (!isEditing) return;
    const input = document.getElementById('time-edit');
    const timer = timers.find(t => t.id === activeTimerId);
    if (input && timer) {
        const newSeconds = parseTime(input.value);
        timer.remaining = newSeconds;
        timer.duration = Math.max(timer.duration, newSeconds);

        // Customization: If it's the default timer, make the new duration the permanent default
        if (timer.id === 'default-5m') {
            timer.duration = newSeconds;
        }

        saveTimers();
    }
    isEditing = false;

    // Restore shell readout
    const container = document.getElementById('display-container');
    if (container) {
        container.classList.remove('editing');
        container.innerHTML = `<span id="timer-readout"></span>`;
    }
    updateFocusUI();
};

window.handleEditKey = (e) => {
    if (e.key === 'Enter') stopEditing();
    if (e.key === 'Escape') {
        isEditing = false;
        const container = document.getElementById('display-container');
        if (container) {
            container.classList.remove('editing');
            container.innerHTML = `<span id="timer-readout"></span>`;
        }
        updateFocusUI();
    }
};

window.addTime = (mins) => {
    const timer = timers.find(t => t.id === activeTimerId);
    if (timer) {
        timer.remaining += mins * 60;
        timer.duration = Math.max(timer.duration, timer.remaining);
        saveTimers();
        updateFocusUI();
        if (!sidebar.classList.contains('hidden')) renderSidebar();
    }
};

window.setActive = (id) => {
    activeTimerId = id;
    isEditing = false;
    render();
    sidebar.classList.add('hidden');
    sidebarOverlay.classList.add('hidden');
};

window.toggleTimer = (id) => {
    const timer = timers.find(t => t.id === id);
    if (timer) {
        timer.isRunning = !timer.isRunning;
        saveTimers();
        updateFocusUI();
    }
};

window.resetTimer = (id) => {
    const timer = timers.find(t => t.id === id);
    if (timer) {
        timer.remaining = timer.duration;
        timer.isRunning = false;
        saveTimers();
        updateFocusUI();
    }
};

window.deleteTimer = (e, id) => {
    if (e) e.stopPropagation();
    const timer = timers.find(t => t.id === id);
    if (timer && timer.isPermanent) return; // Prevent deletion of default timer

    timers = timers.filter(t => t.id !== id);
    if (activeTimerId === id) activeTimerId = timers[0]?.id || null;
    saveTimers();
    render();
};

// Global Tick
setInterval(() => {
    let changed = false;
    let finishedTimerId = null;

    timers.forEach(timer => {
        if (timer.isRunning && timer.remaining > 0) {
            timer.remaining--;
            if (timer.remaining === 0) {
                timer.isRunning = false;
                finishedTimerId = timer.id;
                playChime(); // Play subtle audio cue
            }
            changed = true;
        }
    });

    if (finishedTimerId) {
        // Auto-transition to next timer
        const currentIndex = timers.findIndex(t => t.id === finishedTimerId);
        const nextTimer = timers[currentIndex + 1];
        if (nextTimer) {
            activeTimerId = nextTimer.id;
            nextTimer.isRunning = true;
            changed = true;
            render(); // Transition is a shell change
            return;
        }
    }

    if (changed) {
        updateFocusUI();
        if (!sidebar.classList.contains('hidden')) renderSidebar();
    }
}, 1000);

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    // Ignore shortcuts if the user is typing in an input or textarea
    const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
    const key = e.key.toLowerCase();

    // ESC is always active to close things
    if (e.key === 'Escape') {
        if (!modalOverlay.classList.contains('hidden')) {
            modalOverlay.classList.add('hidden');
        } else if (!helpOverlay.classList.contains('hidden')) {
            helpOverlay.classList.add('hidden');
        } else if (!sidebar.classList.contains('hidden')) {
            sidebar.classList.add('hidden');
            sidebarOverlay.classList.add('hidden');
        } else if (isEditing) {
            stopEditing();
        }
        return;
    }

    if (isTyping) return;

    if (e.code === 'Space') {
        e.preventDefault();
        if (activeTimerId) toggleTimer(activeTimerId);
    } else if (key === 'r') {
        if (activeTimerId) resetTimer(activeTimerId);
    } else if (key === 'm') {
        sidebar.classList.toggle('hidden');
        sidebarOverlay.classList.toggle('hidden');
        if (!sidebar.classList.contains('hidden')) renderSidebar();
    } else if (key === 'a') {
        modalOverlay.classList.remove('hidden');
        document.getElementById('title').focus();
    } else if (key === '?') {
        helpOverlay.classList.toggle('hidden');
    }
});

// Help Modal
if (helpToggle) {
    helpToggle.addEventListener('click', () => helpOverlay.classList.remove('hidden'));
}
if (helpCloseBtn) {
    helpCloseBtn.addEventListener('click', () => helpOverlay.classList.add('hidden'));
}

// Modal
addBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
    document.getElementById('title').focus();
});
cancelBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));

addTimerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const h = parseInt(document.getElementById('hours').value) || 0;
    const m = parseInt(document.getElementById('minutes').value) || 0;
    const s = parseInt(document.getElementById('seconds').value) || 0;

    const duration = (h * 3600) + (m * 60) + s;
    if (duration > 0) {
        const newId = Date.now().toString();
        timers.push({
            id: newId,
            title,
            duration,
            remaining: duration,
            isRunning: false
        });
        if (!activeTimerId) activeTimerId = newId;
        saveTimers();
        render();
        addTimerForm.reset();
        modalOverlay.classList.add('hidden');
        sidebar.classList.add('hidden');
        sidebarOverlay.classList.add('hidden');
    }
});

// Initial Render
render();
