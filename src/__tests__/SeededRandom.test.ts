import { SeededRandom } from '../utils/SeededRandom';

describe('SeededRandom', () => {
  let random: SeededRandom;
  const testSeed = 12345;

  beforeEach(() => {
    random = new SeededRandom(testSeed);
  });

  describe('Deterministic behavior', () => {
    it('should produce the same sequence for the same seed', () => {
      const random1 = new SeededRandom(testSeed);
      const random2 = new SeededRandom(testSeed);

      // Test multiple values to ensure sequence matches
      for (let i = 0; i < 10; i++) {
        expect(random1.nextFloat(0, 1)).toBe(random2.nextFloat(0, 1));
        expect(random1.nextInt(1, 100)).toBe(random2.nextInt(1, 100));
      }
    });

    it('should produce different sequences for different seeds', () => {
      const random1 = new SeededRandom(testSeed);
      const random2 = new SeededRandom(testSeed + 1);

      // The probability of these being equal is extremely low
      expect(random1.nextFloat(0, 1)).not.toBe(random2.nextFloat(0, 1));
    });
  });

  describe('nextInt', () => {
    it('should generate integers within the specified range', () => {
      const min = 5;
      const max = 10;
      for (let i = 0; i < 100; i++) {
        const value = random.nextInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should throw error when min is greater than max', () => {
      expect(() => random.nextInt(10, 5)).toThrow();
    });

    it('should handle min equal to max', () => {
      expect(random.nextInt(5, 5)).toBe(5);
    });
  });

  describe('nextFloat', () => {
    it('should generate floats within the specified range', () => {
      const min = 0;
      const max = 1;
      for (let i = 0; i < 100; i++) {
        const value = random.nextFloat(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should throw error when min is greater than or equal to max', () => {
      expect(() => random.nextFloat(1, 1)).toThrow();
      expect(() => random.nextFloat(2, 1)).toThrow();
    });
  });

  describe('nextBoolean', () => {
    it('should generate boolean with default 0.5 probability', () => {
      let trueCount = 0;
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        if (random.nextBoolean()) trueCount++;
      }

      // With 1000 iterations, we expect roughly 500 true values
      // Allow for some variance (within 10%)
      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    it('should respect custom probability', () => {
      const probability = 0.8;
      let trueCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (random.nextBoolean(probability)) trueCount++;
      }

      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(0.9);
    });

    it('should throw error for invalid probabilities', () => {
      expect(() => random.nextBoolean(-0.1)).toThrow();
      expect(() => random.nextBoolean(1.1)).toThrow();
    });
  });

  describe('reseed', () => {
    it('should reset the generator to produce the same sequence', () => {
      const values1: number[] = [];
      const values2: number[] = [];

      // Generate some values
      for (let i = 0; i < 5; i++) {
        values1.push(random.nextFloat(0, 1));
      }

      // Reseed and generate same number of values
      random.reseed(testSeed);
      for (let i = 0; i < 5; i++) {
        values2.push(random.nextFloat(0, 1));
      }

      // Sequences should match exactly
      expect(values1).toEqual(values2);
    });
  });
});
