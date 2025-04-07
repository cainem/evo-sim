export interface RegionBounds {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export interface HighestPoint {
  x: number;
  y: number;
  height: number;
}

export interface RegionStatistics {
  averageHeight: number;
  carryingCapacity: number;
  highestPoint: HighestPoint;
}
