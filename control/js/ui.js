function updateConnectionIndicator() {
    const sel = document.getElementById('mainSelect');
    const indicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    const isWorking = sel.options[sel.selectedIndex]?.text.includes('●');
    indicator.className = isWorking ? 'status-dot active' : 'status-dot';
    statusText.textContent = isWorking ? 'Conectado' : 'Desconectado';
}

function showView(viewName) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { 'home': 0, 'profile': 1, 'groups': 2, 'groupssellers': 3 };
    if (navMap[viewName] !== undefined) {
        document.querySelectorAll('.nav-item')[navMap[viewName]]?.classList.add('active');
    }
    
    const titles = { 'home': 'Dashboard', 'profile': 'Gestor de Perfil', 'groups': 'Mapeo de Grupos', 'groupssellers': 'Grupos de Ventas' };
    document.getElementById('navTitle').textContent = titles[viewName] || 'Dashboard';
    
    if(viewName === 'home') document.getElementById('statusLog').classList.add('hidden');
    if(viewName === 'groups') resetGroupsView();
    if(viewName === 'groupssellers') resetGroupsSellerView();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function openModal() { 
    document.getElementById('modal').classList.add('active'); 
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.classList.add('hidden');
    qrContainer.innerHTML = ''; 
    document.getElementById('modalSessionId').style.display = 'block';
    document.getElementById('modalSessionId').classList.remove('hidden');
}

function openImageModal(groupName, sessionName, imageUrl, groupId) {
    document.getElementById('modalImageGroupName').textContent = groupName;
    document.getElementById('modalImageSessionName').textContent = sessionName.replace(/_/g, ' ');
    document.getElementById('modalImageContent').src = imageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231c2128" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236e7681" font-size="40">👥</text></svg>';
    document.getElementById('modalImageGroupId').textContent = groupId;
    document.getElementById('modalImageView').classList.add('active');
}

function closeImageModal() {
    document.getElementById('modalImageView').classList.remove('active');
}

function resetGroupsView() {
    const container = document.getElementById('groupsMapContainer');
    if (container) container.classList.add('hidden');
}