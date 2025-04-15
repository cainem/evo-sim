export class Config {
  private static instance: Config;

  private constructor(
    public readonly worldSize: number = 1200,
    public readonly worldMaxHeight: number = 1000,
    public readonly randomSeed: number = Date.now(),
    public readonly startingOrganisms: number = 1000,
    public readonly maxLifeSpan: number = 10,
    public readonly deliberateMutationProbability: number = 0.2,
    public readonly regionCount: number = 100, // Must be a perfect square (10x10)
    public readonly contourLineInterval: number = 100,
    public readonly isTestEnvironment: boolean = false
  ) {}

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public static createCustomConfig(params: Partial<Config>): Config {
    Config.instance = new Config(
      params.worldSize ?? 1200,
      params.worldMaxHeight ?? 1000,
      params.randomSeed ?? Date.now(),
      params.startingOrganisms ?? 1000,
      params.maxLifeSpan ?? 10,
      params.deliberateMutationProbability ?? 0.2,
      params.regionCount ?? 100, // Must be a perfect square (10x10)
      params.contourLineInterval ?? 100,
      true // Mark as test environment for customized configs
    );
    return Config.instance;
  }
}
