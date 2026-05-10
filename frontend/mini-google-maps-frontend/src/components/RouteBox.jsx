import React from 'react';

function formatDistance(meters) {
  if (!meters || meters <= 0) return '--';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function RouteBox({
  destination,
  stops = [],
  awaitingStart,
  awaitingStop,
  onFindRoute,
  onUseCurrentLocation,
  onAddStop,
  onClearStops,
  onClear,
  onSaveRoute,
  routeFound,
  distanceMeters,
  estimates,
  onFitRoute,
  pathPointsCount,
  navActive,
  onToggleNavigation,
  isLoadingML = false,
  segments = []
}) {
  return (
    <div className="routebox" role="region" aria-live="polite">
      {navActive ? (
        <>
          <div className="meta">Navigation</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>
                {formatDistance(distanceMeters)}
              </div>
              <div style={{fontSize:13,color:'var(--muted)'}}>{destination ? (destination.name || '') : ''}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="button" onClick={onFitRoute}>Center route</button>
              <button className="button" onClick={onAddStop}>Add Stop</button>
              <button className="button" onClick={onToggleNavigation}>Stop Navigation</button>
            </div>
          </div>
          <div style={{display:'flex',gap:30,marginBottom:8}}>
            <div style={{minWidth:140, display:'flex',gap:5, alignItems:'flex-end'}}>
              <div style={{fontSize:14,color:'var(--muted)',marginRight:4}}><i class="fa-solid fa-car"></i></div>
              <div style={{fontWeight:500, fontSize:'14px'}}>{estimates?.driving || '--'}</div>
            </div>
            <div style={{minWidth:140, display:'flex',gap:5, alignItems:'flex-end'}}>
              <div style={{fontSize:14,color:'var(--muted)',marginRight:4}}><i class="fa-solid fa-person-walking"></i></div>
              <div style={{fontWeight:500, fontSize:'14px'}}>{estimates?.walking || '--'}</div>
            </div>
          </div>
        </>
      ) : routeFound ? (
        <>
          <div className="meta">Distance</div>

          {/* ML Risk Indicator */}
          {isLoadingML && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#f0f9ff',borderRadius:8,marginBottom:8,fontSize:13}}>
              <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</span>
              <span style={{color:'#0369a1'}}>Analyzing road risk...</span>
            </div>
          )}
          {!isLoadingML && segments.length > 0 && (
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              {[['#4ade80','Safe'],['#facc15','Moderate'],['#f97316','Risky'],['#f87171','Dangerous']].map(([color,label]) => {
                const count = segments.filter(s => s.color === color).length;
                if (!count) return null;
                return (
                  <span key={label} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:99,background:color+'22',fontSize:12,fontWeight:500}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:color,display:'inline-block'}}></span>
                    {label}: {count}
                  </span>
                );
              })}
            </div>
          )}
          {/* Prominent distance like Google Maps */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>
                {formatDistance(distanceMeters)}
              </div>
              <div style={{fontSize:13,color:'var(--muted)'}}>{destination ? (destination.name || '') : ''}</div>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="button" onClick={onFitRoute} title="Fit route on map">Center route</button>
              <button className="button" onClick={onSaveRoute} title="Save route">Save</button>
              <button className="button" onClick={onToggleNavigation}>Start Navigation</button>
            </div>
          </div>

          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:8,justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:30}}>
              <div style={{minWidth:140, display:'flex',gap:5, alignItems:'flex-end'}}>
                <div style={{fontSize:14,color:'var(--muted)',marginRight:4}}><i class="fa-solid fa-car"></i></div>
                <div style={{fontWeight:500, fontSize:'14px'}}>{estimates?.driving || '--'}</div>
              </div>
              <div style={{minWidth:140, display:'flex',gap:5, alignItems:'flex-end'}}>
                <div style={{fontSize:14,color:'var(--muted)',marginRight:4}}><i class="fa-solid fa-person-walking"></i></div>
                <div style={{fontWeight:500, fontSize:'14px'}}>{estimates?.walking || '--'}</div>
              </div>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="button" onClick={onClear}>Clear</button>
            </div>
          </div>
          
        </>
      ) : destination ? (
        <>
          <div className="meta">Destination</div>
          <div style={{fontWeight:700,color:'var(--text)',marginBottom:6}}>
            {destination.name || `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`}
          </div>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>
            {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
          </div>

          <div className="actions">
            <div style={{display:'flex',gap:8}}>
              <button className="button" onClick={onFindRoute}>Find Route</button>
              <button className="button" onClick={onClear}>Clear</button>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="button" onClick={onAddStop}>Add Stop</button>
              {stops.length > 0 && (
                <button className="button" onClick={onClearStops}>Clear Stops</button>
              )}
              {awaitingStart ? (
                <button className="button" onClick={onUseCurrentLocation}>Use Current Location</button>
              ) : null}
            </div>
          </div>

          {awaitingStart && <div style={{marginTop:8,color:'var(--muted)',fontSize:13}}>Click map to place starting point or use your current location.</div>}
          {awaitingStop && <div style={{marginTop:6,color:'var(--muted)',fontSize:13}}>Click map or pick from search to add a stop.</div>}
        </>
      ) : (
        <div style={{fontSize:13,color:'var(--muted)'}}>Select a destination on the map or via search to plan your route.</div>
      )}
    </div>
  );
}
