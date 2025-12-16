import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Search, ArrowUpDown, Info, Map as MapIcon, ArrowLeft, MapPin, Loader2, Footprints, Car, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { getTerminals } from '../services/routeCalculator'; 
import { searchPlaces, getDirections, generateRouteVariants, reverseGeocode } from '../services/openRouteService'; 
import { Terminal, Coordinates, CalculatedRoute } from '../types';
import { useStore } from '../store/useStore';

// ==================================================================================
// ARCHITECTURAL OVERVIEW:
// This component acts as the centralized controller for the CommuteWise map interface.
// It manages:
// 1. Map Interaction (Leaflet): Zooming, Panning, Clicking, Marker rendering.
// 2. State Management (React + Zustand): User location, Search inputs, Routing states.
// 3. API Integration: Geocoding (search/reverse) and Routing via OpenRouteService.
// 4. UI Overlays: Bottom sheets, Search pages, and Route Selection cards.
// ==================================================================================

// --- CUSTOM MAP MARKER ICONS ---

// 1. Current Location Pulsing
// RENDERING LOGIC: Uses HTML/CSS animation (animate-ping) to create a radar-like effect.
const createCurrentLocationIcon = () => L.divIcon({
    className: 'current-location-marker',
    html: `
        <div class="relative w-6 h-6">
            <div class="absolute inset-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            <div class="absolute inset-1 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// 2. Terminal Icons (Bus, Jeep, etc.)
// LOGIC: dynamically colors the marker based on transport type for quick visual identification.
const BUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="17" cy="18" r="2"/></svg>`;
const createTerminalIcon = (type: string) => {
    let colorClass = 'bg-blue-600';
    switch (type) {
        case 'JEEP': colorClass = 'bg-violet-600'; break;
        case 'E_JEEP': colorClass = 'bg-fuchsia-500'; break;
        case 'TRICYCLE': colorClass = 'bg-green-600'; break;
        case 'MIXED': colorClass = 'bg-yellow-500'; break;
        default: colorClass = 'bg-blue-600';
    }
    return L.divIcon({
        className: 'custom-terminal-marker',
        html: `
          <div class="relative w-10 h-10 flex items-center justify-center transform -translate-x-1/2 -translate-y-full">
            <div class="w-full h-full ${colorClass} rounded-[50%_50%_50%_0] transform -rotate-45 flex items-center justify-center shadow-lg border-2 border-white">
              <div class="transform rotate-45 text-white">${BUS_ICON}</div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
};

// 3. ROUTE SELECTION CARD MARKER
// LOGIC: Displays a summary card directly on the map polyline center to allow users to select a route variant.
const createRouteCardIcon = (route: CalculatedRoute, color: string) => {
    return L.divIcon({
        className: 'route-selection-card',
        html: `
            <div class="bg-white rounded-xl shadow-xl border-2 border-${color}-500 p-3 min-w-[200px] transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div class="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                    <span class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">${route.type}</span>
                    <div class="flex gap-1">
                         <span class="text-[9px] bg-slate-100 px-1 rounded text-slate-600">Fare</span>
                         <span class="text-[9px] bg-slate-100 px-1 rounded text-slate-600">Dist</span>
                         <span class="text-[9px] bg-slate-100 px-1 rounded text-slate-600">Time</span>
                    </div>
                </div>
                <div class="flex justify-between items-end mb-3">
                    <div class="text-center">
                        <div class="text-sm font-bold text-slate-800">${route.totalDistanceKm}km</div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm font-bold text-slate-800">${route.totalTimeMin}m</div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm font-bold text-green-600">₱${route.totalCost}</div>
                    </div>
                </div>
                <button 
                    onclick="window.selectRoute('${route.id}')"
                    class="w-full bg-${color}-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-${color}-700 active:scale-95 transition shadow-sm"
                >
                    SELECT ROUTE
                </button>
                <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-${color}-500 transform rotate-45"></div>
            </div>
        `,
        iconSize: [0, 0], // CSS handles size
        iconAnchor: [0, 0]
    });
};

// --- MAP COMPONENTS ---

// HELPER: PROGRAMMATICALLY MOVE MAP VIEW
const RecenterMap = ({ center, zoom }: { center: Coordinates, zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView([center.lat, center.lng], zoom || map.getZoom());
    }, [center, map, zoom]);
    return null;
}

// HELPER: FIT MAP TO SHOW ALL ROUTES
const FitBounds = ({ routes }: { routes: CalculatedRoute[] }) => {
    const map = useMap();
    useEffect(() => {
        if (routes.length > 0) {
            const group = new L.FeatureGroup();
            routes.forEach(r => {
                r.path.forEach(p => {
                    group.addLayer(L.marker([p.lat, p.lng]));
                });
            });
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }, [routes, map]);
    return null;
}

// HELPER: HANDLE RESIZE EVENTS
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
}

// LOGIC: ONE-TIME ZOOM TO USER LOCATION
// We use a flag `hasZoomed` to ensure we don't annoyingly snap back to the user's location
// if they are manually panning around the map.
const MapEventHandler = ({ 
    onMoveEnd, 
    userLocation, 
    hasZoomed, 
    setHasZoomed 
}: { 
    onMoveEnd: (lat: number, lng: number) => void,
    userLocation: Coordinates | null,
    hasZoomed: boolean,
    setHasZoomed: (z: boolean) => void
}) => {
    const map = useMapEvents({
        moveend: () => {
            const { lat, lng } = map.getCenter();
            onMoveEnd(lat, lng);
        },
    });

    useEffect(() => {
        if (userLocation && !hasZoomed) {
            map.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true });
            setHasZoomed(true);
        }
    }, [userLocation, hasZoomed, map, setHasZoomed]);

    return null;
};

// --- MAIN COMPONENT ---

export const Home: React.FC = () => {
    const [terminals, setTerminals] = useState<Terminal[]>([]);
    const navigate = useNavigate();
    
    // --- SEARCH & ROUTING STATE ---
    const [isSearchPageOpen, setIsSearchPageOpen] = useState(false);
    const [searchFrom, setSearchFrom] = useState('Current Location');
    const [searchTo, setSearchTo] = useState('');
    
    // Exact coordinates for routing API
    const [searchFromCoords, setSearchFromCoords] = useState<Coordinates | null>(null);
    const [searchToCoords, setSearchToCoords] = useState<Coordinates | null>(null);
    
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [activeField, setActiveField] = useState<'FROM' | 'TO'>('TO');
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    
    // TOKEN TO FORCE RE-EVALUATION OF DEBOUNCE TIMER ON USER INTERACTION
    const [interactionToken, setInteractionToken] = useState(0);

    const [possibleRoutes, setPossibleRoutes] = useState<CalculatedRoute[]>([]);
    const [isSelectingRoute, setIsSelectingRoute] = useState(false);
    
    // --- MAP & LOCATION STATE ---
    const [showRoutePanel, setShowRoutePanel] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationInfo, setLocationInfo] = useState({ name: "Brgy. Tandang Sora", area: "Bayan / Palengke Area" });
    const mapCenterRef = useRef<Coordinates>({ lat: 14.6741, lng: 121.0359 });
    const [viewingTerminal, setViewingTerminal] = useState<Terminal | null>(null);
    
    // --- REVERSE GEOCODING STATE (DEBOUNCED) ---
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [mapCenterForDebounce, setMapCenterForDebounce] = useState<Coordinates | null>(null);
    const [hasZoomedToUser, setHasZoomedToUser] = useState(false);

    // --- PIN SELECTION ON MAP STATE ---
    const [isPinningLocation, setIsPinningLocation] = useState<'FROM' | 'TO' | null>(null);
    const [mapCenterAddress, setMapCenterAddress] = useState('Panning map...');
    const [mapCenterCoords, setMapCenterCoords] = useState<Coordinates | null>(null);

    // --- BOTTOM SHEET GESTURE STATE ---
    const MIN_SHEET_HEIGHT = 100;
    const [sheetHeight, setSheetHeight] = useState(MIN_SHEET_HEIGHT);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);
    const sheetRef = useRef<HTMLDivElement>(null);
    const isExpanded = sheetHeight > MIN_SHEET_HEIGHT + 50;

    const [showFabMenu, setShowFabMenu] = useState(false);

    // ZUSTAND STORE
    const { 
        currentRoute, setRoute, isLoading, setLoading, 
        setSelectionMode, setHideGlobalFab, user 
    } = useStore();

    const initialCenter = { lat: 14.6741, lng: 121.0359 };

    // ==================================================================================
    // LIFECYCLE: INITIALIZATION
    // ==================================================================================
    useEffect(() => {
        // 1. Load static terminal data (mock database)
        setTerminals(getTerminals());
        
        // 2. Get User's Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(coords);
                    // Initialize Start Point to User Location if default
                    if (searchFrom === 'Current Location') setSearchFromCoords(coords);
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // ==================================================================================
    // LOGIC: SEARCH INPUT DEBOUNCING
    // - Prevents API spamming by waiting 5 seconds after typing stops.
    // - interactionToken is used to reset the timer on specific events (clicks/keys).
    // ==================================================================================
    useEffect(() => {
        const query = activeField === 'FROM' ? searchFrom : searchTo;
        
        // Validation: Do not search for short queries or default values
        if (!query || query.length <= 3 || query === 'Current Location') {
            setSuggestions([]);
            setIsSearchingSuggestions(false);
            return;
        }

        setIsSearchingSuggestions(true);
        setSuggestions([]); 

        const timer = setTimeout(async () => {
            try {
                // CALL EXTERNAL GEOCODING API
                const results = await searchPlaces(query);
                setSuggestions(results.map(r => ({ ...r, type: 'LOCATION' })));
            } catch (error) {
                console.error("Search failed", error);
                setSuggestions([]);
            } finally {
                setIsSearchingSuggestions(false);
            }
        }, 5000); 

        return () => clearTimeout(timer);
    }, [searchFrom, searchTo, activeField, interactionToken]);

    // ==================================================================================
    // LOGIC: MAP DRAGGING DEBOUNCING (REVERSE GEOCODE)
    // - When panning, we want to identify the center location address.
    // - We wait 5 seconds after the drag ends before calling the API.
    // ==================================================================================
    useEffect(() => {
        if (!mapCenterForDebounce) return;

        const timer = setTimeout(async () => {
            const { lat, lng } = mapCenterForDebounce;
            
            try {
                if (isPinningLocation) {
                    // Scenario: User is selecting a specific point for routing
                    setMapCenterAddress("Fetching address...");
                    const result = await reverseGeocode(lat, lng);
                    if (result) {
                        setMapCenterAddress(result.area || result.name);
                    } else {
                        setMapCenterAddress("Unknown Location");
                    }
                } else if (!currentRoute && !isSelectingRoute) {
                    // Scenario: General browsing, update bottom sheet info
                    const result = await reverseGeocode(lat, lng);
                    if (result) {
                        setLocationInfo(result);
                    }
                }
            } catch (err) {
                console.error("Reverse geocode failed", err);
            } finally {
                setIsResolvingAddress(false);
            }
        }, 5000); 

        return () => clearTimeout(timer);
    }, [mapCenterForDebounce, isPinningLocation, currentRoute, isSelectingRoute]);


    // EXPOSE GLOBAL HELPER FOR POPUP BUTTONS (Leaflet HTML limitations)
    useEffect(() => {
        (window as any).selectRoute = (routeId: string) => {
            const selected = possibleRoutes.find(r => r.id === routeId);
            if (selected) {
                handleSelectRoute(selected);
            }
        };
        return () => { (window as any).selectRoute = undefined; };
    }, [possibleRoutes]);

    // HIDE GLOBAL FAB ON MAP VIEW
    useEffect(() => {
        setHideGlobalFab(true);
        return () => setHideGlobalFab(false); 
    }, [setHideGlobalFab]);

    // ==================================================================================
    // LOGIC: BOTTOM SHEET GESTURE HANDLING
    // Handles touch/mouse events to drag the bottom panel up/down.
    // ==================================================================================
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            const clientY = e.clientY;
            const delta = dragStartY.current - clientY;
            const maxHeight = window.innerHeight - 80;
            const newH = Math.min(maxHeight, Math.max(MIN_SHEET_HEIGHT, dragStartHeight.current + delta));
            setSheetHeight(newH);
        };

        const handleGlobalMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            const maxHeight = window.innerHeight - 80;
            // Snap logic: if dragged past threshold, snap to top/bottom
            if (sheetHeight > MIN_SHEET_HEIGHT + 100) {
                setSheetHeight(maxHeight);
            } else {
                setSheetHeight(MIN_SHEET_HEIGHT);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, sheetHeight]);

    // --- INPUT HANDLERS ---

    const resetSearchTimer = () => {
        setInteractionToken(prev => prev + 1);
    };

    const handleSearchInput = (text: string, field: 'FROM' | 'TO') => {
        if (field === 'FROM') setSearchFrom(text); else setSearchTo(text);
    };

    // LOGIC: INPUT BLUR HANDLING
    // If user leaves the "Starting Point" field empty, we strictly revert it to "Current Location"
    // and restore the user's geolocation coordinates to ensure valid routing.
    const handleInputBlur = (field: 'FROM' | 'TO') => {
        if (field === 'FROM') {
            if (searchFrom.trim() === '') {
                setSearchFrom('Current Location');
                if (userLocation) setSearchFromCoords(userLocation);
            }
        }
    };

    const handleClearInput = (field: 'FROM' | 'TO') => {
        if (field === 'FROM') {
            setSearchFrom('');
        } else {
            setSearchTo('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        resetSearchTimer();
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const selectSuggestion = (s: any) => {
        if (activeField === 'FROM') {
            setSearchFrom(s.name);
            setSearchFromCoords({ lat: s.lat, lng: s.lng });
        } else {
            setSearchTo(s.name);
            setSearchToCoords({ lat: s.lat, lng: s.lng });
        }
        setSuggestions([]);
    };

    // ==================================================================================
    // LOGIC: ROUTE CALCULATION TRIGGER
    // 1. Validates start/end points.
    // 2. Calls Routing Service (OpenRouteService).
    // 3. Generates 3 variants (Fastest, Cheapest, Shortest).
    // ==================================================================================
    const handleSearchRoutes = async () => {
        const start = (searchFrom === 'Current Location' && userLocation) ? userLocation : searchFromCoords;
        const end = searchToCoords;

        if (!start || !end) {
            alert("Please select valid locations.");
            return;
        }

        setIsSearchPageOpen(false);
        setLoading(true);

        const realRoute = await getDirections(start, end);

        if (realRoute) {
            const variants = generateRouteVariants(realRoute);
            setPossibleRoutes(variants);
            setIsSelectingRoute(true);
        } else {
            alert('Unable to find route. Please try again.');
        }

        setLoading(false);
    };

    const handleSelectRoute = (route: CalculatedRoute) => {
        setRoute(route);
        setIsSelectingRoute(false);
        setPossibleRoutes([]);
        setShowRoutePanel(true);
    };

    const cancelRouteSelection = () => {
        setIsSelectingRoute(false);
        setPossibleRoutes([]);
        setIsSearchPageOpen(true);
    }

    const clearCurrentRoute = () => {
        setRoute(null);
        setShowRoutePanel(false);
    }

    // --- MAP SELECTION HANDLERS ---
    const startSelectOnMap = () => {
        setIsPinningLocation(activeField);
        setIsSearchPageOpen(false);
        setSelectionMode(true);
    };

    const confirmPinLocation = () => {
        if (isPinningLocation === 'FROM') {
            setSearchFrom(mapCenterAddress);
            setSearchFromCoords(mapCenterCoords);
        } else {
            setSearchTo(mapCenterAddress);
            setSearchToCoords(mapCenterCoords);
        }
        
        setIsPinningLocation(null);
        setSelectionMode(false);
        setIsSearchPageOpen(true);
    };

    const cancelPinLocation = () => {
        setIsPinningLocation(null);
        setSelectionMode(false);
        setIsSearchPageOpen(true);
    };

    // LOGIC: MAP MOVEMENT END
    // Updates internal ref for center coordinates and triggers the debounced reverse geocoding.
    const handleMapMoveEnd = async (lat: number, lng: number) => {
        mapCenterRef.current = { lat, lng };
        
        if (isPinningLocation) {
             setMapCenterCoords({ lat, lng });
             setMapCenterAddress("Identifying...");
        }

        setIsResolvingAddress(true);
        setMapCenterForDebounce({ lat, lng });
    };
    
    // --- SHEET GESTURE HELPERS ---
    const onDragStart = (clientY: number) => {
        setIsDragging(true);
        dragStartY.current = clientY;
        dragStartHeight.current = sheetHeight;
    };
    const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientY);
    const onMouseDown = (e: React.MouseEvent) => onDragStart(e.clientY);
    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const clientY = e.touches[0].clientY;
        const delta = dragStartY.current - clientY;
        const maxHeight = window.innerHeight - 80;
        const newH = Math.min(maxHeight, Math.max(MIN_SHEET_HEIGHT, dragStartHeight.current + delta));
        setSheetHeight(newH);
    };
    const onTouchEnd = () => {
        setIsDragging(false);
        const maxHeight = window.innerHeight - 80;
        if (sheetHeight > MIN_SHEET_HEIGHT + 100) setSheetHeight(maxHeight);
        else setSheetHeight(MIN_SHEET_HEIGHT);
    };
    const toggleSheet = () => {
        const maxHeight = window.innerHeight - 80;
        if (sheetHeight > MIN_SHEET_HEIGHT + 100) setSheetHeight(MIN_SHEET_HEIGHT);
        else setSheetHeight(maxHeight);
    };


    const getRouteCenter = (path: Coordinates[]) => {
        if (!path || path.length === 0) return { lat: 0, lng: 0 };
        return path[Math.floor(path.length / 2)];
    };

    const getRouteColor = (type: string) => {
        if (type === 'FASTEST') return 'blue';
        if (type === 'CHEAPEST') return 'emerald'; 
        return 'amber'; 
    };

    return (
        <div className="relative w-full h-full overflow-hidden z-0">
             
             {/* LOADING SPINNER - Only for Global Search/Route operations */}
            {isLoading && (
                <div className="absolute inset-0 z-[1000] bg-white/80 flex flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-blue-600 font-bold">Processing...</p>
                </div>
            )}

            {/* SEARCH BAR (Visible when idle) */}
            {!isSearchPageOpen && !isSelectingRoute && !currentRoute && !isPinningLocation && (
                <div className="absolute top-4 left-4 right-4 z-[400]">
                    <button 
                        onClick={() => { setIsSearchPageOpen(true); setActiveField('TO'); }}
                        className="w-full bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 active:scale-95 transition-all"
                    >
                        <div className="bg-red-50 p-2 rounded-full"><MapPin size={18} className="text-red-500" /></div>
                        <span className="text-slate-400 font-medium text-sm">Where to?</span>
                    </button>
                </div>
            )}

            {/* PIN LOCATION OVERLAY */}
            {isPinningLocation && (
                <div className="absolute inset-0 z-[500] pointer-events-none flex flex-col items-center justify-center">
                    {/* CENTER PIN - SOLID DESIGN (Teardrop Shape) */}
                    {/* Position logic: mb-10 offsets the pin so the TIP lands exactly on the screen center */}
                    <div className="mb-10 relative z-10 flex flex-col items-center justify-end pointer-events-none">
                         {/* HEAD */}
                         <div className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center z-20 ${isPinningLocation === 'FROM' ? 'bg-blue-600' : 'bg-red-600'}`}>
                             <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                         </div>
                         {/* TAIL */}
                         <div className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] -mt-1 z-10 ${isPinningLocation === 'FROM' ? 'border-t-blue-600' : 'border-t-red-600'}`}></div>
                         {/* SHADOW */}
                         <div className="w-8 h-2 bg-black/30 rounded-[100%] blur-[2px] mt-1"></div>
                    </div>
                    
                    {/* CONFIRMATION CARD */}
                    <div className="absolute bottom-10 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 pointer-events-auto space-y-3">
                        <div className="text-center">
                             <span className="text-xs font-bold text-slate-400 uppercase">Selected Location</span>
                             <p className="font-bold text-slate-800 line-clamp-1">{mapCenterAddress}</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={cancelPinLocation}
                                className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmPinLocation}
                                className={`flex-1 py-3 font-bold text-white rounded-xl ${isPinningLocation === 'FROM' ? 'bg-blue-600' : 'bg-red-600'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN SEARCH PAGE */}
            {isSearchPageOpen && (
                <div className="absolute inset-0 z-[600] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="bg-white p-4 shadow-sm border-b border-slate-200">
                        <div className="flex items-start gap-3">
                            <button onClick={() => setIsSearchPageOpen(false)} className="mt-3 p-1 rounded-full hover:bg-slate-100">
                                <ArrowLeft size={24} className="text-slate-600" />
                            </button>
                            <div className="flex-1 flex flex-col gap-3">
                                {/* FROM FIELD */}
                                <div className={`flex items-center gap-3 bg-slate-50 px-3 py-3 rounded-xl border ${activeField === 'FROM' ? 'bg-white border-blue-500 ring-1 ring-blue-200' : 'border-slate-100'}`}>
                                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-1"></div>
                                    <input 
                                        type="text" 
                                        placeholder="Starting Point" 
                                        value={searchFrom}
                                        onFocus={() => { setActiveField('FROM'); if(searchFrom === 'Current Location') setSearchFrom(''); }}
                                        onBlur={() => handleInputBlur('FROM')} 
                                        onClick={resetSearchTimer}
                                        onChange={(e) => handleSearchInput(e.target.value, 'FROM')}
                                        onKeyDown={handleKeyDown}
                                        className="bg-transparent w-full text-sm font-medium text-black outline-none placeholder:text-slate-400"
                                    />
                                    {searchFrom.length > 0 && (
                                        <button 
                                            onClick={() => handleClearInput('FROM')}
                                            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                
                                {/* TO FIELD */}
                                <div className={`flex items-center gap-3 bg-slate-50 px-3 py-3 rounded-xl border ${activeField === 'TO' ? 'bg-white border-red-500 ring-1 ring-red-200' : 'border-slate-100'}`}>
                                    <MapPin size={18} className="text-red-600 shrink-0" />
                                    <input 
                                        type="text" 
                                        placeholder="Where to?" 
                                        value={searchTo}
                                        autoFocus
                                        onFocus={() => { setActiveField('TO'); if(searchTo === 'Current Location') setSearchTo(''); }}
                                        onClick={resetSearchTimer}
                                        onChange={(e) => handleSearchInput(e.target.value, 'TO')}
                                        onKeyDown={handleKeyDown}
                                        className="bg-transparent w-full text-sm font-medium text-black outline-none placeholder:text-slate-400"
                                    />
                                    {searchTo.length > 0 && (
                                        <button 
                                            onClick={() => handleClearInput('TO')}
                                            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button className="mt-12 h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                <ArrowUpDown size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* CHARACTER LIMIT WARNING / TIP */}
                        {((activeField === 'FROM' && searchFrom.length > 0 && searchFrom.length <= 3 && searchFrom !== 'Current Location') || 
                          (activeField === 'TO' && searchTo.length > 0 && searchTo.length <= 3 && searchTo !== 'Current Location')) && (
                             <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-yellow-700 mb-0.5">Keep typing...</p>
                                    <p className="text-[10px] text-yellow-600 leading-snug">
                                        Enter at least 3 characters. Search activates automatically after 5 seconds of inactivity.
                                    </p>
                                </div>
                             </div>
                        )}

                        {/* LOADING INDICATOR FOR SUGGESTIONS */}
                        {isSearchingSuggestions && (
                             <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                                <Loader2 size={24} className="animate-spin text-blue-600" />
                                <span className="text-sm font-medium">Finding locations...</span>
                             </div>
                        )}

                        {!isSearchingSuggestions && suggestions.length === 0 && (
                            <button 
                                onClick={startSelectOnMap}
                                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition active:scale-[0.98]"
                            >
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-slate-700 text-sm">Select on Map</span>
                                    <span className="block text-xs text-slate-400">Drag pin to specific location</span>
                                </div>
                            </button>
                        )}

                        <button 
                            onClick={handleSearchRoutes}
                            disabled={!searchTo || !searchFrom}
                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            <Search size={18} /> Search Possible Routes
                        </button>

                         {suggestions.length > 0 && !isSearchingSuggestions && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">Suggestions</div>
                                {suggestions.map((s, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => selectSuggestion(s)}
                                        className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center gap-3"
                                    >
                                        <div className="bg-slate-100 p-2 rounded-full text-slate-500"><MapPin size={16} /></div>
                                        <div>
                                            <div className="font-semibold text-sm text-slate-700">{s.name}</div>
                                            <div className="text-xs text-slate-400 truncate w-64">{s.address}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                    </div>
                </div>
            )}

            {/* ROUTE SELECTION OVERLAY (Top Bar + Cancel) */}
            {isSelectingRoute && (
                <div className="absolute top-0 left-0 right-0 z-[500] p-4 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
                     <div className="pointer-events-auto flex items-center justify-between">
                         <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow border border-slate-200">
                             <span className="text-sm font-bold text-slate-700">3 Routes Found</span>
                         </div>
                         <button onClick={cancelRouteSelection} className="bg-white p-2 rounded-full shadow text-slate-600 hover:text-red-600">
                             <ArrowLeft size={20} />
                         </button>
                     </div>
                </div>
            )}

            {/* TRIP DETAILS PANEL (PHASE 2) */}
            {showRoutePanel && currentRoute && (
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.2)] z-[500] max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                     <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                             <button onClick={clearCurrentRoute} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                                 <ArrowLeft size={20} className="text-slate-600" />
                             </button>
                             <div>
                                 <h2 className="font-bold text-slate-800 text-lg leading-none">Trip Details</h2>
                                 <span className="text-xs text-blue-600 font-bold uppercase">{currentRoute.type} ROUTE</span>
                             </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                            <div className="text-center"><div className="text-lg font-bold text-slate-800">{currentRoute.totalTimeMin}m</div><div className="text-[10px] uppercase text-slate-400">Time</div></div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center"><div className="text-lg font-bold text-slate-800">{currentRoute.totalDistanceKm}km</div><div className="text-[10px] uppercase text-slate-400">Dist</div></div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center"><div className="text-lg font-bold text-green-600">₱{currentRoute.totalCost}</div><div className="text-[10px] uppercase text-slate-400">Fare</div></div>
                        </div>
                     </div>
                     
                     <div className="p-6 space-y-6">
                         <h3 className="font-bold text-slate-800">Segments</h3>
                         <div className="relative pl-4 border-l-2 border-dashed border-slate-200 ml-2 space-y-6">
                             {currentRoute.steps.map((step, idx) => (
                                 <div key={idx} className="relative pl-6">
                                     <div className="absolute -left-[25px] top-0 bg-white border border-slate-200 rounded-full p-1 text-slate-500">
                                         {step.type === 'WALK' ? <Footprints size={14} /> : <Car size={14} />}
                                     </div>
                                     <p className="text-sm font-bold text-slate-800 leading-snug">{step.instruction}</p>
                                     <p className="text-xs text-slate-500 mt-1">{step.distance}m · {Math.ceil(step.duration / 60)} min</p>
                                 </div>
                             ))}
                             <div className="relative pl-6">
                                  <div className="absolute -left-[25px] top-0 bg-red-500 border-2 border-white rounded-full p-1 text-white">
                                     <MapPin size={14} />
                                  </div>
                                  <p className="text-sm font-bold text-slate-800">Arrive at Destination</p>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {/* DRAGGABLE BOTTOM ACTION SHEET (LOCATION DETAILS) */}
            {!isSelectingRoute && !isLoading && !isSearchPageOpen && !isPinningLocation && !showRoutePanel && (
                <div 
                    ref={sheetRef}
                    className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.2)] z-[400] flex flex-col ${!isDragging ? 'transition-[height] duration-300 ease-out' : ''}`}
                    style={{ height: `${sheetHeight}px`, touchAction: 'none' }}
                >
                    <div 
                        className="w-full shrink-0 bg-white rounded-t-[2rem] cursor-grab active:cursor-grabbing border-b border-transparent relative"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onMouseDown={onMouseDown}
                        onClick={toggleSheet}
                    >
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                        </div>
                        
                        {viewingTerminal ? (
                             <div className="px-6 pt-1 pb-2 flex items-center gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setViewingTerminal(null); setSheetHeight(MIN_SHEET_HEIGHT); }} 
                                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <h2 className="font-bold text-slate-800 text-lg leading-none line-clamp-1">{viewingTerminal.name}</h2>
                                    <span className="text-xs text-slate-500">Terminal Details</span>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 pt-1 pb-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border mt-1 ${isResolvingAddress ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            {isResolvingAddress ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Info size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <h2 className={`font-bold text-lg leading-tight ${isResolvingAddress ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {isResolvingAddress ? 'Identifying location...' : locationInfo.name}
                                            </h2>
                                            <p className="text-sm text-slate-500 font-medium mb-1">
                                                {isResolvingAddress ? 'Please wait' : locationInfo.area}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`flex-1 px-6 pb-24 no-scrollbar ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                        {/* VIEW DETAILS BUTTON IF LOCATION VALID */}
                        {!viewingTerminal && !isResolvingAddress && (
                             <div className={`space-y-6 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <hr className="border-slate-100" />
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <MapIcon size={18} /> Area Overview
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                                        This area contains {terminals.length} terminals and is a key transit point for commuters in Tandang Sora.
                                    </p>
                                    <button 
                                        onClick={() => navigate('/area-report', { state: { locationInfo } })}
                                        className="w-full py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        View Full Area Report
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* TERMINAL DETAILS CONTENT */}
                        {viewingTerminal && (
                             <div className={`space-y-4 pt-4 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h1 className="text-xl font-bold text-slate-900 leading-tight">{viewingTerminal.name}</h1>
                                            <p className="text-sm text-slate-500 flex items-start gap-1 mt-1">
                                                <MapPin size={14} className="shrink-0 mt-0.5" /> 
                                                <span className="leading-snug">{viewingTerminal.address}</span>
                                            </p>
                                        </div>
                                        <div className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
                                            {viewingTerminal.type}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-4">
                                        <div className="text-center flex-1">
                                            <div className="text-lg font-bold text-slate-800">{viewingTerminal.rating}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Rating</div>
                                        </div>
                                        <div className="w-px bg-slate-200"></div>
                                        <div className="text-center flex-1">
                                            <div className="text-lg font-bold text-slate-800">{viewingTerminal.routeCount}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Routes</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAP */}
            <MapContainer 
                center={[initialCenter.lat, initialCenter.lng]} 
                zoom={14} 
                zoomControl={false}
                className="w-full h-full z-0"
            >
                <MapResizer />
                {/* Updated Handler with Zoom Logic */}
                <MapEventHandler 
                    onMoveEnd={handleMapMoveEnd} 
                    userLocation={userLocation}
                    hasZoomed={hasZoomedToUser}
                    setHasZoomed={setHasZoomedToUser}
                />
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* USER LOCATION */}
                {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={createCurrentLocationIcon()} />}
                
                {/* PHASE 1: SEARCH RESULTS (3 ROUTES) */}
                {isSelectingRoute && possibleRoutes.map(route => {
                    const color = getRouteColor(route.type);
                    const center = getRouteCenter(route.path);
                    return (
                        <React.Fragment key={route.id}>
                            <Polyline 
                                positions={route.path.map(c => [c.lat, c.lng])}
                                color={color === 'blue' ? '#2563eb' : color === 'emerald' ? '#10b981' : '#f59e0b'}
                                weight={6}
                                opacity={0.8}
                            />
                            {/* POPUP MODAL AS MARKER AT CENTER */}
                            <Marker 
                                position={[center.lat, center.lng]}
                                icon={createRouteCardIcon(route, color)}
                                zIndexOffset={1000} 
                            />
                        </React.Fragment>
                    )
                })}
                {isSelectingRoute && <FitBounds routes={possibleRoutes} />}

                {/* PHASE 2: SELECTED ROUTE */}
                {currentRoute && (
                    <>
                         <Polyline 
                            positions={currentRoute.path.map(c => [c.lat, c.lng])}
                            color="#2563eb"
                            weight={6}
                        />
                        {/* Start/End Markers */}
                        <Marker position={[currentRoute.path[0].lat, currentRoute.path[0].lng]} icon={createTerminalIcon('MIXED')} />
                        <Marker position={[currentRoute.path[currentRoute.path.length-1].lat, currentRoute.path[currentRoute.path.length-1].lng]} icon={createTerminalIcon('MIXED')} />
                        <RecenterMap center={currentRoute.path[0]} zoom={15} />
                    </>
                )}

                {/* TERMINALS (Hide when routing) */}
                {!currentRoute && !isSelectingRoute && terminals.map(t => (
                    <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={createTerminalIcon(t.type)}>
                         <Popup>
                             <div className="p-1">
                                 <h3 className="font-bold">{t.name}</h3>
                                 <button onClick={() => setViewingTerminal(t)} className="bg-slate-800 text-white text-xs px-2 py-1 rounded mt-1">View</button>
                             </div>
                         </Popup>
                    </Marker>
                ))}

            </MapContainer>
        </div>
    );
};