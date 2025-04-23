import { BaseOrganism } from '../BaseOrganism';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { WorldMap } from '../WorldMap';

describe('BaseOrganism', () => {
  // Minimal subclass for testing
  class TestOrganism extends BaseOrganism {
    constructor(
      params: { x: number; y: number; roundsLived?: number },
      config: Config,
      random?: SeededRandom
    ) {
      super(params, config, random);
    }

    public reproduce(config: Config, random: SeededRandom, worldMap: WorldMap): BaseOrganism {
      // stub for abstract method
      return this;
    }
  }

  describe('constructor', () => {
    test('uses explicit roundsLived and does not call random', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 5 });
      const mockRandom = { nextInt: jest.fn() } as unknown as SeededRandom;
      const org = new TestOrganism({ x: 5.7, y: 3.2, roundsLived: 2 }, config, mockRandom);
      expect(org.getRoundsLived()).toBe(2);
      expect(mockRandom.nextInt).not.toHaveBeenCalled();
    });

    test('throws if no random and no roundsLived', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 5 });
      expect(
        () => new TestOrganism({ x: 1, y: 1 }, config)
      ).toThrow('SeededRandom instance required for initial organisms');
    });

    test('uses random.nextInt when roundsLived not provided', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 6 });
      const mockRandom = { nextInt: jest.fn().mockReturnValue(3) } as unknown as SeededRandom;
      const org = new TestOrganism({ x: 1.8, y: 2.9 }, config, mockRandom);
      expect(mockRandom.nextInt).toHaveBeenCalledWith(
        0,
        Math.floor(config.maxLifeSpan / 2)
      );
      expect(org.getRoundsLived()).toBe(3);
    });
  });

  describe('aging and death behavior', () => {
    test('initially alive and below lifespan threshold', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 5 });
      const org = new TestOrganism({ x: 0, y: 0, roundsLived: 1 }, config);
      expect(org.isDead()).toBe(false);
      expect(org.shouldDie()).toBe(false);
    });

    test('shouldDie true when roundsLived >= maxLifeSpan regardless of flag', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 4 });
      const org = new TestOrganism({ x: 0, y: 0, roundsLived: 4 }, config);
      expect(org.shouldDie()).toBe(true);
      expect(org.isDead()).toBe(false);
    });

    test('age() increments roundsLived and marks dead at threshold', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 3 });
      const org = new TestOrganism({ x: 0, y: 0, roundsLived: 1 }, config);
      org.age();
      expect(org.getRoundsLived()).toBe(2);
      expect(org.isDead()).toBe(false);
      expect(org.shouldDie()).toBe(false);
      org.age();
      expect(org.getRoundsLived()).toBe(3);
      expect(org.shouldDie()).toBe(true);
      expect(org.isDead()).toBe(true);
    });

    test('markForDeath sets isDead immediately', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 10 });
      const org = new TestOrganism({ x: 0, y: 0, roundsLived: 0 }, config);
      expect(org.isDead()).toBe(false);
      org.markForDeath();
      expect(org.isDead()).toBe(true);
    });

    test('shouldDie ignores flagged status before threshold', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 5 });
      const org = new TestOrganism({ x: 0, y: 0, roundsLived: 1 }, config);
      org.markForDeath();
      expect(org.isDead()).toBe(true);
      expect(org.shouldDie()).toBe(false);
    });
  });

  describe('positioning', () => {
    test('getPosition floors non-integer coordinates', () => {
      const config = Config.createCustomConfig({ maxLifeSpan: 5 });
      const org = new TestOrganism({ x: 5.9, y: -2.1, roundsLived: 0 }, config);
      expect(org.getPosition()).toEqual({ x: 5, y: -3 });
    });
  });
});
