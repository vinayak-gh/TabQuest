const clickSound = new Audio('click.mp3');

function playSound() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

const themeToggle = document.getElementById('themeToggle');
const modeText = document.getElementById('modeText');

function updateThemeUI(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    modeText.innerText = theme.toUpperCase();
}

chrome.storage.local.get('theme', (res) => {
    if (res.theme) updateThemeUI(res.theme);
});

themeToggle.addEventListener('click', () => {
    playSound();
    let current = document.documentElement.getAttribute('data-theme');
    let target = current === 'dark' ? 'light' : 'dark';
    updateThemeUI(target);
    chrome.storage.local.set({ theme: target });
});

function render() {
    const filter = document.getElementById('searchBox').value.toLowerCase();
    const taskList = document.getElementById('taskList');
    const historyList = document.getElementById('historyList');

    chrome.storage.local.get(null, (items) => {
        taskList.innerHTML = "";
        historyList.innerHTML = "";
        let active = 0, tabs = 0;

        Object.keys(items).forEach(key => {
            const task = items[key];
            if (!task.links || key === 'history' || key === 'theme') return;

            active++;
            tabs += task.links.length;

            if (filter && !task.name.toLowerCase().includes(filter)) return;

            const el = document.createElement('div');
            el.className = 'mission-card';
            el.innerHTML = `
                <span class="mission-name">${task.name}</span>
                <div class="mission-meta">📦 ${task.links.length} Tabs Saved</div>
                <div class="btn-group">
                    <button class="btn-sm btn-resume" data-id="${key}">Resume</button>
                    <button class="btn-sm btn-abort" data-id="${key}">Abort</button>
                </div>
            `;
            taskList.appendChild(el);
        });

        // Updated History Rendering with Individual Delete Buttons
        (items.history || []).slice(-10).reverse().forEach((h, index) => {
            const hEl = document.createElement('div');
            hEl.className = 'history-item';
            hEl.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight:700;">✅ ${h.name}</span>
                    <span style="font-size:8px; color:var(--text-muted);">${new Date(h.completedAt).toLocaleDateString()}</span>
                </div>
                <button class="btn-delete-hist" data-histname="${h.name}" data-time="${h.completedAt}">×</button>
            `;
            historyList.appendChild(hEl);
        });

        document.getElementById('activeCount').innerText = active;
        document.getElementById('tabCount').innerText = tabs;
    });
}

document.getElementById('saveBtn').addEventListener('click', () => {
    const name = document.getElementById('taskName').value.trim();
    const hrs = parseInt(document.getElementById('deadlineHours').value) || 0;
    const mins = parseInt(document.getElementById('deadlineMins').value) || 0;
    const totalMinutes = (hrs * 60) + mins;

    if (!name) {
        alert("Please name your mission!");
        return;
    }

    if (totalMinutes < 1) {
        alert("Mission must be at least 1 minute long.");
        return;
    }

    playSound();
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const data = {
            name,
            links: tabs.map(t => ({ url: t.url })),
            deadline: Date.now() + (totalMinutes * 60000)
        };

        chrome.storage.local.set({ [name]: data }, () => {
            chrome.alarms.create(name, { delayInMinutes: totalMinutes });
            chrome.tabs.remove(tabs.map(t => t.id));
            document.getElementById('taskName').value = "";
            render();
        });
    });
});

document.addEventListener('click', (e) => {
    const id = e.target.dataset.id;

    // Clear All History
    if (e.target.id === 'clearHistory') {
        chrome.storage.local.set({ history: [] }, render);
        return;
    }

    // Individual History Delete Logic
    if (e.target.classList.contains('btn-delete-hist')) {
        const nameToDelete = e.target.dataset.histname;
        const timeToDelete = parseInt(e.target.dataset.time);

        chrome.storage.local.get('history', (res) => {
            let history = res.history || [];
            // Filter out the specific entry matching both name and timestamp
            const updatedHistory = history.filter(item =>
                !(item.name === nameToDelete && item.completedAt === timeToDelete)
            );
            chrome.storage.local.set({ history: updatedHistory }, render);
        });
        return;
    }

    if (!id) return;

    // Active Mission Buttons
    if (e.target.classList.contains('btn-resume')) {
        playSound();
        chrome.storage.local.get([id, 'history'], (res) => {
            if(res[id]) {
                res[id].links.forEach(l => chrome.tabs.create({ url: l.url }));
                chrome.alarms.clear(id);
                let history = res.history || [];
                history.push({ name: id, completedAt: Date.now() });
                chrome.storage.local.set({ history }, () => {
                    chrome.storage.local.remove(id, render);
                });
            }
        });
    } else if (e.target.classList.contains('btn-abort')) {
        chrome.alarms.clear(id);
        chrome.storage.local.remove(id, render);
    }
});

document.getElementById('searchBox').addEventListener('input', render);
render();