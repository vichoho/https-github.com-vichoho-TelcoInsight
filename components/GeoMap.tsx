import React, { useEffect, useRef, useState } from 'react';
import { SignalingEvent } from '../types';
import { douglasPeucker } from '../utils/geoUtils';

interface Props {
  events: SignalingEvent[];
}

const GeoMap: React.FC<Props> = ({ events }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerGroup = useRef<any>(null);
  
  // View States
  const [viewMode, setViewMode] = useState<'points' | 'trajectory'>('points');
  const [useSmoothing, setUseSmoothing] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Dragging Logic States
  const [legendOffset, setLegendOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const baseOffset = useRef({ x: 0, y: 0 });

  // Telecom RSRP Color Standard
  const getRsrpColor = (rsrp: number) => {
    if (rsrp >= -80) return '#22c55e'; // Green (Excellent)
    if (rsrp >= -90) return '#84cc16'; // Lime (Good)
    if (rsrp >= -100) return '#eab308'; // Yellow (Fair)
    if (rsrp >= -110) return '#f97316'; // Orange (Poor)
    return '#ef4444'; // Red (Bad)
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Use window.L from CDN
    const L = (window as any).L;
    if (!L) return;

    // Create Map
    mapInstance.current = L.map(mapRef.current).setView([25.033964, 121.564472], 13);

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    layerGroup.current = L.layerGroup().addTo(mapInstance.current);

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Layers when data or mode changes
  useEffect(() => {
    if (!mapInstance.current || !layerGroup.current || events.length === 0) return;

    const L = (window as any).L;
    layerGroup.current.clearLayers();

    const validEvents = events.filter(e => !e.isOutlier);

    // Fit bounds
    const bounds = L.latLngBounds(validEvents.map(e => [e.lat, e.lng]));
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });

    // Helper to create the specific S/E/O Marker styling
    const createMarkerIcon = (event: SignalingEvent, isStart: boolean, isEnd: boolean, isOutlier: boolean) => {
      const color = getRsrpColor(event.rsrp);
      let width = 12;
      let height = 12;
      let borderRadius = '50%';
      let zIndexOffset = 0;
      let innerText = '';
      const borderColor = 'white';

      if (isStart || isEnd || isOutlier) {
         width = 16;
         height = 16;
         borderRadius = '4px'; // Rounded square
         zIndexOffset = 1000;

         if (isStart) innerText = 'S';
         else if (isEnd) innerText = 'E';
         else if (isOutlier) innerText = 'O';
      }

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: ${width}px;
          height: ${height}px;
          border-radius: ${borderRadius};
          border: 2px solid ${borderColor};
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-family: sans-serif;
          font-size: 10px;
          line-height: 1;
        ">${innerText}</div>
      `;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [width, height],
        iconAnchor: [width/2, height/2]
      });

      return { icon, zIndexOffset };
    };

    const bindPopupContent = (marker: any, event: SignalingEvent, isStart: boolean, isEnd: boolean, isOutlier: boolean) => {
      marker.bindPopup(`
        <div class="text-sm min-w-[150px]">
          <div class="font-bold mb-1 border-b border-slate-600 pb-1 flex justify-between">
             <span>${event.eventType}</span>
             <span style="color: ${getRsrpColor(event.rsrp)}">${event.rsrp} dBm</span>
          </div>
          <div class="mt-1">Time: ${new Date(event.timestamp).toLocaleTimeString()}</div>
          <div>Speed: ${event.speedKmH.toFixed(1)} km/h</div>
          ${isOutlier ? '<div class="text-red-400 font-bold mt-1">⚠️ Outlier (High Speed)</div>' : ''}
          ${isStart ? '<div class="text-green-400 font-bold mt-1">🏁 Start Point</div>' : ''}
          ${isEnd ? '<div class="text-blue-400 font-bold mt-1">🛑 End Point</div>' : ''}
        </div>
      `);
    };

    if (viewMode === 'points') {
      // POINTS MODE
      events.forEach((event, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === events.length - 1;
        const isOutlier = event.isOutlier;

        const { icon, zIndexOffset } = createMarkerIcon(event, isStart, isEnd, isOutlier);
        const marker = L.marker([event.lat, event.lng], { icon, zIndexOffset });
        bindPopupContent(marker, event, isStart, isEnd, isOutlier);
        
        layerGroup.current.addLayer(marker);
      });

    } else {
      // TRAJECTORY MODE
      
      // 1. Filter outliers first for the path (Line)
      let pathPoints = validEvents;

      // 2. Apply Douglas-Peucker Smoothing if enabled
      if (useSmoothing) {
        pathPoints = douglasPeucker(pathPoints, 0.0001);
      }

      const latlngs = pathPoints.map(e => [e.lat, e.lng]);

      // Draw Polyline
      const polyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.6,
        lineJoin: 'round'
      });
      layerGroup.current.addLayer(polyline);

      // 3. Add directional dots (Small circles) along the path
      // Only render dots that are NOT Start/End (because those get special markers in step 4)
      pathPoints.forEach((p, idx) => {
         // Check if this point is the absolute Start or End of the original event list
         const originalIndex = events.indexOf(p);
         const isStart = originalIndex === 0;
         const isEnd = originalIndex === events.length - 1;

         if (isStart || isEnd) return; // Skip, will be rendered by Special Marker loop

         if (idx % 2 === 0) {
            const fillColor = getRsrpColor(p.rsrp);
            const circle = L.circleMarker([p.lat, p.lng], {
              radius: 4,
              fillColor: fillColor,
              color: 'white',
              weight: 1,
              stroke: false,
              fillOpacity: 1
            });
            bindPopupContent(circle, p, false, false, false);
            layerGroup.current.addLayer(circle);
         }
      });

      // 4. Add Special Markers (Start, End, Outlier) from the full Event list
      // This ensures Outliers are shown even if not in the path, and Start/End get the correct S/E styling
      events.forEach((event, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === events.length - 1;
        const isOutlier = event.isOutlier;

        if (isStart || isEnd || isOutlier) {
            const { icon, zIndexOffset } = createMarkerIcon(event, isStart, isEnd, isOutlier);
            const marker = L.marker([event.lat, event.lng], { icon, zIndexOffset });
            bindPopupContent(marker, event, isStart, isEnd, isOutlier);
            layerGroup.current.addLayer(marker);
        }
      });
    }

  }, [events, viewMode, useSmoothing]);

  // Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow left click drag
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    baseOffset.current = { ...legendOffset };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      setLegendOffset({
        x: baseOffset.current.x + deltaX,
        y: baseOffset.current.y + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);


  return (
    <div className="w-full h-full relative group overflow-hidden rounded-lg">
      <div ref={mapRef} className="w-full h-full z-0" style={{ background: '#0f172a' }}></div>
      
      {/* Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-800/90 backdrop-blur p-2 rounded border border-slate-600 shadow-lg flex flex-col gap-2">
         <div className="flex bg-slate-700 rounded p-1">
            <button
               onClick={() => setViewMode('points')}
               className={`text-xs px-3 py-1 rounded transition-colors ${viewMode === 'points' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
               Points
            </button>
            <button
               onClick={() => setViewMode('trajectory')}
               className={`text-xs px-3 py-1 rounded transition-colors ${viewMode === 'trajectory' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
               Trajectory
            </button>
         </div>
         
         {viewMode === 'trajectory' && (
           <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer px-1">
              <input 
                type="checkbox" 
                checked={useSmoothing} 
                onChange={(e) => setUseSmoothing(e.target.checked)}
                className="accent-blue-500"
              />
              Optimize Path (RDP)
           </label>
         )}
      </div>

      {/* Floating Legend Container */}
      <div 
        className="absolute bottom-4 left-4 z-[400] flex flex-col items-start gap-1 cursor-move select-none active:cursor-grabbing transition-shadow hover:shadow-xl"
        style={{ transform: `translate(${legendOffset.x}px, ${legendOffset.y}px)` }}
        onMouseDown={handleMouseDown}
        title="Drag to move legend"
      >
        
        {/* Toggle Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setShowLegend(!showLegend); }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
          className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 p-1.5 rounded border border-slate-600 shadow-md text-xs flex items-center gap-1 mb-1 transition-colors"
        >
          {showLegend ? (
             <>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.071 20.485a9.97 9.97 0 002.828-9.9m-2.828 9.9a9.97 9.97 0 01-2.828-9.9m2.828 9.9l-1.414-1.414M12 16a4 4 0 100-8 4 4 0 000 8z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12l-8 8" /></svg>
               <span className="sr-only">Hide</span>
             </>
          ) : (
             <>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
               <span className="px-1 font-bold">LEGEND</span>
             </>
          )}
        </button>

        {showLegend && (
          <div className="flex flex-row items-end gap-2">
            
            {/* Legend 1: Markers */}
            <div className="bg-slate-800/90 backdrop-blur p-2 rounded border border-slate-600 shadow-lg text-xs space-y-1 min-w-[110px]">
               <div className="font-bold text-slate-400 mb-1 border-b border-slate-600 pb-1 flex items-center justify-between">
                 Trace Events
                 <span className="text-[10px] text-slate-500">::</span>
               </div>
               <div className="flex items-center gap-2">
                  <div style={{
                    backgroundColor: 'transparent',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '10px',
                    fontFamily: 'sans-serif'
                  }}>S</div>
                  <span>Start Point</span>
               </div>
               <div className="flex items-center gap-2">
                  <div style={{
                    backgroundColor: 'transparent',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '10px',
                    fontFamily: 'sans-serif'
                  }}>E</div>
                  <span>End Point</span>
               </div>
               <div className="flex items-center gap-2">
                   <div style={{
                    backgroundColor: 'transparent',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '10px',
                    fontFamily: 'sans-serif'
                  }}>O</div>
                  <span>Outlier</span>
               </div>
            </div>

            {/* Legend 2: RSRP Heatmap */}
            <div className="bg-slate-800/90 backdrop-blur p-2 rounded border border-slate-600 shadow-lg text-xs space-y-1 min-w-[130px]">
               <div className="font-bold text-slate-400 mb-1 border-b border-slate-600 pb-1 flex items-center justify-between">
                 Signal (RSRP)
                 <span className="text-[10px] text-slate-500">::</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#22c55e]"></span> 
                  <span>&gt; -80 dBm</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#84cc16]"></span> 
                  <span>-80 ~ -90</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#eab308]"></span> 
                  <span>-90 ~ -100</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#f97316]"></span> 
                  <span>-100 ~ -110</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#ef4444]"></span> 
                  <span>&lt; -110 dBm</span>
               </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default GeoMap;