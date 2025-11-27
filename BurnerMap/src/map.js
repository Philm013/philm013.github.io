
// Contains all map related functions
Object.assign(app, {
    initMap: () => {
        if(app.map) return;
        app.map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
        app.layers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.dark.addTo(app.map);
        if(app.isHost) {
            document.getElementById('host-hint').style.opacity = '1';
            app.map.on('dblclick', (e) => { app.setRally(e.latlng); app.send({ type: 'rally', lat: e.latlng.lat, lng: e.latlng.lng }); });
        }
    },

    toggleSatellite: () => {
        if(app.layerMode === 'sat') {
            app.map.removeLayer(app.layers.sat);
            if(app.isLight) { app.layers.light.addTo(app.map); app.layerMode = 'light'; } else { app.layers.dark.addTo(app.map); app.layerMode = 'dark'; }
        } else {
            if(app.layerMode === 'dark') app.map.removeLayer(app.layers.dark); else app.map.removeLayer(app.layers.light);
            app.layers.sat.addTo(app.map); app.layerMode = 'sat';
        }
    },

    startLocation: () => {
        navigator.geolocation.watchPosition(pos => {
            const { latitude: lat, longitude: lng, heading } = pos.coords;
            app.myLocation = { lat, lng, heading };
            app.updateMarker({ from: app.myId, lat, lng, heading, username: 'You', isSelf: true, battery: app.battery });
            if(!app.centered) { app.map.setView([lat, lng], 16); app.centered = true; }
            app.send({ type: 'loc', lat, lng, heading });
        }, null, { enableHighAccuracy: true });
    },

    updateMarker: (d) => {
        let dist = '';
        if(app.myLocation && !d.isSelf) {
            const m = app.map.distance([app.myLocation.lat, app.myLocation.lng], [d.lat, d.lng]);
            dist = m > 1000 ? (m/1000).toFixed(1)+'km' : Math.round(m)+'m';
        }

        if(app.markers[d.from]) {
            app.markers[d.from].setLatLng([d.lat, d.lng]);
            // Rotation for heading
            if(d.heading) {
                const arrow = document.getElementById(`arrow-${d.from}`);
                if(arrow) arrow.style.transform = `translateX(-50%) rotate(${d.heading}deg)`;
            }
            // Update Dash
            const dash = document.getElementById(`dash-${d.from}`);
            if(dash) dash.innerHTML = `<span class="font-bold text-[10px] uppercase">${d.username}</span><div class="flex gap-2 text-[9px] opacity-80"><span><i class="fa-solid fa-bolt text-yellow-500"></i> ${d.battery||'?'}%</span>${dist?`<span>${dist}</span>`:''}</div>`;
        } else {
            const color = d.isSelf ? '#3b82f6' : '#fff';
            const html = `
                <div class="relative w-10 h-10 flex flex-col items-center justify-center">
                    <div class="marker-arrow" id="arrow-${d.from}" style="border-bottom-color:${color}"></div>
                    <div class="w-full h-full rounded-full bg-black border-[3px] shadow-lg relative z-10 flex items-center justify-center font-bold text-xs text-white" style="border-color:${color}; background:${d.isSelf?'#3b82f6':'#000'}">
                        ${d.username.charAt(0)}
                    </div>
                    <div id="dash-${d.from}" class="absolute bottom-[-35px] bg-black/80 backdrop-blur px-2 py-1 rounded border border-white/20 text-white flex flex-col items-center whitespace-nowrap z-[1000]">
                        <span class="font-bold text-[10px] uppercase">${d.username}</span>
                        <div class="flex gap-2 text-[9px] opacity-80"><span><i class="fa-solid fa-bolt text-yellow-500"></i> ${d.battery||'?'}%</span></div>
                    </div>
                </div>`;
            const icon = L.divIcon({ className: 'bg-transparent', html, iconSize: [40, 40], iconAnchor: [20, 20] });
            app.markers[d.from] = L.marker([d.lat, d.lng], { icon, zIndexOffset: d.isSelf?1000:0 }).addTo(app.map);
        }
    },

    forceFocus: () => {
        if(app.myLocation) {
            app.send({ type: 'focus', lat: app.myLocation.lat, lng: app.myLocation.lng });
            app.map.flyTo([app.myLocation.lat, app.myLocation.lng], 18);
            app.showToast('Focusing Group...');
        }
    },

    setRally: (coords) => {
        if(app.rallyMarker) app.map.removeLayer(app.rallyMarker);
        const icon = L.divIcon({ html: '<div class="text-4xl filter drop-shadow-lg">🚩</div>', className: 'bg-transparent', iconSize: [40,40], iconAnchor: [20,40] });
        app.rallyMarker = L.marker([coords.lat, coords.lng], { icon }).addTo(app.map);
        app.showToast('Rally Updated');
    },

    removeMarker: (id) => { if(app.markers[id]) { app.map.removeLayer(app.markers[id]); delete app.markers[id]; } },

    triggerSonar: (d) => { const m = L.marker([d.lat, d.lng], { icon: L.divIcon({ className: 'sonar-wave', iconSize: [100,100], iconAnchor: [50,50] }), zIndexOffset: -100 }).addTo(app.map); setTimeout(() => app.map.removeLayer(m), 2000); },
});
