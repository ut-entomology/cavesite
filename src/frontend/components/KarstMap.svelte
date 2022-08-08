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

  interface MapRegionSource {
    propertyName: string;
    layerName: string;
    mapboxCode: string;
  }

  const regionSources: MapRegionSource[] = [
    {
      propertyName: 'Name',
      layerName: 'Bexar_KFRs-2lu38z',
      mapboxCode: 'jtlapput.3rmne8o7'
    },
    {
      propertyName: 'KFR',
      layerName: 'Trav_Will_KFRs-356oa0',
      mapboxCode: 'jtlapput.3idlwl9a'
    }
  ];

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
      for (const regionSource of regionSources) {
        const sourceID = _toLayerSourceID(regionSource.layerName);
        map.addSource(sourceID, {
          url: 'mapbox://' + regionSource.mapboxCode,
          type: 'vector'
        });
        map.addLayer({
          id: sourceID,
          source: sourceID,
          'source-layer': regionSource.layerName,
          type: 'fill'
        });
      }
    });
    map.on('idle', () => {
      // Don't add layers again upon going idle for the second time.
      if (!completedLayers) {
        // Extract the names of the currently visible KFRs.

        const features = map.queryRenderedFeatures({
          // @ts-ignore error in type definition
          layers: regionSources.map((src) => _toLayerSourceID(src.layerName))
        });
        const kfrNamesPerSource: any[][] = [];
        let kfrCount = 0;
        for (const regionSource of regionSources) {
          const kfrNames: string[] = [];
          for (const feature of features) {
            const kfrName = (feature as any).properties[regionSource.propertyName];
            if (kfrName !== undefined && !kfrNames.includes(kfrName)) {
              kfrNames.push(kfrName);
              ++kfrCount;
            }
          }
          kfrNamesPerSource.push(kfrNames);
        }
        const fillColors: string[] = [];
        for (let i = 0; i < kfrCount; ++i) {
          fillColors.push(`hsl(${i * (360 / kfrCount)}, 50%, 50%)`);
        }

        // Render the KFRs each in a unique color.

        let fillColorIndex = 0;
        for (const regionSource of regionSources) {
          const kfrNames = kfrNamesPerSource.shift()!;
          const fillColorField: any[] = ['match', ['get', regionSource.propertyName]];
          for (const kfrName of kfrNames) {
            fillColorField.push(kfrName);
            fillColorField.push(fillColors[fillColorIndex++]);
          }
          fillColorField.push('gray'); // default color

          const sourceID = _toLayerSourceID(regionSource.layerName);
          map.removeLayer(sourceID);
          map.addLayer({
            id: sourceID,
            source: sourceID,
            'source-layer': regionSource.layerName,
            type: 'fill',
            paint: {
              'fill-color': fillColorField as any,
              'fill-opacity': 0.35,
              'fill-outline-color': '#000'
            }
          });
        }
        completedLayers = true;
      }
    });
    map.on('mousemove', (e) => {
      const featureElem = document.getElementById('feature_name');
      const features = map.queryRenderedFeatures(e.point);
      let kfrName = '';
      if (features.length > 0) {
        for (const regionSource of regionSources) {
          const testName = (features[0].properties as any)[regionSource.propertyName];
          if (testName) {
            kfrName = testName;
            break;
          }
        }
      }
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

  function _toLayerSourceID(layerName: string) {
    return layerName.replaceAll(' ', '-');
  }
</script>

<svelte:head>
  <link
    href="https://api.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.css"
    rel="stylesheet"
  />
</svelte:head>

<div id="map_box">
  <div id="map" />
  <div id="feature_name" class="hidden" />
</div>

<style lang="scss">
  #map_box {
    flex-grow: 1;
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

  :global(.mapboxgl-canvas) {
    width: 100% !important;
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