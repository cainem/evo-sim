import { OrganismD } from '../OrganismD';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';
import { BaseOrganism } from '../BaseOrganism';

describe('OrganismD reproduction', () => {
  beforeEach(() => {
    Config.createCustomConfig({ worldSize: 100, regionCount: 4, organismType: 'D' });
  });

  it('sexual reproduction produces two offspring with RoundsLived 0', () => {
    const config = Config.getInstance();
    const random = new SeededRandom(1);
    random.nextBoolean = jest.fn().mockReturnValue(false);  // no mutations
    random.nextInt = jest.fn().mockReturnValue(0);         // choose first gene

    const parentA = new OrganismD({ x: 10, y: 10 }, config, random);
    const parentB = new OrganismD({ x: 10, y: 10 }, config, random);
    const parents: BaseOrganism[] = [parentA, parentB];

    // parentB at index 1 will reproduce (even position)
    const offspring = parentB.reproduce(parents, 1, config, random);
    expect(offspring).toHaveLength(2);
    offspring.forEach(child => {
      expect(child).toBeInstanceOf(OrganismD);
      expect(child.getRoundsLived()).toBe(0);
    });
  });

  it('asexual reproduction produces one offspring for last odd organism', () => {
    const config = Config.getInstance();
    const random = new SeededRandom(2);
    random.nextBoolean = jest.fn().mockReturnValue(false);
    random.nextInt = jest.fn().mockReturnValue(0);

    const p1 = new OrganismD({ x: 5, y: 5 }, config, random);
    const p2 = new OrganismD({ x: 5, y: 5 }, config, random);
    const p3 = new OrganismD({ x: 5, y: 5 }, config, random);
    const arr: BaseOrganism[] = [p1, p2, p3];

    // only p3 (index 2) should reproduce
    expect(p1.reproduce(arr, 0, config, random)).toHaveLength(0);
    expect(p2.reproduce(arr, 1, config, random)).toHaveLength(0);
    const off = p3.reproduce(arr, 2, config, random);
    expect(off).toHaveLength(1);
    expect(off[0]).toBeInstanceOf(OrganismD);
    expect(off[0].getRoundsLived()).toBe(0);
  });
});
