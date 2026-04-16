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