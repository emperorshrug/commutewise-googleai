import { Coordinates, CalculatedRoute, RouteStep, Terminal, TransportType } from '../types';

// ==================================================================================
// ARCHITECTURAL OVERVIEW: ROUTING ENGINE
// This module simulates a routing backend by implementing Dijkstra's Algorithm entirely
// on the client side.
//
// CORE CONCEPTS:
// 1. Graph Construction: We define key locations (nodes) in Tandang Sora as "GraphNodes".
// 2. Edges & Weights: Connections between nodes have weights (Time, Distance, Cost).
// 3. Algorithm: Dijkstra's algorithm is used to find the optimal path based on user preference.
// ==================================================================================

// MOCK GRAPH NODE DEFINITION
interface GraphNode {
  id: string;
  name: string;
  address: string; // Added address
  coords: Coordinates;
  connections: {
    targetId: string;
    distanceKm: number;
    timeMin: number;
    cost: number;
    type: 'WALK' | 'RIDE';
    vehicleType?: string;
  }[];
  // Added properties for terminal visualization
  terminalType?: 'BUS' | 'JEEP' | 'E_JEEP' | 'TRICYCLE' | 'MIXED';
}

// MOCK DATA FOR TANDANG SORA (SIMPLIFIED GRAPH)
// NOTE: In a production app, this data would come from a PostGIS database or a service like OpenTripPlanner.
const GRAPH_NODES: Record<string, GraphNode> = {
  'ts_palengke': {
    id: 'ts_palengke',
    name: 'Tandang Sora Palengke',
    address: 'Tandang Sora Palengke, Tandang Sora Ave, Quezon City, 1116 Metro Manila',
    coords: { lat: 14.6741, lng: 121.0359 },
    terminalType: 'MIXED',
    connections: [
      { targetId: 'visayas_ave', distanceKm: 2.5, timeMin: 15, cost: 13, type: 'RIDE', vehicleType: 'JEEP' },
      { targetId: 'comm_ave', distanceKm: 3.0, timeMin: 20, cost: 15, type: 'RIDE', vehicleType: 'JEEP' }
    ]
  },
  'visayas_ave': {
    id: 'visayas_ave',
    name: 'Visayas Avenue Junction',
    address: 'Visayas Avenue, corner Tandang Sora Ave, Quezon City, 1128 Metro Manila',
    coords: { lat: 14.6650, lng: 121.0450 },
    terminalType: 'JEEP',
    connections: [
      { targetId: 'ts_palengke', distanceKm: 2.5, timeMin: 15, cost: 13, type: 'RIDE', vehicleType: 'JEEP' },
      { targetId: 'technohub', distanceKm: 4.0, timeMin: 25, cost: 20, type: 'RIDE', vehicleType: 'BUS' }
    ]
  },
  'comm_ave': {
    id: 'comm_ave',
    name: 'Commonwealth Avenue',
    address: 'Commonwealth Ave, Diliman, Quezon City, 1101 Metro Manila',
    coords: { lat: 14.6680, lng: 121.0550 },
    terminalType: 'BUS',
    connections: [
      { targetId: 'ts_palengke', distanceKm: 3.0, timeMin: 20, cost: 15, type: 'RIDE', vehicleType: 'JEEP' },
      { targetId: 'technohub', distanceKm: 1.5, timeMin: 5, cost: 0, type: 'WALK' } // Walking path
    ]
  },
  'technohub': {
    id: 'technohub',
    name: 'UP Ayala Technohub',
    address: 'UP Ayala Technohub, Commonwealth Ave, Diliman, Quezon City, 1101 Metro Manila',
    coords: { lat: 14.6575, lng: 121.0580 },
    terminalType: 'E_JEEP',
    connections: [
      { targetId: 'visayas_ave', distanceKm: 4.0, timeMin: 25, cost: 20, type: 'RIDE', vehicleType: 'BUS' }
    ]
  },
  'culiat_tricycle': {
    id: 'culiat_tricycle',
    name: 'Culiat Tricycle Toda',
    address: 'Culiat High School, Tandang Sora Ave, Quezon City, 1128 Metro Manila',
    coords: { lat: 14.6620, lng: 121.0500 },
    terminalType: 'TRICYCLE',
    connections: [
       { targetId: 'visayas_ave', distanceKm: 1.0, timeMin: 10, cost: 20, type: 'RIDE', vehicleType: 'TRICYCLE' }
    ]
  }
};

// --- SEARCH ALGORITHM & MOCK DATA ---

// Additional Mock Addresses for Autocomplete
const MOCK_STREETS = [
    "1 Sampaguita Ave, Quezon City, 1107 Metro Manila",
    "25 Banlat Road, Tandang Sora, Quezon City, 1116 Metro Manila",
    "St. James College, Mindanao Ave, Quezon City, 1100 Metro Manila",
    "Cherry Foodarama, Congressional Ave, Quezon City, 1100 Metro Manila",
    "Project 6, Quezon City, 1100 Metro Manila",
    "SM City North EDSA, North Avenue, corner Epifanio de los Santos Ave, Quezon City, 1100 Metro Manila"
];

// LOGIC: HYBRID SEARCH
// Combines graph node search (terminals) with a static street list for fallback.
export const searchLocations = (query: string): Array<{name: string, address: string, type: 'TERMINAL' | 'LOCATION'}> => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results: Array<{name: string, address: string, type: 'TERMINAL' | 'LOCATION'}> = [];

    // 1. Search Terminals
    Object.values(GRAPH_NODES).forEach(node => {
        if (node.name.toLowerCase().includes(lowerQuery) || node.address.toLowerCase().includes(lowerQuery)) {
            results.push({
                name: node.name,
                address: node.address,
                type: 'TERMINAL'
            });
        }
    });

    // 2. Search Mock Streets
    MOCK_STREETS.forEach(street => {
        if (street.toLowerCase().includes(lowerQuery)) {
            // Extract a "Name" from the address for display purposes
            const name = street.split(',')[0]; 
            results.push({
                name: name,
                address: street,
                type: 'LOCATION'
            });
        }
    });

    return results;
};

// HELPER: NEAREST NEIGHBOR SEARCH
// Finds the closest graph node to a given coordinate (Naive Euclidean Distance).
const findNearestNode = (lat: number, lng: number): string | null => {
  let minDesc = Infinity;
  let nearestId = null;

  Object.values(GRAPH_NODES).forEach(node => {
    const dist = Math.sqrt(Math.pow(node.coords.lat - lat, 2) + Math.pow(node.coords.lng - lng, 2));
    if (dist < minDesc) {
      minDesc = dist;
      nearestId = node.id;
    }
  });

  return nearestId;
};

// ==================================================================================
// LOGIC: DIJKSTRA'S ALGORITHM
// Calculates the optimal path between two coordinates by snapping them to the nearest
// graph nodes and traversing the edge weights.
// ==================================================================================
export const calculateRoute = (
  start: Coordinates,
  end: Coordinates,
  metric: 'TIME' | 'DISTANCE' | 'COST' = 'TIME'
): CalculatedRoute | null => {
  
  // 1. IDENTIFY START AND END NODES IN GRAPH
  const startNodeId = findNearestNode(start.lat, start.lng);
  const endNodeId = findNearestNode(end.lat, end.lng);

  if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;

  // 2. INITIALIZE ALGORITHM VARIABLES
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];
  const processed = new Set<string>();

  Object.keys(GRAPH_NODES).forEach(nodeId => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    queue.push(nodeId);
  });

  distances[startNodeId] = 0;

  // 3. MAIN LOOP (PRIORITY QUEUE MOCKED VIA ARRAY SORT)
  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift();

    if (!u || distances[u] === Infinity) break;
    if (u === endNodeId) break;

    const neighbors = GRAPH_NODES[u].connections;
    
    for (const neighbor of neighbors) {
        if (processed.has(neighbor.targetId)) continue;

        // Calculate weight based on selected metric (Time/Dist/Cost)
        let weight = 0;
        if (metric === 'TIME') weight = neighbor.timeMin;
        else if (metric === 'DISTANCE') weight = neighbor.distanceKm;
        else if (metric === 'COST') weight = neighbor.cost;

        const alt = distances[u] + weight;
        
        if (alt < distances[neighbor.targetId]) {
            distances[neighbor.targetId] = alt;
            previous[neighbor.targetId] = u;
        }
    }
    processed.add(u);
  }

  // 4. RECONSTRUCT PATH
  const path: string[] = [];
  let current: string | null = endNodeId;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  if (path[0] !== startNodeId) return null; // No path found

  // 5. BUILD RESULT OBJECT (Formatting for UI)
  const pathCoords: Coordinates[] = path.map(id => GRAPH_NODES[id].coords);
  const steps: RouteStep[] = [];
  let totalTime = 0;
  let totalDist = 0;
  let totalCost = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i+1];
    const conn = GRAPH_NODES[fromId].connections.find(c => c.targetId === toId);

    if (conn) {
        totalTime += conn.timeMin;
        totalDist += conn.distanceKm;
        totalCost += conn.cost;
        
        // Determine transport type with fallback
        const transportType: TransportType = conn.type === 'WALK' 
          ? 'WALK' 
          : (conn.vehicleType as TransportType) || 'CAR';

        steps.push({
            instruction: conn.type === 'WALK' ? `Walk to ${GRAPH_NODES[toId].name}` : `Ride ${conn.vehicleType} to ${GRAPH_NODES[toId].name}`,
            type: transportType,
            distance: conn.distanceKm * 1000, // km to meters
            duration: conn.timeMin * 60, // min to seconds
            way_points: [0, 0] // Mock waypoints
        });
    }
  }

  let routeType: 'FASTEST' | 'CHEAPEST' | 'SHORTEST' = 'FASTEST';
  if (metric === 'DISTANCE') routeType = 'SHORTEST';
  else if (metric === 'COST') routeType = 'CHEAPEST';

  const tags = metric === 'TIME' ? ['Fastest'] : metric === 'COST' ? ['Cheapest'] : ['Shortest'];

  return {
    id: `route-${Date.now()}`,
    totalTimeMin: totalTime,
    totalDistanceKm: totalDist,
    totalCost: totalCost,
    path: pathCoords,
    steps: steps,
    type: routeType,
    tags: tags
  };
};

export const getTerminals = (): Terminal[] => {
    return Object.values(GRAPH_NODES).map(node => ({
        id: node.id,
        name: node.name,
        address: node.address, // Include address
        location: node.coords,
        type: (node.terminalType || 'MIXED') as TransportType,
        rating: 4.5,
        routeCount: node.connections.length
    }));
};