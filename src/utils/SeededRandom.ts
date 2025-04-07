/**
 * A seedable pseudo-random number generator using the Mulberry32 algorithm.
 * This provides deterministic random number generation based on a seed value.
 */
export class SeededRandom {
  private state: number;

  /**
   * Creates a new SeededRandom instance with the given seed.
   * @param seed - A number to use as the random number generator seed
   */
  constructor(seed: number) {
    this.state = seed >>> 0; // Convert to 32-bit unsigned integer
  }

  /**
   * Generates the next random number using Mulberry32 algorithm.
   * @returns A number between 0 and 1
   */
  private next(): number {
    // Mulberry32 algorithm
    let z = (this.state += 0x6D2B79F5);
    z = (z ^ (z >>> 15)) * (1 | (z >>> 1));
    z ^= z + (z ^ (z >>> 7)) * (1 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer between min (inclusive) and max (inclusive).
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (inclusive)
   * @returns A random integer between min and max
   * @throws Error if min is greater than max
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error('Minimum value must be less than or equal to maximum value');
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float between min (inclusive) and max (exclusive).
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (exclusive)
   * @returns A random float between min and max
   * @throws Error if min is greater than or equal to max
   */
  public nextFloat(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Minimum value must be less than maximum value');
    }
    return this.next() * (max - min) + min;
  }

  /**
   * Generates a random boolean with the given probability of being true.
   * @param probability - The probability of returning true (between 0 and 1)
   * @returns A random boolean
   * @throws Error if probability is not between 0 and 1
   */
  public nextBoolean(probability: number = 0.5): boolean {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    return this.next() < probability;
  }

  /**
   * Resets the random number generator to its initial state with the given seed.
   * @param seed - The new seed value
   */
  public reseed(seed: number): void {
    this.state = seed >>> 0;
  }
}
