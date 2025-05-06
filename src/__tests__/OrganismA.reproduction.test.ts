import { Config } from '../Config';
import { OrganismA } from '../OrganismA';
import { WorldMap } from '../WorldMap';
import { SeededRandom } from '../utils/SeededRandom';

describe('Organism Reproduction', () => {
  let config: Config;
  let worldMap: WorldMap;
  let random: SeededRandom;
  let halfRegionSize: number;
  const testSeed = 12345;

  beforeEach(() => {
    config = Config.createCustomConfig({
      worldSize: 100,
      startingOrganisms: 100,
      maxLifeSpan: 10,
      deliberateMutationProbability: 0.5,
      randomSeed: testSeed,
      regionCount: 100
    });
    random = new SeededRandom(testSeed);
    worldMap = new WorldMap(config, random);
    halfRegionSize = Math.floor((config.worldSize / Math.sqrt(config.regionCount)) / 2);
  });

  describe('State Copying', () => {
    it('should create offspring with reset rounds lived', () => {
      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 5,
        deliberateMutationX: 0,
        deliberateMutationY: 0,
        offspringsXDistance: 1,
        offspringsYDistance: 1
      }, config);

      const offspring = parent.reproduce([parent], 0, config, random, worldMap);
      expect(offspring[0].getRoundsLived()).toBe(0);
    });

    it('should copy parent mutation parameters when no mutation occurs', () => {
      // Set random to always return false for mutation
      const noMutationRandom = new SeededRandom(testSeed);
      jest.spyOn(noMutationRandom, 'nextBoolean').mockReturnValue(false);

      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: -1,
        offspringsXDistance: 2,
        offspringsYDistance: -2
      }, config);

      const offspring = parent.reproduce([parent], 0, config, noMutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.deliberateMutationX).toBe(1);
      expect(params.deliberateMutationY).toBe(-1);
      expect(params.offspringsXDistance).toBe(3); // 2 + 1 (mutation)
      expect(params.offspringsYDistance).toBe(-3); // -2 + (-1) (mutation)
    });
  });

  describe('Mutation Logic', () => {
    it('should mutate from 0 to either -1 or 1', () => {
      // Set random to always return true for mutation probability
      const mutationRandom = new SeededRandom(testSeed);
      jest.spyOn(mutationRandom, 'nextBoolean')
        .mockReturnValueOnce(true)  // Trigger X mutation
        .mockReturnValueOnce(true)  // X mutation to 1
        .mockReturnValueOnce(true)  // Trigger Y mutation
        .mockReturnValueOnce(false); // Y mutation to -1

      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 0,
        deliberateMutationX: 0,
        deliberateMutationY: 0,
        offspringsXDistance: 0,
        offspringsYDistance: 0
      }, config);

      const offspring = parent.reproduce([parent], 0, config, mutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.deliberateMutationX).toBe(1);
      expect(params.deliberateMutationY).toBe(-1);
    });

    it('should mutate from non-zero to 0', () => {
      // Set random to always return true for mutation probability
      const mutationRandom = new SeededRandom(testSeed);
      jest.spyOn(mutationRandom, 'nextBoolean').mockReturnValue(true);

      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: -1,
        offspringsXDistance: 1,
        offspringsYDistance: -1
      }, config);

      const offspring = parent.reproduce([parent], 0, config, mutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.deliberateMutationX).toBe(0);
      expect(params.deliberateMutationY).toBe(0);
    });
  });

  describe('Clamping of Offspring Distances', () => {
    it('should clamp offspringsXDistance to -halfRegionSize if parent+mutation < -halfRegionSize', () => {
      const parent = new OrganismA({
        x: 0,
        y: 0,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: 0,
        offspringsXDistance: -halfRegionSize - 1,
        offspringsYDistance: 0
      }, config);
      // Force mutation to +1 (so -halfRegionSize - 1 + 1 = -halfRegionSize, but let's test -halfRegionSize - 1 + 0 = -halfRegionSize - 1)
      const noMutationRandom = new SeededRandom(testSeed);
      jest.spyOn(noMutationRandom, 'nextBoolean').mockReturnValue(false);
      const offspring = parent.reproduce([parent], 0, config, noMutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.offspringsXDistance).toBe(-halfRegionSize);
    });
    it('should clamp offspringsXDistance to halfRegionSize if parent+mutation > halfRegionSize', () => {
      const parent = new OrganismA({
        x: 0,
        y: 0,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: 0,
        offspringsXDistance: halfRegionSize + 1,
        offspringsYDistance: 0
      }, config);
      // Force mutation to +1 (so halfRegionSize + 1 + 1 = halfRegionSize + 2)
      const mutationRandom = new SeededRandom(testSeed);
      jest.spyOn(mutationRandom, 'nextBoolean')
        .mockReturnValueOnce(false) // X: no mutation
        .mockReturnValueOnce(false); // Y: no mutation
      const offspring = parent.reproduce([parent], 0, config, mutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.offspringsXDistance).toBe(halfRegionSize);
    });
    it('should clamp offspringsYDistance to -halfRegionSize if parent+mutation < -halfRegionSize', () => {
      const parent = new OrganismA({
        x: 0,
        y: 0,
        roundsLived: 0,
        deliberateMutationX: 0,
        deliberateMutationY: 1,
        offspringsXDistance: 0,
        offspringsYDistance: -halfRegionSize - 1
      }, config);
      const noMutationRandom = new SeededRandom(testSeed);
      jest.spyOn(noMutationRandom, 'nextBoolean').mockReturnValue(false);
      const offspring = parent.reproduce([parent], 0, config, noMutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.offspringsYDistance).toBe(-halfRegionSize);
    });
    it('should clamp offspringsYDistance to halfRegionSize if parent+mutation > halfRegionSize', () => {
      const parent = new OrganismA({
        x: 0,
        y: 0,
        roundsLived: 0,
        deliberateMutationX: 0,
        deliberateMutationY: 1,
        offspringsXDistance: 0,
        offspringsYDistance: halfRegionSize + 1
      }, config);
      const mutationRandom = new SeededRandom(testSeed);
      jest.spyOn(mutationRandom, 'nextBoolean')
        .mockReturnValueOnce(false) // X: no mutation
        .mockReturnValueOnce(false); // Y: no mutation
      const offspring = parent.reproduce([parent], 0, config, mutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.offspringsYDistance).toBe(halfRegionSize);
    });
    it('should not clamp if within range', () => {
      const parent = new OrganismA({
        x: 0,
        y: 0,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: 1,
        offspringsXDistance: 3,
        offspringsYDistance: -4
      }, config);
      const noMutationRandom = new SeededRandom(testSeed);
      jest.spyOn(noMutationRandom, 'nextBoolean').mockReturnValue(false);
      const offspring = parent.reproduce([parent], 0, config, noMutationRandom, worldMap);
      const params = offspring[0].getParameters();
      expect(params.offspringsXDistance).toBe(4);
      expect(params.offspringsYDistance).toBe(-3);
    });
  });

  describe('Position Calculation', () => {
    it('should not apply offset when deliberateMutation is 0', () => {
      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 0,
        deliberateMutationX: 0,
        deliberateMutationY: 0,
        offspringsXDistance: 10,
        offspringsYDistance: -10
      }, config);

      const offspring = parent.reproduce([parent], 0, config, random, worldMap);
      const pos = offspring[0].getPosition();
      // With deliberateMutation = 0, offspringsDistance should not be applied
      expect(pos.x).toBe(50); // No offset when deliberateMutationX is 0
      expect(pos.y).toBe(50); // No offset when deliberateMutationY is 0
    });

    it('should apply offset when deliberateMutation is non-zero', () => {
      const parent = new OrganismA({
        x: 50,
        y: 50,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: -1,
        offspringsXDistance: 10,
        offspringsYDistance: -10
      }, config);

      const offspring = parent.reproduce([parent], 0, config, random, worldMap);
      const pos = offspring[0].getPosition();
      // With deliberateMutation != 0, offspringsDistance should be applied
      expect(pos.x).toBe(60); // 50 + 10 when deliberateMutationX is 1
      expect(pos.y).toBe(40); // 50 - 10 when deliberateMutationY is -1
    });
    
    it('should handle world wrap-around with non-zero mutation', () => {
      const parent = new OrganismA({
        x: 90,
        y: 10,
        roundsLived: 0,
        deliberateMutationX: 1,
        deliberateMutationY: -1,
        offspringsXDistance: 20,
        offspringsYDistance: -20
      }, config);

      const offspring = parent.reproduce([parent], 0, config, random, worldMap);
      const pos = offspring[0].getPosition();
      expect(pos.x).toBe(10); // (90 + 20) % 100
      expect(pos.y).toBe(90); // (10 - 20 + 100) % 100
    });
  });
});
