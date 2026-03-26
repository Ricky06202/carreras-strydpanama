<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let gpxUrl: string;
  export let raceName: string;
  
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  
  onMount(async () => {
    const leaflet = await import('leaflet');
    L = leaflet.default;
    
    map = L.map(mapContainer).setView([9.0, -79.5], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    try {
      const response = await fetch(gpxUrl);
      const gpxText = await response.text();
      
      const parser = new DOMParser();
      const gpx = parser.parseFromString(gpxText, 'text/xml');
      const tracks = gpx.getElementsByTagName('trk');
      
      if (tracks.length > 0) {
        const points = tracks[0].getElementsByTagName('trkpt');
        const coords: [number, number][] = [];
        
        for (let i = 0; i < points.length; i++) {
          const lat = parseFloat(points[i].getAttribute('lat') || '0');
          const lon = parseFloat(points[i].getAttribute('lon') || '0');
          coords.push([lat, lon]);
        }
        
        if (coords.length > 0) {
          const polyline = L.polyline(coords, {
            color: '#FF6B00',
            weight: 4,
            opacity: 0.8
          }).addTo(map);
          
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          
          L.marker(coords[0], {
            icon: L.divIcon({
              className: 'marker-start',
              html: '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>',
              iconSize: [16, 16]
            })
          }).addTo(map).bindPopup('Inicio');
          
          L.marker(coords[coords.length - 1], {
            icon: L.divIcon({
              className: 'marker-end',
              html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>',
              iconSize: [16, 16]
            })
          }).addTo(map).bindPopup('Meta');
        }
      }
    } catch (e) {
      console.error('Error loading GPX:', e);
    }
  });
  
  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div class="w-full h-96 rounded-lg overflow-hidden">
  <div bind:this={mapContainer} class="w-full h-full"></div>
</div>

<style>
  :global(.leaflet-container) {
    font-family: inherit;
  }
  :global(.marker-start), :global(.marker-end) {
    background: transparent;
    border: none;
  }
</style>