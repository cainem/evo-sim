Product Definition Document: "EvoSim" World Simulation
1. Overview

EvoSim is a round-based digital simulation modelling a 2D world with varying height. Organisms inhabit this world, living, dying, and reproducing based on age, location, and regional carrying capacity influenced by terrain height. The simulation visualizes the world state, organism distribution, and key statistics over time using TypeScript and the Three.js library. The simulation's parameters are configurable, and its behaviour should be deterministic based on an initial seed value.

2. World Definition

Dimensions: A square surface grid.
Size defined by Config.WorldSize (Initial: 1200). Coordinates range from (0, 0) [Top-Left] to (Config.WorldSize - 1, Config.WorldSize - 1) [Bottom-Right].
Topology: Wraps around horizontally and vertically (toroidal). Moving off an edge reappears on the opposite edge (e.g., moving left from x=0 results in x=Config.WorldSize - 1). Mathematically: new_coord = (old_coord + delta + WorldSize) % WorldSize.
Height (Z-axis): Each point (x, y) has a static height z, where 0 <= z <= Config.WorldMaxHeight (Initial: 1000).
Height Function f(x, y):
Determines the height z at coordinates (x, y).
Proposed Method: Summation of multiple 2D Gaussian functions. Place approximately 10-15 Gaussian "hills" at pseudo-random locations (cx_i, cy_i) with pseudo-random amplitudes a_i (determining peak height) and standard deviations σ_i (determining width/smoothness).
f(x, y) = clamp( sum( a_i * exp( -((x-cx_i)² / (2*σ_i²)) - ((y-cy_i)² / (2*σ_i²)) ) ), 0, Config.WorldMaxHeight )
The placement, amplitude, and width parameters will be derived pseudo-randomly based on Config.RandomSeed.
This function generates a static, relatively smooth landscape with multiple peaks and valleys.
Randomness: All pseudo-random elements (initial organism age, mutations, height function parameters, tie-breaking) will use a seeded pseudo-random number generator (PRNG) initialized with Config.RandomSeed.
3. Organisms

Initial State:
Config.StartingOrganisms (Initial: 1000) are created at the start.
All start at the center coordinates: (floor(Config.WorldSize / 2) - 1, floor(Config.WorldSize / 2) - 1).
Internal State:
position: Current (x, y) coordinates on the world surface.
RoundsLived: Integer counter. Initialized randomly between 0 and Config.MaxLifeSpan - 1 for starting organisms; 0 for offspring.
DeliberateMutationX: Integer: -1, 0, or 1. Initialized to 0.
DeliberateMutationY: Integer: -1, 0, or 1. Initialized to 0.
OffspringsXDistance: Integer. Initialized to 0.
OffspringsYDistance: Integer. Initialized to 0.
Lifespan: Organisms live for a maximum of Config.MaxLifeSpan rounds (Initial: 10).
4. Simulation Loop (Round-Based)

Each round proceeds as follows:

Aging: Increment RoundsLived for all organisms.
Death (a): Identify and mark for death organisms where RoundsLived >= Config.MaxLifeSpan.
Reproduction Phase (Region-Based):
For each Region:
Identify current organisms n within the region that have not been marked for death
Determine the region's CarryingCapacity m (calculated at startup).
If n < m and n > 0:
Calculate target reproductions: q = m - n.
Filter organisms: Select only those with RoundsLived >= 1. Let this count be n_eligible. Do include organisms that have been marked for death.
Sort eligible organisms by the height f(x, y) at their position (descending). Handle ties pseudo-randomly.
Select the top min(q, n_eligible) organisms for reproduction.
Each selected organism creates one offspring.
Death (b): Remove organisms that have been marked for death.
Update Counters: Update overall round and population counters.
5. Reproduction Mechanics

When a parent organism reproduces:

State Inheritance: Child inherits parent's state before potential mutations, except RoundsLived is set to 0.
Mutation (DeliberateMutationX/Y):
For DeliberateMutationX and DeliberateMutationY independently:
With probability Config.DeliberateMutationProbability (Initial: 0.2), a mutation occurs.
If mutation occurs:
If current value is 1 or -1, it mutates to 0.
If current value is 0, it mutates to 1 or -1 (50/50 chance).
The child's state reflects these potentially mutated values.
Offspring Distance Update:
Child.OffspringsXDistance = Parent.OffspringsXDistance + Parent.DeliberateMutationX
Child.OffspringsYDistance = Parent.OffspringsYDistance + Parent.DeliberateMutationY
Child.OffspringsXDistance/Child.OffspringsYDistance cannot be less than -5 or greater than 5
Offspring Placement:
Start at parent's (x, y).
Calculate offset:
offsetX = (Parent.DeliberateMutationX != 0) ? Parent.OffspringsXDistance : 0
offsetY = (Parent.DeliberateMutationY != 0) ? Parent.OffspringsYDistance : 0
Calculate new position:
Child.X = (Parent.X + offsetX + Config.WorldSize) % Config.WorldSize
Child.Y = (Parent.Y + offsetY + Config.WorldSize) % Config.WorldSize
The child organism is added to the simulation at this new position.
6. Regions

Definition: The world is divided into a grid of Config.RegionCount (Initial: 100) square regions. Config.RegionCount must be a perfect square. Config.WorldSize must be an exact multiple of sqrt(Config.RegionCount).
Initial Region Size: Config.WorldSize / sqrt(Config.RegionCount) = 1200 / 10 = 120x120.
Startup Calculation:
Average Height: For each region, calculate average height by sampling f(x, y) at 100 points arranged in a 10x10 grid evenly spaced within the region boundaries. Store this average.
Highest Sampled Point: Identify the coordinates and height of the highest point among the 100 sampled within each region. Store this.
Carrying Capacity: Calculate static capacity for each region: Capacity = floor( (RegionAvgHeight / SumOfAllRegionAvgHeights) * Config.StartingOrganisms )
State: Each region stores its boundaries, average height, carrying capacity, and the location/height of its highest sampled point.
7. Visual Representation (Three.js)

Canvas: Render within a browser canvas, ideally matching Config.WorldSize in pixels (e.g., 1200x1200).
Terrain: Render the world surface.
Color: Use contour shading based on height z. Colors should span the height range (0 to WorldMaxHeight) and have opacity < 100% (e.g., 70-80%) for a non-bold look.
Lines: Draw contour lines at intervals defined by Config.ContourLineInterval (Initial: 100 units of height).
Regions: Draw outlines for each region boundary. Display the region's CarryingCapacity as text within or near the region.
Organisms: Represent each organism by a 3x3 pixel square centered at its (x, y) position. Color can be uniform (e.g., black or white) or potentially encode state (optional).
Flags:
Mark the highest sampled point in the entire world with a small red flag/marker.
UI Overlays: Display the current Round Number and Total Population count, typically in a corner (e.g., top-left).
8. Configuration (Config Class/Object)

Consolidate all simulation parameters:

WorldSize (Initial: 1200)
WorldMaxHeight (Initial: 1000)
RandomSeed (Initial: e.g., 42) - Crucial for reproducibility
StartingOrganisms (Initial: 1000)
MaxLifeSpan (Initial: 10)
DeliberateMutationProbability (Initial: 0.2)
RegionCount (Initial: 100)
ContourLineInterval (Initial: 100)
(Internal/Derived): RegionSize, Gaussian parameters for height map, etc.
9. Methodology & Testing

Language/Library: TypeScript with Three.js.
Testing: Implement unit tests for all core logic functions (height generation, organism state changes, reproduction rules, position calculation, region assignment, capacity calculation).
Coverage: Aim for full statement, branch, and condition coverage where practical.
Mocking: Minimize mocking. Mocking the PRNG (e.g., providing a predictable sequence or fixed values) is acceptable and recommended for testing probabilistic paths (mutations, tie-breaking).
Test Descriptions: Clearly describe the behavior being tested and the expected outcome, ensuring alignment with this PDD.
Proposed Incremental Development Steps
Here's a suggested breakdown into logical, checkpoint-able steps suitable for prompting an AI assistant. Assume you're working within a TypeScript project environment.