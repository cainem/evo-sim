import { RegionBounds, HighestPoint, RegionStatistics } from './types/RegionTypes';

export class Region {
  private readonly bounds: RegionBounds;
  private averageHeight: number = 0;
  private carryingCapacity: number = 0;
  private highestPoint: HighestPoint = { x: 0, y: 0, height: 0 };

  constructor(bounds: RegionBounds) {
    this.bounds = bounds;
  }

  /**
   * Updates the region's statistics
   */
  public updateStatistics(stats: RegionStatistics): void {
    this.averageHeight = stats.averageHeight;
    this.carryingCapacity = stats.carryingCapacity;
    this.highestPoint = { ...stats.highestPoint };
  }

  /**
   * Gets the region's boundaries
   */
  public getBounds(): RegionBounds {
    return { ...this.bounds };
  }

  /**
   * Gets the region's statistics
   */
  public getStatistics(): RegionStatistics {
    return {
      averageHeight: this.averageHeight,
      carryingCapacity: this.carryingCapacity,
      highestPoint: { ...this.highestPoint }
    };
  }

  /**
   * Checks if a point is within this region's boundaries
   */
  public containsPoint(x: number, y: number): boolean {
    return x >= this.bounds.startX && x < this.bounds.endX &&
           y >= this.bounds.startY && y < this.bounds.endY;
  }

  /**
   * Gets the width of the region
   */
  public getWidth(): number {
    return this.bounds.endX - this.bounds.startX;
  }

  /**
   * Gets the height of the region
   */
  public getHeight(): number {
    return this.bounds.endY - this.bounds.startY;
  }
}
