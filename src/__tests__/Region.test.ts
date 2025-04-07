import { Region } from '../Region';
import { RegionBounds, RegionStatistics } from '../types/RegionTypes';

describe('Region', () => {
  let region: Region;
  let bounds: RegionBounds;

  beforeEach(() => {
    bounds = {
      startX: 0,
      endX: 10,
      startY: 0,
      endY: 10
    };
    region = new Region(bounds);
  });

  describe('Boundaries', () => {
    it('should store and return correct boundaries', () => {
      expect(region.getBounds()).toEqual(bounds);
    });

    it('should calculate correct width and height', () => {
      expect(region.getWidth()).toBe(10);
      expect(region.getHeight()).toBe(10);
    });

    it('should correctly determine if a point is within bounds', () => {
      // Inside
      expect(region.containsPoint(5, 5)).toBe(true);
      
      // On edges (inclusive start, exclusive end)
      expect(region.containsPoint(0, 0)).toBe(true);
      expect(region.containsPoint(9, 9)).toBe(true);
      expect(region.containsPoint(10, 10)).toBe(false);
      
      // Outside
      expect(region.containsPoint(-1, 5)).toBe(false);
      expect(region.containsPoint(5, -1)).toBe(false);
      expect(region.containsPoint(11, 5)).toBe(false);
      expect(region.containsPoint(5, 11)).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should update and return statistics correctly', () => {
      const stats: RegionStatistics = {
        averageHeight: 50,
        carryingCapacity: 100,
        highestPoint: { x: 5, y: 5, height: 75 }
      };

      region.updateStatistics(stats);
      expect(region.getStatistics()).toEqual(stats);
    });

    it('should return a copy of statistics to prevent external modification', () => {
      const stats: RegionStatistics = {
        averageHeight: 50,
        carryingCapacity: 100,
        highestPoint: { x: 5, y: 5, height: 75 }
      };

      region.updateStatistics(stats);
      const returnedStats = region.getStatistics();
      returnedStats.averageHeight = 60;
      returnedStats.highestPoint.height = 80;

      expect(region.getStatistics()).toEqual(stats);
    });
  });
});
