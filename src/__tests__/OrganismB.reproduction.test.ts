import { OrganismB } from '../OrganismB';
import { Config } from '../Config';
import { SeededRandom } from '../utils/SeededRandom';

describe('OrganismB reproduction', () => {
  let config: Config;

  beforeEach(() => {
    config = Config.createCustomConfig({ worldSize: 10, maxLifeSpan: 100 });
  });

  it('applies positive random offset without wrap-around', () => {
    const randomStub = { nextInt: jest.fn().mockReturnValue(3) };
    const parent = new OrganismB({ x: 2, y: 4, roundsLived: 0 }, config);
    const child = parent.reproduce(config, randomStub as any);
    expect(child).toBeInstanceOf(OrganismB);
    expect(child.getPosition()).toEqual({ x: 5, y: 7 });
    expect(child.getRoundsLived()).toBe(0);
  });

  it('applies negative random offset with wrap-around', () => {
    const randomStub = { nextInt: jest.fn().mockReturnValue(-5) };
    const parent = new OrganismB({ x: 1, y: 0, roundsLived: 0 }, config);
    const child = parent.reproduce(config, randomStub as any);
    expect(child.getPosition()).toEqual({ x: (1 - 5 + 10) % 10, y: (0 - 5 + 10) % 10 });
  });

  it('random offset range covers full [-5,5]', () => {
    const random = new SeededRandom(12345);
    const parent = new OrganismB({ x: 5, y: 5, roundsLived: 0 }, config);
    for (let i = 0; i < 20; i++) {
      const child = parent.reproduce(config, random);
      const { x, y } = child.getPosition();
      const dxRaw = x - 5;
      const dyRaw = y - 5;
      // adjust for wrap-around
      const dx = dxRaw > 5 ? dxRaw - 10 : dxRaw < -5 ? dxRaw + 10 : dxRaw;
      const dy = dyRaw > 5 ? dyRaw - 10 : dyRaw < -5 ? dyRaw + 10 : dyRaw;
      expect(dx).toBeGreaterThanOrEqual(-5);
      expect(dx).toBeLessThanOrEqual(5);
      expect(dy).toBeGreaterThanOrEqual(-5);
      expect(dy).toBeLessThanOrEqual(5);
    }
  });
});
