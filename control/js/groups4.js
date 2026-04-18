function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Guardando ${escapeHtml(groupName)}...</span></div>`;

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

async function fetchGroupsSeller() {
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
        const safeUrlImage = (g.url_image_actual || '').replace(/'/g, "\\'");
        const rowId = `row-group-${index}`;
        html += `
        <tr id="${rowId}" style="cursor: pointer;" onclick="openImageModal('${safeGroupName}', '${safeSessionName}', '${safeUrlImage}', '${g.id_chat_group}')">
            <td>
                <div style="color: var(--accent); font-weight: 600; margin-bottom: 4px;">${g.Nombre_session}</div>
                <div style="color: var(--text-muted); font-size: 11px;">${g.Nombre_red || 'Sin red'}</div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${safeUrlImage}" alt="" class="group-photo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%231c2128%22 width=%2240%22 height=%2240%22 rx=%228%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 fill=%22%236e7681%22 font-size=%2214%22>👥</text></svg>'">
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
                    <button onclick="actionUpdatePhoto('${g.id_chat_group}', '${g.Nombre_session}', '${safeUrlImage}', '${rowId}')" 
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
                statusLog.innerHTML = `<span style="color: var(--success);">Nombre del grupo actualizado a "${escapeHtml(newName)}"</span>`;
            } else {
                const rawMsg = data.body?.mensaje || data.mensaje || 'No se pudo actualizar';
                statusLog.innerHTML = `<span style="color: var(--danger);">Error: ${escapeHtml(rawMsg)}</span>`;
            }
        } catch (e) {
            console.error("Error:", e);
            statusLog.innerHTML = `<span style="color: var(--danger);">Error de conexión al actualizar nombre</span>`;
        }
    }
}

let currentRowId = null;

async function actionUpdatePhoto(groupId, session, currentUrl, rowId) {
    currentRowId = rowId;
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
            console.log("Cloudinary full response:", uploadResult);

            let imageUrl = null;
            if (Array.isArray(uploadResult)) {
                imageUrl = uploadResult[0]?.secure_url || uploadResult[0]?.url || null;
            } else {
                imageUrl = uploadResult?.secure_url || uploadResult?.url || null;
            }

            console.log("Extracted imageUrl:", imageUrl);

            if (!imageUrl) {
                console.error("No se encontró URL en la respuesta:", uploadResult);
                statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir imagen: no se получиу URL</span>`;
                return;
            }

            const safeImageUrl = imageUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeGroupId = groupId.replace(/'/g, "\\'");
            const safeSession = session.replace(/'/g, "\\'");
            
            const previewHtml = `
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px;">
                    <p style="color: var(--accent); font-weight: 600; font-size: 12px; text-align: center; margin-bottom: 16px;">Nueva imagen (URL: ${safeImageUrl})</p>
                    <div style="text-align: center; margin-bottom: 16px;">
                        <img src="${safeImageUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);">
                    </div>
                    <input type="text" readonly value="${safeImageUrl}" id="newGroupImageUrl" style="margin-bottom: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button onclick="console.log('Click confirm - imageUrl:', '${safeImageUrl}'); confirmGroupPhotoUpdate('${safeGroupId}', '${safeSession}', '${safeImageUrl}', currentRowId)" class="btn btn-primary btn-block" style="font-size: 12px;">Confirmar cambio de foto</button>
                        <button onclick="statusLog.innerHTML = 'Esperando comando...'; statusLog.classList.add('hidden');" class="btn btn-secondary btn-block" style="font-size: 12px;">Cancelar</button>
                    </div>
                </div>`;
            
            statusLog.innerHTML = previewHtml;
            console.log("Preview shown with imageUrl:", imageUrl);

        } catch (err) { 
            console.error("Error upload:", err);
            statusLog.innerHTML = `<span style="color: var(--danger);">Error al subir imagen</span>`; 
        }
    };
    fileInput.click();
}

async function confirmGroupPhotoUpdate(groupId, session, imageUrl, rowId) {
    console.log("confirmGroupPhotoUpdate called:", { groupId, session, imageUrl, rowId });
    
    const statusLog = document.getElementById('statusLog');
    statusLog.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div><span style="color: var(--accent);">Actualizando foto del grupo...</span></div>`;

    const rowElement = rowId ? document.getElementById(rowId) : null;

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
            const rawMsg = data.body?.mensaje || data.mensaje || 'No se pudo actualizar';
            statusLog.innerHTML = `<span style="color: var(--danger);">Error: ${escapeHtml(rawMsg)}</span>`;
        }
    } catch (e) {
        console.error("Error:", e);
        statusLog.innerHTML = `<span style="color: var(--danger);">Error de conexión al actualizar foto</span>`;
    }
}
