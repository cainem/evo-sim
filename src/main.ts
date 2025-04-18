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
const roundDelay = 500; // milliseconds between rounds

// Get the canvas element
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;
const seedInput = document.getElementById('seedInput') as HTMLInputElement;
const startSimBtn = document.getElementById('startSimBtn') as HTMLButtonElement;
const seedInputContainer = document.getElementById('seedInputContainer');

function startSimulationWithSeed(seed: number) {
    if (!canvas) {
        console.error('Canvas element #simulationCanvas not found!');
        return;
    }
    // Hide the seed input UI
    if (seedInputContainer) seedInputContainer.style.display = 'none';

    // Create config with user seed
    const config = Config.createCustomConfig({ randomSeed: seed });
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
        const visualizer = new Visualizer(canvas);
        visualizer.setWorldMap(worldMap);
        if (DEBUG) {
            console.log('CSS2DRenderer initialized:', visualizer);
        }
        let worldHighestPoint = { x: 0, y: 0, height: 0 };
        try {
            visualizer.drawRegions(regions);
            visualizer.drawOrganisms(simulation.getOrganisms());
            const allRegionStats = regions.map(r => r.getStatistics());
            worldHighestPoint = allRegionStats.reduce((highest, stat) => {
                if (stat.highestPoint && stat.highestPoint.height > highest.height) {
                    return stat.highestPoint;
                }
                return highest;
            }, { x: 0, y: 0, height: 0 });
            visualizer.drawFlags(worldHighestPoint);
        } catch (e) {
            console.error('Error during visualization:', e);
        }
        visualizer.startRenderLoop();
        visualizer.updateUIOverlay(simulation.getRoundNumber(), simulation.getOrganismCount());
        setupSimulationControls(simulation, visualizer, regions, worldHighestPoint);
        window.addEventListener('beforeunload', () => {
            visualizer.dispose();
        });
        console.log("Visualizer initialized with terrain, regions, organisms, and flags.");
    } catch (error) {
        console.error("Error during Visualizer initialization or setup:", error);
    }
}

if (startSimBtn) {
    startSimBtn.onclick = () => {
        let seed = parseInt(seedInput?.value || '', 10);
        if (isNaN(seed) || seed < 0 || seed > 4294967295) {
            // Use default seed if not provided or invalid
            seed = 42;
        }
        startSimulationWithSeed(seed);
    };
}
// Optionally, allow pressing Enter in the input to start
if (seedInput) {
    seedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            startSimBtn?.click();
        }
    });
}

/**
 * Sets up the simulation controls and main simulation loop
 * @param simulation The simulation instance
 * @param visualizer The visualizer instance
 * @param regions The regions of the world
 * @param worldHighestPoint The highest point in the world
 */
function setupSimulationControls(
    simulation: Simulation,
    visualizer: Visualizer,
    regions: Region[],
    worldHighestPoint: { x: number, y: number, height: number }
): void {
    // Create control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '10px';
    controlsContainer.style.left = '10px';
    controlsContainer.style.padding = '10px';
    controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    controlsContainer.style.borderRadius = '5px';
    controlsContainer.style.zIndex = '1000';
    
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
    controlsContainer.appendChild(toggleButton);
    controlsContainer.appendChild(stepButton);
    controlsContainer.appendChild(resetButton);
    
    // Add container to body
    document.body.appendChild(controlsContainer);
    
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
        // Stop simulation if running
        if (isSimulationRunning) {
            isSimulationRunning = false;
            toggleButton.textContent = 'Start Simulation';
            
            if (simulationInterval !== null) {
                clearInterval(simulationInterval);
                simulationInterval = null;
            }
        }
        
        // Reset simulation
        simulation.reset();
        simulation.initialize();
        
        // Update visualization
        visualizer.drawOrganisms(simulation.getOrganisms());
        visualizer.updateUIOverlay(simulation.getRoundNumber(), simulation.getOrganismCount());
    });
    
    // Add cleanup logic
    window.addEventListener('beforeunload', () => {
        if (simulationInterval !== null) {
            clearInterval(simulationInterval);
        }
        document.body.removeChild(controlsContainer);
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
