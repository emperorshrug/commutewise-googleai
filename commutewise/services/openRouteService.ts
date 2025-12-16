import { Coordinates, CalculatedRoute, RouteStep } from '../types';

// ==================================================================================
// ARCHITECTURAL OVERVIEW: EXTERNAL API SERVICE
// This module handles communication with OpenRouteService (ORS) for:
// 1. Geocoding (converting text to coordinates).
// 2. Reverse Geocoding (converting coordinates to text addresses).
// 3. Direction Routing (getting polylines and turn-by-turn steps).
//
// FEATURES:
// - Throttling: Prevents hitting API rate limits.
// - Mock Fallback: Provides dummy data if the API fails or is unreachable.
// - Route Variance: Generates multiple route options (Fastest, Cheapest, Shortest)
//   from a single API response by manipulating cost/time heuristics.
// ==================================================================================

// API KEY (May be restricted, fallback implemented)
const ORS_API_KEY = '5b3ce3597851110001cf6248'; 
const ORS_BASE_URL = 'https://api.openrouteservice.org';

// --- MOCK DATA FOR FALLBACK ---
const MOCK_FALLBACK_LOCATIONS = [
    { name: "Tandang Sora Palengke", address: "Tandang Sora Ave, Quezon City", lat: 14.6741, lng: 121.0359 },
    { name: "Visayas Avenue Junction", address: "Visayas Ave, Quezon City", lat: 14.6650, lng: 121.0450 },
    { name: "Commonwealth Market", address: "Commonwealth Ave, Quezon City", lat: 14.6680, lng: 121.0550 },
    { name: "UP Ayala Technohub", address: "Commonwealth Ave, Diliman, QC", lat: 14.6575, lng: 121.0580 },
    { name: "SM City North EDSA", address: "North Avenue, Quezon City", lat: 14.6560, lng: 121.0290 },
    { name: "Trinoma Mall", address: "North Avenue, Quezon City", lat: 14.6540, lng: 121.0330 },
    { name: "Quezon City Hall", address: "Kalayaan Ave, Quezon City", lat: 14.6460, lng: 121.0490 },
    { name: "Iglesia Ni Cristo (Central)", address: "Commonwealth Ave, Quezon City", lat: 14.6610, lng: 121.0540 },
    { name: "Culiat High School", address: "Tandang Sora Ave, Quezon City", lat: 14.6620, lng: 121.0500 },
];

// --- SAFETY & THROTTLING ---
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 1000; 

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- GEOCODING (SEARCH) ---
// Queries ORS /geocode/search. Returns top 5 results focused on Philippines.
export const searchPlaces = async (query: string): Promise<Array<{name: string, address: string, lat: number, lng: number}>> => {
    if (!query || query.length < 3) return [];

    const now = Date.now();
    if (now - lastCallTime < MIN_CALL_INTERVAL) {
        await wait(200);
    }
    lastCallTime = Date.now();

    try {
        const url = `${ORS_BASE_URL}/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(query)}&boundary.country=PH&size=5`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn(`Geocoding API unavailable: ${response.statusText}`);
            throw new Error("API_ERROR");
        }

        const data = await response.json();
        
        if (!data.features) return [];

        return data.features.map((feature: any) => ({
            name: feature.properties.name,
            address: feature.properties.label,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
        }));
    } catch (error) {
        // FALLBACK: Local search if API fails
        console.warn("Geocoding failed, using fallback data.");
        const lowerQuery = query.toLowerCase();
        return MOCK_FALLBACK_LOCATIONS.filter(l => 
            l.name.toLowerCase().includes(lowerQuery) || 
            l.address.toLowerCase().includes(lowerQuery)
        );
    }
};

// --- REVERSE GEOCODING ---
// Queries ORS /geocode/reverse. Finds address from Lat/Lng.
// Logic: Prioritizes 'neighbourhood' field to find Barangay names suitable for the UI.
export const reverseGeocode = async (lat: number, lng: number): Promise<{name: string, area: string} | null> => {
    const now = Date.now();
    const timeSinceLast = now - lastCallTime;
    
    // Slight throttle even with UI debounce to prevent rapid fire if debounce is bypassed
    if (timeSinceLast < 500) {
        await wait(500); 
    }
    lastCallTime = Date.now();

    try {
        const url = `${ORS_BASE_URL}/geocode/reverse?api_key=${ORS_API_KEY}&point.lat=${lat}&point.lon=${lng}&size=1&boundary.country=PH`;
        const response = await fetch(url);

        if (!response.ok) {
             console.error("Reverse Geocode API Error:", response.status);
             throw new Error("API_ERROR");
        }

        const data = await response.json();
        if (!data.features || data.features.length === 0) {
             return { name: "Unknown Location", area: "Address not found" };
        }

        const props = data.features[0].properties;

        // Improved name extraction priority
        const name = props.neighbourhood || props.locality || props.borough || props.county || props.region || "Unknown Location";
        const area = props.name || props.street || props.label || "Unknown Area";

        return { name, area };

    } catch (error) {
        // Simple fallback if reverse geocoding fails
        console.warn("Reverse Geocode failed, using generic name.");
        return { name: "Location Coordinates", area: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
};

// --- DIRECTIONS API ---
// Queries ORS /v2/directions/driving-car/geojson.
// Returns a GeoJSON LineString and instructions.
export const getDirections = async (start: Coordinates, end: Coordinates): Promise<CalculatedRoute | null> => {
    const now = Date.now();
    const timeSinceLast = now - lastCallTime;
    if (timeSinceLast < MIN_CALL_INTERVAL) {
        await wait(MIN_CALL_INTERVAL - timeSinceLast);
    }
    lastCallTime = Date.now();

    try {
        const url = `${ORS_BASE_URL}/v2/directions/driving-car/geojson`;
        
        const body = {
            coordinates: [
                [start.lng, start.lat],
                [end.lng, end.lat]
            ],
            instructions: true,
            language: 'en',
            units: 'km'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`ORS API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) return null;

        const feature = data.features[0];
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        const path: Coordinates[] = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));

        const steps: RouteStep[] = [];
        if (props.segments) {
            props.segments.forEach((segment: any) => {
                segment.steps.forEach((step: any) => {
                    steps.push({
                        instruction: step.instruction,
                        type: 'CAR',
                        distance: step.distance,
                        duration: step.duration,
                        way_points: step.way_points
                    });
                });
            });
        }

        const distKm = props.summary.distance;
        const durationMin = Math.ceil(props.summary.duration / 60);
        // Base fare calculation logic
        const baseFare = 13; 
        const fare = baseFare + Math.max(0, (distKm - 4) * 2);

        return {
            id: `route-${Date.now()}`,
            totalTimeMin: durationMin,
            totalDistanceKm: parseFloat(distKm.toFixed(2)),
            totalCost: Math.ceil(fare),
            path: path,
            steps: steps,
            type: 'FASTEST',
            tags: ['Fare', 'Distance', 'Time']
        };

    } catch (error) {
        console.error("Routing Error:", error);
        return null;
    }
};

// --- ROUTE VARIANTS GENERATOR ---
// LOGIC: Since the free API often returns only one "Fastest" route, we simulate
// "Cheapest" and "Shortest" options by mathematically adjusting the base route properties
// to give the user a realistic "choice" UX (Mocking multiple route providers).
export const generateRouteVariants = (baseRoute: CalculatedRoute): CalculatedRoute[] => {
    const fastest: CalculatedRoute = { 
        ...baseRoute, 
        type: 'FASTEST', 
        id: baseRoute.id + '_fast',
        tags: ['Fastest', 'Comfort']
    };

    const cheapest: CalculatedRoute = {
        ...baseRoute,
        id: baseRoute.id + '_cheap',
        totalCost: Math.max(13, Math.floor(baseRoute.totalCost * 0.7)),
        totalTimeMin: Math.ceil(baseRoute.totalTimeMin * 1.3),
        type: 'CHEAPEST',
        tags: ['Budget', 'Saver']
    };

    const shortest: CalculatedRoute = {
        ...baseRoute,
        id: baseRoute.id + '_short',
        totalDistanceKm: parseFloat((baseRoute.totalDistanceKm * 0.95).toFixed(2)),
        totalTimeMin: Math.ceil(baseRoute.totalTimeMin * 1.1),
        type: 'SHORTEST',
        tags: ['Eco', 'Direct']
    };

    return [fastest, cheapest, shortest];
};