import { Simulation } from '../Simulation';
import { Region } from '../Region';
import { BaseOrganism } from '../BaseOrganism';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { WorldMap } from '../WorldMap';

// Dummy subclass for testing
class DummyOrganism extends BaseOrganism {
  constructor(x: number, y: number) {
    // Provide roundsLived so no random is needed
    super({ x, y, roundsLived: 0 }, Config.createCustomConfig({}));
  }

  // No offspring needed for this test
  public override age(): void {
    super.age();
  }

  public reproduce(config: Config, random: SeededRandom, worldMap: WorldMap): BaseOrganism {
    // stub implementation
    return this;
  }
}

describe('Simulation.findFirstOrganismInRegion', () => {
  const config = Config.createCustomConfig({});
  const sim = new Simulation(config, {} as any, {} as any, []);
  const region1 = new Region({ startX: 0, endX: 5, startY: 0, endY: 5 });
  const region2 = new Region({ startX: 5, endX: 10, startY: 0, endY: 5 });

  let org1: DummyOrganism;
  let org2: DummyOrganism;

  beforeEach(() => {
    org1 = new DummyOrganism(1, 1);
    org2 = new DummyOrganism(6, 2);
    sim.initializeWithOrganisms([org1, org2]);
  });

  it('returns the first organism in region1', () => {
    expect(sim.findFirstOrganismInRegion(region1)).toBe(org1);
  });

  it('returns the first organism in region2', () => {
    expect(sim.findFirstOrganismInRegion(region2)).toBe(org2);
  });

  it('returns null when no organism in region', () => {
    const emptyRegion = new Region({ startX: 10, endX: 20, startY: 0, endY: 5 });
    expect(sim.findFirstOrganismInRegion(emptyRegion)).toBeNull();
  });
});
