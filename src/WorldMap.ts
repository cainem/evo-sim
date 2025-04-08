import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { GaussianParameters } from './types/GaussianParameters';

export class WorldMap {
  private heightMap: number[][];
  private readonly gaussianCount = 12; // Number of Gaussian functions to sum
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
      amplitude: this.random.nextFloat(0.3, 1.0) * this.config.worldMaxHeight,
      centerX: this.random.nextFloat(0, this.config.worldSize),
      centerY: this.random.nextFloat(0, this.config.worldSize),
      sigma: this.random.nextFloat(this.config.worldSize * 0.05, this.config.worldSize * 0.2)
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
   * Generates the height map using a sum of Gaussian functions
   */
  public generateHeightMap(): void {

    // Calculate height for each point
    for (let x = 0; x < this.config.worldSize; x++) {
      for (let y = 0; y < this.config.worldSize; y++) {
        let height = 0;
        
        // Sum all Gaussian functions
        for (const params of this.gaussianParameters) {
          height += this.calculateGaussianValue(x, y, params);
        }

        // Clamp height between 0 and worldMaxHeight
        this.heightMap[x][y] = Math.min(
          Math.max(height, 0),
          this.config.worldMaxHeight
        );
      }
    }
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
