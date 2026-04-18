let qrInterval = null;

async function confirmStart() {
    const val = document.getElementById('modalSessionId').value;
    if (!val) return alert('Selecciona una sucursal');
    
    document.getElementById('modalSessionId').classList.add('hidden');
    document.getElementById('modalSessionId').style.display = 'none';
    
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.classList.remove('hidden');
    qrContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="spinner"></div>
            <p id="qrStatusText" style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Iniciando sesión en servidor...</p>
            <img id="qrImage" src="" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px; margin-top: 16px; display: none;">
        </div>
    `;

    try {
        const createResponse = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "body": { 
                    "SendAction": "createSession", 
                    "name_session": val 
                }
            })
        });

        const createData = await createResponse.json();
        console.log("Respuesta de creación:", createData);

        const statusText = document.getElementById('qrStatusText');
        if (statusText) statusText.innerText = "Obteniendo código QR...";

        setTimeout(() => {
            getQR(val);
        }, 1500);

    } catch (e) {
        console.error("Error al crear sesión:", e);
        qrContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">Error al conectar con el servidor</div>`;
        setTimeout(() => closeModal(), 3000);
    }
}

async function getQR(sessionName) {
    const qrContainer = document.getElementById('qrContainer');
    
    try {
        const response = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "body": { "SendAction": "getQR", "name_session": sessionName }
            })
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        const data = await response.json();
        const resData = data.body || data;

        if (resData.mensaje === "La sesión ha sido creada correctamente o el tiempo para escanear tu código QR ha expirado" || resData.status === "WORKING") {
            if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--success);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <p style="font-weight: 600;">CONECTADO</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Configurando sucursal...</p>
                </div>`;
            
            setTimeout(() => {
                handleAction('getSession');
                closeModal();
            }, 3000);
            return;
        }

        let qrBase64 = resData.data || (Array.isArray(resData) && resData[0]?.data);
        if (qrBase64) {
            const qrImage = document.getElementById('qrImage');
            if (qrImage) {
                qrImage.src = `data:image/png;base64,${qrBase64}`;
                qrImage.style.display = 'block';
                
                const spinner = qrContainer.querySelector('.spinner');
                if (spinner) spinner.style.display = 'none';
                
                const statusText = document.getElementById('qrStatusText');
                if (statusText) statusText.innerText = "Escanea el código con WhatsApp";
            }

            if (!qrInterval) {
                qrInterval = setInterval(() => getQR(sessionName), 20000);
            }
        }
    } catch (e) {
        console.error("Error obteniendo QR:", e);
    }
}

async function handleAction(actionName, manualName = null, extraData = null) {
    const buttons = document.querySelectorAll('button');
    const statusLog = document.getElementById('statusLog');
    const mainSelect = document.getElementById('mainSelect');
    
    buttons.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
    statusLog.classList.remove('hidden');

    const sessionName = manualName || document.getElementById('sessionName').value;

    if (!sessionName && actionName !== 'getSession') {
        alert("Selecciona una sucursal.");
        buttons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        return;
    }

    statusLog.innerHTML = `<span style="color: var(--accent);">${actionName.toUpperCase()} en curso...</span>`;

    try {
        const response = await fetch('./waha-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "body": { 
                    "SendAction": actionName, 
                    "name_session": sessionName,
                    "new_profile_name": actionName === 'setProfileName' ? extraData : undefined,
                    "picture_url": actionName === 'setProfilePicture' ? extraData : undefined
                }
            })
        });

        const res = await response.json();
        const sessions = res.getSession || (Array.isArray(res) && res[0]?.getSession);

        if (sessions && Array.isArray(sessions)) {
            mainSelect.innerHTML = '<option value="">--- Seleccionar Sucursal ---</option>';
            
            const activeSessionNames = sessions.map(s => s.name_session);
        
            sessions.forEach(s => {
                const icon = s.status === 'WORKING' ? '●' : '○';
                const cleanName = s.name_session.replace(/_/g, ' ');
                mainSelect.add(new Option(`${icon} ${cleanName}`, s.name_session));
            });
        
            filterModalOptions(activeSessionNames);
        
            statusLog.innerHTML = `<span style="color: var(--success);">${sessions.length} sesiones encontradas.</span>`;
            updateConnectionIndicator();
        } else {
            if (actionName === 'getinfoSession') {
                const rawMsg = res.body?.mensaje || res.mensaje || 'Operación completada';
                const msg = rawMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const rawImageUrl = res.body?.imagen_actual_red;
                const imageUrl = rawImageUrl ? rawImageUrl.replace(/</g, '&lt;').replace(/>/g, '&gt;') : null;
                
                let htmlContent = `<div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px;">`;
                htmlContent += `<p style="color: var(--success); font-weight: 600; margin-bottom: 16px;">${msg}</p>`;
                
                if (imageUrl) {
                    const safeImageUrl = imageUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    htmlContent += `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                        <img src="${safeImageUrl}" alt="Foto de perfil" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent);" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231c2128%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%236e7681%22 font-size=%2240%22>👤</text></svg>'">
                        <input type="text" readonly value="${safeImageUrl}" style="width: 100%; font-size: 11px; text-align: center;">
                    </div>`;
                }
                
                htmlContent += `</div>`;
                statusLog.innerHTML = htmlContent;
            } else {
                const rawMsg = res.body?.mensaje || res.mensaje || 'Operación completada';
                const msg = rawMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                statusLog.innerHTML = `<span style="color: var(--text-secondary);">${msg}</span>`;
                if (['deleteSession', 'createSession', 'restartSession', 'deleteProfilePicture', 'setProfilePicture', 'setProfileName'].includes(actionName)) {
                    setTimeout(() => handleAction('getSession'), 2000); 
                }
            }
        }
    } catch (e) {
        statusLog.innerHTML = `<span style="color: var(--danger);">Error de comunicación.</span>`;
    } finally {
        buttons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }
}

function filterModalOptions(activeNames) {
    const modalSelect = document.getElementById('modalSessionId');
    modalSelect.innerHTML = '<option value="">--- Seleccionar ---</option>';
    const availableBranches = allBranches.filter(branch => !activeNames.includes(branch.value));
    availableBranches.sort((a,b) => a.label.localeCompare(b.label)).forEach(b => {
        modalSelect.add(new Option(b.label, b.value));
    });
    console.log(`Sucursales filtradas: ${availableBranches.length} disponibles para crear.`);
}
