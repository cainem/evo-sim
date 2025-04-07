import { Config } from './Config';
import { WorldMap } from './WorldMap';
import { Region } from './Region';
import { RegionBounds, RegionStatistics } from './types/RegionTypes';

export class RegionManager {
  private regions: Region[] = [];
  private readonly SAMPLE_GRID_SIZE = 10;

  constructor(
    private readonly config: Config,
    private readonly worldMap: WorldMap
  ) {}

  /**
   * Calculates and initializes all regions
   */
  public calculateRegions(): void {
    this.regions = [];
    const regionBounds = this.calculateRegionBoundaries();

    let totalAverageHeight = 0;

    // Calculate initial statistics for each region
    regionBounds.forEach(bounds => {
      const region = new Region(bounds);
      const stats = this.calculateRegionStatistics(bounds);
      totalAverageHeight += stats.averageHeight;
      this.regions.push(region);
    });

    // Calculate carrying capacities based on relative heights
    this.regions.forEach((region, index) => {
      const stats = this.calculateRegionStatistics(regionBounds[index]);
      const relativeHeight = stats.averageHeight / totalAverageHeight;
      const carryingCapacity = Math.floor(
        this.config.startingOrganisms * relativeHeight
      );

      region.updateStatistics({
        ...stats,
        carryingCapacity
      });
    });
  }

  /**
   * Calculates the boundaries for all regions
   */
  private calculateRegionBoundaries(): RegionBounds[] {
    const bounds: RegionBounds[] = [];
    const regionsPerSide = Math.ceil(Math.sqrt(this.config.regionCount));
    const regionWidth = Math.ceil(this.config.worldSize / regionsPerSide);
    const regionHeight = Math.ceil(this.config.worldSize / regionsPerSide);

    for (let y = 0; y < regionsPerSide; y++) {
      for (let x = 0; x < regionsPerSide; x++) {
        if (bounds.length < this.config.regionCount) {
          bounds.push({
            startX: x * regionWidth,
            endX: Math.min((x + 1) * regionWidth, this.config.worldSize),
            startY: y * regionHeight,
            endY: Math.min((y + 1) * regionHeight, this.config.worldSize)
          });
        }
      }
    }

    return bounds;
  }

  /**
   * Calculates statistics for a single region
   */
  private calculateRegionStatistics(bounds: RegionBounds): RegionStatistics {
    let totalHeight = 0;
    let samplesCount = 0;
    let highestPoint = { x: bounds.startX, y: bounds.startY, height: -1 };

    // Calculate sample points spacing
    const stepX = Math.max(1, Math.floor((bounds.endX - bounds.startX) / this.SAMPLE_GRID_SIZE));
    const stepY = Math.max(1, Math.floor((bounds.endY - bounds.startY) / this.SAMPLE_GRID_SIZE));

    // Sample heights in a grid pattern
    for (let y = bounds.startY; y < bounds.endY; y += stepY) {
      for (let x = bounds.startX; x < bounds.endX; x += stepX) {
        const height = this.worldMap.getHeight(x, y);
        totalHeight += height;
        samplesCount++;

        if (height > highestPoint.height) {
          highestPoint = { x, y, height };
        }
      }
    }

    return {
      averageHeight: totalHeight / samplesCount,
      carryingCapacity: 0, // Will be calculated later
      highestPoint
    };
  }

  /**
   * Gets all regions
   */
  public getRegions(): Region[] {
    return [...this.regions];
  }

  /**
   * Gets the region containing the specified point
   */
  public getRegionAt(x: number, y: number): Region | null {
    return this.regions.find(region => region.containsPoint(x, y)) || null;
  }

  /**
   * Gets the total carrying capacity across all regions
   */
  public getTotalCarryingCapacity(): number {
    return this.regions.reduce(
      (sum, region) => sum + region.getStatistics().carryingCapacity,
      0
    );
  }
}
