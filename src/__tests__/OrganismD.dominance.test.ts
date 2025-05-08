import { OrganismD } from '../OrganismD';
import { SeededRandom } from '../utils/SeededRandom';

describe('OrganismD.DominanceOutcomeDeterminator', () => {
  it('chooses first gene when R < M for unequal DFs', () => {
    const df1 = 100;
    const df2 = 200;
    // M = 150, so R < 150 chooses lowerIndex (0)
    const rand = new SeededRandom(0);
    jest.spyOn(rand, 'nextInt').mockReturnValue(100); // R = 100 < 150
    expect(OrganismD.DominanceOutcomeDeterminator(rand, df1, df2)).toBe(0);
  });

  it('chooses second gene when R >= M for unequal DFs', () => {
    const df1 = 100;
    const df2 = 200;
    // M = 150, so R >= 150 chooses higherIndex (1)
    const rand = new SeededRandom(0);
    jest.spyOn(rand, 'nextInt').mockReturnValue(150); // R = 150 >= 150
    expect(OrganismD.DominanceOutcomeDeterminator(rand, df1, df2)).toBe(1);
  });

  it('uses first gene on tie when R < M for equal DFs', () => {
    const df = 50;
    // M = 50, R < 50 chooses 0
    const rand = new SeededRandom(0);
    jest.spyOn(rand, 'nextInt').mockReturnValue(10);
    expect(OrganismD.DominanceOutcomeDeterminator(rand, df, df)).toBe(0);
  });

  it('uses second gene on tie when R >= M for equal DFs', () => {
    const df = 50;
    // M = 50, R >= 50 chooses 1
    const rand = new SeededRandom(0);
    jest.spyOn(rand, 'nextInt').mockReturnValue(50);
    expect(OrganismD.DominanceOutcomeDeterminator(rand, df, df)).toBe(1);
  });
});
