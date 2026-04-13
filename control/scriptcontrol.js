    let qrInterval = null;
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

    async function handleAction(actionName) {
        const statusLog = document.getElementById('statusLog');
        const mainSelect = document.getElementById('mainSelect');
        const sessionName = document.getElementById('sessionName').value;

        if (!sessionName && actionName !== 'getSession') return alert("Selecciona una sucursal.");

        statusLog.innerText = `>> ${actionName.toUpperCase()} en curso...`;

        try {
            const response = await fetch('waha-api-dash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "body": { "SendAction": actionName, "name_session": sessionName } })
            });

            const res = await response.json();
            
            if (actionName === 'restartSession') {
                const status = res.status || (res.body && res.body.status);
                if (status !== 'WORKING') {
                    statusLog.innerText = `>> Sesión desconectada. Cargando QR...`;
                    openModal();
                    document.getElementById('modalSessionId').value = sessionName;
                    prepareQRUI("Obteniendo código QR...");
                    getQR(sessionName); 
                    return; 
                }
            }

            const sessions = res.getSession || (Array.isArray(res) && res[0]?.getSession);
            if (sessions && Array.isArray(sessions)) {
                mainSelect.innerHTML = '<option value="">--- Seleccionar Sucursal ---</option>';
                const activeNames = sessions.map(s => s.name_session);
                
                sessions.forEach(s => {
                    const icon = s.status === 'WORKING' ? '🟢' : '🔴';
                    mainSelect.add(new Option(`${icon} ${s.name_session.replace(/_/g, ' ')}`, s.name_session));
                });

                filterModalOptions(activeNames);
                statusLog.innerText = `>> Datos actualizados.`;
                updateConnectionIndicator();
            }
        } catch (e) { 
            statusLog.innerText = `>> Error de servidor.`; 
        }
    }

    async function confirmStart() {
        const val = document.getElementById('modalSessionId').value;
        if (!val) return alert('Selecciona una sucursal');
        
        prepareQRUI("Creando sesión...");

        try {
            await fetch('waha-api-dash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "body": { "SendAction": "createSession", "name_session": val } })
            });
            setTimeout(() => getQR(val), 2000);
        } catch (e) {
            document.getElementById('qrContainer').innerHTML = `<div class="p-4 text-red-500 font-bold text-xs text-center">❌ Error</div>`;
        }
    }

    async function getQR(sessionName) {
        if (qrInterval) clearInterval(qrInterval);

        qrInterval = setInterval(async () => {
            const qrImage = document.getElementById('qrImage');
            const qrStatusText = document.getElementById('qrStatusText');
            const spinner = qrImage ? qrImage.previousElementSibling : null;

            try {
                const response = await fetch('waha-api-dash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ "body": { "SendAction": "getQR", "name_session": sessionName } })
                });
                
                const resData = await response.json();
                const qrObj = resData.getQR || (Array.isArray(resData) ? resData[0]?.getQR : resData);

                if (qrObj && qrObj.data && qrImage) {
                    const mime = qrObj.mimetype || 'image/png';
                    qrImage.src = `data:${mime};base64,${qrObj.data}`;
                    qrImage.classList.remove('hidden');
                    qrStatusText.innerText = "ESCANEA EL CÓDIGO QR";
                    if (spinner) spinner.classList.add('hidden');
                }
                
                if (qrObj && qrObj.status === 'WORKING') {
                    clearInterval(qrInterval);
                    qrStatusText.innerText = "¡CONECTADO!";
                    setTimeout(() => { 
                        closeModal(); 
                        handleAction('getSession'); 
                    }, 3000);
                }
            } catch (e) { 
                console.error("Error QR:", e); 
            }
        }, 20000);
    }

    function prepareQRUI(text) {
        document.getElementById('modalForm').classList.add('hidden');
        document.getElementById('btnIniciarSesion').classList.add('hidden');
        const container = document.getElementById('qrContainer');
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
                <p id="qrStatusText" class="text-black text-[10px] font-bold uppercase text-center">${text}</p>
                <img id="qrImage" src="" alt="QR" class="w-48 h-48 hidden mt-2">
            </div>
        `;
    }

    function filterModalOptions(activeNames) {
        const modalSelect = document.getElementById('modalSessionId');
        modalSelect.innerHTML = '<option value="">--- Seleccionar ---</option>';
        allBranches.filter(b => !activeNames.includes(b.value))
            .sort((a,b) => a.label.localeCompare(b.label))
            .forEach(b => modalSelect.add(new Option(b.label, b.value)));
    }

    function updateConnectionIndicator() {
        const sel = document.getElementById('mainSelect');
        const indicator = document.getElementById('connectionStatus');
        const isWorking = sel.options[sel.selectedIndex]?.text.includes('🟢');
        indicator.className = isWorking ? "w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" : "w-2.5 h-2.5 bg-red-500 rounded-full";
    }

    function openModal() { document.getElementById('modal').classList.replace('hidden', 'flex'); }
    
    function closeModal() {
        if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
        document.getElementById('modal').classList.replace('flex', 'hidden');
        document.getElementById('qrContainer').classList.add('hidden');
        document.getElementById('modalForm').classList.remove('hidden');
        document.getElementById('btnIniciarSesion').classList.remove('hidden');
    }

    window.onload = () => handleAction('getSession');
