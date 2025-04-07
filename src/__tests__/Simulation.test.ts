import { Config } from '../Config';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';
import { Simulation } from '../Simulation';

describe('Simulation', () => {
  let config: Config;
  let worldMap: WorldMap;
  let random: SeededRandom;
  let simulation: Simulation;
  const testSeed = 12345;

  beforeEach(() => {
    config = Config.createCustomConfig({
      worldSize: 100,
      startingOrganisms: 10,
      maxLifeSpan: 50,
      randomSeed: testSeed
    });
    random = new SeededRandom(testSeed);
    worldMap = new WorldMap(config, random);
    simulation = new Simulation(config, worldMap, random);
  });

  describe('Initialization', () => {
    it('should create correct number of starting organisms at center', () => {
      simulation.initialize();

      const organisms = simulation.getOrganisms();
      expect(organisms.length).toBe(config.startingOrganisms);

      // Check all organisms are at center
      const centerX = Math.floor(config.worldSize / 2);
      const centerY = Math.floor(config.worldSize / 2);

      organisms.forEach(organism => {
        const pos = organism.getPosition();
        expect(pos.x).toBe(centerX);
        expect(pos.y).toBe(centerY);
      });
    });

    it('should initialize organisms with valid mutation parameters', () => {
      simulation.initialize();

      const organisms = simulation.getOrganisms();
      organisms.forEach(organism => {
        const params = organism.getMutationParameters();
        
        expect(params.deliberateMutationX).toBeGreaterThanOrEqual(-1);
        expect(params.deliberateMutationX).toBeLessThanOrEqual(1);
        expect(params.deliberateMutationY).toBeGreaterThanOrEqual(-1);
        expect(params.deliberateMutationY).toBeLessThanOrEqual(1);
        expect(params.offspringsXDistance).toBeGreaterThanOrEqual(-10);
        expect(params.offspringsXDistance).toBeLessThanOrEqual(10);
        expect(params.offspringsYDistance).toBeGreaterThanOrEqual(-10);
        expect(params.offspringsYDistance).toBeLessThanOrEqual(10);
      });
    });

    it('should initialize organisms with random initial ages', () => {
      simulation.initialize();

      const organisms = simulation.getOrganisms();
      organisms.forEach(organism => {
        const age = organism.getRoundsLived();
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThan(config.maxLifeSpan / 2);
      });
    });
  });

  describe('Round Execution', () => {
    beforeEach(() => {
      simulation.initialize();
    });

    it('should increment round number after each round', () => {
      expect(simulation.getRoundNumber()).toBe(0);
      simulation.runRound();
      expect(simulation.getRoundNumber()).toBe(1);
      simulation.runRound();
      expect(simulation.getRoundNumber()).toBe(2);
    });

    it('should age all organisms each round', () => {
      const initialAges = simulation.getOrganisms()
        .map(org => org.getRoundsLived());

      simulation.runRound();

      const newAges = simulation.getOrganisms()
        .map(org => org.getRoundsLived());

      expect(newAges.length).toBe(initialAges.length);
      for (let i = 0; i < newAges.length; i++) {
        expect(newAges[i]).toBe(initialAges[i] + 1);
      }
    });

    it('should remove organisms that exceed maxLifeSpan', () => {
      // Create a test config with very short lifespan
      const shortLifeConfig = Config.createCustomConfig({
        maxLifeSpan: 2,
        startingOrganisms: 5,
        randomSeed: testSeed
      });
      const testSim = new Simulation(
        shortLifeConfig,
        new WorldMap(shortLifeConfig, random),
        random
      );
      testSim.initialize();

      // Run for 3 rounds (exceeding maxLifeSpan)
      for (let i = 0; i < 3; i++) {
        testSim.runRound();
      }

      // All original organisms should be dead
      expect(testSim.getOrganismCount()).toBe(0);
    });

    it('should return correct number of deaths each round', () => {
      // Create a simulation with organisms that will die after 2 rounds
      const testConfig = Config.createCustomConfig({
        maxLifeSpan: 2,
        startingOrganisms: 4,
        randomSeed: testSeed
      });
      const testRandom = new SeededRandom(testSeed);
      const testSim = new Simulation(
        testConfig,
        new WorldMap(testConfig, testRandom),
        testRandom
      );
      testSim.initialize();

      // Get initial organism count
      const initialCount = testSim.getOrganismCount();
      
      // Run rounds and track deaths
      const deaths: number[] = [];
      for (let i = 0; i < 3; i++) {
        deaths.push(testSim.runRound());
      }
      
      // Verify deaths add up to initial count
      expect(deaths.reduce((a, b) => a + b, 0)).toBe(initialCount);
      // Verify no organisms remain
      expect(testSim.getOrganismCount()).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset simulation to initial state', () => {
      simulation.initialize();
      simulation.runRound();
      simulation.runRound();

      simulation.reset();

      expect(simulation.getRoundNumber()).toBe(0);
      expect(simulation.getOrganismCount()).toBe(0);
    });
  });
});
