import { Config } from '../Config';

describe('Config', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    (Config as any).instance = undefined;
  });

  it('should create default config with singleton pattern', () => {
    const config = Config.getInstance();
    expect(config).toBeDefined();
    expect(config.worldSize).toBe(1000);
    expect(config.worldMaxHeight).toBe(100);
    expect(config.startingOrganisms).toBe(100);
    expect(config.maxLifeSpan).toBe(1000);
    expect(config.deliberateMutationProbability).toBe(0.01);
    expect(config.regionCount).toBe(10);
    expect(config.contourLineInterval).toBe(10);
  });

  it('should create custom config with specified parameters', () => {
    const customConfig = Config.createCustomConfig({
      worldSize: 2000,
      worldMaxHeight: 200,
      startingOrganisms: 50
    });

    expect(customConfig.worldSize).toBe(2000);
    expect(customConfig.worldMaxHeight).toBe(200);
    expect(customConfig.startingOrganisms).toBe(50);
    // Other parameters should remain default
    expect(customConfig.maxLifeSpan).toBe(1000);
    expect(customConfig.deliberateMutationProbability).toBe(0.01);
  });

  it('should maintain singleton instance', () => {
    const config1 = Config.getInstance();
    const config2 = Config.getInstance();
    expect(config1).toBe(config2);
  });
});
