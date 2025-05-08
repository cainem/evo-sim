import { OrganismD } from '../OrganismD';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { Gene, GeneSet } from '../OrganismC';

describe('OrganismD Constructor and Initial State', () => {
  beforeEach(() => {
    // Reset Config singleton
    (Config as any).instance = undefined;
  });

  it('should use provided gene sets if given', () => {
    Config.createCustomConfig({ worldSize: 10, regionCount: 1 });
    const rand = new SeededRandom(123);
    const geneSet1: GeneSet = {
      geneX: { deliberateMutation: false, sizeOfRelativeMutation: 0, absolutePosition: 1, dominanceFactor: 1 },
      geneY: { deliberateMutation: true, sizeOfRelativeMutation: 2, absolutePosition: 2, dominanceFactor: 2 }
    };
    const geneSet2: GeneSet = {
      geneX: { deliberateMutation: true, sizeOfRelativeMutation: 3, absolutePosition: 3, dominanceFactor: 3 },
      geneY: { deliberateMutation: false, sizeOfRelativeMutation: 4, absolutePosition: 4, dominanceFactor: 4 }
    };
    const org = new OrganismD({ x: 5, y: 5 }, Config.getInstance(), rand, geneSet1, geneSet2);
    expect(org.geneSet1).toEqual(geneSet1);
    expect(org.geneSet2).toEqual(geneSet2);
  });

  it('should initialize gene sets when none provided', () => {
    Config.createCustomConfig({ worldSize: 100, regionCount: 4 });
    const rand = new SeededRandom(456);
    const org = new OrganismD({ x: 0, y: 0 }, Config.getInstance(), rand);
    // Basic structure checks
    expect(org.geneSet1).toBeDefined();
    expect(org.geneSet2).toBeDefined();
    expect(typeof org.geneSet1.geneX.absolutePosition).toBe('number');
    expect(typeof org.geneSet1.geneX.dominanceFactor).toBe('number');
    expect(typeof org.geneSet1.geneY.sizeOfRelativeMutation).toBe('number');
    expect(typeof org.geneSet2.geneX.deliberateMutation).toBe('boolean');
    expect(typeof org.geneSet2.geneY.dominanceFactor).toBe('number');
  });
});
