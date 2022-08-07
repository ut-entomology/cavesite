<script lang="ts" context="module">
  /*
    How to replace a shapefile:
    
    - Login to your account at https://studio.mapbox.com/tilesets/
    - Click the "..." next to the name of the shapefile.
    - Click "Replace" to replace the shapefile.
  */
  export interface MapMarkerSpec {
    label: string;
    latitude: number;
    longitude: number;
    color: string;
  }
</script>

<script lang="ts">
  import { afterUpdate } from 'svelte';
  import * as mapboxgl from 'mapbox-gl';

  import { appInfo } from '../stores/app_info';

  export let markerSpecs: MapMarkerSpec[];

  const TEMP_KFR_LAYER = 'Temporary KFRs';

  let specsByLongByLat: Record<number, Record<number, MapMarkerSpec[]>> = {};
  let htmlByLongByLat: Record<number, Record<number, string>> = {};
  let pinnedLabels: Record<string, boolean> = {};
  let completedLayers = false;

  for (const spec of markerSpecs) {
    let specsByLong = specsByLongByLat[spec.latitude];
    if (!specsByLong) {
      specsByLong = {};
      specsByLongByLat[spec.latitude] = specsByLong;
    }
    let specs = specsByLong[spec.longitude];
    if (!specs) {
      specs = [];
      specsByLong[spec.longitude] = specs;
    }
    specs.push(spec);
  }
  for (const latitudeStr of Object.keys(specsByLongByLat)) {
    const latitude = parseFloat(latitudeStr);
    const specsByLong = specsByLongByLat[latitude];
    for (const longitudeStr of Object.keys(specsByLong)) {
      const longitude = parseFloat(longitudeStr);
      const specs = specsByLong[longitude];
      specs.sort((a, b) => (a.label < b.label ? -1 : 1));
      let htmlByLong = htmlByLongByLat[latitude];
      if (!htmlByLong) {
        htmlByLong = {};
        htmlByLongByLat[latitude] = htmlByLong;
      }
      htmlByLong[longitude] =
        "<div class='pinned'>PINNED</div>" +
        specs
          .map(
            (spec) =>
              `<div class="marker_line">` +
              `<span style="color:${spec.color}">&#x25cf;</span> ${spec.label}` +
              `</div>`
          )
          .join('\n');
    }
  }

  afterUpdate(() => {
    const map = new mapboxgl.Map({
      accessToken: $appInfo.mapToken,
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-99.1, 31.5], // longitude, latitude
      zoom: 5
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
    map.on('load', () => {
      map.addSource('TravisWilliamsonKFRs', {
        url: 'mapbox://jtlapput.3idlwl9a',
        type: 'vector'
      });
      map.addLayer({
        id: TEMP_KFR_LAYER,
        source: 'TravisWilliamsonKFRs',
        'source-layer': 'Trav_Will_KFRs-356oa0',
        type: 'fill'
      });

      map.on('idle', () => {
        // Don't add layers again upon going idle for the second time.
        if (!completedLayers) {
          // Extract the KFRs currently visible in the temporary KFR layer.

          // @ts-ignore error in type definition
          const features = map.queryRenderedFeatures({ layers: [TEMP_KFR_LAYER] });
          const kfrs = features.map((feature) => (feature as any).properties.KFR);
          const fillColors: any[] = ['match', ['get', 'KFR']];
          for (let i = 0; i < kfrs.length; ++i) {
            fillColors.push(kfrs[i]);
            fillColors.push(`hsl(${i * (360 / kfrs.length)}, 50%, 50%)`);
          }
          fillColors.push('gray'); // default color

          // Render the KFRs for real this time.

          map.removeLayer(TEMP_KFR_LAYER);
          map.addLayer({
            id: 'KFRs',
            source: 'TravisWilliamsonKFRs',
            'source-layer': 'Trav_Will_KFRs-356oa0',
            type: 'fill',
            paint: {
              'fill-color': fillColors as any,
              'fill-opacity': 0.35,
              'fill-outline-color': '#000'
            }
          });
          completedLayers = true;
        }
      });
    });
    map.on('mousemove', (e) => {
      const featureElem = document.getElementById('feature_name');
      const features = map.queryRenderedFeatures(e.point);
      let kfrName =
        (features.length == 0 ? '' : (features[0].properties as any).KFR) || '';
      if (kfrName == '') {
        featureElem!.classList.add('hidden');
      } else {
        featureElem!.classList.remove('hidden');
      }
      featureElem!.innerText = 'KFR: ' + kfrName;
    });

    for (const spec of markerSpecs) {
      const popup = new mapboxgl.Popup({ closeButton: false });
      popup.setHTML(htmlByLongByLat[spec.latitude][spec.longitude]);
      popup.on('close', () => {
        if (pinnedLabels[spec.label]) popup.addTo(map);
      });

      const marker = new mapboxgl.Marker({ color: spec.color }).setLngLat([
        spec.longitude,
        spec.latitude
      ]);
      const markerElem = marker.getElement();
      markerElem.addEventListener('mouseenter', () => popup.addTo(map));
      markerElem.addEventListener('click', () => {
        if (pinnedLabels[spec.label]) {
          pinnedLabels[spec.label] = false;
          popup.removeClassName('pin');
        } else {
          pinnedLabels[spec.label] = true;
          popup.addClassName('pin');
        }
      });
      markerElem.addEventListener('mouseleave', () => {
        if (!pinnedLabels[spec.label]) popup.remove();
      });
      markerElem.classList.add('location_marker');
      marker.setPopup(popup);
      marker.addTo(map);
    }
  });
</script>

<svelte:head>
  <link
    href="https://api.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.css"
    rel="stylesheet"
  />
</svelte:head>

<div id="map_area">
  <div id="map" />
  <div id="feature_name" class="hidden" />
</div>

<style lang="scss">
  #map_area {
    width: 100%;
    height: 600px;
    position: relative;
  }
  #map {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  #feature_name {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0.5rem;
    background-color: rgba(255, 255, 255, 0.75);
    padding: 0.1rem 0.5rem;
    font-size: 0.95rem;
  }

  :global(.location_marker) {
    cursor: pointer;
  }

  :global(.mapboxgl-popup) {
    max-width: 220px;
  }

  :global(.marker_line) {
    margin: 0.2em 0 0 1.4em;
    text-indent: -1.4em;
    line-height: 1.3em;
  }
  :global(.marker_line span) {
    font-size: 1.25em;
  }
  :global(.pinned) {
    display: none;
    font-size: 0.9em;
    text-align: center;
    color: chocolate;
    margin-bottom: 0.4em;
  }
  :global(.pin .pinned) {
    display: block;
  }
</style>
