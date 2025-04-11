import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { WorldMap } from '../WorldMap';
import { GaussianParameters } from '../types/GaussianParameters';

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

  describe('Flat Map Normalization Edge Case', () => {
    it('should handle completely flat maps (rawRange near zero)', () => {
      // Setup specific to this test
      const testSeedIsolated = 99999;
      const worldSizeIsolated = 50; 
      const worldMaxHeightIsolated = 20;
      const configIsolated = Config.createCustomConfig({
        worldSize: worldSizeIsolated,
        worldMaxHeight: worldMaxHeightIsolated,
        randomSeed: testSeedIsolated
      });
      // Need a random instance for the mocked generator, even if not fully used
      const randomIsolated = new SeededRandom(testSeedIsolated);

      // Mock generateGaussianParameters directly for this instance using jest.spyOn
      const generateParamsSpy = jest.spyOn(WorldMap.prototype as any, 'generateGaussianParameters');
      generateParamsSpy.mockImplementation((): GaussianParameters => {
        // Return parameters that will result in a flat map (amplitude = 0)
        // Keep sigma > 0 to avoid division by zero
        // Use the config and random instance available in this scope
        const sigma = randomIsolated.nextFloat(configIsolated.worldSize * 0.02, configIsolated.worldSize * 0.08); // Keep sigma > 0
        // Ensure sigma is not exactly zero due to float precision, provide a minimum
        const safeSigma = Math.max(sigma, 1e-9); 
        
        return {
          amplitude: 0, 
          centerX: randomIsolated.nextFloat(0, configIsolated.worldSize),
          centerY: randomIsolated.nextFloat(0, configIsolated.worldSize),
          sigma: safeSigma 
        };
      });

      try {
        // Create the map - it will use the mocked generator
        const flatMap = new WorldMap(configIsolated, randomIsolated);
        const heightMap = flatMap.getRawHeightMap();

        let firstProblematicValue: number | undefined | null = 0;
        let foundProblem = false;

        for (let x = 0; x < worldSizeIsolated && !foundProblem; x++) {
          for (let y = 0; y < worldSizeIsolated && !foundProblem; y++) {
            const value = heightMap[x]?.[y];
            
            // Check if value is not a finite number close to zero
            if (typeof value !== 'number' || !isFinite(value) || Math.abs(value) > 1e-9) { 
              firstProblematicValue = value;
              foundProblem = true;
            }
          }
        }

        // Assert that no problematic value was found
        expect(foundProblem).toBe(false);
        if (foundProblem) {
            console.error(`Isolated test failed: Found problematic value: ${firstProblematicValue}`);
            expect(firstProblematicValue).toBeCloseTo(0); // Add for clarity if it still fails
        }
      } finally {
          // IMPORTANT: Restore the original method AFTER creating the map and running checks
          generateParamsSpy.mockRestore(); 
      }
    });
  });

  describe('Constructor with initialHeightMap', () => {
    it('should use the provided height map if dimensions are valid', () => {
      // ... (rest of the code remains the same)
    });

    it('should throw an error if the provided height map columns are invalid', () => {
      const invalidColsMap = [
        [1, 2, 3],
        [4, 5], // Invalid column length
        [7, 8, 9]
      ];
      // Adjust config size to match the row count but mismatch column count
      const customConfig = Config.createCustomConfig({ worldSize: 3 });
      expect(() => new WorldMap(customConfig, random, invalidColsMap)).toThrow(
        'Provided initialHeightMap dimensions must match config.worldSize'
      );
    });

    it('should throw an error if the provided height map is empty or has invalid dimensions', () => {
      // ... (rest of the code remains the same)
    });

    it('should handle negative y coordinates (wrap-around)', () => {
      const map = new WorldMap(config, random);
      const expectedY = config.worldSize - 1; // Expected wrapped index
      const expectedHeight = map.getHeight(0, expectedY); // Height at wrapped position
      const actualHeight = map.getHeight(0, -config.worldSize - 1); // Height far negative
      expect(actualHeight).toBe(expectedHeight);
    });

    it('should handle large positive coordinates (wrap-around)', () => {
      // ... (rest of the code remains the same)
    });
  });
});
