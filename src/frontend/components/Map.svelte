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

  let specsByLongByLat: Record<number, Record<number, MapMarkerSpec[]>> = {};
  let htmlByLongByLat: Record<number, Record<number, string>> = {};

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
      htmlByLong[longitude] = specs
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
    map.addControl(new mapboxgl.NavigationControl());

    for (const spec of markerSpecs) {
      const popup = new mapboxgl.Popup().setHTML(
        htmlByLongByLat[spec.latitude][spec.longitude]
      );
      const marker = new mapboxgl.Marker({ color: spec.color }).setLngLat([
        spec.longitude,
        spec.latitude
      ]);
      const element = marker.getElement();
      element.addEventListener('mouseenter', () => popup.addTo(map));
      element.addEventListener('mouseleave', () => popup.remove());
      element.classList.add('location_marker');
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
    max-width: 200px;
  }

  :global(.marker_line) {
    margin: 0.2em 0 0 1.4em;
    text-indent: -1.4em;
    line-height: 1.3em;
  }
  :global(.marker_line span) {
    font-size: 1.25em;
  }
</style>
