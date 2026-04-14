    let qrInterval = null;

    // --- 1. FUNCIÓN PARA INICIAR EL PROCESO (CREAR + SOLICITAR QR) ---
    async function confirmStart() {
        const val = document.getElementById('modalSessionId').value;
        if (!val) return alert('Selecciona una sucursal');
        
        // Preparación visual inmediata: ocultar selectores y mostrar cargador
        document.getElementById('modalSessionId').classList.add('hidden');
        document.getElementById('btnIniciarSesion').classList.add('hidden');
        
        const qrContainer = document.getElementById('qrContainer');
        qrContainer.classList.remove('hidden');
        qrContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
                <p id="qrStatusText" class="text-black text-[10px] font-bold uppercase text-center">Iniciando sesión en servidor...</p>
                <img id="qrImage" src="" alt="QR Code" class="w-48 h-48 hidden mt-2">
            </div>
        `;

        try {
            // Paso A: Crear la sesión en el backend (WAHA via n8n)
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

            // Actualizar texto visual
            const statusText = document.getElementById('qrStatusText');
            if (statusText) statusText.innerText = "Obteniendo código QR...";

            // Paso B: Iniciar bucle de solicitud de QR tras un breve delay
            setTimeout(() => {
                getQR(val);
            }, 1500);

        } catch (e) {
            console.error("Error al crear sesión:", e);
            qrContainer.innerHTML = `<div class="p-4 text-red-500 font-bold text-xs text-center">❌ Error al conectar con el servidor</div>`;
            setTimeout(() => closeModal(), 3000);
        }
    }

    // --- 2. FUNCIÓN PARA OBTENER Y MOSTRAR EL QR ---
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
                    <div class="p-4 text-green-600 font-bold text-center text-sm">
                        ✅ ¡CONECTADO!<br>
                        <span class="text-[10px] text-zinc-500">Configurando sucursal...</span>
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
                    qrImage.classList.remove('hidden');
                    
                    const loader = qrContainer.querySelector('.animate-spin');
                    if (loader) loader.remove();
                    
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

    // --- 3. FUNCIÓN UNIFICADA DE ACCIÓN (BACKEND) ---
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

        statusLog.innerText = `>> ${actionName.toUpperCase()} en curso...`;

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
                
                // Creamos un set con los nombres de sesiones que YA existen en el servidor
                const activeSessionNames = sessions.map(s => s.name_session);
            
                sessions.forEach(s => {
                    const icon = s.status === 'WORKING' ? '🟢' : '🔴';
                    const cleanName = s.name_session.replace(/_/g, ' ');
                    mainSelect.add(new Option(`${icon} ${cleanName}`, s.name_session));
                });
            
                // LLAMAMOS A LA FUNCIÓN DE FILTRADO
                filterModalOptions(activeSessionNames);
            
                statusLog.innerText = `${sessions.length} sesiones encontradas.`;
                updateConnectionIndicator();
            } else {
                const msg = res.body?.mensaje || res.mensaje || 'Operación completada';
                statusLog.innerText = `>> ${msg}`;
                if (['deleteSession', 'createSession', 'restartSession', 'deleteProfilePicture', 'setProfilePicture', 'setProfileName'].includes(actionName)) {
                    setTimeout(() => handleAction('getSession'), 2000); 
                }
            }
        } catch (e) {
            statusLog.innerText = `>> Error de comunicación.`;
        } finally {
            buttons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        }
    }

    function filterModalOptions(activeNames) {
        const modalSelect = document.getElementById('modalSessionId');
        
        // 1. Limpiar el select del modal
        modalSelect.innerHTML = '<option value="">--- Seleccionar ---</option>';
        
        // 2. Filtrar: Solo mostrar sucursales cuyo 'value' NO esté en activeNames
        const availableBranches = allBranches.filter(branch => !activeNames.includes(branch.value));
    
        // 3. Ordenar y rellenar el select
        availableBranches.sort((a,b) => a.label.localeCompare(b.label)).forEach(b => {
            modalSelect.add(new Option(b.label, b.value));
        });
    
        console.log(`Sucursales filtradas: ${availableBranches.length} disponibles para crear.`);
    }
      
    // --- 4. GESTIÓN DE PERFIL Y FOTOS ---
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
            statusLog.innerHTML = `<div class="p-2 animate-pulse text-blue-400">⏳ Subiendo imagen...</div>`;

            const formData = new FormData();
            formData.append('data0', file);
            formData.append('name_session', sessionName);

            try {
                const response = await fetch('./upload-imagen', { method: 'POST', body: formData });
                const result = await response.json();
                const url = Array.isArray(result) ? result[0].secure_url : result.secure_url;

                if (url) {
                    statusLog.innerHTML = `
                        <div class="bg-green-500/10 border border-green-500/50 p-4 rounded-2xl mt-2 space-y-3">
                            <p class="text-green-400 font-bold text-[10px] mb-2 text-center">✅ IMAGEN LISTA</p>
                            <input type="text" readonly value="${url}" id="urlCloudinary" class="w-full bg-black/40 p-2 rounded-xl text-[10px] outline-none text-zinc-500 mb-2">
                            <div class="grid grid-cols-1 gap-2">
                                <button onclick="copyUrlToClipboard()" class="w-full bg-zinc-700 text-white p-3 rounded-xl text-[10px] font-bold transition active:scale-95">📋 COPIAR LINK</button>
                                <button onclick="handleAction('setProfilePicture', null, '${url}')" class="w-full bg-green-600 text-white p-3 rounded-xl text-[10px] font-bold transition active:scale-95">✨ APLICAR A ESTA CUENTA</button>
                                <button onclick="changeAllProfilePictures()" class="w-full bg-blue-600 text-white p-3 rounded-xl text-[10px] font-bold transition active:scale-95">🖼️ CHANGE ALL PICS (WORKING)</button>
                            </div>
                        </div>`;
                }
            } catch (err) { 
                statusLog.innerHTML = `<div class="p-2 text-red-400">❌ Error al subir.</div>`; 
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
                statusLog.innerHTML = `<div class="p-2 text-red-400">❌ No hay sesiones activas.</div>`;
                return;
            }

            for (let i = 0; i < total; i++) {
                const session = activeSessions[i];
                statusLog.innerHTML = `
                    <div class="bg-blue-500/10 border border-blue-500/50 p-3 rounded-xl space-y-2">
                        <p class="text-blue-400 font-bold text-[10px]">🔄 PROCESANDO: ${i+1} de ${total}</p>
                        <p class="text-white text-[10px]">Sucursal: ${session.name_session.replace(/_/g, ' ')}</p>
                        <div id="countdownTimer" class="text-zinc-500 text-[9px]">Siguiente en: 5s</div>
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
            statusLog.innerHTML = `<div class="p-4 bg-green-600/20 text-green-400 rounded-xl text-center font-bold">🎉 ¡TODO ACTUALIZADO!</div>`;
        } catch (e) {
            statusLog.innerHTML = `<div class="p-2 text-red-400">❌ Error masivo.</div>`;
        }
    }

    // --- 5. FUNCIONES AUXILIARES Y UI ---
    function copyUrlToClipboard() {
        const el = document.getElementById("urlCloudinary");
        navigator.clipboard.writeText(el.value);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    }

    function openNameModal() {
        if (!document.getElementById('sessionName').value) return alert("Selecciona una sucursal.");
        document.getElementById('modalName').classList.replace('hidden', 'flex');
        document.getElementById('newNameInput').focus();
    }

    function closeNameModal() {
        document.getElementById('modalName').classList.replace('flex', 'hidden');
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
        const isWorking = sel.options[sel.selectedIndex]?.text.includes('🟢');
        indicator.className = isWorking 
            ? "w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.8)]" 
            : "w-2.5 h-2.5 bg-red-500 rounded-full";
    }

function showView(viewName) {
        document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewName}`);
        if(target) target.classList.add('active');
        
        const titles = { 'home': 'EFECTIMUNDO', 'profile': 'GESTOR DE PERFIL', 'groups': 'GESTOR DE GRUPOS', 'groupssellers': 'GRUPOS DE VENTAS' };
        document.getElementById('navTitle').innerText = titles[viewName] || 'EFECTIMUNDO';
        
        if(viewName === 'home') document.getElementById('statusLog').classList.add('hidden');
        if(viewName === 'groups') resetGroupsView();
        if(viewName === 'groupssellers') resetGroupsSellerView();
        window.scrollTo({top: 0, behavior: 'smooth'});
      }

    function openModal() { document.getElementById('modal').classList.replace('hidden', 'flex'); }

    function closeModal() {
        document.getElementById('modal').classList.replace('flex', 'hidden');
        if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
        const qrContainer = document.getElementById('qrContainer');
        qrContainer.classList.add('hidden');
        qrContainer.innerHTML = ''; 
        document.getElementById('modalSessionId').classList.remove('hidden');
        document.getElementById('btnIniciarSesion').classList.remove('hidden');
    }
    
    function openImageModal(groupName, sessionName, imageUrl, groupId) {
        document.getElementById('modalImageGroupName').textContent = groupName;
        document.getElementById('modalImageSessionName').textContent = sessionName;
        document.getElementById('modalImageContent').src = imageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="14">Sin imagen</text></svg>';
        document.getElementById('modalImageGroupId').textContent = groupId;
        document.getElementById('modalImageView').classList.replace('hidden', 'flex');
    }
    
    function closeImageModal() {
        document.getElementById('modalImageView').classList.replace('flex', 'hidden');
    }
    
     async function fetchGroupsAction() {
  const sessionName = document.getElementById('sessionName').value;
  if (!sessionName) return alert("Selecciona una sucursal primero.");
  
  const btn = document.getElementById('btnFetchGroupsMap');
  const statusLog = document.getElementById('statusLog');
  const container = document.getElementById('groupsMapContainer');
  const dropdown = document.getElementById('groupsMapDropdown');
  const label = document.getElementById('displayMapSessionName');

  btn.classList.add('animate-pulse', 'opacity-50');
  statusLog.innerText = ">> Obteniendo grupos...";

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

      label.innerText = dynamicKey.replaceAll('_', ' ');
      dropdown.innerHTML = '';

      validGroups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id_chatgroup;
        opt.text = g.name_group || `Sin nombre (${g.id_chatgroup.substring(0, 15)}...)`;
        dropdown.appendChild(opt);
      });

      container.classList.remove('hidden');
      statusLog.innerText = `>> Se cargaron ${validGroups.length} grupos exitosamente.`;
    }
  } catch (e) {
    console.error("Error en fetchGroups:", e);
    statusLog.innerText = ">> Error al conectar con el servidor.";
  } finally {
    btn.classList.remove('animate-pulse', 'opacity-50');
  }
}

      async function saveGroupToDatabase() {
        const dropdown = document.getElementById('groupsMapDropdown');
        if (!dropdown || !dropdown.value) return alert("Selecciona un grupo primero.");
        
        const groupId = dropdown.value;
        const groupName = dropdown.options[dropdown.selectedIndex].text;
        const sessionName = document.getElementById('sessionName').value;

        const statusLog = document.getElementById('statusLog');
        statusLog.innerText = `>> Guardando ${groupName}...`;

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
          statusLog.innerText = "✅ Grupo guardado en base de datos.";
        } catch (e) {
          statusLog.innerText = "❌ Error al guardar en base.";
        }
      }

function resetGroupsSellerView() {
    const container = document.getElementById('groupsSellerContainer');
    const dropdown = document.getElementById('groupsSellerDropdown');
    const sessionLabel = document.getElementById('displaySellerSessionName');
    const statusLog = document.getElementById('statusLog');

    if (container) container.classList.add('hidden');
    if (dropdown) dropdown.innerHTML = '';
    if (sessionLabel) sessionLabel.innerText = '';
    if (statusLog) statusLog.innerText = "Esperando comando...";
}
     
/**
 * Obtiene todos los grupos guardados en la base de datos sin filtrar por sesión
 * y construye una tabla de administración global.
 */
async function fetchGroupshellin() {
    const sessionName = document.getElementById('sessionName').value;
    if (!sessionName) return alert("Selecciona una sucursal primero.");
    
    const btn = document.getElementById('btnFetchGroupsSeller');
    const container = document.getElementById('groupsSellerContainer');
    const statusLog = document.getElementById('statusLog');

    if (btn) btn.classList.add('animate-pulse', 'opacity-50');
    if (statusLog) statusLog.innerText = ">> Consultando registros en base de datos...";

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
            if (statusLog) statusLog.innerText = ">> No se encontraron datos.";
            return;
        }

        renderFullAdminTable(groups);
        
        if (container) container.classList.remove('hidden');
        if (statusLog) statusLog.innerText = `>> ${groups.length} registros cargados exitosamente.`;

    } catch (error) {
        console.error("Error detallado:", error);
        if (statusLog) statusLog.innerText = ">> Error al conectar con la BD.";
    } finally {
        if (btn) btn.classList.remove('animate-pulse', 'opacity-50');
    }
}

/**
 * Genera el HTML de la tabla con los datos de la base de datos
 * @param {Array} groups - Lista de grupos obtenida del backend
 */
function renderFullAdminTable(groups) {
    const container = document.getElementById('groupsSellerContainer');
    
    let html = `
    <div class="space-y-4">
        <h4 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Panel de Control Global</h4>
        <div class="overflow-x-auto border border-zinc-800 rounded-2xl bg-zinc-950/50">
            <table class="w-full text-left text-[11px] border-separate border-spacing-0">
                <thead class="bg-zinc-900 text-zinc-500 sticky top-0">
                    <tr>
                        <th class="p-4 font-bold border-b border-zinc-800">Sucursal / Red</th>
                        <th class="p-4 font-bold border-b border-zinc-800">Grupo de Ventas</th>
                        <th class="p-4 font-bold border-b border-zinc-800 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">`;

    groups.forEach((g, index) => {
        const safeGroupName = (g.nombre_gupo_ventas || 'Sin nombre').replace(/'/g, "\\'");
        const safeSessionName = (g.Nombre_session || '').replace(/_/g, ' ').replace(/'/g, "\\'");
        html += `
        <tr class="group-row hover:bg-zinc-900/40 transition-colors cursor-pointer" data-group-id="${g.id_chat_group}" onclick="openImageModal('${safeGroupName}', '${safeSessionName}', '${g.url_image_actual || ''}', '${g.id_chat_group}')">
            <td class="p-4">
                <div class="text-green-500 font-bold mb-0.5">${g.Nombre_session}</div>
                <div class="text-zinc-500 text-[9px] italic">${g.Nombre_red || 'Sin red'}</div>
            </td>
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="${g.url_image_actual || ''}" alt="" class="group-photo w-10 h-10 rounded-full object-cover border border-zinc-700" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23333%22 width=%2240%22 height=%2240%22 rx=%228%22/><text x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>👥</text></svg>'">
                    <div>
                        <div class="group-name text-white font-medium">${g.nombre_gupo_ventas || 'Sin nombre'}</div>
                        <span class="text-[9px] text-zinc-600 font-mono truncate max-w-[120px] inline-block">${g.id_chat_group}</span>
                    </div>
                </div>
            </td>
            <td class="p-4" onclick="event.stopPropagation()">
                <div class="flex justify-center gap-2">
                    <button onclick="actionUpdateName('${g.id_chat_group}', '${g.Nombre_session}', this.closest('tr'))" 
                            class="p-2 bg-zinc-900 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg border border-zinc-800"
                            title="Cambiar Nombre">
                        📝
                    </button>
                    <button onclick="actionUpdatePhoto('${g.id_chat_group}', '${g.Nombre_session}', '${g.url_image_actual || ''}', this.closest('tr'))" 
                            class="p-2 bg-zinc-900 text-purple-400 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-lg border border-zinc-800"
                            title="Cambiar Foto">
                        🖼️
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
    const currentName = rowElement.querySelector('.group-name')?.textContent || '';
    const newName = prompt(`Escribe el nuevo nombre para el grupo:`, currentName);
    
    if (newName && newName.trim() !== "" && newName !== currentName) {
        const statusLog = document.getElementById('statusLog');
        statusLog.innerText = `>> Actualizando nombre del grupo...`;
        
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
                const nameEl = rowElement.querySelector('.group-name');
                if (nameEl) nameEl.textContent = newName.trim();
                statusLog.innerText = `✅ Nombre del grupo actualizado a "${newName}"`;
            } else {
                statusLog.innerText = `❌ Error: ${data.body?.mensaje || data.mensaje || 'No se pudo actualizar'}`;
            }
        } catch (e) {
            console.error("Error:", e);
            statusLog.innerText = `❌ Error de conexión al actualizar nombre`;
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
        statusLog.innerHTML = `<div class="p-2 animate-pulse text-blue-400">⏳ Subiendo imagen...</div>`;

        const formData = new FormData();
        formData.append('data0', file);
        formData.append('name_session', session);

        try {
            const uploadResponse = await fetch('./upload-imagen', { method: 'POST', body: formData });
            const uploadResult = await uploadResponse.json();
            const imageUrl = Array.isArray(uploadResult) ? uploadResult[0].secure_url : uploadResult.secure_url;

            if (!imageUrl) {
                statusLog.innerHTML = `<div class="p-2 text-red-400">❌ Error al subir imagen</div>`;
                return;
            }

            const safeGroupId = groupId.replace(/'/g, "\\'");
            const previewHtml = `
                <div class="bg-purple-500/10 border border-purple-500/50 p-4 rounded-2xl mt-2 space-y-3">
                    <p class="text-purple-400 font-bold text-[10px] mb-2 text-center">📸 NUEVA IMAGEN</p>
                    <div class="flex justify-center mb-2">
                        <img src="${imageUrl}" class="w-20 h-20 object-cover rounded-xl border border-zinc-700">
                    </div>
                    <input type="text" readonly value="${imageUrl}" id="newGroupImageUrl" class="w-full bg-black/40 p-2 rounded-xl text-[10px] outline-none text-zinc-500 mb-2">
                    <div class="grid grid-cols-1 gap-2">
                        <button id="btnConfirmPhoto" class="w-full bg-green-600 text-white p-3 rounded-xl text-[10px] font-bold transition active:scale-95">
                            ✅ CONFIRMAR CAMBIO DE FOTO
                        </button>
                        <button id="btnCancelPhoto" class="w-full bg-zinc-700 text-white p-3 rounded-xl text-[10px] font-bold transition active:scale-95">
                            ❌ CANCELAR
                        </button>
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
            statusLog.innerHTML = `<div class="p-2 text-red-400">❌ Error al subir imagen</div>`; 
        }
    };
    fileInput.click();
}

async function confirmGroupPhotoUpdate(groupId, session, imageUrl, rowElement) {
    const statusLog = document.getElementById('statusLog');
    statusLog.innerText = `>> Actualizando foto del grupo...`;

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
            statusLog.innerText = `❌ Error del servidor: ${response.status}`;
            return;
        }
        
        const data = JSON.parse(rawText);
        const success = data.body?.success || data.success || data.mensaje?.includes('éxito') || data.mensaje?.includes('correctamente');
        
        if (success) {
            if (rowElement) {
                const imgEl = rowElement.querySelector('.group-photo');
                if (imgEl) imgEl.src = imageUrl;
            }
            statusLog.innerHTML = `<div class="p-2 text-green-400">✅ Foto del grupo actualizada correctamente</div>`;
        } else {
            statusLog.innerText = `❌ Error: ${data.body?.mensaje || data.mensaje || 'No se pudo actualizar'}`;
        }
    } catch (e) {
        console.error("Error:", e);
        statusLog.innerText = `❌ Error de conexión al actualizar foto`;
    }
}

    // --- 6. INICIALIZACIÓN DE SUCURSALES ---
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
        {value: "Efectimundo_Ecatepec_Center_Plazas", label: "Ecatepec Center"},
        {value: "Efectimundo_Ecatepec_Chiconautla", label: "Ecatepec Chiconautla"},
        {value: "Efectimundo_Ecatepec_Gobernadora", label: "Ecatepec Gobernadora"},
        {value: "Efectimundo_Ecatepec_Jardines_de_Morelos", label: "Ecatepec Jardines"},
        {value: "Efectimundo_Ecatepec_Muzquiz", label: "Ecatepec Muzquiz"},
        {value: "Efectimundo_Ecatepec_Palomas", label: "Ecatepec Palomas"},
        {value: "Efectimundo_Ecatepec_San_Agustin", label: "Ecatepec San Agustín"},
        {value: "Efectimundo_Ecatepec_Santa_Clara", label: "Ecatepec Santa Clara"},
        {value: "Efectimundo_Galerias_Chalco", label: "Galerías Chalco"},
        {value: "Efectimundo_Gran_Patio_Ecatepec", label: "Gran Patio Ecatepec"},
        {value: "Efectimundo_Gran_Patio_Valle_de_Chalco", label: "Gran Patio Valle Chalco"},
        {value: "Efectimundo_Héroes_Chalco", label: "Héroes Chalco"},
        {value: "Efectimundo_Héroes_Ixtapaluca", label: "Héroes Ixtapaluca"},
        {value: "Efectimundo_Héroes_Tecamac_1_Seccion", label: "Héroes Tecámac 1"},
        {value: "Efectimundo_Heroes_Tizayuca", label: "Héroes Tizayuca"},
        {value: "Efectimundo_Hidalgo_Patio_Tepeji", label: "Hidalgo Patio Tepeji"},
        {value: "Efectimundo_Hidalgo_Tizayuca", label: "Hidalgo Tizayuca"},
        {value: "Efectimundo_Huehuetoca_Palacio_Municipal", label: "Huehuetoca Palacio"},
        {value: "Efectimundo_Huehuetoca_Paseo_de_la_Mora", label: "Huehuetoca Paseo Mora"},
        {value: "Efectimundo_Ixtapaluca_Cortijo", label: "Ixtapaluca Cortijo"},
        {value: "Efectimundo_Ixtapaluca_Patio_Ayotla", label: "Ixtapaluca Ayotla"},
        {value: "Efectimundo_Ixtapaluca_Plaza_San_Buenaventura", label: "Ixtapaluca Plaza San Buena"},
        {value: "Efectimundo_Iztapalapa_Desarrollo_urbano", label: "Iztapalapa Desarrollo"},
        {value: "Efectimundo_Iztapalapa_Santa_Cruz_Meyehualco", label: "Iztapalapa Meyehualco"},
        {value: "Efectimundo_Jiutepec_Morelos", label: "Jiutepec Morelos"},
        {value: "Efectimundo_Miramontes", label: "Miramontes"},
        {value: "Efectimundo_Morelos_Plan_de_Ayala", label: "Morelos Plan Ayala"},
        {value: "Efectimundo_Naucalpan_Urbina", label: "Naucalpan Urbina"},
        {value: "Efectimundo_Nezahualcoyotl_Adolfo_Lopez_Mateos", label: "Neza López Mateos"},
        {value: "Efectimundo_Nezahualcoyotl_Cuarta_Avenida", label: "Neza 4ta Av"},
        {value: "Efectimundo_Nezahualcoyotl_Madrugada", label: "Neza Madrugada"},
        {value: "Efectimundo_Nicolas_Romero", label: "Nicolás Romero"},
        {value: "Efectimundo_Oaxaca_Plaza_Bella", label: "Oaxaca Plaza Bella"},
        {value: "Efectimundo_Patio_Texcoco", label: "Patio Texcoco"},
        {value: "Efectimundo_Playa_del_Carmen_Plaza_Sofia", label: "Playa Carmen Plaza Sofía"},
        {value: "Efectimundo_Plaza_Atizapan", label: "Plaza Atizapán"},
        {value: "Efectimundo_Plaza_Centenario", label: "Plaza Centenario"},
        {value: "Efectimundo_Plaza_Chimalhuacan", label: "Plaza Chimalhuacán"},
        {value: "Efectimundo_Plaza_Coacalco", label: "Plaza Coacalco"},
        {value: "Efectimundo_Plaza_del_Salado", label: "Plaza del Salado"},
        {value: "Efectimundo_Plaza_Ecatepec", label: "Plaza Ecatepec"},
        {value: "Efectimundo_Plaza_Ixtapaluca", label: "Plaza Ixtapaluca"},
        {value: "Efectimundo_Plaza_Tizara", label: "Plaza Tizara"},
        {value: "Efectimundo_Portal_Tultitlan", label: "Portal Tultitlán"},
        {value: "Efectimundo_Puebla_Av_Independencia", label: "Puebla Av Independencia"},
        {value: "Efectimundo_Puebla_Misiones_de_San_Francisco", label: "Puebla Misiones San Fco"},
        {value: "Efectimundo_Puebla_Plaza_Centro_Sur", label: "Puebla Plaza Centro Sur"},
        {value: "Efectimundo_Puerta_Texcoco", label: "Puerta Texcoco"},
        {value: "Efectimundo_Recursos_Hidraulicos_Ecatepec", label: "Recursos Hidráulicos"},
        {value: "Efectimundo_San_Cosme", label: "San Cosme"},
        {value: "Efectimundo_San_Felipe", label: "San Felipe"},
        {value: "Efectimundo_Santiago_Tianguistenco_Toluca", label: "Santiago Tianguistenco"},
        {value: "Efectimundo_Serviplaza_Iztapalapa", label: "Serviplaza Iztapalapa"},
        {value: "Efectimundo_Tacubaya", label: "Tacubaya"},
        {value: "Efectimundo_Tecamac_Centro", label: "Tecámac Centro"},
        {value: "Efectimundo_Tecamac_Macroplaza", label: "Tecámac Macroplaza"},
        {value: "Efectimundo_Tecamac_Plaza_Bella_Mexiquense", label: "Tecámac Plaza Bella"},
        {value: "Efectimundo_Tecamac_Power_Center", label: "Tecámac Power Center"},
        {value: "Efectimundo_Texcoco_Fray_Pedro_de_Gante", label: "Texcoco Fray Pedro"},
        {value: "Efectimundo_Texcoco_Mercado_San_Antonio", label: "Texcoco Mercado San Antonio"},
        {value: "Efectimundo_Tlahuac_San_Lorenzo", label: "Tláhuac San Lorenzo"},
        {value: "Efectimundo_Tlahuac_Zapotitlan", label: "Tláhuac Zapotitlán"},
        {value: "Efectimundo_Tlalnepantla_Valle_Dorado", label: "Tlalnepantla Valle Dorado"},
        {value: "Efectimundo_Tlalpan", label: "Tlalpan"},
        {value: "Efectimundo_Tlaxcala_Centro", label: "Tlaxcala Centro"},
        {value: "Efectimundo_Tlaxcala_Santa_Ana", label: "Tlaxcala Santa Ana"},
        {value: "Efectimundo_Toluca_Juan_Aldama", label: "Toluca Juan Aldama"},
        {value: "Efectimundo_Toluca_Las_Torres", label: "Toluca Las Torres"},
        {value: "Efectimundo_Tula_Hidalgo", label: "Tula Hidalgo"},
        {value: "Efectimundo_Tultitlan", label: "Tultitlán"},
        {value: "Efectimundo_Tultitlan_Lecheria", label: "Tultitlán Lechería"},
        {value: "Efectimundo_Valle_de_Chalco", label: "Valle de Chalco"},
        {value: "Efectimundo_Villas_de_las_Flores", label: "Villas Flores"},
        {value: "Efectimundo_Zinacantepec_Toluca", label: "Zinacantepec Toluca"},
        {value: "Efectimundo_Zumpango_Plaza_Centro", label: "Zumpango Plaza Centro"}
    ];

    const modalSelect = document.getElementById('modalSessionId');
    modalSelect.innerHTML = '<option value="">--- Seleccionar ---</option>';
    allBranches.sort((a,b) => a.label.localeCompare(b.label)).forEach(b => {
        modalSelect.add(new Option(b.label, b.value));
    });

    window.onload = () => handleAction('getSession');
