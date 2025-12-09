
// Simple procedural map generator
// Generates a fixed-size grid with regions

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;

export type TerrainType = 'GRASS' | 'WATER' | 'MOUNTAIN' | 'SAND' | 'SNOW';

export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  regionId: string;
  variation: number; // For visual variety (0-3)
}

export function generateWorldMap(): MapTile[] {
  const tiles: MapTile[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      let terrain: TerrainType = 'GRASS';
      let regionId = 'region-1'; // Default Heartlands

      // Geography Logic
      if (x > MAP_WIDTH - 4) {
        terrain = 'WATER';
        regionId = 'region-3'; // Coast
        if (x === MAP_WIDTH - 4) terrain = 'SAND'; // Beach
      } else if (y < 3 || y > MAP_HEIGHT - 4) {
        terrain = 'MOUNTAIN';
        regionId = 'region-2'; // Borderlands
        if (y === 3 || y === MAP_HEIGHT - 4) terrain = 'GRASS'; // Transition
      } else {
        // Heartlands center
        regionId = 'region-1';
        if (Math.random() > 0.9) terrain = 'WATER'; // Little lakes
      }

      tiles.push({
        x,
        y,
        terrain,
        regionId,
        variation: Math.floor(Math.random() * 4)
      });
    }
  }

  return tiles;
}



