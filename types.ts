// AUTHENTICATION TYPES
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  role: 'guest' | 'user' | 'admin';
}

// MAP AND ROUTING TYPES
export interface Coordinates {
  lat: number;
  lng: number;
}

export type TransportType = 'BUS' | 'JEEP' | 'E_JEEP' | 'TRICYCLE' | 'MIXED' | 'WALK' | 'CAR';

export interface Terminal {
  id: string;
  name: string;
  address: string;
  type: TransportType;
  location: Coordinates;
  rating: number;
  routeCount: number;
}

export interface RouteStep {
  instruction: string;
  type: TransportType;
  distance: number; // in meters
  duration: number; // in seconds
  way_points: [number, number]; // index in the coordinate array
}

export interface CalculatedRoute {
  id: string;
  totalTimeMin: number;
  totalDistanceKm: number;
  totalCost: number;
  path: Coordinates[];
  steps: RouteStep[];
  type: 'FASTEST' | 'CHEAPEST' | 'SHORTEST';
  tags: string[]; // ['Fare', 'Distance', 'Time']
}

export interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  note?: string;
  icon: 'Home' | 'Briefcase' | 'Heart' | 'Star' | 'MapPin' | 'Coffee' | 'School';
}

// COMMUNITY TYPES
export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  image_url?: string;
  location?: Coordinates;
  upvotes: number;
  created_at: string;
}

export interface Report {
  type: 'GENERAL' | 'MAP_ISSUE' | 'APP_ISSUE' | 'FEEDBACK';
  description: string;
  location?: Coordinates;
  images: string[]; // URLs
}