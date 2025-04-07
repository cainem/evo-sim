import { Config } from '../Config';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';
import { RegionManager } from '../RegionManager';

describe('RegionManager', () => {
  let config: Config;
  let worldMap: WorldMap;
  let regionManager: RegionManager;
  const testSeed = 12345;

  beforeEach(() => {
    config = Config.createCustomConfig({
      worldSize: 100,
      startingOrganisms: 100,
      regionCount: 4,
      randomSeed: testSeed
    });
    const random = new SeededRandom(testSeed);
    worldMap = new WorldMap(config, random);
    regionManager = new RegionManager(config, worldMap);
  });

  describe('Region Calculation', () => {
    beforeEach(() => {
      regionManager.calculateRegions();
    });

    it('should create correct number of regions', () => {
      expect(regionManager.getRegions().length).toBe(config.regionCount);
    });

    it('should create regions that cover the entire world', () => {
      const regions = regionManager.getRegions();
      
      // Check if every point in the world is covered by exactly one region
      for (let y = 0; y < config.worldSize; y++) {
        for (let x = 0; x < config.worldSize; x++) {
          const containingRegions = regions.filter(r => r.containsPoint(x, y));
          expect(containingRegions.length).toBe(1);
        }
      }
    });

    it('should calculate reasonable carrying capacities', () => {
      const totalCapacity = regionManager.getTotalCarryingCapacity();
      
      // Due to floor rounding, total capacity should be close to but not exceed startingOrganisms
      expect(totalCapacity).toBeLessThanOrEqual(config.startingOrganisms);
      expect(totalCapacity).toBeGreaterThan(config.startingOrganisms * 0.9);
    });

    it('should identify highest points in each region', () => {
      const regions = regionManager.getRegions();
      
      regions.forEach(region => {
        const stats = region.getStatistics();
        const bounds = region.getBounds();
        
        // Verify highest point is within region bounds
        expect(stats.highestPoint.x).toBeGreaterThanOrEqual(bounds.startX);
        expect(stats.highestPoint.x).toBeLessThan(bounds.endX);
        expect(stats.highestPoint.y).toBeGreaterThanOrEqual(bounds.startY);
        expect(stats.highestPoint.y).toBeLessThan(bounds.endY);
        
        // Verify it's actually the highest point (within sampled points)
        const height = worldMap.getHeight(
          stats.highestPoint.x,
          stats.highestPoint.y
        );
        expect(stats.highestPoint.height).toBe(height);
      });
    });
  });

  describe('Region Queries', () => {
    beforeEach(() => {
      regionManager.calculateRegions();
    });

    it('should find correct region for any point', () => {
      const regions = regionManager.getRegions();
      
      regions.forEach(region => {
        const bounds = region.getBounds();
        const centerX = Math.floor((bounds.startX + bounds.endX) / 2);
        const centerY = Math.floor((bounds.startY + bounds.endY) / 2);
        
        expect(regionManager.getRegionAt(centerX, centerY)).toBe(region);
      });
    });

    it('should return null for points outside world bounds', () => {
      expect(regionManager.getRegionAt(-1, 0)).toBeNull();
      expect(regionManager.getRegionAt(0, -1)).toBeNull();
      expect(regionManager.getRegionAt(config.worldSize, 0)).toBeNull();
      expect(regionManager.getRegionAt(0, config.worldSize)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-square number of regions', () => {
      config = Config.createCustomConfig({
        worldSize: 100,
        regionCount: 3,
        startingOrganisms: 100,
        randomSeed: testSeed
      });
      regionManager = new RegionManager(config, worldMap);
      regionManager.calculateRegions();

      expect(regionManager.getRegions().length).toBe(3);
    });

    it('should handle single region', () => {
      config = Config.createCustomConfig({
        worldSize: 100,
        regionCount: 1,
        startingOrganisms: 100,
        randomSeed: testSeed
      });
      regionManager = new RegionManager(config, worldMap);
      regionManager.calculateRegions();

      const regions = regionManager.getRegions();
      expect(regions.length).toBe(1);
      
      const bounds = regions[0].getBounds();
      expect(bounds.startX).toBe(0);
      expect(bounds.startY).toBe(0);
      expect(bounds.endX).toBe(config.worldSize);
      expect(bounds.endY).toBe(config.worldSize);
    });
  });
});
