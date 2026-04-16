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
                    const msg = res.body?.mensaje || res.mensaje || 'Operación completada';
                    const imageUrl = res.body?.imagen_actual_red;
                    
                    let htmlContent = `<div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px;">`;
                    htmlContent += `<p style="color: var(--success); font-weight: 600; margin-bottom: 16px;">${msg}</p>`;
                    
                    if (imageUrl) {
                        htmlContent += `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <img src="${imageUrl}" alt="Foto de perfil" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent);" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231c2128%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%236e7681%22 font-size=%2240%22>👤</text></svg>'">
                            <input type="text" readonly value="${imageUrl}" style="width: 100%; font-size: 11px; text-align: center;">
                        </div>`;
                    }
                    
                    htmlContent += `</div>`;
                    statusLog.innerHTML = htmlContent;
                } else {
                    const msg = res.body?.mensaje || res.mensaje || 'Operación completada';
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

    function openModal() { document.getElementById('modal').classList.add('active'); }

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
    
    async function fetchGroupsAction() {
        const sessionName = document.getElementById('sessionName').value;
        if (!sessionName) return alert("Selecciona una sucursal primero.");
        
        const btn = document.getElementById('btnFetchGroupsMap');
        const statusLog = document.getElementById('statusLog');
        const container = document.getElementById('groupsMapContainer');
        const dropdown = document.getElementById('groupsMapDropdown');
        const label = document.getElementById('displayMapSessionName');

        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        statusLog.classList.remove('hidden');
        statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Obteniendo grupos...</span></div>`;

        try {
            const response = await fetch('./waha-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "body": { "SendAction": "getGroups", "name_session": sessionName }
                })
            });

            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const data = await response.json();
            const resultData = Array.isArray(data) ? data[0] : data;
            const dynamicKey = Object.keys(resultData)[0];
            const rawItems = resultData[dynamicKey];

            if (rawItems && Array.isArray(rawItems)) {
                const validGroups = rawItems.filter(item => item.id_chatgroup && !item.error);

                label.textContent = dynamicKey.replaceAll('_', ' ');
                dropdown.innerHTML = '';

                validGroups.forEach(g => {
                    const opt = document.createElement('option');
                    opt.value = g.id_chatgroup;
                    opt.text = g.name_group || `Sin nombre (${g.id_chatgroup.substring(0, 15)}...)`;
                    dropdown.appendChild(opt);
                });

                container.classList.remove('hidden');
                statusLog.innerHTML = `<span style="color: var(--success);">${validGroups.length} grupos cargados.</span>`;
            }
        } catch (e) {
            console.error("Error en fetchGroups:", e);
            statusLog.innerHTML = `<span style="color: var(--danger);">Error al conectar con el servidor.</span>`;
        } finally {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }

    async function saveGroupToDatabase() {
        const dropdown = document.getElementById('groupsMapDropdown');
        if (!dropdown || !dropdown.value) return alert("Selecciona un grupo primero.");
        
        const groupId = dropdown.value;
        const groupName = dropdown.options[dropdown.selectedIndex].text;
        const sessionName = document.getElementById('sessionName').value;

        const statusLog = document.getElementById('statusLog');
        statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Guardando ${groupName}...</span></div>`;

        try {
            const response = await fetch('./waha-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "body": { 
                        "SendAction": "saveGroup", 
                        "name_session": sessionName,
                        "id_chatgroup": groupId,
                        "name_group": groupName
                    }
                })
            });
            statusLog.innerHTML = `<span style="color: var(--success);">Grupo guardado en base de datos.</span>`;
        } catch (e) {
            statusLog.innerHTML = `<span style="color: var(--danger);">Error al guardar en base.</span>`;
        }
    }

    function resetGroupsSellerView() {
        const container = document.getElementById('groupsSellerContainer');
        const dropdown = document.getElementById('groupsSellerDropdown');
        const sessionLabel = document.getElementById('displaySellerSessionName');
        const statusLog = document.getElementById('statusLog');

        if (container) container.classList.add('hidden');
        if (dropdown) dropdown.innerHTML = '';
        if (sessionLabel) sessionLabel.textContent = '';
        if (statusLog) statusLog.innerHTML = 'Esperando comando...';
    }
     
    async function fetchGroupshellin() {
        const sessionName = document.getElementById('sessionName').value;
        if (!sessionName) return alert("Selecciona una sucursal primero.");
        
        const btn = document.getElementById('btnFetchGroupsSeller');
        const container = document.getElementById('groupsSellerContainer');
        const statusLog = document.getElementById('statusLog');

        if (btn) {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        }
        if (statusLog) {
            statusLog.classList.remove('hidden');
            statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Consultando registros en base de datos...</span></div>`;
        }

        try {
            const response = await fetch('./waha-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    "body": { 
                        "SendAction": "getAllSavedGroups",
                        "name_session": sessionName
                    } 
                })
            });

            if (!response.ok) throw new Error(`Error en servidor: ${response.status}`);

            const rawText = await response.text();
            console.log("Respuesta cruda:", rawText);
            if (!rawText) throw new Error("Respuesta vacía del servidor");
            const data = JSON.parse(rawText);

            const groups = data.allgroupssellin || [];

            if (groups.length === 0) {
                if (statusLog) statusLog.innerHTML = `<span style="color: var(--text-muted);">No se encontraron datos.</span>`;
                return;
            }

            renderFullAdminTable(groups);
            
            if (container) container.classList.remove('hidden');
            if (statusLog) statusLog.innerHTML = `<span style="color: var(--success);">${groups.length} registros cargados.</span>`;

        } catch (error) {
            console.error("Error detallado:", error);
            if (statusLog) statusLog.innerHTML = `<span style="color: var(--danger);">Error al conectar con la BD.</span>`;
        } finally {
            if (btn) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    function renderFullAdminTable(groups) {
        const container = document.getElementById('groupsSellerContainer');
        
        let html = `
        <div style="max-width: 1000px;">
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 16px; text-align: center;">Panel de Control Global</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Sucursal / Red</th>
                            <th>Grupo de Ventas</th>
                            <th style="text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

        groups.forEach((g, index) => {
            const safeGroupName = (g.nombre_gupo_ventas || 'Sin nombre').replace(/'/g, "\\'");
            const safeSessionName = (g.Nombre_session || '').replace(/_/g, ' ').replace(/'/g, "\\'");
            html += `
            <tr style="cursor: pointer;" onclick="openImageModal('${safeGroupName}', '${safeSessionName}', '${g.url_image_actual || ''}', '${g.id_chat_group}')">
                <td>
                    <div style="color: var(--accent); font-weight: 600; margin-bottom: 4px;">${g.Nombre_session}</div>
                    <div style="color: var(--text-muted); font-size: 11px;">${g.Nombre_red || 'Sin red'}</div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${g.url_image_actual || ''}" alt="" class="group-photo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%231c2128%22 width=%2240%22 height=%2240%22 rx=%228%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 fill=%22%236e7681%22 font-size=%2214%22>👥</text></svg>'">
                        <div>
                            <div style="font-weight: 500;">${g.nombre_gupo_ventas || 'Sin nombre'}</div>
                            <div style="color: var(--text-muted); font-size: 10px; font-family: monospace; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.id_chat_group}</div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;" onclick="event.stopPropagation()">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button onclick="actionUpdateName('${g.id_chat_group}', '${g.Nombre_session}', this.closest('tr'))" 
                                class="icon-btn"
                                title="Cambiar Nombre">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onclick="actionUpdatePhoto('${g.id_chat_group}', '${g.Nombre_session}', '${g.url_image_actual || ''}', this.closest('tr'))" 
                                class="icon-btn"
                                title="Cambiar Foto">
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

    async function actionUpdateName(groupId, session, rowElement) {
        const currentName = rowElement.querySelector('div[style*="font-weight: 500"]')?.textContent || '';
        const newName = prompt(`Escribe el nuevo nombre para el grupo:`, currentName);
        
        if (newName && newName.trim() !== "" && newName !== currentName) {
            const statusLog = document.getElementById('statusLog');
            statusLog.classList.remove('hidden');
            statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Actualizando nombre del grupo...</span></div>`;
            
            try {
                const response = await fetch('./waha-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        "body": { 
                            "SendAction": "setGroupName", 
                            "name_session": session,
                            "id_chat_group": groupId,
                            "new_group_name": newName.trim()
                        }
                    })
                });

                const data = await response.json();
                const success = data.body?.success || data.success || data.mensaje?.includes('éxito') || data.mensaje?.includes('correctamente');
                
                if (success) {
                    const nameEl = rowElement.querySelector('div[style*="font-weight: 500"]');
                    if (nameEl) nameEl.textContent = newName.trim();
                    statusLog.innerHTML = `<span style="color: var(--success);">Nombre del grupo actualizado a "${newName}"</span>`;
                } else {
                    statusLog.innerHTML = `<span style="color: var(--danger);">Error: ${data.body?.mensaje || data.mensaje || 'No se pudo actualizar'}</span>`;
                }
            } catch (e) {
                console.error("Error:", e);
                statusLog.innerHTML = `<span style="color: var(--danger);">Error de conexión al actualizar nombre</span>`;
            }
        }
    }

    async function actionUpdatePhoto(groupId, session, currentUrl, rowElement) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg, image/png';
        
        const statusLog = document.getElementById('statusLog');

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            statusLog.classList.remove('hidden');
            statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Subiendo imagen...</span></div>`;

            const formData = new FormData();
            formData.append('data0', file);
            formData.append('name_session', session);

            try {
                const uploadResponse = await fetch('./upload-imagen', { method: 'POST', body: formData });
                const uploadResult = await uploadResponse.json();
                const imageUrl = Array.isArray(uploadResult) ? uploadResult[0].secure_url : uploadResult.secure_url;

                if (!imageUrl) {
                    statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir imagen</span>`;
                    return;
                }

                const previewHtml = `
                    <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px;">
                        <p style="color: var(--accent); font-weight: 600; font-size: 12px; text-align: center; margin-bottom: 16px;">Nueva imagen</p>
                        <div style="text-align: center; margin-bottom: 16px;">
                            <img src="${imageUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);">
                        </div>
                        <input type="text" readonly value="${imageUrl}" id="newGroupImageUrl" style="margin-bottom: 16px;">
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button id="btnConfirmPhoto" class="btn btn-primary btn-block" style="font-size: 12px;">Confirmar cambio de foto</button>
                            <button id="btnCancelPhoto" class="btn btn-secondary btn-block" style="font-size: 12px;">Cancelar</button>
                        </div>
                    </div>`;
                
                statusLog.innerHTML = previewHtml;
                
                document.getElementById('btnConfirmPhoto').addEventListener('click', () => {
                    confirmGroupPhotoUpdate(groupId, session, imageUrl, rowElement);
                });
                
                document.getElementById('btnCancelPhoto').addEventListener('click', () => {
                    statusLog.innerHTML = 'Esperando comando...';
                    statusLog.classList.add('hidden');
                });

            } catch (err) { 
                console.error("Error upload:", err);
                statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir imagen</span>`; 
            }
        };
        fileInput.click();
    }

    async function confirmGroupPhotoUpdate(groupId, session, imageUrl, rowElement) {
        const statusLog = document.getElementById('statusLog');
        statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Actualizando foto del grupo...</span></div>`;

        try {
            const response = await fetch('./waha-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "body": { 
                        "SendAction": "setGroupPhoto", 
                        "name_session": session,
                        "id_chat_group": groupId,
                        "new_photo_url": imageUrl
                    }
                })
            });

            const rawText = await response.text();
            console.log("Respuesta setGroupPhoto:", rawText);
            
            if (!rawText || !response.ok) {
                statusLog.innerHTML = `<span style="color: var(--danger);">Error del servidor: ${response.status}</span>`;
                return;
            }
            
            const data = JSON.parse(rawText);
            const success = data.body?.success || data.success || data.mensaje?.includes('éxito') || data.mensaje?.includes('correctamente');
            
            if (success) {
                if (rowElement) {
                    const imgEl = rowElement.querySelector('.group-photo');
                    if (imgEl) imgEl.src = imageUrl;
                }
                statusLog.innerHTML = `<span style="color: var(--success);">Foto del grupo actualizada correctamente</span>`;
            } else {
                statusLog.innerHTML = `<span style="color: var(--danger);">Error: ${data.body?.mensaje || data.mensaje || 'No se pudo actualizar'}</span>`;
            }
        } catch (e) {
            console.error("Error:", e);
            statusLog.innerHTML = `<span style="color: var(--danger);">Error de conexión al actualizar foto</span>`;
        }
    }

    const allBranches = [
        {value: "Efectimundo_Atizapan_Plaza_Cristal", label: "Atizapán Plaza Cristal"},
        {value: "Efectimundo_Azcapotzalco", label: "Azcapotzalco"},
        {value: "Efectimundo_Cancun_MultiPlaza_Arco_Norte", label: "Cancún Arco Norte"},
        {value: "Efectimundo_Chalco_Centro", label: "Chalco Centro"},
        {value: "Efectimundo_Chalco_Guadalupana", label: "Chalco Guadalupana"},
        {value: "Efectimundo_Chalco_Soriana_Valle", label: "Chalco Soriana Valle"},
        {value: "Efectimundo_Chilpancingo", label: "Chilpancingo"},
        {value: "Efectimundo_Chimalhuacan_Barrio_Artesanos", label: "Chimalhuacán Artesanos"},
        {value: "Efectimundo_Chimalhuacan_Centro", label: "Chimalhuacán Centro"},
        {value: "Efectimundo_Chimalhuacan_Las_Torres", label: "Chimalhuacán Las Torres"},
        {value: "Efectimundo_Coacalco_Bosques_del_Valle", label: "Coacalco Bosques"},
        {value: "Efectimundo_Coacalco_Power_Center", label: "Coacalco Power Center"},
        {value: "Efectimundo_Coyoacan_Plaza_Cantil", label: "Coyoacán Plaza Cantil"},
        {value: "Efectimundo_Cuajimalpa", label: "Cuajimalpa"},
        {value: "Efectimundo_Cuautepec", label: "Cuautepec"},
        {value: "Efectimundo_Cuautepec_Barrio_Alto", label: "Cuautepec Barrio Alto"},
        {value: "Efectimundo_Cuautitlan_Izcalli_Portal_Cuautitlan", label: "Izcalli Portal"},
        {value: "Efectimundo_Cuautla_Morelos", label: "Cuautla Morelos"},
        {value: "Efectimundo_Durango", label: "Durango"},
        {value: "Efectimundo_Ecatepec_Plaza_Ecatepec", label: "Ecatepec Plaza"},
        {value: "Efectimundo_Guadalajara_Plaza_Del_Sol", label: "Guadalajara Plaza del Sol"},
        {value: "Efectimundo_Guadalajara_Plaza_Mich", label: "Guadalajara Plaza Mich"},
        {value: "Efectimundo_Iztapaluca", label: "Iztapaluca"},
        {value: "Efectimundo_La_Paz_Estado_De_Mexico", label: "La Paz"},
        {value: "Efectimundo_Leon_Central", label: "León Central"},
        {value: "Efectimundo_Leon_Plaza_Mayor", label: "León Plaza Mayor"},
        {value: "Efectimundo_Lerma", label: "Lerma"},
        {value: "Efectimundo_Merida_Plaza_Las_Americas", label: "Mérida Plaza Las Américas"},
        {value: "Efectimundo_Merida_Plaza_Thread", label: "Mérida Plaza Thread"},
        {value: "Efectimundo_Metepec_Plaza_News", label: "Metepec Plaza News"},
        {value: "Efectimundo_Mexico_Plaza_Loreto", label: "Plaza Loreto"},
        {value: "Efectimundo_Mexico_Plaza_San_Angel", label: "Plaza San Ángel"},
        {value: "Efectimundo_Monterrey_Facp", label: "Monterrey FAcP"},
        {value: "Efectimundo_Monterrey_Plaza_Ciclon", label: "Monterrey Plaza Ciclón"},
        {value: "Efectimundo_Naucalpan_Plaza_Naucalpan", label: "Naucalpan Plaza"},
        {value: "Efectimundo_Nezahualcóyotl_Central", label: "Nezahualcóyotl Central"},
        {value: "Efectimundo_Nezahualcóyotl_Plaza_Aragon", label: "Nezahualcóyotl Aragón"},
        {value: "Efectimundo_Pachuca", label: "Pachuca"},
        {value: "Efectimundo_Plaza_Boulevard", label: "Plaza Boulevard"},
        {value: "Efectimundo_Plaza_Cantiles", label: "Plaza Cantiles"},
        {value: "Efectimundo_Plaza_Central", label: "Plaza Central"},
        {value: "Efectimundo_Plaza_La_Cumbre", label: "Plaza La Cumbre"},
        {value: "Efectimundo_Plaza_Las_Hadas", label: "Plaza Las Hadas"},
        {value: "Efectimundo_Puebla_Plaza_Dorada", label: "Puebla Plaza Dorada"},
        {value: "Efectimundo_Puebla_Plaza_San_Angel", label: "Puebla San Ángel"},
        {value: "Efectimundo_Queretaro_Plaza_Anfor", label: "Querétaro Plaza Anfor"},
        {value: "Efectimundo_Queretaro_Plaza_Zaragoza", label: "Querétaro Plaza Zaragoza"},
        {value: "Efectimundo_San_Juan_del_Rio", label: "San Juan del Río"},
        {value: "Efectimundo_San_Luis_Potosi_El_Doral", label: "San Luis Potosí El Doral"},
        {value: "Efectimundo_San_Luis_Potosi_Plaza_Cactus", label: "San Luis Potosí Cactus"},
        {value: "Efectimundo_Tepic", label: "Tepic"},
        {value: "Efectimundo_Tijuana_Av_Principal", label: "Tijuana Av Principal"},
        {value: "Efectimundo_Tijuana_Plaza_Fidelidad", label: "Tijuana Plaza Fidelidad"},
        {value: "Efectimundo_Tlalnepantla_Plaza_Tlalnepantla", label: "Tlalnepantla Plaza"},
        {value: "Efectimundo_Toluca_Plaza_Digital", label: "Toluca Plaza Digital"},
        {value: "Efectimundo_Torreon_Paseo_La_Roma", label: "Torreón Paseo La Roma"},
        {value: "Efectimundo_Tuxtla_Gutierrez", label: "Tuxtla Gutiérrez"},
        {value: "Efectimundo_Veracruz_Plaza_Veracruz", label: "Veracruz Plaza"},
        {value: "Efectimundo_Villahermosa_Atrio", label: "Villahermosa Atrio"},
        {value: "Efectimundo_Zacatecas", label: "Zacatecas"}
    ];

    document.addEventListener('DOMContentLoaded', () => {
        handleAction('getSession');
    });
