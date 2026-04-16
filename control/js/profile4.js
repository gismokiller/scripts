async function uploadProfilePicture() {
    const sessionName = document.getElementById('sessionName').value;
    if (!sessionName) return alert("Selecciona una sucursal.");

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg, image/png';

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const statusLog = document.getElementById('statusLog');
        statusLog.classList.remove('hidden');
        statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Subiendo imagen...</span></div>`;

        const formData = new FormData();
        formData.append('data0', file);
        formData.append('name_session', sessionName);

        try {
            const response = await fetch('./upload-imagen', { method: 'POST', body: formData });
            const result = await response.json();
            const url = Array.isArray(result) ? result[0].secure_url : result.secure_url;

            if (url) {
                statusLog.innerHTML = `
                    <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px;">
                        <p style="color: var(--accent); font-weight: 600; font-size: 12px; text-align: center; margin-bottom: 16px;">IMAGEN LISTA</p>
                        <input type="text" readonly value="${url}" id="urlCloudinary" style="margin-bottom: 16px;">
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button onclick="copyUrlToClipboard()" class="btn btn-secondary btn-block" style="font-size: 12px;">Copiar Link</button>
                            <button onclick="handleAction('setProfilePicture', null, '${url}')" class="btn btn-primary btn-block" style="font-size: 12px;">Aplicar a esta cuenta</button>
                            <button onclick="changeAllProfilePictures()" class="btn btn-info btn-block" style="font-size: 12px;">Cambiar todas las fotos (WORKING)</button>
                        </div>
                    </div>`;
            }
        } catch (err) { 
            statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir.</span>`; 
        }
    };
    fileInput.click();
}

async function changeAllProfilePictures() {
    const statusLog = document.getElementById('statusLog');
    const urlCloudinary = document.getElementById('urlCloudinary')?.value;
    if (!urlCloudinary) return alert("Sube una foto primero.");
    if (!confirm("¿Actualizar TODAS las sesiones WORKING?")) return;

    statusLog.classList.remove('hidden');
    try {
        const response = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "body": { "SendAction": "getSession" } })
        });
        const res = await response.json();
        const allSessions = res.getSession || (Array.isArray(res) && res[0]?.getSession) || [];
        const activeSessions = allSessions.filter(s => s.status === 'WORKING');
        const total = activeSessions.length;

        if (total === 0) {
            statusLog.innerHTML = `<span style="color: var(--danger);">No hay sesiones activas.</span>`;
            return;
        }

        for (let i = 0; i < total; i++) {
            const session = activeSessions[i];
            statusLog.innerHTML = `
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px;">
                    <p style="color: var(--accent); font-weight: 600; font-size: 12px;">Procesando: ${i+1} de ${total}</p>
                    <p style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">Sucursal: ${session.name_session.replace(/_/g, ' ')}</p>
                    <div id="countdownTimer" style="color: var(--text-muted); font-size: 11px; margin-top: 8px;">Siguiente en: 5s</div>
                </div>`;

            await handleAction('setProfilePicture', session.name_session, urlCloudinary);
            if (i + 1 < total) {
                for (let s = 5; s > 0; s--) {
                    const t = document.getElementById('countdownTimer');
                    if (t) t.innerText = `Siguiente en: ${s}s`;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        statusLog.innerHTML = `<span style="color: var(--success); font-weight: 600;">Todo actualizado correctamente.</span>`;
    } catch (e) {
        statusLog.innerHTML = `<span style="color: var(--danger);">Error masivo.</span>`;
    }
}

function copyUrlToClipboard() {
    const el = document.getElementById("urlCloudinary");
    navigator.clipboard.writeText(el.value);
    if (window.navigator.vibrate) window.navigator.vibrate(20);
}

function openNameModal() {
    if (!document.getElementById('sessionName').value) return alert("Selecciona una sucursal.");
    document.getElementById('modalName').classList.add('active');
    document.getElementById('newNameInput').focus();
}

function closeNameModal() {
    document.getElementById('modalName').classList.remove('active');
    document.getElementById('newNameInput').value = '';
}

async function confirmNameChange() {
    const newName = document.getElementById('newNameInput').value.trim();
    if (!newName) return alert("Escribe un nombre.");
    closeNameModal();
    await handleAction('setProfileName', null, newName);
}

async function fetchAllSessionsForProfile() {
    const btn = document.getElementById('btnFetchSessionsProfile');
    const container = document.getElementById('sessionsProfileContainer');
    const statusLog = document.getElementById('statusLog');

    if (btn) {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    }
    
    statusLog.classList.remove('hidden');
    statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Cargando sesiones...</span></div>`;

    try {
        const response = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "body": { "SendAction": "getSession" } })
        });

        if (!response.ok) throw new Error(`Error en servidor: ${response.status}`);

        const res = await response.json();
        const sessions = res.getSession || (Array.isArray(res) && res[0]?.getSession) || [];

        if (sessions.length === 0) {
            statusLog.innerHTML = `<span style="color: var(--text-muted);">No hay sesiones registradas.</span>`;
            return;
        }

        renderSessionsProfileTable(sessions);
        container.classList.remove('hidden');
        statusLog.innerHTML = `<span style="color: var(--success);">${sessions.length} sesiones cargadas.</span>`;

    } catch (error) {
        console.error("Error:", error);
        statusLog.innerHTML = `<span style="color: var(--danger);">Error al conectar con el servidor.</span>`;
    } finally {
        if (btn) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }
}

function renderSessionsProfileTable(sessions) {
    const container = document.getElementById('sessionsProfileContainer');
    
    let html = `
    <div style="max-width: 100%; overflow-x: auto;">
        <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 16px; text-align: center;">Perfiles de Sesiones</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Sesión</th>
                        <th>Estado</th>
                        <th>Nombre Público</th>
                        <th>Perfil</th>
                        <th style="text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

    sessions.forEach(s => {
        const sessionCleanName = s.name_session.replace(/_/g, ' ');
        const nombreRed = s.nombre_red || 'Sin nombre';
        const imagenRed = s.imagen_red || '';
        const contactoId = s.contacto_id || '';
        const isWorking = s.status === 'WORKING';
        
        html += `
        <tr>
            <td>
                <div style="font-weight: 600; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sessionCleanName}</div>
                <div style="color: var(--text-muted); font-size: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name_session}</div>
            </td>
            <td>
                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; ${isWorking ? 'background: rgba(63, 185, 80, 0.15); color: var(--success);' : 'background: rgba(248, 81, 73, 0.15); color: var(--danger);'}">
                    <span style="width: 6px; height: 6px; border-radius: 50%; ${isWorking ? 'background: var(--success);' : 'background: var(--danger);'}"></span>
                    ${isWorking ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td>
                <div style="font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nombreRed}</div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${imagenRed}" alt="" class="group-photo" style="width: 40px; height: 40px; border-radius: 50%;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%231c2128%22 width=%2240%22 height=%2240%22 rx=%2220%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 fill=%22%236e7681%22 font-size=%2214%22>👤</text></svg>'">
                    <div style="font-size: 10px; color: var(--text-muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${contactoId}</div>
                </div>
            </td>
            <td style="text-align: center;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button onclick="openModalEditName('${s.name_session}', '${nombreRed.replace(/'/g, "\\'")}')" 
                            class="icon-btn"
                            title="Cambiar Nombre"
                            ${!isWorking ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onclick="openModalEditPhoto('${s.name_session}')" 
                            class="icon-btn"
                            title="Cambiar Foto"
                            ${!isWorking ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>`;

    container.innerHTML = html;
}

function openModalEditName(sessionName, currentName) {
    const modalNameEdit = document.getElementById('modalNameEdit');
    if (!modalNameEdit) return;
    
    document.getElementById('sessionNameForEdit').value = sessionName;
    document.getElementById('currentNameDisplay').textContent = currentName || 'Sin nombre';
    modalNameEdit.classList.add('active');
    document.getElementById('newNameInputEdit').value = '';
    document.getElementById('newNameInputEdit').focus();
}

function closeModalEditName() {
    document.getElementById('modalNameEdit').classList.remove('active');
    const statusLog = document.getElementById('statusLog');
    statusLog.classList.add('hidden');
    statusLog.innerHTML = 'Esperando comando...';
}

async function confirmNameChangeEdit() {
    const sessionName = document.getElementById('sessionNameForEdit').value;
    const newName = document.getElementById('newNameInputEdit').value.trim();
    
    if (!newName) return alert("Escribe un nombre.");
    closeModalEditName();
    
    const statusLog = document.getElementById('statusLog');
    statusLog.classList.remove('hidden');
    statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Actualizando nombre...</span></div>`;

    try {
        const response = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "body": { 
                    "SendAction": "setProfileName", 
                    "name_session": sessionName,
                    "new_profile_name": newName
                }
            })
        });

        const res = await response.json();
        const msg = res.body?.mensaje || res.mensaje || 'Nombre actualizado';
        
        statusLog.innerHTML = `<span style="color: var(--success);">${msg}</span>`;
        
        setTimeout(async () => {
            await handleAction('getinfoSession', sessionName);
            fetchAllSessionsForProfile();
        }, 1500);
    } catch (e) {
        statusLog.innerHTML = `<span style="color: var(--danger);">Error al actualizar nombre.</span>`;
    }
}

function openModalEditPhoto(sessionName) {
    const modalPhotoEdit = document.getElementById('modalPhotoEdit');
    const statusLog = document.getElementById('statusLog');
    if (!modalPhotoEdit) return;
    
    document.getElementById('sessionNameForPhotoEdit').value = sessionName;
    modalPhotoEdit.classList.add('active');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg, image/png';
    fileInput.id = 'fileInputPhotoEdit';
    fileInput.click();
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            closeModalEditPhoto();
            return;
        }

        statusLog.classList.remove('hidden');
        statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Subiendo imagen...</span></div>`;

        const formData = new FormData();
        formData.append('data0', file);
        formData.append('name_session', sessionName);

        try {
            const response = await fetch('./upload-imagen', { method: 'POST', body: formData });
            const result = await response.json();
            const url = Array.isArray(result) ? result[0].secure_url : result.secure_url;

            if (!url) {
                statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir imagen.</span>`;
                return;
            }

            statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Aplicando foto...</span></div>`;

            const setResponse = await fetch('./waha-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "body": { 
                        "SendAction": "setProfilePicture", 
                        "name_session": sessionName,
                        "picture_url": url
                    }
                })
            });

            const setRes = await setResponse.json();
            const msg = setRes.body?.mensaje || setRes.mensaje || 'Foto actualizada';
            
            statusLog.innerHTML = `<span style="color: var(--success);">${msg}</span>`;
            
            closeModalEditPhoto();
            setTimeout(async () => {
                await handleAction('getinfoSession', sessionName);
                fetchAllSessionsForProfile();
            }, 1500);
        } catch (err) { 
            statusLog.innerHTML = `<span style="color: var(--danger);">Error al procesar imagen.</span>`; 
        }
    };
}

function closeModalEditPhoto() {
    const modal = document.getElementById('modalPhotoEdit');
    const statusLog = document.getElementById('statusLog');
    if (modal) modal.classList.remove('active');
    if (statusLog) {
        statusLog.classList.add('hidden');
        statusLog.innerHTML = 'Esperando comando...';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modalNameEdit = document.getElementById('modalNameEdit');
        const modalPhotoEdit = document.getElementById('modalPhotoEdit');
        if (modalNameEdit?.classList.contains('active')) {
            closeModalEditName();
        }
        if (modalPhotoEdit?.classList.contains('active')) {
            closeModalEditPhoto();
        }
    }
});

document.addEventListener('click', function(e) {
    const modalPhotoEdit = document.getElementById('modalPhotoEdit');
    const modalNameEdit = document.getElementById('modalNameEdit');
    
    if (e.target === modalPhotoEdit) {
        closeModalEditPhoto();
    }
    if (e.target === modalNameEdit) {
        closeModalEditName();
    }
});
