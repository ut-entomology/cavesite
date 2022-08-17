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
  }

  export interface MapState {
    longitude: number;
    latitude: number;
    zoom: number;
    showingKFRs: boolean;
  }
</script>

<script lang="ts">
  import { afterUpdate } from 'svelte';
  import * as mapboxgl from 'mapbox-gl';

  import { appInfo } from '../stores/app_info';

  export let initialState: MapState | null = null;
  export let baseRGB: number[];
  export let markerSpecs: MapMarkerSpec[];
  export let featureColors: string[];
  export let stateChanged: ((state: MapState) => void) | null = null;
  export let mapReady = () => {};

  interface MapRegionSource {
    propertyName: string;
    layerName: string;
    mapboxCode: string;
  }

  interface RegionSet {
    regionSources: MapRegionSource[];
    regionCount: number;
    namesPerSource: any[][];
  }

  const MARKER_RADIUS = 18;
  const MARKER_DIAMETER = MARKER_RADIUS * 2;
  const INNER_RADIUS = 8;
  const STROKE_COLOR_FACTOR = 0.85;

  const krSources: MapRegionSource[] = [
    {
      propertyName: 'Region',
      layerName: 'Karst_Regions_TSS-4adrg1',
      mapboxCode: 'jtlapput.d6bu8w0a'
    }
  ];
  const kfrSources: MapRegionSource[] = [
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
  let krRegionSet: RegionSet;
  let kfrRegionSet: RegionSet;
  let activeRegionSet: RegionSet;
  let regionSelection = initialState?.showingKFRs ? 'KFR' : 'KR';

  const markerTemplatesBySize: string[] = [];
  markerTemplatesBySize[1] = `<div><svg width="${MARKER_DIAMETER}" height="${MARKER_DIAMETER}" viewbox="0 0 ${MARKER_DIAMETER} ${MARKER_DIAMETER}" text-anchor="middle" stroke="|STROKE|" stroke-width="1px" style="display:block"><circle cx="${MARKER_RADIUS}" cy="${MARKER_RADIUS}" r="${MARKER_RADIUS}" fill="|ARC|" /><circle cx="${MARKER_RADIUS}" cy="${MARKER_RADIUS}" r="${INNER_RADIUS}" fill="#eee" /><text stroke="#555" dominant-baseline="central" transform="translate(${MARKER_RADIUS}, ${MARKER_RADIUS})">1</text></svg></div>`;

  let map: mapboxgl.Map;
  let markers: mapboxgl.Marker[];
  let popups: mapboxgl.Popup[];
  let specsByLongByLat: Record<number, Record<number, MapMarkerSpec[]>>;
  let colorsByLabel: Record<string, string>;
  let strokeColor: string;
  let pinnedLabels: Record<string, boolean>;
  let completedLayers: boolean;

  $: {
    specsByLongByLat = {};
    pinnedLabels = {};
    completedLayers = false;

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
  }

  $: {
    colorsByLabel = {};
    for (let i = 0; i < markerSpecs.length; ++i) {
      colorsByLabel[markerSpecs[i].label] = featureColors[i];
    }
  }

  $: {
    const strokeRGB = baseRGB.slice();
    for (let i = 0; i < strokeRGB.length; ++i) {
      strokeRGB[i] = Math.round(STROKE_COLOR_FACTOR * strokeRGB[i]);
    }
    strokeColor = `rgb(${strokeRGB.join(',')})`;
  }

  afterUpdate(() => {
    if (map) {
      for (const marker of markers) marker.remove();
      for (const popup of popups) popup.remove();
    } else {
      map = new mapboxgl.Map({
        accessToken: $appInfo.mapToken,
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-99.1, 31.5], // longitude, latitude
        zoom: 5
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
      map.on('load', () => {
        const regionSources = [...krSources, ...kfrSources];
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
      map.on('mousemove', (e) => {
        const featureElem = document.getElementById('feature_name');
        const features = map.queryRenderedFeatures(e.point);
        let regionName = '';
        if (features.length > 0) {
          for (const regionSource of activeRegionSet.regionSources) {
            const testName = (features[0].properties as any)[regionSource.propertyName];
            if (testName) {
              regionName = testName;
              break;
            }
          }
        }
        if (regionName == '') {
          featureElem!.classList.add('hidden');
        } else {
          featureElem!.classList.remove('hidden');
        }
        featureElem!.innerText = regionName;
      });
      map.on('idle', () => {
        const mapHiderElement = document.getElementById('map_hider');
        mapHiderElement?.classList.add('hidden');

        // All layers have to be rendered an in view on the map for any of the layer
        // names to be read, so we start with a view of all of Texas with all regions
        // shown and extract the region information before choosing initial regions.

        if (!completedLayers) {
          krRegionSet = extractRegionSet(krSources);
          kfrRegionSet = extractRegionSet(kfrSources);
          setVisibleRegions();
          completedLayers = true;
        }
        if (initialState) {
          map.setZoom(initialState.zoom);
          map.setCenter([initialState.longitude, initialState.latitude]);
          initialState = null;
        }
        mapReady();
      });
      map.on('moveend', _stateChanged);
      map.on('zoomend', _stateChanged);
    }

    markers = [];
    popups = [];
    for (const latitudeStr of Object.keys(specsByLongByLat)) {
      const latitude = parseFloat(latitudeStr);
      const specsByLong = specsByLongByLat[latitude];
      for (const longitudeStr of Object.keys(specsByLong)) {
        const longitude = parseFloat(longitudeStr);
        const specs = specsByLong[longitude];
        specs.sort((a, b) => (a.label < b.label ? -1 : 1));

        const popup = new mapboxgl.Popup({ closeButton: false });
        popup.setHTML(
          "<div class='pinned'>PINNED</div>" +
            specs
              .map(
                (spec, i) =>
                  `<div class="marker_line">` +
                  `<span style="color:${
                    colorsByLabel[specs[i].label]
                  }">&#x25cf;</span> ${spec.label}` +
                  `</div>`
              )
              .join('\n')
        );
        popup.on('close', () => {
          if (pinnedLabels[specs[0].label]) popup.addTo(map);
        });
        popups.push(popup);

        // @ts-ignore incorrect mapbox type def
        const marker = new mapboxgl.Marker({
          element: createDonutElement(specs)
        }).setLngLat([longitude, latitude]);
        markers.push(marker);

        const markerElem = marker.getElement();
        markerElem.addEventListener('mouseenter', () => popup.addTo(map));
        markerElem.addEventListener('click', () => {
          if (pinnedLabels[specs[0].label]) {
            pinnedLabels[specs[0].label] = false;
            popup.removeClassName('pin');
          } else {
            pinnedLabels[specs[0].label] = true;
            popup.addClassName('pin');
          }
        });
        markerElem.addEventListener('mouseleave', () => {
          if (!pinnedLabels[specs[0].label]) popup.remove();
        });
        markerElem.classList.add('location_marker');
        marker.setPopup(popup);
        marker.addTo(map);
      }
    }
    if (completedLayers) mapReady();
  });

  function _stateChanged() {
    if (stateChanged !== null) {
      const { lng, lat } = map.getCenter();
      stateChanged({
        latitude: lat,
        longitude: lng,
        zoom: map.getZoom(),
        showingKFRs: regionSelection == 'KFR'
      });
    }
  }

  function _toLayerSourceID(layerName: string) {
    return layerName.replaceAll(' ', '-');
  }

  function createDonutElement(specs: MapMarkerSpec[]): ChildNode {
    let template = markerTemplatesBySize[specs.length];
    if (!template) {
      let html = `<div><svg width="${MARKER_DIAMETER}" height="${MARKER_DIAMETER}" viewbox="0 0 ${MARKER_DIAMETER} ${MARKER_DIAMETER}" text-anchor="middle" stroke="|STROKE|" stroke-width="1px" style="display:block">`;
      for (let i = 0; i < specs.length; i++) {
        html += createDonutArcHtml(i / specs.length, (i + 1) / specs.length, `|ARC|`);
      }
      template =
        html +
        `<circle cx="${MARKER_RADIUS}" cy="${MARKER_RADIUS}" r="${INNER_RADIUS}" fill="#eee" /><text stroke="#555" dominant-baseline="central" transform="translate(${MARKER_RADIUS}, ${MARKER_RADIUS})">${specs.length}</text></svg></div>`;
      markerTemplatesBySize[specs.length] = template;
    }

    const segments = template.split('|');
    let specIndex = 0;
    for (let i = 0; i < segments.length; ++i) {
      if (segments[i] == 'ARC') {
        segments[i] = colorsByLabel[specs[specIndex++].label];
      } else if (segments[i] == 'STROKE') {
        segments[i] = strokeColor;
      }
    }
    const el = document.createElement('div');
    el.innerHTML = segments.join('');
    return el.firstChild!;
  }

  function createDonutArcHtml(
    startFraction: number,
    endFraction: number,
    color: string
  ) {
    const r = MARKER_RADIUS;
    const r0 = INNER_RADIUS;
    if (endFraction - startFraction === 1) endFraction -= 0.00001;
    const a0 = 2 * Math.PI * (startFraction - 0.25);
    const a1 = 2 * Math.PI * (endFraction - 0.25);
    const x0 = Math.cos(a0);
    const y0 = Math.sin(a0);
    const x1 = Math.cos(a1);
    const y1 = Math.sin(a1);
    const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;

    return `<path d="M ${r + r0 * x0} ${r + r0 * y0} L ${r + r * x0} ${
      r + r * y0
    } A ${r} ${r} 0 ${largeArc} 1 ${r + r * x1} ${r + r * y1} L ${r + r0 * x1} ${
      r + r0 * y1
    } A ${r0} ${r0} 0 ${largeArc} 0 ${r + r0 * x0} ${r + r0 * y0}" fill="${color}" />`;
  }

  function setVisibleRegions() {
    if (regionSelection == 'KR') {
      removeRegionSet(kfrRegionSet);
      renderRegionSet(krRegionSet);
    } else {
      removeRegionSet(krRegionSet);
      renderRegionSet(kfrRegionSet);
    }
  }

  function extractRegionSet(regionSources: MapRegionSource[]): RegionSet {
    const features = map.queryRenderedFeatures({
      // @ts-ignore error in type definition
      layers: regionSources.map((src) => _toLayerSourceID(src.layerName))
    });
    const namesPerSource: any[][] = [];
    let regionCount = 0;
    for (const regionSource of regionSources) {
      const regionNames: string[] = [];
      for (const feature of features) {
        const regionName = (feature as any).properties[regionSource.propertyName];
        if (regionName !== undefined && !regionNames.includes(regionName)) {
          regionNames.push(regionName);
          ++regionCount;
        }
      }
      namesPerSource.push(regionNames);
    }
    return { regionSources, regionCount, namesPerSource };
  }

  function removeRegionSet(regionSet: RegionSet): void {
    for (const regionSource of regionSet.regionSources) {
      const sourceID = _toLayerSourceID(regionSource.layerName);
      map.removeLayer(sourceID);
    }
  }

  function renderRegionSet(regionSet: RegionSet): void {
    const fillColors: string[] = [];
    for (let i = 0; i < regionSet.regionCount; ++i) {
      fillColors.push(`hsl(${i * (360 / regionSet.regionCount)}, 50%, 50%)`);
    }

    // Render the KFRs each in a unique color.

    let fillColorIndex = 0;
    for (let i = 0; i < regionSet.regionSources.length; ++i) {
      const regionSource = regionSet.regionSources[i];
      const regionNames = regionSet.namesPerSource[i];
      const fillColorField: any[] = ['match', ['get', regionSource.propertyName]];
      for (const regionName of regionNames) {
        fillColorField.push(regionName);
        fillColorField.push(fillColors[fillColorIndex++]);
      }
      fillColorField.push('gray'); // default color

      const sourceID = _toLayerSourceID(regionSource.layerName);
      if (!completedLayers) map.removeLayer(sourceID);
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
    activeRegionSet = regionSet;
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
  <div id="region_controls">
    <div class="btn-group" role="group" aria-label="Switch between data and admin tabs">
      <input
        type="radio"
        class="btn-check"
        bind:group={regionSelection}
        name="region_switch"
        id="kr_selector"
        value="KR"
        on:change={setVisibleRegions}
      />
      <label class="btn btn-outline-primary compact" for="kr_selector">KR</label>
      <input
        type="radio"
        class="btn-check"
        bind:group={regionSelection}
        name="region_switch"
        id="kfr_selector"
        value="KFR"
        on:change={setVisibleRegions}
      />
      <label class="btn btn-outline-primary compact" for="kfr_selector">KFR</label>
    </div>
    <div id="feature_name" class="hidden" />
  </div>
  <div id="map_hider" />
</div>

<style lang="scss">
  @import '../variables.scss';

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
  #region_controls {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0.5rem 0.75rem;
    font-size: 0.95rem;
  }
  #region_controls .btn-group {
    float: left;
    border-radius: $border-radius;
    background-color: white;
  }

  #feature_name {
    float: left;
    margin-left: 0.5rem;
    background-color: rgba(255, 255, 255, 0.75);
    padding: 0.1rem 0.5rem;
  }
  #map_hider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: white;
  }

  :global(.mapboxgl-canvas) {
    width: 100% !important;
  }

  :global(.location_marker) {
    cursor: pointer;
  }

  :global(.mapboxgl-popup) {
    max-width: 260px !important;
  }
  :global(.mapboxgl-popup-content) {
    padding-bottom: 12px !important;
  }

  :global(.marker_line) {
    margin: 0.3em 0 0 1.6em;
    text-indent: -1.6em;
    line-height: 1.3em;
  }
  :global(.marker_line span) {
    font-size: 2.2em;
    vertical-align: text-bottom;
  }
  :global(.pinned) {
    display: none;
    font-size: 0.9em;
    text-align: center;
    color: chocolate;
    margin-bottom: 0.2em;
  }
  :global(.pin .pinned) {
    display: block;
  }
</style>
