import { Config } from '../Config';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';
import { Simulation } from '../Simulation';
import { Organism } from '../Organism';
import { OrganismParameters } from '../types/OrganismParameters';
import { Region } from '../Region';

describe('Simulation', () => {
  let config: Config;
  let worldMap: WorldMap;
  let random: SeededRandom;
  let simulation: Simulation;
  const testSeed = 12345;

  beforeEach(() => {
    // Use smaller world size for faster test setup
    const testWorldSize = 20; 
    config = Config.createCustomConfig({
      worldSize: testWorldSize,
      startingOrganisms: 10,
      maxLifeSpan: 50,
      randomSeed: testSeed
    });
    random = new SeededRandom(testSeed);
    
    // Create a simple flat height map for tests
    const testHeightMap = Array(testWorldSize)
      .fill(0)
      .map(() => Array(testWorldSize).fill(50)); // Flat map at height 50
      
    // Pass the pre-generated map to WorldMap, skipping generation
    worldMap = new WorldMap(config, random, testHeightMap); 
    
    // Create test regions (adjust if needed based on worldSize)
    const regions = [new Region({
      startX: 0,
      endX: config.worldSize, // Use config.worldSize here
      startY: 0,
      endY: config.worldSize  // Use config.worldSize here
    })];

    // Set region statistics
    regions[0].updateStatistics({
      averageHeight: 50,
      carryingCapacity: 25, // Fixed carrying capacity for testing
      highestPoint: { x: 10, y: 10, height: 75 }
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
      // With carryingCapacity of 25 and 10 initial organisms, we can have up to 15 births
      // But we only have 10 eligible parents (the initial organisms), so we get 10 births
      expect(result1.births).toBe(10);
      expect(simulation.getRoundNumber()).toBe(1);
      
      const result2 = simulation.runRound();
      expect(result2.deaths).toBe(0); // Assuming maxLifeSpan is high enough
      // Now we have 20 organisms (10 aged + 10 new), but capacity is 25, so only 5 more can be born
      // But we have 20 eligible parents, so we'll only select 5 of those to give birth
      expect(result2.births).toBe(5);
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
      const testWorldSize = 10; // Keep this small too
      const shortLifeConfig = Config.createCustomConfig({
        maxLifeSpan: 2,
        startingOrganisms: 5,
        randomSeed: testSeed,
        worldSize: testWorldSize
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
        highestPoint: { x: 5, y: 5, height: 75 } // Adjusted for smaller size
      });
      
      // Create simple map for this specific test
      const testHeightMap = Array(testWorldSize)
        .fill(0)
        .map(() => Array(testWorldSize).fill(50));
        
      // Use the dedicated random generator and pre-generated map
      const testWorldMap = new WorldMap(shortLifeConfig, testRandom, testHeightMap);
      
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
      // Create a simulation with organisms that will die *in* round 2
      const testWorldSize = 10;
      const testConfig = Config.createCustomConfig({
        maxLifeSpan: 2,
        startingOrganisms: 4,
        randomSeed: testSeed + 1, // Use different seed to avoid affecting other tests
        worldSize: testWorldSize
      });
      const testRandom = new SeededRandom(testSeed + 1); // Use matching seed
      const testRegions = [new Region({
        startX: 0,
        endX: testConfig.worldSize,
        startY: 0,
        endY: testConfig.worldSize
      })];
      // Add dummy stats to satisfy type
      testRegions[0].updateStatistics({ 
        carryingCapacity: 100, 
        averageHeight: 50, 
        highestPoint: {x:0, y:0, height: 50}
      });
       
      // Create simple map for this specific test
      const testHeightMap = Array(testWorldSize)
          .fill(0)
          .map(() => Array(testWorldSize).fill(50));
          
      const testWorldMap = new WorldMap(testConfig, testRandom, testHeightMap);
      
      const testSim = new Simulation(testConfig, testWorldMap, testRandom, testRegions);

      // Manually initialize organisms with age 0 for deterministic death test
      const initialOrganisms: Organism[] = [];
      const centerX = Math.floor(testConfig.worldSize / 2);
      const centerY = Math.floor(testConfig.worldSize / 2);
      for (let i = 0; i < testConfig.startingOrganisms; i++) {
        const params: OrganismParameters = {
          x: centerX,
          y: centerY,
          roundsLived: 0, // Explicitly start at age 0
          // Add dummy mutation params
          deliberateMutationX: 0,
          deliberateMutationY: 0,
          offspringsXDistance: 0,
          offspringsYDistance: 0
        };
        initialOrganisms.push(new Organism(params, testConfig, testRandom)); // Correct signature
      }
      testSim.initializeWithOrganisms(initialOrganisms);

      // Get initial organism count
      const initialCount = testSim.getOrganismCount();
      expect(initialCount).toBe(4); // Restore this assertion
      
      // Mock reproduction to isolate death testing
      const originalHandleReproduction = (testSim as any).handleReproduction;
      (testSim as any).handleReproduction = () => []; 

      // Run only 2 rounds
      const deaths: number[] = [];
      for (let i = 0; i < 2; i++) { 
        const result = testSim.runRound();
        deaths.push(result.deaths);
      }
      
      // Restore original method (good practice)
      (testSim as any).handleReproduction = originalHandleReproduction;

      // Verify deaths occurred in round 2
      expect(deaths.length).toBe(2);
      expect(deaths[0]).toBe(0); // No deaths round 1
      expect(deaths[1]).toBe(initialCount); // All die in round 2 when age == maxLifeSpan
      expect(deaths.reduce((a, b) => a + b, 0)).toBe(initialCount); // Total deaths match initial
      
      // Verify no organisms remain (due to death and no births)
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
