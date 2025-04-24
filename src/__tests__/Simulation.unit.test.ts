import { Simulation } from '../Simulation';
import { BaseOrganism } from '../BaseOrganism';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { Region } from '../Region';
import { WorldMap } from '../WorldMap';

describe('Simulation basic functionality', () => {
  let config: Config;
  let random: SeededRandom;
  let worldMap: WorldMap;
  let regions: Region[];

  class DummyOrganism extends BaseOrganism {
    constructor(x: number, y: number, roundsLived: number = 0) {
      super({ x, y, roundsLived }, Config.createCustomConfig({ worldSize: 10, maxLifeSpan: 5 }));
    }

    public reproduce(
      parents: BaseOrganism[],
      index: number,
      config: Config,
      random: SeededRandom,
      worldMap?: WorldMap
    ): BaseOrganism {
      // stub implementation for abstract method
      return this;
    }
  }

  beforeEach(() => {
    config = Config.createCustomConfig({ worldSize: 10, maxLifeSpan: 5, startingOrganisms: 0 });
    random = new SeededRandom(42);
    worldMap = {} as any;
    regions = [
      new Region({ startX: 0, endX: 5, startY: 0, endY: 5 }),
      new Region({ startX: 5, endX: 10, startY: 5, endY: 10 })
    ];
  });

  it('initial getters should reflect empty simulation', () => {
    const sim = new Simulation(config, worldMap, random, regions);
    expect(sim.getRoundNumber()).toBe(0);
    expect(sim.getOrganismCount()).toBe(0);
    expect(sim.getOrganisms()).toEqual([]);
  });

  it('initializeWithOrganisms and reset should work', () => {
    const sim = new Simulation(config, worldMap, random, regions);
    const o1 = new DummyOrganism(1, 1);
    const o2 = new DummyOrganism(6, 6);
    sim.initializeWithOrganisms([o1, o2]);
    expect(sim.getOrganismCount()).toBe(2);
    expect(sim.getOrganisms()).toEqual([o1, o2]);
    sim.reset();
    expect(sim.getOrganismCount()).toBe(0);
    expect(sim.getRoundNumber()).toBe(0);
    expect(sim.getOrganisms()).toEqual([]);
  });

  it('groupOrganismsByRegion groups organisms correctly', () => {
    const sim = new Simulation(config, worldMap, random, regions);
    const o1 = new DummyOrganism(2, 2);
    const o2 = new DummyOrganism(6, 6);
    const o3 = new DummyOrganism(1, 4);
    sim.initializeWithOrganisms([o1, o2, o3]);
    const regionMap = (sim as any).groupOrganismsByRegion() as Map<number, BaseOrganism[]>;
    expect(regionMap.get(0)).toEqual([o1, o3]);
    expect(regionMap.get(1)).toEqual([o2]);
  });

  it('runRound handles death and increments round', () => {
    const sim = new Simulation(config, worldMap, random, regions);
    // Stub reproduction to isolate death logic
    (sim as any).handleReproduction = jest.fn().mockReturnValue([]);

    const deadOrg = new DummyOrganism(0, 0, 5); // at maxLifeSpan
    const aliveOrg = new DummyOrganism(0, 0, 0);
    sim.initializeWithOrganisms([deadOrg, aliveOrg]);

    const result = sim.runRound();
    expect(result.deaths).toBe(1);
    expect(result.births).toBe(0);
    expect(sim.getRoundNumber()).toBe(1);
    expect(sim.getOrganismCount()).toBe(1);
  });

  it('getRandomMutationValue maps nextInt 0,1,2 to -1,0,1', () => {
    const stubRandom = { nextInt: jest.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
    } as unknown as SeededRandom;
    const sim = new Simulation(config, worldMap, stubRandom, regions);
    const method = (sim as any).getRandomMutationValue.bind(sim);
    expect(method()).toBe(-1);
    expect(method()).toBe(0);
    expect(method()).toBe(1);
  });
});
