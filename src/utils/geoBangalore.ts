// Bengaluru (Banashankari BDA Complex & Kanakapura Road Corridor) GIS & Landmark Data

export interface BangaloreLandmark {
  id: string;
  name: string;
  kannadaName: string;
  category: 'bda_complex' | 'metro_station' | 'metro_pillar' | 'road' | 'cricket_ground' | 'temple' | 'bus_stand' | 'residential';
  lat: number;
  lng: number;
  worldX: number; // local game world coordinates (meters)
  worldZ: number;
  height: number;
  description: string;
}

// BDA Complex Origin (Lat: 12.92544, Lng: 77.57531) = Game World (0, 0)
export const BANASHANKARI_ORIGIN = {
  lat: 12.92544,
  lng: 77.57531,
};

// Conversions for Bengaluru latitude/longitude to metric grid
const METERS_PER_DEG_LAT = 110852.0;
const METERS_PER_DEG_LNG = 108500.0;

export function geoToWorld(lat: number, lng: number): { x: number; z: number } {
  const dLat = lat - BANASHANKARI_ORIGIN.lat;
  const dLng = lng - BANASHANKARI_ORIGIN.lng;
  return {
    x: dLng * METERS_PER_DEG_LNG,
    z: -dLat * METERS_PER_DEG_LAT, // North is negative Z in standard 3D coordinate space
  };
}

export function worldToGeo(x: number, z: number): { lat: number; lng: number } {
  return {
    lat: BANASHANKARI_ORIGIN.lat - (z / METERS_PER_DEG_LAT),
    lng: BANASHANKARI_ORIGIN.lng + (x / METERS_PER_DEG_LNG),
  };
}

export const BANGALORE_LANDMARKS: BangaloreLandmark[] = [
  {
    id: 'bda-complex-main',
    name: 'Banashankari BDA Shopping Complex',
    kannadaName: 'ಬನಶಂಕರಿ ಬಿ.ಡಿ.ಎ ಕಾಂಪ್ಲೆಕ್ಸ್',
    category: 'bda_complex',
    lat: 12.92544,
    lng: 77.57531,
    worldX: 0,
    worldZ: 0,
    height: 18,
    description: '3-Story commercial hub, sprawling open central atrium, rooftop snipers nest & BDA office arcade.',
  },
  {
    id: 'bsk-metro-station',
    name: 'Banashankari Metro Station (Green Line)',
    kannadaName: 'ಬನಶಂಕರಿ ಮೆಟ್ರೋ ನಿಲ್ದಾಣ',
    category: 'metro_station',
    lat: 12.92482,
    lng: 77.57410,
    worldX: -130,
    worldZ: 68,
    height: 14,
    description: 'Elevated concourse station, turnstiles, steel skybridge connecting to TTMC.',
  },
  {
    id: 'bmtc-ttmc-busstand',
    name: 'Banashankari TTMC Bus Terminal',
    kannadaName: 'ಬಿ.ಎಂ.ಟಿ.ಸಿ ಟಿಟಿಎಂಸಿ ಬಸ್ ನಿಲ್ದಾಣ',
    category: 'bus_stand',
    lat: 12.92410,
    lng: 77.57450,
    worldX: -88,
    worldZ: 148,
    height: 12,
    description: 'Multi-level bus depot filled with green BMTC Suvarna buses and taxi bays.',
  },
  {
    id: 'bsk-temple',
    name: 'Banashankari Amma Temple Junction',
    kannadaName: 'ಶ್ರೀ ಬನಶಂಕರಿ ಅಮ್ಮನವರ ದೇವಸ್ಥಾನ',
    category: 'temple',
    lat: 12.92620,
    lng: 77.57320,
    worldX: -229,
    worldZ: -84,
    height: 15,
    description: 'Historic gopuram gateway and stone wall perimeter offering high defensive cover.',
  },
  {
    id: 'cricket-ground-2nd-stage',
    name: 'Banashankari 2nd Stage Cricket Grounds',
    kannadaName: 'ಬನಶಂಕರಿ ಕ್ರಿಕೆಟ್ ಮೈದಾನ',
    category: 'cricket_ground',
    lat: 12.92720,
    lng: 77.57680,
    worldX: 161,
    worldZ: -195,
    height: 4,
    description: 'Open turf with cricket pitch, practice nets, stadium pavilion and floodlight towers.',
  },
  {
    id: 'kanakapura-road-axis',
    name: 'Kanakapura Road Metro Viaduct Corridor',
    kannadaName: 'ಕನಕಪುರ ಮುಖ್ಯ ರಸ್ತೆ',
    category: 'road',
    lat: 12.92300,
    lng: 77.57350,
    worldX: -196,
    worldZ: 270,
    height: 12,
    description: 'Dual 6-lane arterial corridor shadowed by 40+ elevated Namma Metro concrete pillars.',
  },
];
