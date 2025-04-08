import { Config } from '../Config';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';
import { Simulation } from '../Simulation';
import { Region } from '../Region';

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
    worldMap.generateHeightMap(); // Ensure height map is initialized
    // Create test regions
    const regions = [new Region({
      startX: 0,
      endX: config.worldSize,
      startY: 0,
      endY: config.worldSize
    })];

    // Set region statistics
    regions[0].updateStatistics({
      averageHeight: 50,
      carryingCapacity: 25, // Fixed carrying capacity for testing
      highestPoint: { x: 50, y: 50, height: 75 }
    });

    simulation = new Simulation(config, worldMap, random, regions);
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
      const result1 = simulation.runRound();
      expect(result1.deaths).toBe(0);
      expect(result1.births).toBe(10); // 10 initial organisms -> 10 eligible parents -> 10 births
      expect(simulation.getRoundNumber()).toBe(1);
      
      const result2 = simulation.runRound();
      expect(result2.deaths).toBe(0); // Assuming maxLifeSpan is high enough
      expect(result2.births).toBe(20); // 20 organisms (10 aged + 10 new) -> 20 eligible -> 20 births (assuming capacity)
      expect(simulation.getRoundNumber()).toBe(2);
    });

    it('should age all organisms each round', () => {
      const initialAges = simulation.getOrganisms()
        .map(org => org.getRoundsLived());

      simulation.runRound();

      const newAges = simulation.getOrganisms()
        .map(org => org.getRoundsLived());

      // After reproduction, we'll have more organisms
      expect(newAges.length).toBe(initialAges.length * 2); // Each organism reproduces once
      // Original organisms should be aged by 1
      for (let i = 0; i < initialAges.length; i++) {
        expect(newAges[i]).toBe(initialAges[i] + 1);
      }
      // New organisms should start at 0
      for (let i = initialAges.length; i < newAges.length; i++) {
        expect(newAges[i]).toBe(0);
      }
    });

    it('should remove organisms that exceed maxLifeSpan', () => {
      // Create a test config with very short lifespan
      const shortLifeConfig = Config.createCustomConfig({
        maxLifeSpan: 2,
        startingOrganisms: 5,
        randomSeed: testSeed
      });
      // Create a dedicated random generator for this test to ensure determinism
      const testRandom = new SeededRandom(testSeed);
      
      const testRegions = [new Region({
        startX: 0,
        endX: shortLifeConfig.worldSize,
        startY: 0,
        endY: shortLifeConfig.worldSize
      })];
      
      // Set region statistics
      testRegions[0].updateStatistics({
        averageHeight: 50,
        carryingCapacity: shortLifeConfig.startingOrganisms,
        highestPoint: { x: 50, y: 50, height: 75 }
      });
      
      // Use the dedicated random generator
      const testWorldMap = new WorldMap(shortLifeConfig, testRandom);
      testWorldMap.generateHeightMap();
      const testSim = new Simulation(
        shortLifeConfig,
        testWorldMap,
        testRandom, // Pass the dedicated generator
        testRegions
      );
      testSim.initialize();

      // Mock reproduction to isolate death testing
      const originalHandleReproduction = (testSim as any).handleReproduction;
      (testSim as any).handleReproduction = () => [];

      // Run for 3 rounds (exceeding maxLifeSpan)
      for (let i = 0; i < 3; i++) {
        const result = testSim.runRound();
      }

      // Restore original method (good practice)
      (testSim as any).handleReproduction = originalHandleReproduction;

      // Assert that all organisms are gone after 3 rounds due to lifespan
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
      const testRegions = [new Region({
        startX: 0,
        endX: testConfig.worldSize,
        startY: 0,
        endY: testConfig.worldSize
      })];
      testRegions[0].updateStatistics({
        averageHeight: 50,
        carryingCapacity: testConfig.startingOrganisms,
        highestPoint: { x: 50, y: 50, height: 75 }
      });
      const testSim = new Simulation(
        testConfig,
        new WorldMap(testConfig, testRandom),
        testRandom,
        testRegions
      );
      testSim.initialize();

      // Get initial organism count
      const initialCount = testSim.getOrganismCount();
      
      // Run rounds and track deaths
      const deaths: number[] = [];
      for (let i = 0; i < 3; i++) {
        const result = testSim.runRound();
        deaths.push(result.deaths);
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
