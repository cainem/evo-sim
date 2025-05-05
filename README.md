# Product Definition Document: "EvoSim" World Simulation

## 1. Overview

EvoSim is a round-based digital simulation modelling a 2D world with varying height. Organisms inhabit this world, living, dying, and reproducing based on age, location, and regional carrying capacity influenced by terrain height. The simulation visualizes the world state, organism distribution, and key statistics over time using TypeScript and the Three.js library. The simulation's parameters are configurable, and its behaviour should be deterministic based on an initial seed value.

## 2. World Definition

* **Dimensions:** A square surface grid.
    * Size defined by `Config.WorldSize` (Initial: 1200). Coordinates range from (0, 0) [Top-Left] to (`Config.WorldSize` - 1, `Config.WorldSize` - 1) [Bottom-Right].
* **Topology:** Wraps around horizontally and vertically (toroidal). Moving off an edge reappears on the opposite edge (e.g., moving left from x=0 results in x=`Config.WorldSize` - 1). Mathematically: `new_coord = (old_coord + delta + WorldSize) % WorldSize`.
* **Height (Z-axis):** Each point (x, y) has a static height z, where 0 <= z <= `Config.WorldMaxHeight` (Initial: 1000).
* **Height Function `f(x, y)`:**
    * Determines the height z at coordinates (x, y).
    * Proposed Method: Summation of multiple 2D Gaussian functions. Place approximately 10-15 Gaussian "hills" at pseudo-random locations (cx_i, cy_i) with pseudo-random amplitudes a_i (determining peak height) and standard deviations σ_i (determining width/smoothness).
    * `f(x, y) = clamp( sum( a_i * exp( -((x-cx_i)² / (2*σ_i²)) - ((y-cy_i)² / (2*σ_i²)) ) ), 0, Config.WorldMaxHeight )`
    * The placement, amplitude, and width parameters will be derived pseudo-randomly based on `Config.RandomSeed`.
    * This function generates a static, relatively smooth landscape with multiple peaks and valleys.
* **Randomness:** All pseudo-random elements (initial organism state, mutations, height function parameters, tie-breaking) will use a seeded pseudo-random number generator (PRNG) initialized with `Config.RandomSeed`.

## 3. Organisms

* **Organism Types:**
    * `OrganismA` (Original): reproduction rules as described in section 5.1.
    * `OrganismB` (Random): reproduction rules as described in section 5.2.
    * `OrganismC` (Genetic): reproduction rules as described in section 5.3.
    * Only one organism type is active per simulation, selected via a drop-down prior to startup.

* **Initial State:**
    * `Config.StartingOrganisms` (Initial: 5000) are created at the start.
    * All start at the center coordinates: (floor(`Config.WorldSize` / 2) - 1, floor(`Config.WorldSize` / 2) - 1).
    * Initial `RoundsLived`: Integer. Initialized randomly between 0 and `Config.MaxLifeSpan` - 1 for starting organisms; 0 for offspring.
    * Initial Gene State (for `OrganismC`): Genes are initialized with pseudo-random values within their allowed ranges (see below) using the seeded PRNG.

* **Common Internal State (All Types):**
    * `position`: Current (x, y) coordinates on the world surface.
    * `RoundsLived`: Integer counter.

* **Type-Specific Internal State:**
    * **OrganismA Specific State:**
        * `DeliberateMutationX`: Integer: -1, 0, or 1. Initialized to 0.
        * `DeliberateMutationY`: Integer: -1, 0, or 1. Initialized to 0.
        * `OffspringsXDistance`: Integer. Initialized to 0.
        * `OffspringsYDistance`: Integer. Initialized to 0.
    * **OrganismB Specific State:**
        * None beyond common state.
    * **OrganismC Specific State (Genes):**
        * Organisms of type C have 2 sets of 2 genes (GeneX and GeneY per set).
            ```
            Set 1: GeneX(1), GeneY(1)
            Set 2: GeneX(2), GeneY(2)
            ```
        * **Gene Definition:** Each Gene (GeneX(1), GeneY(1), GeneX(2), GeneY(2)) has the following properties:
            * `DeliberateMutation`: boolean [true/false].
            * `SizeOfRelativeMutation`: integer [-regionsize/2 ... 0 ... +regionsize/2].
            * `AbsolutePosition`: integer [0 .. Config.WorldSize - 1].
            * `DominanceFactor`: integer [0 .. 10000].
        * Note: `regionsize` is derived from config: `Config.WorldSize / sqrt(Config.RegionCount)`.

* **Lifespan:** Organisms live for a maximum of `Config.MaxLifeSpan` rounds (Initial: 10).

* **PRNG Initialization:** The PRNG is initialized once from a single seed value (`RandomSeed`, Initial: 9969) allowing the results to be fully deterministic.

## 4. Simulation Loop (Round-Based)

Each round proceeds as follows:

1.  **Aging:** Increment `RoundsLived` for all organisms.
2.  **Death (a):** Identify and mark for death organisms where `RoundsLived` >= `Config.MaxLifeSpan`.
3.  **Reproduction Phase (Region-Based):**
    * For each Region:
        * Identify current living organisms `n` within the region (excluding those marked for death).
        * Identify total organisms `t` within the region (including those marked for death).
        * Determine the region's `CarryingCapacity` `m` (calculated at startup).
        * If `n < m` and `t > 0`:
            * Calculate target reproductions: `q = m - n`.
            * Filter eligible parents: Select organisms with `RoundsLived` >= 1; organisms marked for death are still eligible for reproduction.
            * Sort eligible organisms by the height `f(x, y)` at their position (descending). Handle ties pseudo-randomly.
            * Select the top `min(q, n_eligible)` organisms for reproduction.
            * Execute reproduction based on the active organism type's rules (see Section 5), generating offspring.
4.  **Death (b):** Remove organisms that have been marked for death.
5.  **Update Counters:** Update overall round and population counters.

* **Simulation Stop Condition:**
    * The simulation ends immediately when any organism first enters the region containing the highest point of the map (the flagged high point). No further rounds are executed after this event. The simulation should record or display which organism reached the region, the region identity, and in which round.

## 5. Reproduction Mechanics

Reproduction rules vary by organism type. Offspring always start with `RoundsLived` = 0.

### 5.1. OrganismA Reproduction Rules

* An eligible OrganismA creates **one** offspring.
* **State Inheritance:** Child inherits parent's state before potential mutations, except `RoundsLived` is set to 0.
* **Mutation (`DeliberateMutationX/Y`):**
    * For `DeliberateMutationX` and `DeliberateMutationY` independently:
        * With probability `Config.DeliberateMutationProbability` (Initial: 0.2), a mutation occurs.
        * If mutation occurs:
            * If current value is 1 or -1, it mutates to 0.
            * If current value is 0, it mutates to 1 or -1 (50/50 chance).
        * The child's state reflects these potentially mutated values.
* **Offspring Distance Update:**
    * `Child.OffspringsXDistance = Parent.OffspringsXDistance + Parent.DeliberateMutationX`.
    * `Child.OffspringsYDistance = Parent.OffspringsYDistance + Parent.DeliberateMutationY`.
    * `Child.OffspringsXDistance`/`Child.OffspringsYDistance` cannot be less than -5 or greater than 5.
* **Offspring Placement:**
    * Start at parent's (x, y).
    * Calculate offset:
        * `offsetX = (Parent.DeliberateMutationX != 0) ? Parent.OffspringsXDistance : 0`
        * `offsetY = (Parent.DeliberateMutationY != 0) ? Parent.OffspringsYDistance : 0`
    * Calculate new position:
        * `Child.X = (Parent.X + offsetX + Config.WorldSize) % Config.WorldSize`
        * `Child.Y = (Parent.Y + offsetY + Config.WorldSize) % Config.WorldSize`
    * The child organism is added to the simulation at this new position.

### 5.2. OrganismB Reproduction Rules

* An eligible OrganismB creates **one** offspring.
* Generate random dx and dy ∈ [-5, 5] using the seeded PRNG.
* Child position: `x = (parent.x + dx + Config.WorldSize) % Config.WorldSize`, `y = (parent.y + dy + Config.WorldSize) % Config.WorldSize`.

### 5.3. OrganismC Reproduction Rules

* **Reproduction Mode Selection:**
    * Eligible OrganismC instances selected for reproduction in a region are processed based on their order in the height-sorted list.
    * Pairing logic uses 1-based positions: the first organism is at position 1, the second at position 2, etc.
    * If an organism is at an even position `n` (i.e., its 0-based `currentIndex` is odd, e.g., 1, 3, 5...), it reproduces **sexually** with the organism at position `n-1` (i.e., `currentIndex - 1`).
    * If the list has an odd number of organisms, the last organism reproduces asexually.
    * The last organism in an odd-length list is always at an odd position `n` (i.e., its 0-based `currentIndex` is even). It reproduces **asexually**.
    * Result: Organisms at odd indices (1, 3, ...) reproduce sexually. The organism at an even index (0, 2, ...) reproduces asexually *only if* it's the last one in the list.

* **Sexual Reproduction:**
    * Produces **two** offspring per pair of parents (a and b).
    * **Gene Mixing:** Genes from parents (a) and (b) are mixed to form offspring (A) and (B) as follows:
        * **Offspring (A):**
            * Set1: `GeneX(a1)`, `GeneY(b2)`
            * Set2: `GeneX(a2)`, `GeneY(b1)`
        * **Offspring (B):**
            * Set1: `GeneX(b1)`, `GeneY(a2)`
            * Set2: `GeneX(b2)`, `GeneY(a1)`
    * **Mutation Process (Applied independently to *each gene* in *each* offspring after mixing):**
        1.  **Recalculate `DeliberateMutation` Flag:** The gene's `DeliberateMutation` flag has a `Config.DeliberateMutationProbability` chance of flipping its state (true->false or false->true).
        2.  **Apply Gene Changes (if `DeliberateMutation` is now `true`):**
            * **`SizeOfRelativeMutation` Update:** Add a random integer \[-1, 0, 1] (from seeded PRNG) to the current `SizeOfRelativeMutation`. The result must be clamped so its magnitude does not exceed `regionsize / 2`.
            * **`AbsolutePosition` Update:** Add the *updated* `SizeOfRelativeMutation` to the `AbsolutePosition`. Apply world wrapping: `new_pos = (AbsolutePosition + SizeOfRelativeMutation + Config.WorldSize) % Config.WorldSize`.
            * **`DominanceFactor` Recalculation:** If the *updated* `SizeOfRelativeMutation` is *not zero*, there is a `Config.DeliberateMutationProbability` chance (using the same config value) that the `DominanceFactor` is recalculated. If recalculated, it is assigned a new random integer between 0 and 10000 (inclusive, from seeded PRNG).
        3.  **No Change (if `DeliberateMutation` is now `false`):** If the `DeliberateMutation` flag is false after the recalculation step, the `SizeOfRelativeMutation`, `AbsolutePosition`, and `DominanceFactor` for that gene remain unchanged from the values inherited/mixed from the parents.
    * **Offspring Placement (X, Y Coordinates):** For each offspring, determine its final (x, y) position:
        * Compare `DominanceFactor` of `GeneX(Set1)` vs `GeneX(Set2)`. Use the `AbsolutePosition` from the GeneX with the higher `DominanceFactor`. If tied, use `GeneX(Set1)`. This determines the offspring's X coordinate.
        * Compare `DominanceFactor` of `GeneY(Set1)` vs `GeneY(Set2)`. Use the `AbsolutePosition` from the GeneY with the higher `DominanceFactor`. If tied, use `GeneY(Set1)`. This determines the offspring's Y coordinate.

* **Asexual Reproduction:**
    * Produces **one** offspring.
    * **Gene Inheritance:** The offspring inherits an exact copy of the single parent's genes (Set 1 and Set 2 are identical copies of the parent's Set 1 and Set 2).
    * **Mutation Process:** The same mutation process described for sexual reproduction (recalculation of `DeliberateMutation` flag and potential subsequent changes to other gene properties if the flag is ON) is applied independently to each gene of the single offspring.
    * **Offspring Placement (X, Y Coordinates):** The placement is determined using the same dominance comparison logic as in sexual reproduction (comparing Set 1 vs Set 2 genes for X and Y, using `AbsolutePosition` of the dominant gene, Set 1 winning ties), even though the initial gene sets are identical copies from the parent.

## 6. Regions

* **Definition:** The world is divided into a grid of `Config.RegionCount` (Initial: 900) square regions. `Config.RegionCount` must be a perfect square. `Config.WorldSize` must be an exact multiple of `sqrt(Config.RegionCount)`.
* **Initial Region Size:** `Config.WorldSize / sqrt(Config.RegionCount)` = 1200 / 30 = 40x40.
* **Startup Calculation:**
    * **Average Height:** For each region, calculate average height by sampling `f(x, y)` at 100 points arranged in a 10x10 grid evenly spaced within the region boundaries. Store this average.
    * **Highest Sampled Point:** Identify the coordinates and height of the highest point among the 100 sampled within each region. Store this.
    * **Carrying Capacity:** Calculate static capacity for each region: `Capacity = floor( (RegionAvgHeight / SumOfAllRegionAvgHeights) * Config.StartingOrganisms )`.
* **State:** Each region stores its boundaries, average height, carrying capacity, and the location/height of its highest sampled point.

## 7. Visual Representation (Three.js)

* **Canvas:** Render within a browser canvas, ideally matching `Config.WorldSize` in pixels (e.g., 1200x1200).
* **Terrain:** Render the world surface.
    * **Color:** Use contour shading based on height z. Colors should span the height range (0 to `WorldMaxHeight`) and have opacity < 100% (e.g., 70-80%) for a non-bold look.
* **Regions:** Draw outlines for each region boundary. Display the region's `CarryingCapacity` as text within or near the region.
* **Organisms:** Represent each organism by a 3x3 pixel square centered at its (x, y) position. Color can be uniform (e.g., black or white) or potentially encode state (optional).
* **Flags:**
    * Mark the highest sampled point in the entire world with a small red flag/marker.
* **UI Overlays:** Display the current Round Number and Total Population count, typically in a corner (e.g., top-left).
* Allowing the setting of all configuration parameters (`WorldSize`, `WorldMaxHeight`, `StartingOrganisms`, `MaxLifeSpan`, `DeliberateMutationProbability`, `RegionCount`) and the random seed (Initial: 9969) via a configuration panel at startup.

## 8. Configuration (Config Class/Object)

Consolidate all simulation parameters:

* `WorldSize` (Initial: 1200)
* `WorldMaxHeight` (Initial: 1000)
* `RandomSeed` (Initial: 9969) - Crucial for reproducibility
* `StartingOrganisms` (Initial: 5000)
* `MaxLifeSpan` (Initial: 10)
* `DeliberateMutationProbability` (Initial: 0.2) - Used by OrganismA and OrganismC
* `RegionCount` (Initial: 900)
* (Internal/Derived): `RegionSize`, Gaussian parameters for height map, etc.

## 9. Methodology & Testing

* **Language/Library:** TypeScript with Three.js.
* **Testing:** Implement unit tests for all core logic functions (height generation, organism state changes, reproduction rules for *all types*, position calculation, region assignment, capacity calculation).
* **Coverage:** Aim for full statement, branch, and condition coverage where practical.
* **Mocking:** Minimize mocking. Mocking the PRNG (e.g., providing a predictable sequence or fixed values) is acceptable and recommended for testing probabilistic paths (mutations, tie-breaking).
* **Test Descriptions:** Clearly describe the behavior being tested and the expected outcome, ensuring alignment with this PDD.