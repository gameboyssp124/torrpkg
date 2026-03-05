const API_BASE = "http://YOUR_PS4_IP:8080/api"; 

// Required specific endpoints
const ENDPOINTS = {
    GET_TORRENTS: `${API_BASE}/torrents`,
    ADD_MAGNET: `${API_BASE}/torrents/add-magnet`,
    UPLOAD_FILE: `${API_BASE}/torrents/upload`,
    PAUSE: (id) => `${API_BASE}/torrents/${id}/pause`,
    RESUME: (id) => `${API_BASE}/torrents/${id}/resume`,
    DELETE: (id) => `${API_BASE}/torrents/${id}`,
    GET_SETTINGS: `${API_BASE}/settings`,
    POST_SETTINGS: `${API_BASE}/settings`
};

let currentTorrents = [];
let activeSidebarFilter = "All";
let selectedTorrentId = null;

// --- Init & Polling ---
window.onload = async () => {
    fetchSettings();
    setInterval(fetchPS4Data, 2000);
};

// --- View / Modal Logic ---
function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = "none"); }

document.getElementById('btnOpenAddModal').addEventListener('click', () => openModal('addModal'));
document.getElementById('btnOpenSettings').addEventListener('click', () => openModal('settingsModal'));

function switchBottomTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.bottom-pane .tab-pane').forEach(pane => pane.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-sidebar li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.settings-content .settings-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// --- Dynamic Settings UI Logic ---
function toggleProxyFields() {
    const type = document.getElementById('proxyType').value;
    const div = document.getElementById('proxySettings');
    if (type === 'socks5') div.classList.remove('hidden');
    else div.classList.add('hidden');
}

function toggleVpnFields() {
    const type = document.getElementById('vpnType').value;
    document.getElementById('vpnOpenVpn').classList.add('hidden');
    document.getElementById('vpnWireguard').classList.add('hidden');
    if (type === 'openvpn') document.getElementById('vpnOpenVpn').classList.remove('hidden');
    else if (type === 'wireguard') document.getElementById('vpnWireguard').classList.remove('hidden');
}

// --- Action Buttons (Pause/Resume/Delete) ---
document.getElementById('btnPause').addEventListener('click', async () => {
    if (!selectedTorrentId) return alert("Select a torrent first.");
    await fetch(ENDPOINTS.PAUSE(selectedTorrentId), { method: 'POST' });
    fetchPS4Data();
});

document.getElementById('btnResume').addEventListener('click', async () => {
    if (!selectedTorrentId) return alert("Select a torrent first.");
    await fetch(ENDPOINTS.RESUME(selectedTorrentId), { method: 'POST' });
    fetchPS4Data();
});

document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!selectedTorrentId) return alert("Select a torrent first.");
    if (confirm("Are you sure you want to delete this torrent?")) {
        await fetch(ENDPOINTS.DELETE(selectedTorrentId), { method: 'DELETE' });
        selectedTorrentId = null;
        fetchPS4Data();
    }
});

// --- Add Torrent (Split Magnet / Upload Endpoints) ---
async function submitTorrent() {
    const magnet = document.getElementById('magnetInput').value;
    const file = document.getElementById('fileInput').files[0];
    const savePath = document.getElementById('savePathInput').value; 
    
    const formData = new FormData();
    formData.append('savePath', savePath);

    try {
        if (magnet) {
            formData.append('magnet', magnet);
            await fetch(ENDPOINTS.ADD_MAGNET, { method: 'POST', body: formData });
        } else if (file) {
            formData.append('torrentFile', file);
            await fetch(ENDPOINTS.UPLOAD_FILE, { method: 'POST', body: formData });
        } else {
            return alert("Provide a magnet link or .torrent file.");
        }
        
        closeModals();
        alert("Torrent successfully sent to PS4!");
        fetchPS4Data(); 
    } catch (err) {
        alert("Failed to communicate with PS4 Backend. Ensure it is running.");
    }
}

// --- Settings Load & Save ---
async function fetchSettings() {
    try {
        const res = await fetch(ENDPOINTS.GET_SETTINGS);
        const s = await res.json();
        // Here you would map the fetched JSON to the UI elements.
        // Example: document.getElementById('setDefSavePath').value = s.defaultSavePath;
    } catch (err) { console.warn("Could not fetch settings. UI will use defaults."); }
}

async function saveSettings() {
    const formData = new FormData();
    
    // Downloads Data
    formData.append('defaultSavePath', document.getElementById('setDefSavePath').value);
    formData.append('preallocate', document.getElementById('setPrealloc').checked);
    
    // Connection Data
    formData.append('listenPort', document.getElementById('listenPort').value);
    formData.append('upnp', document.getElementById('setUpnp').checked);
    
    // Proxy Data
    formData.append('proxyType', document.getElementById('proxyType').value);
    if(document.getElementById('proxyType').value === 'socks5') {
        formData.append('proxyHost', document.getElementById('proxyHost').value);
        formData.append('proxyPort', document.getElementById('proxyPort').value);
        formData.append('proxyUser', document.getElementById('proxyUser').value);
        formData.append('proxyPass', document.getElementById('proxyPass').value);
        formData.append('proxyPeers', document.getElementById('proxyPeers').checked);
        formData.append('proxyTrackers', document.getElementById('proxyTrackers').checked);
    }

    // VPN File Uploads
    const vpnType = document.getElementById('vpnType').value;
    formData.append('vpnType', vpnType);
    if (vpnType === 'openvpn') {
        const fileOvpn = document.getElementById('fileOvpn').files[0];
        if (fileOvpn) formData.append('ovpnFile', fileOvpn);
        formData.append('ovpnUser', document.getElementById('ovpnUser').value);
        formData.append('ovpnPass', document.getElementById('ovpnPass').value);
    } else if (vpnType === 'wireguard') {
        const fileWg = document.getElementById('fileWg').files[0];
        if (fileWg) formData.append('wgFile', fileWg);
    }

    // BitTorrent Leak Prevent Data
    formData.append('dht', document.getElementById('setDht').checked);
    formData.append('pex', document.getElementById('setPeX').checked);
    formData.append('lpd', document.getElementById('setLpd').checked);
    formData.append('encryption', document.getElementById('setEncryption').value);

    // Web UI
    formData.append('uiPort', document.getElementById('setUiPort').value);
    formData.append('uiUser', document.getElementById('setUiUser').value);
    formData.append('uiPass', document.getElementById('setUiPass').value);

    try {
        // Send ALL settings and files to the POST /api/settings endpoint
        await fetch(ENDPOINTS.POST_SETTINGS, { method: 'POST', body: formData });
        alert("Settings and VPN Configurations applied and saved to PS4!");
        closeModals();
    } catch (err) {
        alert("Failed to save settings to PS4.");
    }
}

// --- Render Table & Filters ---
document.querySelectorAll('.sidebar li').forEach(li => {
    li.addEventListener('click', (e) => {
        let targetLi = e.target.closest('li');
        document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
        targetLi.classList.add('active');
        activeSidebarFilter = targetLi.getAttribute('data-filter');
        renderTable(); 
    });
});

function renderTable() {
    const tbody = document.getElementById('torrentListBody');
    tbody.innerHTML = '';
    
    const filtered = currentTorrents.filter(t => {
        if (activeSidebarFilter === "All") return true;
        return t.status.toLowerCase() === activeSidebarFilter.toLowerCase();
    });

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        // Apply styling if this row is selected
        if (t.id === selectedTorrentId) tr.classList.add('selected');

        tr.innerHTML = `
            <td>${t.name}</td><td>${t.size}</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${t.progress}%"></div>
                    <span class="progress-text">${t.progress}%</span>
                </div>
            </td>
            <td>${t.status}</td><td>${t.seeds}</td><td>${t.peers}</td>
            <td>${t.downSpeed}</td><td>${t.upSpeed}</td>
        `;

        // Click row to select
        tr.addEventListener('click', () => {
            selectedTorrentId = t.id;
            renderTable(); // Re-render to show selection highlight
        });

        tbody.appendChild(tr);
    });
}

function updateSidebarCounts() {
    let dl = 0, sd = 0, cp = 0, pa = 0;
    currentTorrents.forEach(t => {
        const s = t.status.toLowerCase();
        if (s === "downloading" || s === "fetching metadata") dl++;
        if (s === "seeding") sd++;
        if (s === "completed") cp++;
        if (s === "paused") pa++;
    });

    document.getElementById('count-all').innerText = `(${currentTorrents.length})`;
    document.getElementById('count-dl').innerText = `(${dl})`;
    document.getElementById('count-sd').innerText = `(${sd})`;
    document.getElementById('count-cp').innerText = `(${cp})`;
    document.getElementById('count-pa').innerText = `(${pa})`;
}

async function fetchPS4Data() {
    try {
        const res = await fetch(ENDPOINTS.GET_TORRENTS);
        const data = await res.json();
        
        currentTorrents = data.torrents; 
        updateSidebarCounts();
        renderTable();
        
        document.getElementById('totalDown').innerText = data.totalDownSpeed;
        document.getElementById('totalUp').innerText = data.totalUpSpeed;
        document.getElementById('ps4Status').innerText = "Online";
        document.getElementById('ps4Status').className = "online";
    } catch (error) {
        document.getElementById('ps4Status').innerText = "Offline";
        document.getElementById('ps4Status').className = "offline";
    }
}