<script lang="ts" context="module">
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
  let stickyLabels: Record<string, boolean> = {};
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
        "<div class='sticky'>STICKY</div>" +
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
        url: 'mapbox://jtlapput.2k6h4ej0',
        type: 'vector'
      });
      map.addLayer({
        id: TEMP_KFR_LAYER,
        source: 'TravisWilliamsonKFRs',
        'source-layer': 'Trav_Will_KFRs_2021-6fuhl2',
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
            'source-layer': 'Trav_Will_KFRs_2021-6fuhl2',
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

    for (const spec of markerSpecs) {
      const popup = new mapboxgl.Popup({ closeButton: false });
      popup.setHTML(htmlByLongByLat[spec.latitude][spec.longitude]);
      popup.on('close', () => {
        if (stickyLabels[spec.label]) popup.addTo(map);
      });

      const marker = new mapboxgl.Marker({ color: spec.color }).setLngLat([
        spec.longitude,
        spec.latitude
      ]);
      const markerElem = marker.getElement();
      markerElem.addEventListener('mouseenter', () => popup.addTo(map));
      markerElem.addEventListener('click', () => {
        if (stickyLabels[spec.label]) {
          stickyLabels[spec.label] = false;
          popup.removeClassName('stick');
        } else {
          stickyLabels[spec.label] = true;
          popup.addClassName('stick');
        }
      });
      markerElem.addEventListener('mouseleave', () => {
        if (!stickyLabels[spec.label]) popup.remove();
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

<div id="map" />

<style>
  #map {
    width: 100%;
    height: 600px;
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
  :global(.sticky) {
    display: none;
    font-size: 0.9em;
    text-align: center;
    color: chocolate;
    margin-bottom: 0.4em;
  }
  :global(.stick .sticky) {
    display: block;
  }
</style>
