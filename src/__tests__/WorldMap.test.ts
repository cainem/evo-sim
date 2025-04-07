import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { WorldMap } from '../WorldMap';

describe('WorldMap', () => {
  let config: Config;
  let random: SeededRandom;
  let worldMap: WorldMap;
  const testSeed = 12345;
  const worldSize = 100;
  const worldMaxHeight = 50;

  beforeEach(() => {
    config = Config.createCustomConfig({
      worldSize,
      worldMaxHeight,
      randomSeed: testSeed
    });
    random = new SeededRandom(testSeed);
    worldMap = new WorldMap(config, random);
  });

  describe('Height map generation', () => {
    it('should generate consistent height maps for the same seed', () => {
      // Create two world maps with the same seed
      const random1 = new SeededRandom(testSeed);
      const random2 = new SeededRandom(testSeed);
      const map1 = new WorldMap(config, random1);
      const map2 = new WorldMap(config, random2);

      // Compare height maps
      const heightMap1 = map1.getRawHeightMap();
      const heightMap2 = map2.getRawHeightMap();

      // Check if all heights match
      for (let x = 0; x < worldSize; x++) {
        for (let y = 0; y < worldSize; y++) {
          expect(heightMap1[x][y]).toBe(heightMap2[x][y]);
        }
      }
    });

    it('should generate different height maps for different seeds', () => {
      const random1 = new SeededRandom(testSeed);
      const random2 = new SeededRandom(testSeed + 1);
      const map1 = new WorldMap(config, random1);
      const map2 = new WorldMap(config, random2);

      const heightMap1 = map1.getRawHeightMap();
      const heightMap2 = map2.getRawHeightMap();

      // Check that at least some heights are different
      let hasDifference = false;
      for (let x = 0; x < worldSize && !hasDifference; x++) {
        for (let y = 0; y < worldSize && !hasDifference; y++) {
          if (heightMap1[x][y] !== heightMap2[x][y]) {
            hasDifference = true;
          }
        }
      }
      expect(hasDifference).toBe(true);
    });

    it('should clamp heights between 0 and worldMaxHeight', () => {
      const heightMap = worldMap.getRawHeightMap();

      for (let x = 0; x < worldSize; x++) {
        for (let y = 0; y < worldSize; y++) {
          expect(heightMap[x][y]).toBeGreaterThanOrEqual(0);
          expect(heightMap[x][y]).toBeLessThanOrEqual(worldMaxHeight);
        }
      }
    });
  });

  describe('getHeight', () => {
    it('should return correct height for coordinates within bounds', () => {
      const x = 5;
      const y = 10;
      const heightMap = worldMap.getRawHeightMap();
      expect(worldMap.getHeight(x, y)).toBe(heightMap[x][y]);
    });

    it('should handle wrap-around for negative coordinates', () => {
      const heightMap = worldMap.getRawHeightMap();
      
      // Test negative x
      expect(worldMap.getHeight(-1, 5))
        .toBe(heightMap[worldSize - 1][5]);
      
      // Test negative y
      expect(worldMap.getHeight(5, -1))
        .toBe(heightMap[5][worldSize - 1]);
      
      // Test both negative
      expect(worldMap.getHeight(-1, -1))
        .toBe(heightMap[worldSize - 1][worldSize - 1]);
    });

    it('should handle wrap-around for coordinates beyond world size', () => {
      const heightMap = worldMap.getRawHeightMap();
      
      // Test x > worldSize
      expect(worldMap.getHeight(worldSize + 5, 5))
        .toBe(heightMap[5][5]);
      
      // Test y > worldSize
      expect(worldMap.getHeight(5, worldSize + 5))
        .toBe(heightMap[5][5]);
      
      // Test both > worldSize
      expect(worldMap.getHeight(worldSize + 5, worldSize + 5))
        .toBe(heightMap[5][5]);
    });
  });

  describe('Gaussian parameters', () => {
    it('should generate valid Gaussian parameters', () => {
      const params = worldMap.getGaussianParameters();
      
      expect(params.length).toBeGreaterThan(0);
      
      for (const param of params) {
        expect(param.amplitude).toBeGreaterThan(0);
        expect(param.amplitude).toBeLessThanOrEqual(worldMaxHeight);
        expect(param.sigma).toBeGreaterThan(0);
        expect(param.centerX).toBeGreaterThanOrEqual(0);
        expect(param.centerX).toBeLessThan(worldSize);
        expect(param.centerY).toBeGreaterThanOrEqual(0);
        expect(param.centerY).toBeLessThan(worldSize);
      }
    });
  });
});
