import { Visualizer } from './Visualizer';
import { WorldMap } from './WorldMap';
import { Config } from './Config';
import { SeededRandom } from './utils/SeededRandom';
import { RegionManager } from './RegionManager';
import { Simulation } from './Simulation';
import { Region } from './Region';

// Debug flag to enable verbose logging
const DEBUG = false;

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

    if (errors.length > 0) {
        errorMessageDiv.innerHTML = errors.join('<br>');
        errorMessageDiv.style.display = 'block';
        return null;
    } else {
        errorMessageDiv.style.display = 'none';
        const organismType = organismTypeInput.value as 'A' | 'B' | 'C';
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
    const worldMap = new WorldMap(config, random);
    const regionManager = new RegionManager(config, worldMap);
    regionManager.calculateRegions();
    const regions = regionManager.getRegions();

    if (DEBUG) {
        console.log('Regions created:', regions.length);
        regions.forEach((region, index) => {
            console.log(`Region ${index}:`, region.getBounds(), region.getStatistics());
        });
    }
    const simulation = new Simulation(config, worldMap, random, regions);
    simulation.initialize();

    // Find the region containing the world's highest point
    let worldHighestPoint = { x: 0, y: 0, height: 0 };
    let highPointRegion: Region | null = null;
    {
        const allRegionStats = regions.map(r => r.getStatistics());
        worldHighestPoint = allRegionStats.reduce((highest, stat) => {
            if (stat.highestPoint && stat.highestPoint.height > highest.height) {
                return stat.highestPoint;
            }
            return highest;
        }, { x: 0, y: 0, height: 0 });
        highPointRegion = regions.find(r => r.containsPoint(worldHighestPoint.x, worldHighestPoint.y)) || null;
    }
    // Store for later use
    (window as any).__highPointRegion = highPointRegion;
    (window as any).__worldHighestPoint = worldHighestPoint;
    (window as any).__simulation = simulation;
    (window as any).__regions = regions;
    (window as any).__roundStopped = false;

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
        currentVisualizer.drawRegions(regions);
        currentVisualizer.drawOrganisms(simulation.getOrganisms());
        currentVisualizer.drawFlags(worldHighestPoint);
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
const configInputs = [randomSeedInput, worldSizeInput, worldMaxHeightInput, startingOrganismsInput, maxLifeSpanInput, mutationProbabilityInput, regionCountInput, organismTypeInput];
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
    toggleButton.id = 'toggleSimBtn';
    toggleButton.textContent = 'Start Simulation';
    toggleButton.style.marginRight = '10px';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.cursor = 'pointer';

    // Create step button
    const stepButton = document.createElement('button');
    stepButton.id = 'stepSimBtn';
    stepButton.textContent = 'Run 1 Round';
    stepButton.style.padding = '5px 10px';
    stepButton.style.cursor = 'pointer';

    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'resetSimBtn';
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
            (window as any).__stopSimulationInterval = () => {
                if (simulationInterval !== null) {
                    clearInterval(simulationInterval);
                    simulationInterval = null;
                }
                isSimulationRunning = false;
            };

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
        // Remove simulation end overlay if present
        const overlay = document.getElementById('simEndOverlay');
        if (overlay) overlay.remove();

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
export function runSimulationRound(simulation: Simulation, visualizer: Visualizer): void {
    // Stop if already ended
    if ((window as any).__roundStopped) return;
    // Run a simulation round
    const roundStats = simulation.runRound();

    // Check simulation stop condition (organism enters high-point region)
    const regions = (window as any).__regions as Region[];
    const highPointRegion = (window as any).__highPointRegion as Region | null;
    if (highPointRegion) {
        const organisms = simulation.getOrganisms();
        const found = organisms.find(org => highPointRegion!.containsPoint(org.getPosition().x, org.getPosition().y));
        if (found) {
            (window as any).__roundStopped = true;
            // Display result
            const round = simulation.getRoundNumber();
            const pos = found.getPosition();
            const regionIdx = regions.findIndex(r => r === highPointRegion);
            // Use a simple overlay
            let overlay = document.getElementById('simEndOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'simEndOverlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '50%';
                overlay.style.left = '50%';
                overlay.style.transform = 'translate(-50%, -50%)';
                overlay.style.background = 'rgba(255,255,255,0.95)';
                overlay.style.padding = '32px 48px';
                overlay.style.borderRadius = '12px';
                overlay.style.fontSize = '1.15rem';
                overlay.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)';
                overlay.style.zIndex = '99999';
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = `<b>Simulation Ended</b><br>
                Organism at (${pos.x}, ${pos.y}) entered region #${regionIdx} containing the world's highest point (${highPointRegion.getStatistics().highestPoint.x}, ${highPointRegion.getStatistics().highestPoint.y}, height=${highPointRegion.getStatistics().highestPoint.height})<br>
                Round: ${round}`;
            // Stop simulation interval if running
            if ((window as any).__stopSimulationInterval) (window as any).__stopSimulationInterval();
            const toggleBtn = document.getElementById('toggleSimBtn') as HTMLButtonElement;
            if (toggleBtn) toggleBtn.textContent = 'Start Simulation';
            const stepBtn = document.getElementById('stepSimBtn') as HTMLButtonElement;
            if (stepBtn) stepBtn.disabled = false;
            const resetBtn = document.getElementById('resetSimBtn') as HTMLButtonElement;
            if (resetBtn) resetBtn.disabled = false;
            return;
        }
    }

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
