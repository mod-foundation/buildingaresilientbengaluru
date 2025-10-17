mapboxgl.accessToken = 'pk.eyJ1IjoibW9kLWZvdW5kYXRpb24iLCJhIjoiY21ncnNrcmx4MXdlOTJqc2FjNW85ZnR3NSJ9.0Ha_bpb4AJ-O2pvIumHu7A';

let allLayerIds = [];

//map container
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mod-foundation/cmgt3nndf00h101sd83sj4g7x',
    center: [77.616, 12.986],
    zoom: 11
});

//views
const defaultView = {
    center: [77.616, 12.986],
    zoom: 11,
    pitch: 0,
    bearing: 0
  };
  
const dem3DView = {
    center: [77.650, 12.950],
    zoom: 10.6,
    pitch: 60,   // tilt for 3D
    bearing: -45 // rotate if you like
  };


//calling layer lists
const layerIds = ['primary-drains', 'secondary-drains', 'Lakes', 'valleys', 'valleys category', 'dem'];
const layerList = document.getElementById('layer-list');

const interactiveLayers = ['primary-drains', 'secondary-drains', 'valleys', 'Lakes']; // all your vector layers
const lineLayers = ['primary-drains', 'secondary-drains', 'valleys']; // layers that are lines and hard to click


// Close the menu on page load
const details = document.querySelector('sl-details');
details.open = false;

// Add zoom controls
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Add fullscreen control
map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

// Add scale control
map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
}), 'bottom-right');

// Add geolocate control
map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true
}), 'top-right');

// Store original paint properties for all layers
const originalLayerProperties = {};

// Save all paint properties of a layer
function storeOriginalLayerProperties(layerId) {
    const layer = map.getLayer(layerId);
    if (!layer) return;

    if (!originalLayerProperties[layerId]) {
        const paintProps = map.getStyle().layers.find(l => l.id === layerId)?.paint;
        if (paintProps) {
            originalLayerProperties[layerId] = { ...paintProps }; // copy all paint props
        }
    }
}

// Fades a single layer in or out
function fadeToggleLayer(layerId, show = true) {
    const layer = map.getLayer(layerId);
    if (!layer) return;

    storeOriginalLayerProperties(layerId); // ensure original properties are stored

    const props = originalLayerProperties[layerId];
    if (!props) return;

    const propName = {
        line: 'line-opacity',
        fill: 'fill-opacity',
        circle: 'circle-opacity',
        raster: 'raster-opacity'
    }[layer.type];

    if (!propName) return;

    const targetOpacity = show ? (props[propName] !== undefined ? props[propName] : 1) : 0;

    if (show) {
        // Restore all original properties except opacity
        for (const key in props) {
            if (key !== propName) map.setPaintProperty(layerId, key, props[key]);
        }
        map.setPaintProperty(layerId, propName, 0); // start opacity at 0
        map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
    
    gsap.to({ t: 0 }, { // start from 0
        t: targetOpacity,
        duration: show ? 1.5 : 0,
        onUpdate: function() {
            map.setPaintProperty(layerId, propName, this.targets()[0].t);
        },
        onComplete: function() {
            if (!show) map.setLayoutProperty(layerId, 'visibility', 'none');
        }
    });
}

// Toggle grouped layers
function toggleLayer(layerId, show = true) {
    const groupMapping = {
        'primary-drains': ['primary-drains', 'primary-drains-interaction', 'Halo'],
        'secondary-drains': ['secondary-drains', 'secondary-drains-interaction', 'Secondary Drains Halo'],
        'dem': ['dem', 'hillshade'],
        // add more groups here
    };

    const layersToToggle = groupMapping[layerId] || [layerId];
    layersToToggle.forEach(id => fadeToggleLayer(id, show));
}


map.on('load', () => {

        allLayerIds = map.getStyle().layers.map(l => l.id); 
        // Get an array of all layer IDs in the current map style and store in allLayerIds

        // Hide valleys category layer initially
        if (map.getLayer('valleys category')) { 
            // Check if the 'valleys category' layer exists on the map
            map.setLayoutProperty('valleys category', 'visibility', 'none'); 
            // Set its visibility to 'none', so it is hidden initially
            const checkbox = document.getElementById('layer-valleys category'); 
            // Get the corresponding checkbox in the UI (if it exists)
            if (checkbox) checkbox.checked = false; 
            // Ensure the checkbox is unchecked since the layer is hidden
        }

        layerIds.forEach(layerId => { 
            // Loop through all layers you want to create checkboxes for
            const layer = map.getLayer(layerId); 
            // Get the Mapbox layer object for the current layerId
            if (layer) { 
                // Only proceed if the layer exists in the map
                const visibility = map.getLayoutProperty(layerId, 'visibility') || 'visible'; 
                // Get current visibility of the layer; default to 'visible' if not set
                const isVisible = visibility !== 'none'; 
                // Determine if the layer is currently visible (true/false)
            
                const div = document.createElement('div'); 
                // Create a container div for this layer's checkbox
                div.className = 'layer-item'; 
                // Add a CSS class for styling the div
                
                const checkbox = document.createElement('sl-checkbox'); 
                // Create a Shoelace checkbox element
                checkbox.id = `layer-${layerId}`; 
                // Give it a unique ID based on the layerId
                checkbox.checked = isVisible; 
                // Set initial checked state based on whether the layer is visible
                checkbox.textContent = layerId.charAt(0).toUpperCase() + layerId.slice(1).replace(/-/g, ' '); 
                // Set the label of the checkbox, capitalize first letter and replace hyphens with spaces
                
                checkbox.addEventListener('sl-change', () => {
                    toggleLayer(layerId, checkbox.checked);
                });

                div.appendChild(checkbox); 
                // Add the checkbox to the container div
            
            // Add opacity slider for DEM layer
            if (layerId === 'dem') {
                const opacityContainer = document.createElement('div');
                opacityContainer.id = 'dem-opacity-container';
                opacityContainer.style.display = 'none';
                opacityContainer.style.marginTop = '2px';
                opacityContainer.style.paddingLeft= '25px';
           
           
                
                const label = document.createElement('div');
                label.style.marginBottom = '8px';
                label.style.fontFamily = "'Open Sans', sans-serif";
                label.style.fontSize = '14px';
                label.style.color = '#333';
                label.textContent = 'Opacity';
                
                const slider = document.createElement('sl-range');
                slider.id = 'dem-opacity-slider';
                slider.min = '0';
                slider.max = '100';
                slider.value = '100';
                
                opacityContainer.appendChild(label);
                opacityContainer.appendChild(slider);
                div.appendChild(opacityContainer);
                
                checkbox.addEventListener('sl-change', () => {
                    opacityContainer.style.display = checkbox.checked ? 'block' : 'none';
                });
            }

            layerList.appendChild(div);
            
            // Show opacity container if DEM layer is already visible
            if (layerId === 'dem' && isVisible) {
                document.getElementById('dem-opacity-container').style.display = 'block';
            }
        }
   
    });
            
    // Create a duplicate interaction layer
    lineLayers.forEach(layerId => {
        if (!map.getLayer(layerId)) return;
    
        // Create a duplicate interaction layer
        const interactionLayerId = layerId + '-interaction';
    
        map.addLayer({
            id: interactionLayerId,
            type: 'line',
            source: map.getLayer(layerId).source,
            'source-layer': map.getLayer(layerId)['source-layer'], // for vector tiles
            paint: {
                'line-color': '#000',   // invisible
                'line-width': 20,       // thick for click area
                'line-opacity': 0        // fully transparent
            }
        });
    });

    // Handle DEM opacity slider
    const demOpacitySlider = document.getElementById('dem-opacity-slider');
    if (demOpacitySlider) {
        demOpacitySlider.addEventListener('sl-input', () => {
            const opacity = demOpacitySlider.value / 100;
            ['dem', 'hillshade'].forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(layerId, 'raster-opacity', opacity);
              }
            });
          });
    }

    interactiveLayers.forEach(layerId => {
        const clickLayer = lineLayers.includes(layerId) ? layerId + '-interaction' : layerId;
    
        if (!map.getLayer(clickLayer)) return;
    
        map.on('click', clickLayer, (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [clickLayer] });
            if (!features.length) return;
    
            const feature = features[0];
    
            // Create a Mapbox popup at the click location
            new mapboxgl.Popup({ 
                closeButton: true,  // optional: shows a close button
                closeOnClick: true, // closes when clicking outside
                offset: [0, -10]    // offset so it doesn't cover the point
            })
            .setLngLat(e.lngLat)   // use clicked location
            .setHTML(
                Object.entries(feature.properties)
                      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                      .join('<br>')
            )
            .addTo(map);
        });
    
        map.on('mouseenter', clickLayer, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', clickLayer, () => map.getCanvas().style.cursor = '');
    });
    
});

// 1) define ordered hierarchy (top to bottom)
const orderedDetails = [
    'dem-detail',                 // level 0 (top)
    'valleys-detail',
    'lakes-detail',             // level 1 (on top of DEM)
    'drains-detail',              // level 2 (on top of valleys)
    'secondary-drains-detail'     // level 3 (most detailed)
  ];
  
  // 2) mapping detail IDs to the map layer(s) they control
  // keep your existing layerMapping or update as needed
  const layerMapping = {
    'dem-detail': ['dem', 'hillshade','white mask'],
    'valleys-detail': ['valleys'],
    'lakes-detail': ['Lakes'],
    'drains-detail': ['primary-drains', 'primary-drains-interaction','Halo'],
    'secondary-drains-detail': ['secondary-drains', 'secondary-drains-interaction','Secondary Drains Halo', 'road-secondary-tertiary','road-motorway-trunk','road-primary']
  };
  
 // 3) optional base layers that should never be turned off
const alwaysVisible = [
    'background',   // your road layer ID in Mapbox Studio (replace if different)
    'satellite',      // your satellite imagery layer ID
    'road-label',
    'place-label'
  ];
  
  // 4) hierarchical sl-show handler
  // Hierarchical sl-show handler using toggleLayer/fadeToggleLayer
  document.querySelectorAll('#panel sl-details').forEach(detail => {
    detail.addEventListener('sl-show', () => {
        const selectedId = detail.id;
        const selectedIndex = orderedDetails.indexOf(selectedId);

        // Close other details in UI
        document.querySelectorAll('#panel sl-details').forEach(d => {
            if (d !== detail) d.open = false;
        });

        // Fly to the appropriate view
        if (selectedId === 'dem-detail') {
            map.flyTo(dem3DView);

            // Toggle valleys layer on after 1 second
            setTimeout(() => {
                toggleLayer('valleys', true);   // fade in valleys
                toggleLayer('Ridge', true);
                const cb = document.getElementById('layer-valleys');
                if (cb) cb.checked = true;      // keep checkbox in sync
            }, 1000);
        } else {
            map.flyTo(defaultView);
        }

        // Loop through hierarchy
        orderedDetails.forEach((detailId, idx) => {
            const layersForDetail = layerMapping[detailId] || [];

            layersForDetail.forEach(layerId => {
                if (!map.getLayer(layerId)) return;
                const cb = document.getElementById(`layer-${layerId}`);

                if (idx < selectedIndex) {
                    // Lower hierarchy: turn on instantly
                    map.setLayoutProperty(layerId, 'visibility', 'visible');
                    if (cb) cb.checked = true;
                } else if (idx === selectedIndex) {
                    // Clicked hierarchy: fade in
                    toggleLayer(layerId, true);
                    if (cb) cb.checked = true;
                } else {
                    // Higher hierarchy: turn off
                    toggleLayer(layerId, false);
                    if (cb) cb.checked = false;
                }
            });
        });

        // Hide layers not part of the mapping
        const mappedLayerSet = new Set(Object.values(layerMapping).flat());
        allLayerIds.forEach(layerId => {
            if (!mappedLayerSet.has(layerId) && !alwaysVisible.includes(layerId)) {
                if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
                const cb = document.getElementById(`layer-${layerId}`);
                if (cb) cb.checked = false;
            }
        });

        // Handle valleys category using toggleLayer
        if (map.getLayer('valleys category')) {
            const showValleyCat = selectedId === 'valleys-detail';
            toggleLayer('valleys category', showValleyCat);
            
            const cb = document.getElementById('layer-valleys category');
            if (cb) cb.checked = showValleyCat;
        }


    });
});
