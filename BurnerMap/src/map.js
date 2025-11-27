
// Contains all map related functions
Object.assign(app, {
    initMap: () => {
        if(app.map) return;
        app.map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
        app.layers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, tileSize: 512, zoomOffset: -1 });
        app.layers.dark.addTo(app.map);
        app.map.on('dblclick', (e) => {
                if (app.isHost) {
                    app.setRally(e.latlng);
                    app.send({ type: 'rally', lat: e.latlng.lat, lng: e.latlng.lng });
                }
            });
            app.map.on('click', (e) => {
                if (app.waypointAddMode) {
                    app.addWaypoint(e.latlng);
                    app.toggleWaypointMode(); // Exit mode after adding
                }
            });
        }
    },

    toggleWaypointMode: () => {
        app.waypointAddMode = !app.waypointAddMode;
        const btn = document.getElementById('btn-poi');
        if (app.waypointAddMode) {
            app.showToast('Tap on map to add a POI');
            btn.classList.add('bg-blue-600', 'text-white');
            L.DomUtil.addClass(app.map._container,'crosshair-cursor');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            L.DomUtil.removeClass(app.map._container,'crosshair-cursor');
        }
    },

    addWaypoint: (latlng) => {
        const name = prompt("Enter POI Name:", "New POI");
        if (!name) return;
        const waypoint = {
            id: 'wp_' + Date.now(),
            name: name,
            lat: latlng.lat,
            lng: latlng.lng,
            createdBy: app.myId,
        };
        app.waypoints.push(waypoint);
        app.drawWaypoint(waypoint);
        app.send({ type: 'waypoint_new', waypoint: waypoint });
    },

    drawWaypoint: (wp) => {
        const icon = L.divIcon({
            html: `<div class="flex flex-col items-center">
                    <div class="text-3xl">📍</div>
                    <div class="bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">${wp.name}</div>
                   </div>`,
            className: 'bg-transparent',
            iconSize: [30, 40],
            iconAnchor: [15, 40]
        });
        const marker = L.marker([wp.lat, wp.lng], { icon, draggable: true }).addTo(app.map);
        marker.wp_id = wp.id;

        marker.on('dragend', (e) => {
            const newLatLng = e.target.getLatLng();
            wp.lat = newLatLng.lat;
            wp.lng = newLatLng.lng;
            app.send({ type: 'waypoint_update', waypoint: wp });
        });

        marker.on('click', () => app.showWaypointActions(wp));
        app.markers[wp.id] = marker;
    },

    updateWaypoint: (wp) => {
        const existing = app.waypoints.find(w => w.id === wp.id);
        if (existing) {
            Object.assign(existing, wp);
            if (app.markers[wp.id]) {
                app.map.removeLayer(app.markers[wp.id]);
            }
            app.drawWaypoint(existing);
        } else {
            app.waypoints.push(wp);
            app.drawWaypoint(wp);
        }
    },

    removeWaypoint: (id) => {
        app.waypoints = app.waypoints.filter(w => w.id !== id);
        if (app.markers[id]) {
            app.map.removeLayer(app.markers[id]);
            delete app.markers[id];
        }
    },

    showWaypointActions: (wp) => {
        const content = `<h2 class="text-2xl font-bold">${wp.name}</h2>`;
        const buttons = [
            { label: 'Pan To', action: () => app.panToWaypoint(wp) },
            { label: 'Chat about this', action: () => app.startPrivateChat({ from: wp.id, username: wp.name, isWaypoint: true }), class: 'bg-green-600 text-white' },
        ];
        if (wp.createdBy === app.myId || app.isHost) {
            buttons.push({ label: 'Delete POI', action: () => app.deleteWaypoint(wp.id), class: 'bg-red-600 text-white' });
        }
        app.showActions(content, buttons);
    },

    panToWaypoint: (wp) => {
        app.map.flyTo([wp.lat, wp.lng]);
    },
    
    deleteWaypoint: (id) => {
        app.removeWaypoint(id);
        app.send({ type: 'waypoint_delete', id: id });
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
            if (!d.isSelf) {
                app.markers[d.from].on('click', () => app.showUserActions(d));
            }
        }
    },

    showUserActions: (user) => {
        if (user.isSelf) return;

        let dist = '';
        if (app.myLocation) {
            const m = app.map.distance([app.myLocation.lat, app.myLocation.lng], [user.lat, user.lng]);
            dist = m > 1000 ? (m / 1000).toFixed(1) + 'km away' : Math.round(m) + 'm away';
        }

        const content = `
            <h2 class="text-2xl font-bold">${user.username}</h2>
            <p class="text-sm opacity-60">${dist}</p>
        `;

        const buttons = [
            { label: 'Private Message', action: () => app.startPrivateChat(user), class: 'bg-blue-600 text-white' },
            { label: 'Navigate To', action: () => app.navigateTo(user) },
        ];
        app.showActions(content, buttons);
    },

    navigateTo: (user) => {
        app.showToast(`Routing to ${user.username}...`);
        app.map.flyTo([user.lat, user.lng], 18);
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
