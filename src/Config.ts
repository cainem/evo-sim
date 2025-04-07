export class Config {
  private static instance: Config;

  private constructor(
    public readonly worldSize: number = 1000,
    public readonly worldMaxHeight: number = 100,
    public readonly randomSeed: number = Date.now(),
    public readonly startingOrganisms: number = 100,
    public readonly maxLifeSpan: number = 1000,
    public readonly deliberateMutationProbability: number = 0.01,
    public readonly regionCount: number = 10,
    public readonly contourLineInterval: number = 10
  ) {}

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public static createCustomConfig(params: Partial<Config>): Config {
    Config.instance = new Config(
      params.worldSize ?? 1000,
      params.worldMaxHeight ?? 100,
      params.randomSeed ?? Date.now(),
      params.startingOrganisms ?? 100,
      params.maxLifeSpan ?? 1000,
      params.deliberateMutationProbability ?? 0.01,
      params.regionCount ?? 10,
      params.contourLineInterval ?? 10
    );
    return Config.instance;
  }
}
