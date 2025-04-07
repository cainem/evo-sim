import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { Organism } from '../Organism';
import { OrganismParameters } from '../types/OrganismParameters';

describe('Organism', () => {
  let config: Config;
  let random: SeededRandom;
  const testSeed = 12345;

  beforeEach(() => {
    config = Config.createCustomConfig({
      maxLifeSpan: 100,
      randomSeed: testSeed
    });
    random = new SeededRandom(testSeed);
  });

  describe('Constructor', () => {
    it('should create an initial organism with random roundsLived', () => {
      const params: OrganismParameters = {
        x: 10,
        y: 20,
        deliberateMutationX: 0.1,
        deliberateMutationY: 0.2,
        offspringsXDistance: 5,
        offspringsYDistance: 3
      };

      const organism = new Organism(params, config, random);
      const position = organism.getPosition();
      const mutations = organism.getMutationParameters();

      expect(position.x).toBe(params.x);
      expect(position.y).toBe(params.y);
      expect(organism.getRoundsLived()).toBeLessThan(config.maxLifeSpan / 2);
      expect(organism.getRoundsLived()).toBeGreaterThanOrEqual(0);
      expect(mutations).toEqual({
        deliberateMutationX: params.deliberateMutationX,
        deliberateMutationY: params.deliberateMutationY,
        offspringsXDistance: params.offspringsXDistance,
        offspringsYDistance: params.offspringsYDistance
      });
    });

    it('should create an offspring organism with specified roundsLived', () => {
      const params: OrganismParameters = {
        x: 15,
        y: 25,
        roundsLived: 0,
        deliberateMutationX: 0.15,
        deliberateMutationY: 0.25,
        offspringsXDistance: 6,
        offspringsYDistance: 4
      };

      const organism = new Organism(params, config);
      expect(organism.getRoundsLived()).toBe(0);
      expect(organism.getPosition()).toEqual({ x: params.x, y: params.y });
    });

    it('should throw error if random is not provided for initial organism', () => {
      const params: OrganismParameters = {
        x: 10,
        y: 20,
        deliberateMutationX: 0.1,
        deliberateMutationY: 0.2,
        offspringsXDistance: 5,
        offspringsYDistance: 3
      };

      expect(() => new Organism(params, config)).toThrow();
    });
  });

  describe('Age and Death', () => {
    it('should increment age correctly', () => {
      const params: OrganismParameters = {
        x: 10,
        y: 20,
        roundsLived: 0,
        deliberateMutationX: 0.1,
        deliberateMutationY: 0.2,
        offspringsXDistance: 5,
        offspringsYDistance: 3
      };

      const organism = new Organism(params, config);
      const initialAge = organism.getRoundsLived();
      
      organism.age();
      expect(organism.getRoundsLived()).toBe(initialAge + 1);
      
      organism.age();
      expect(organism.getRoundsLived()).toBe(initialAge + 2);
    });

    it('should correctly determine death status', () => {
      const params: OrganismParameters = {
        x: 10,
        y: 20,
        roundsLived: config.maxLifeSpan - 1,
        deliberateMutationX: 0.1,
        deliberateMutationY: 0.2,
        offspringsXDistance: 5,
        offspringsYDistance: 3
      };

      const organism = new Organism(params, config);
      expect(organism.isDead()).toBe(false);
      
      organism.age();
      expect(organism.isDead()).toBe(true);
    });
  });

  describe('Parameter Access', () => {
    it('should correctly return all parameters', () => {
      const params: OrganismParameters = {
        x: 10,
        y: 20,
        roundsLived: 5,
        deliberateMutationX: 0.1,
        deliberateMutationY: 0.2,
        offspringsXDistance: 5,
        offspringsYDistance: 3
      };

      const organism = new Organism(params, config);
      const returnedParams = organism.getParameters();

      expect(returnedParams).toEqual(params);
    });
  });
});
