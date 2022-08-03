<script lang="ts" context="module">
  export interface MapMarkerSpec {
    label: string;
    latitude: number;
    longitude: number;
    color: string;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import * as mapboxgl from 'mapbox-gl';

  import { appInfo } from '../stores/app_info';

  export let markerSpecs: MapMarkerSpec[];

  onMount(() => {
    const map = new mapboxgl.Map({
      accessToken: $appInfo.mapToken,
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-99.1, 31.5], // longitude, latitude
      zoom: 5
    });
    map.addControl(new mapboxgl.NavigationControl());

    for (const markerSpec of markerSpecs) {
      const popup = new mapboxgl.Popup().setText(markerSpec.label);
      const marker = new mapboxgl.Marker({ color: markerSpec.color }).setLngLat([
        markerSpec.longitude,
        markerSpec.latitude
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
</style>
