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

            const data = await response.json();
            const resData = data.body || data;

            // Caso: Sesión ya vinculada (Éxito total)
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

            // Caso: Mostrar imagen Base64 del QR
            let qrBase64 = resData.data || (Array.isArray(resData) && resData[0]?.data);
            if (qrBase64) {
                const qrImage = document.getElementById('qrImage');
                if (qrImage) {
                    qrImage.src = `data:image/png;base64,${qrBase64}`;
                    qrImage.classList.remove('hidden');
                    
                    // Quitar spinner si existe
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
        document.getElementById(`view-${viewName}`).classList.add('active');
        document.getElementById('navTitle').innerText = viewName === 'profile' ? 'GESTOR DE PERFIL' : 'EFECTIMUNDO';
        if(viewName === 'home') document.getElementById('statusLog').classList.add('hidden');
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
