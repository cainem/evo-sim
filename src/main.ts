import { Visualizer } from './Visualizer';
import { WorldMap } from './WorldMap';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { RegionManager } from './RegionManager';
import { Simulation } from './Simulation';
import { Region } from './Region';

// Debug flag to enable verbose logging
const DEBUG = true;

// Simulation control
let isSimulationRunning = false;
const roundDelay = 10; // milliseconds between rounds

// Get the canvas element
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;
// Get UI elements
const configPanelContainer = document.getElementById('configPanelContainer');
const randomSeedInput = document.getElementById('randomSeedInput') as HTMLInputElement;
const worldSizeInput = document.getElementById('worldSizeInput') as HTMLInputElement;
const worldMaxHeightInput = document.getElementById('worldMaxHeightInput') as HTMLInputElement;
const startingOrganismsInput = document.getElementById('startingOrganismsInput') as HTMLInputElement;
const maxLifeSpanInput = document.getElementById('maxLifeSpanInput') as HTMLInputElement;
const mutationProbabilityInput = document.getElementById('mutationProbabilityInput') as HTMLInputElement;
const regionCountInput = document.getElementById('regionCountInput') as HTMLInputElement;
const contourIntervalInput = document.getElementById('contourIntervalInput') as HTMLInputElement;
const organismTypeInput = document.getElementById('organismTypeInput') as HTMLSelectElement;
const startSimBtn = document.getElementById('startSimBtn') as HTMLButtonElement;
const errorMessageDiv = document.getElementById('errorMessage') as HTMLDivElement;

let currentVisualizer: Visualizer | null = null; // Keep track of the current visualizer
let currentControlsContainer: HTMLElement | null = null; // Keep track of controls UI

// Function to read and validate config from UI
function readConfigFromUI(): Config | null {
    const values = {
        randomSeed: parseInt(randomSeedInput.value, 10),
        worldSize: parseInt(worldSizeInput.value, 10),
        worldMaxHeight: parseInt(worldMaxHeightInput.value, 10),
        startingOrganisms: parseInt(startingOrganismsInput.value, 10),
        maxLifeSpan: parseInt(maxLifeSpanInput.value, 10),
        deliberateMutationProbability: parseFloat(mutationProbabilityInput.value),
        regionCount: parseInt(regionCountInput.value, 10),
        contourLineInterval: parseInt(contourIntervalInput.value, 10),
    };

    const errors: string[] = [];

    // Validate values
    if (isNaN(values.randomSeed) || values.randomSeed < 0 || values.randomSeed > 4294967295) errors.push('Invalid Random Seed (must be 0-4294967295).');
    if (isNaN(values.worldSize) || values.worldSize < 100) errors.push('Invalid World Size (min 100).');
    if (isNaN(values.worldMaxHeight) || values.worldMaxHeight < 100) errors.push('Invalid Max Height (min 100).');
    if (isNaN(values.startingOrganisms) || values.startingOrganisms < 10) errors.push('Invalid Starting Organisms (min 10).');
    if (isNaN(values.maxLifeSpan) || values.maxLifeSpan < 1) errors.push('Invalid Max Lifespan (min 1).');
    if (isNaN(values.deliberateMutationProbability) || values.deliberateMutationProbability < 0 || values.deliberateMutationProbability > 1) errors.push('Invalid Mutation Probability (must be 0-1).');
    if (isNaN(values.regionCount) || values.regionCount < 4 || Math.sqrt(values.regionCount) % 1 !== 0) errors.push('Invalid Region Count (must be a perfect square >= 4).');
    if (values.worldSize % Math.sqrt(values.regionCount) !== 0) errors.push('World Size must be divisible by Sqrt(Region Count).');
    if (isNaN(values.contourLineInterval) || values.contourLineInterval < 10) errors.push('Invalid Contour Interval (min 10).');

    if (errors.length > 0) {
        errorMessageDiv.innerHTML = errors.join('<br>');
        errorMessageDiv.style.display = 'block';
        return null;
    } else {
        errorMessageDiv.style.display = 'none';
        const organismType = organismTypeInput.value as 'A' | 'B';
        // Create config with user inputs - mark as non-test
        return Config.createCustomConfig({ ...values, isTestEnvironment: false, organismType });
    }
}

function startSimulationWithConfig(config: Config) {
    if (!canvas) {
        console.error('Canvas element #simulationCanvas not found!');
        return;
    }

    // Hide the config panel UI
    if (configPanelContainer) configPanelContainer.style.display = 'none';

    // Create a seeded random number generator
    const random = new SeededRandom(config.randomSeed);
    // Create the world map
    const worldMap = new WorldMap(config, random);
    // Create region manager and calculate regions
    const regionManager = new RegionManager(config, worldMap);
    regionManager.calculateRegions();
    const regions = regionManager.getRegions();

    if (DEBUG) {
        console.log('Regions created:', regions.length);
        regions.forEach((region, index) => {
            console.log(`Region ${index}:`, region.getBounds(), region.getStatistics());
        });
    }
    // Create simulation with regions
    const simulation = new Simulation(config, worldMap, random, regions);
    simulation.initialize();

    if (DEBUG) {
        const organisms = simulation.getOrganisms();
        console.log('Organisms created:', organisms.length);
        organisms.forEach((organism, index) => {
            if (index < 5) {
                console.log(`Organism ${index}:`, organism.getPosition());
            }
        });
    }
    try {
        // Dispose previous visualizer if exists
        if (currentVisualizer) {
            currentVisualizer.dispose();
            currentVisualizer = null;
        }

        currentVisualizer = new Visualizer(canvas);
        currentVisualizer.setWorldMap(worldMap);
        if (DEBUG) {
            console.log('CSS2DRenderer initialized:', currentVisualizer);
        }
        let worldHighestPoint = { x: 0, y: 0, height: 0 };
        try {
            currentVisualizer.drawRegions(regions);
            currentVisualizer.drawOrganisms(simulation.getOrganisms());
            const allRegionStats = regions.map(r => r.getStatistics());
            worldHighestPoint = allRegionStats.reduce((highest, stat) => {
                if (stat.highestPoint && stat.highestPoint.height > highest.height) {
                    return stat.highestPoint;
                }
                return highest;
            }, { x: 0, y: 0, height: 0 });
            currentVisualizer.drawFlags(worldHighestPoint);
        } catch (e) {
            console.error('Error during visualization:', e);
        }
        currentVisualizer.startRenderLoop();
        currentVisualizer.updateUIOverlay(simulation.getRoundNumber(), simulation.getOrganismCount());
        setupSimulationControls(simulation, currentVisualizer);

        window.addEventListener('beforeunload', () => {
            currentVisualizer?.dispose();
        });
        console.log("Visualizer initialized with terrain, regions, organisms, and flags.");
    } catch (error) {
        console.error("Error during Visualizer initialization or setup:", error);
    }
}

if (startSimBtn) {
    startSimBtn.onclick = () => {
        const config = readConfigFromUI();
        if (config) {
            startSimulationWithConfig(config);
        }
    };
}
// Add event listeners for Enter key on all inputs
const configInputs = [randomSeedInput, worldSizeInput, worldMaxHeightInput, startingOrganismsInput, maxLifeSpanInput, mutationProbabilityInput, regionCountInput, contourIntervalInput, organismTypeInput];
configInputs.forEach(input => {
    if (input) {
        input.addEventListener('keydown', (evt) => {
            const e = evt as KeyboardEvent;
            if (e.key === 'Enter') {
                startSimBtn?.click();
            }
        });
    }
});

/**
 * Sets up the simulation controls and main simulation loop
 * @param simulation The simulation instance
 * @param visualizer The visualizer instance
 */
function setupSimulationControls(
    simulation: Simulation,
    visualizer: Visualizer
): void {
    // Remove previous controls if they exist
    if (currentControlsContainer) {
        currentControlsContainer.remove();
        currentControlsContainer = null;
    }

    currentControlsContainer = document.createElement('div');
    currentControlsContainer.style.position = 'absolute';
    currentControlsContainer.style.bottom = '10px';
    currentControlsContainer.style.left = '10px';
    currentControlsContainer.style.padding = '10px';
    currentControlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    currentControlsContainer.style.borderRadius = '5px';
    currentControlsContainer.style.zIndex = '1000';

    // Create start/stop button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Start Simulation';
    toggleButton.style.marginRight = '10px';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.cursor = 'pointer';

    // Create step button
    const stepButton = document.createElement('button');
    stepButton.textContent = 'Run 1 Round';
    stepButton.style.padding = '5px 10px';
    stepButton.style.cursor = 'pointer';

    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    resetButton.style.marginLeft = '10px';
    resetButton.style.padding = '5px 10px';
    resetButton.style.cursor = 'pointer';

    // Add buttons to container
    currentControlsContainer.appendChild(toggleButton);
    currentControlsContainer.appendChild(stepButton);
    currentControlsContainer.appendChild(resetButton);

    // Add container to body
    document.body.appendChild(currentControlsContainer);

    // Keep track of the simulation interval
    let simulationInterval: number | null = null;

    // Toggle button click event
    toggleButton.addEventListener('click', () => {
        isSimulationRunning = !isSimulationRunning;

        if (isSimulationRunning) {
            toggleButton.textContent = 'Stop Simulation';
            stepButton.disabled = true;
            resetButton.disabled = true;

            // Start the simulation loop
            simulationInterval = window.setInterval(() => {
                runSimulationRound(simulation, visualizer);
            }, roundDelay);
        } else {
            toggleButton.textContent = 'Start Simulation';
            stepButton.disabled = false;
            resetButton.disabled = false;

            // Stop the simulation loop
            if (simulationInterval !== null) {
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
        }
    });

    // Step button click event
    stepButton.addEventListener('click', () => {
        runSimulationRound(simulation, visualizer);
    });

    // Reset button click event
    resetButton.addEventListener('click', () => {
        // Dispose current visualizer and remove controls
        if (currentVisualizer) {
            currentVisualizer.dispose();
            currentVisualizer = null;
        }
        if (currentControlsContainer) {
            currentControlsContainer.remove();
            currentControlsContainer = null;
        }

        // Show the config panel again
        if (configPanelContainer) {
            configPanelContainer.style.display = 'block';
        }

        // Clear any previous errors
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.innerHTML = '';

        console.log("Simulation reset, showing config panel.");
    });

    // Add cleanup logic
    window.addEventListener('beforeunload', () => {
        if (simulationInterval !== null) {
            clearInterval(simulationInterval);
        }
        if (currentControlsContainer) {
            currentControlsContainer.remove();
        }
    });
}

/**
 * Runs a single round of the simulation and updates the visualization
 * @param simulation The simulation instance
 * @param visualizer The visualizer instance
 */
function runSimulationRound(simulation: Simulation, visualizer: Visualizer): void {
    // Run a simulation round
    const roundStats = simulation.runRound();

    if (DEBUG) {
        console.log(`Round ${simulation.getRoundNumber()} stats:`, {
            organisms: simulation.getOrganismCount(),
            deaths: roundStats.deaths,
            births: roundStats.births
        });
    }

    // Update visualization with new organism positions
    visualizer.drawOrganisms(simulation.getOrganisms());

    // Update UI overlay with current simulation stats
    visualizer.updateUIOverlay(simulation.getRoundNumber(), simulation.getOrganismCount());
}
