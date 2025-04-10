import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { GaussianParameters } from './types/GaussianParameters';

export class WorldMap {
  private heightMap: number[][];
  private readonly gaussianCount = 50; // Adjusted count
  private gaussianParameters: GaussianParameters[] = [];

  constructor(
    private readonly config: Config,
    private readonly random: SeededRandom,
    initialHeightMap?: number[][] // Optional pre-generated map
  ) {
    // Initialize Gaussian parameters regardless, might be needed elsewhere?
    this.gaussianParameters = Array(this.gaussianCount)
      .fill(null)
      .map(() => this.generateGaussianParameters());
      
    if (initialHeightMap) {
      // Use provided map if available
      if (initialHeightMap.length !== config.worldSize || 
          initialHeightMap[0]?.length !== config.worldSize) {
         throw new Error('Provided initialHeightMap dimensions must match config.worldSize');
      }
      this.heightMap = initialHeightMap;
    } else {
      // Otherwise, initialize and generate the map
      this.heightMap = Array(config.worldSize)
        .fill(null)
        .map(() => Array(config.worldSize).fill(0));
      this.generateHeightMap(); // Generate map only if not provided
    }
  }

  /**
   * Generates random parameters for a Gaussian function
   */
  private generateGaussianParameters(): GaussianParameters {
    return {
      amplitude: this.random.nextFloat(0.0, 0.9) * this.config.worldMaxHeight, // Range ensures non-negative hills
      centerX: this.random.nextFloat(0, this.config.worldSize),
      centerY: this.random.nextFloat(0, this.config.worldSize),
      sigma: this.random.nextFloat(this.config.worldSize * 0.02, this.config.worldSize * 0.08) // Min sigma range
    };
  }

  /**
   * Calculates the Gaussian value at a point (x, y) for given parameters
   */
  private calculateGaussianValue(x: number, y: number, params: GaussianParameters): number {
    // Calculate minimum distances considering wrap-around
    const dx = Math.min(
      Math.abs(x - params.centerX),
      Math.abs(x - params.centerX + this.config.worldSize),
      Math.abs(x - params.centerX - this.config.worldSize)
    );
    const dy = Math.min(
      Math.abs(y - params.centerY),
      Math.abs(y - params.centerY + this.config.worldSize),
      Math.abs(y - params.centerY - this.config.worldSize)
    );

    // Calculate Gaussian value
    const exponent = -(dx * dx + dy * dy) / (2 * params.sigma * params.sigma);
    return params.amplitude * Math.exp(exponent);
  }

  /**
   * Generates the height map using a sum of Gaussian functions with normalization
   */
  public generateHeightMap(): void {
    const rawHeights: number[][] = Array(this.config.worldSize)
      .fill(null)
      .map(() => Array(this.config.worldSize).fill(0));
    let minRawHeight = Infinity;
    let maxRawHeight = -Infinity;

    // First pass: Calculate raw Gaussian sums and find min/max
    for (let x = 0; x < this.config.worldSize; x++) {
      for (let y = 0; y < this.config.worldSize; y++) {
        let rawHeight = 0;
        for (const params of this.gaussianParameters) {
          rawHeight += this.calculateGaussianValue(x, y, params);
        }
        rawHeights[x][y] = rawHeight;
        minRawHeight = Math.min(minRawHeight, rawHeight);
        maxRawHeight = Math.max(maxRawHeight, rawHeight);
      }
    }

    // Second pass: Normalize heights to the range [0, worldMaxHeight]
    const rawRange = maxRawHeight - minRawHeight;
    // Avoid division by zero if the map is completely flat
    const scaleFactor = rawRange > 1e-6 ? this.config.worldMaxHeight / rawRange : 0;

    for (let x = 0; x < this.config.worldSize; x++) {
      for (let y = 0; y < this.config.worldSize; y++) {
        const normalizedHeight = (rawHeights[x][y] - minRawHeight) * scaleFactor;
        // Clamp final value just in case of floating point inaccuracies
        this.heightMap[x][y] = Math.min(
          Math.max(normalizedHeight, 0),
          this.config.worldMaxHeight
        );
      }
    }
    const centerX = Math.floor(this.config.worldSize / 2);
    const centerY = Math.floor(this.config.worldSize / 2);
  }

  /**
   * Gets the height at coordinates (x, y), handling wrap-around
   */
  public getHeight(x: number, y: number): number {
    // Ensure coordinates are integers before wrapping
    const intX = Math.floor(x);
    const intY = Math.floor(y);
    // Wrap coordinates using modulo
    const wrappedX = ((intX % this.config.worldSize) + this.config.worldSize) % this.config.worldSize;
    const wrappedY = ((intY % this.config.worldSize) + this.config.worldSize) % this.config.worldSize;
    return this.heightMap[wrappedX][wrappedY];
  }

  /**
   * Gets the Gaussian parameters used to generate the height map
   * Useful for testing and verification
   */
  public getGaussianParameters(): GaussianParameters[] {
    return [...this.gaussianParameters];
  }

  /**
   * Gets the raw height map data
   * Useful for testing and verification
   */
  public getRawHeightMap(): number[][] {
    return this.heightMap.map(row => [...row]);
  }
}
