// DOM Elements
const scenarioSelect = document.getElementById('scenario-select');
const severityGroup = document.getElementById('severity-group');
const severityButtonsContainer = document.getElementById('severity-buttons-container');
const resetBtn = document.getElementById('reset-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const controlPanel = document.getElementById('control-panel');
const audioInfo = document.getElementById('audio-info');
const audioDescription = document.getElementById('audio-description');
const vehicleBackground = document.getElementById('vehicle-background');
const centerConsole = document.getElementById('center-console');
const driverCluster = document.getElementById('driver-cluster');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');

// Scene mode elements
const sceneView = document.getElementById('scene-view');
const sceneImage = document.getElementById('scene-image');
const sceneImageNext = document.getElementById('scene-image-next');

// All severity buttons (dynamic)
let severityButtons = [];

// State
let currentScenario = null;
let currentSeverity = 'low';
let currentStepIndex = 0; // For scene-mode step tracking
const currentVehicle = 'rivian';

// Audio context for Web Audio API
let audioContext = null;

// --- Scene mode helpers ---

// Returns true if the current scenario uses full composite scene images
function isSceneMode() {
    return currentScenario && currentScenario.type === 'scene';
}

// Show scene view, hide legacy layered view
function enterSceneMode() {
    sceneView.classList.remove('hidden');
    vehicleBackground.classList.add('hidden');
}

// Show legacy layered view, hide scene view
function exitSceneMode() {
    sceneView.classList.add('hidden');
    vehicleBackground.classList.remove('hidden');
    // Clean up any step indicator
    removeStepIndicator();
}

// Preload all images for a scene scenario so transitions are instant
function preloadSceneImages(scenario) {
    if (!scenario.steps) return;
    scenario.steps.forEach(step => {
        const img = new Image();
        img.src = step.image;
    });
}

// Render the current step's scene image with a crossfade
function renderSceneStep(index) {
    const steps = currentScenario.steps;
    if (!steps || index < 0 || index >= steps.length) return;

    currentStepIndex = index;
    const step = steps[index];

    // Crossfade: load new image into the "next" layer, fade it in, then swap
    sceneImageNext.src = step.image;
    sceneImageNext.onload = () => {
        // Fade in the next image
        sceneImageNext.style.opacity = '1';
        // After transition, swap src to main image and reset next layer
        setTimeout(() => {
            sceneImage.src = step.image;
            sceneImageNext.style.opacity = '0';
        }, 420); // slightly longer than the 0.4s CSS transition
    };

    // If it's already cached, onload fires synchronously in some browsers
    if (sceneImageNext.complete && sceneImageNext.src.includes(step.image)) {
        sceneImageNext.style.opacity = '1';
        setTimeout(() => {
            sceneImage.src = step.image;
            sceneImageNext.style.opacity = '0';
        }, 420);
    }

    // Update step indicator dots
    updateStepIndicator(index);

    // Update step label
    updateStepLabel(step.label);

    // Play alert sound for escalating steps (skip first step = "clear")
    if (index > 0 && steps.length > 2) {
        // Map step position to severity for audio
        const ratio = index / (steps.length - 1);
        if (ratio >= 0.75) {
            playAlertSound('high');
        } else if (ratio >= 0.4) {
            playAlertSound('mid');
        }
    } else if (index > 0) {
        playAlertSound('mid');
    }

    announceToScreenReader(`Step ${index + 1} of ${steps.length}: ${step.label}`);
}

// Create/update the dot indicator at the bottom of the scene view
function createStepIndicator(stepCount) {
    removeStepIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'scene-step-indicator';
    indicator.id = 'scene-step-indicator';

    for (let i = 0; i < stepCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'scene-step-dot' + (i === 0 ? ' active' : '');
        dot.dataset.step = i;
        dot.setAttribute('aria-label', `Step ${i + 1}`);
        dot.addEventListener('click', () => renderSceneStep(i));
        indicator.appendChild(dot);
    }

    sceneView.appendChild(indicator);
}

function updateStepIndicator(activeIndex) {
    const indicator = document.getElementById('scene-step-indicator');
    if (!indicator) return;
    const dots = indicator.querySelectorAll('.scene-step-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
    });
}

function removeStepIndicator() {
    const existing = document.getElementById('scene-step-indicator');
    if (existing) existing.remove();
    const label = document.getElementById('scene-step-label');
    if (label) label.remove();
}

function updateStepLabel(text) {
    let label = document.getElementById('scene-step-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'scene-step-label';
        label.id = 'scene-step-label';
        sceneView.appendChild(label);
    }
    label.textContent = text;
}

// Keyboard navigation for scene mode (left/right arrows)
function handleSceneKeydown(e) {
    if (!isSceneMode()) return;
    const steps = currentScenario.steps;
    if (!steps) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentStepIndex < steps.length - 1) {
            renderSceneStep(currentStepIndex + 1);
        }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentStepIndex > 0) {
            renderSceneStep(currentStepIndex - 1);
        }
    }
}

// --- Audio (shared between both modes) ---

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playAlertSound(severity) {
    try {
        const ctx = initAudioContext();
        if (severity === 'low') return;
        if (severity === 'mid') {
            playBeep(ctx, 500, 0.18, 0);
        } else if (severity === 'high') {
            playBeep(ctx, 850, 0.12, 0);
            playBeep(ctx, 850, 0.12, 0.15);
            playBeep(ctx, 850, 0.12, 0.3);
            playBeep(ctx, 850, 0.12, 0.45);
            playBeep(ctx, 850, 0.12, 0.6);
            playBeep(ctx, 850, 0.12, 0.75);
            playBeep(ctx, 850, 0.12, 0.9);
        }
    } catch (error) {
        console.error('Error playing alert sound:', error);
    }
}

function playBeep(ctx, frequency, duration, startDelay) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    const now = ctx.currentTime + startDelay;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
}

// --- Cached sorted scenarios ---
let sortedScenarios = [];

// --- Initialize ---
function init() {
    try {
        if (typeof SCENARIOS === 'undefined' || !Array.isArray(SCENARIOS)) {
            throw new Error('SCENARIOS configuration not loaded');
        }
        if (typeof VEHICLES === 'undefined' || !VEHICLES[currentVehicle]) {
            throw new Error('VEHICLES configuration not loaded');
        }

        sortedScenarios = [...SCENARIOS];
        populateScenarios();
        attachEventListeners();
        loadVehicleImage();
        updateVehicleSurfaces();
        forceResetToBaseMap();

        // Add keyboard listener for scene mode arrow navigation
        document.addEventListener('keydown', handleSceneKeydown);
    } catch (error) {
        console.error('Initialization failed:', error);
        showError('Failed to initialize simulator. Please refresh the page.');
    }
}

// --- Legacy layered mode functions ---

function loadVehicleImage() {
    const imagePath = './assets/vehicles/rivian-interior.png';
    const vehicleOverlay = document.getElementById('vehicle-overlay');
    const img = new Image();
    loadingIndicator.classList.remove('hidden');
    img.onload = () => {
        vehicleOverlay.style.backgroundImage = `url('${imagePath}')`;
        loadingIndicator.classList.add('hidden');
    };
    img.onerror = () => {
        console.error('Failed to load vehicle image:', imagePath);
        loadingIndicator.classList.add('hidden');
        showError('Failed to load vehicle image. Using fallback display.');
    };
    img.src = imagePath;
}

function showError(message) {
    if (errorMessage) {
        const errorText = errorMessage.querySelector('p');
        if (errorText) errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => errorMessage.classList.add('hidden'), 5000);
    }
}

function updateVehicleSurfaces() {
    try {
        const vehicle = VEHICLES[currentVehicle];
        if (!vehicle) return;
        driverCluster.style.display = vehicle.surfaces.includes('driver-cluster') ? 'flex' : 'none';
        centerConsole.style.display = vehicle.surfaces.includes('center-console') ? 'flex' : 'none';
    } catch (error) {
        console.error('Error updating vehicle surfaces:', error);
    }
}

// --- Shared UI ---

function populateScenarios() {
    try {
        sortedScenarios.forEach(scenario => {
            const option = document.createElement('option');
            option.value = scenario.id;
            option.textContent = scenario.name;
            scenarioSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating scenarios:', error);
        showError('Failed to load scenarios.');
    }
}

function attachEventListeners() {
    try {
        scenarioSelect.addEventListener('change', handleScenarioChange);
        resetBtn.addEventListener('click', handleReset);
        minimizeBtn.addEventListener('click', togglePanel);
    } catch (error) {
        console.error('Error attaching event listeners:', error);
    }
}

function handleSeverityClick(event) {
    try {
        const button = event.currentTarget;
        if (button.disabled) return;
        const severity = button.dataset.severity;
        severityButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentSeverity = severity;

        if (currentScenario) {
            if (isSceneMode()) {
                // In scene mode, severity buttons act as step selectors
                const stepIndex = parseInt(severity, 10);
                if (!isNaN(stepIndex)) {
                    renderSceneStep(stepIndex);
                }
            } else {
                renderAlert();
                showAudioInfo();
                playAlertSound(severity);
            }
            announceToScreenReader(`Severity changed to ${severity}`);
        }
    } catch (error) {
        console.error('Error handling severity click:', error);
        showError('Failed to change severity level.');
    }
}

function togglePanel() {
    try {
        controlPanel.classList.toggle('minimized');
        minimizeBtn.setAttribute('aria-label',
            controlPanel.classList.contains('minimized') ? 'Maximize control panel' : 'Minimize control panel'
        );
    } catch (error) {
        console.error('Error toggling panel:', error);
    }
}

function handleScenarioChange() {
    try {
        const scenarioId = scenarioSelect.value;

        if (!scenarioId) {
            clearAlerts();
            exitSceneMode();
            disableAllSeverityButtons();
            severityGroup.classList.add('hidden');
            audioInfo.classList.add('hidden');
            // Show legacy view in default state
            vehicleBackground.classList.remove('hidden');
            forceResetToBaseMap();
            return;
        }

        currentScenario = SCENARIOS.find(s => s.id === scenarioId);

        if (!currentScenario) {
            console.error(`Scenario not found: ${scenarioId}`);
            showError('Selected scenario not found.');
            return;
        }

        if (isSceneMode()) {
            // --- Scene mode ---
            enterSceneMode();
            preloadSceneImages(currentScenario);

            // Show severity group with step buttons
            severityGroup.classList.remove('hidden');
            updateSceneStepButtons();

            // Show first step
            currentStepIndex = 0;
            sceneImage.src = currentScenario.steps[0].image;
            sceneImageNext.style.opacity = '0';
            createStepIndicator(currentScenario.steps.length);
            updateStepLabel(currentScenario.steps[0].label);

            // Select first step button
            if (severityButtons.length > 0) {
                severityButtons[0].classList.add('active');
            }

            announceToScreenReader(`Selected ${currentScenario.name} — ${currentScenario.steps.length} steps. Use arrow keys or buttons to navigate.`);
        } else {
            // --- Legacy layered mode ---
            exitSceneMode();

            if (!currentScenario.alerts) {
                showError('Scenario data is incomplete.');
                return;
            }

            severityGroup.classList.remove('hidden');
            updateSeverityButtons();
            selectFirstAvailableSeverity();
            showAudioInfo();
            announceToScreenReader(`Selected ${currentScenario.name}`);
        }
    } catch (error) {
        console.error('Error handling scenario change:', error);
        showError('Failed to load scenario.');
    }
}

// Build step buttons for scene mode (replacing severity buttons)
function updateSceneStepButtons() {
    severityButtonsContainer.innerHTML = '';
    severityButtons = currentScenario.steps.map((step, i) => {
        const btn = document.createElement('button');
        btn.className = 'severity-btn';
        btn.dataset.severity = String(i); // Store index as severity value
        btn.textContent = step.label;
        btn.setAttribute('aria-label', `Step ${i + 1}: ${step.label}`);
        btn.addEventListener('click', () => {
            severityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSceneStep(i);
        });
        severityButtonsContainer.appendChild(btn);
        return btn;
    });
}

// Legacy severity buttons
function updateSeverityButtons() {
    const keys = Object.keys(currentScenario.alerts);
    severityButtonsContainer.innerHTML = '';
    severityButtons = keys.map(key => {
        const btn = document.createElement('button');
        btn.className = 'severity-btn';
        btn.dataset.severity = key;
        btn.textContent = key;
        btn.setAttribute('aria-label', `Variation ${key}`);
        btn.addEventListener('click', handleSeverityClick);
        severityButtonsContainer.appendChild(btn);
        return btn;
    });
}

function disableAllSeverityButtons() {
    severityButtons.forEach(btn => btn.classList.remove('active'));
    severityButtonsContainer.innerHTML = '';
    severityButtons = [];
}

function selectFirstAvailableSeverity() {
    severityButtons.forEach(btn => btn.classList.remove('active'));
    if (severityButtons.length > 0) {
        currentSeverity = severityButtons[0].dataset.severity;
    }
}

function handleReset() {
    try {
        scenarioSelect.value = '';
        currentSeverity = 'low';
        currentStepIndex = 0;
        currentScenario = null;
        disableAllSeverityButtons();
        severityGroup.classList.add('hidden');
        audioInfo.classList.add('hidden');

        // Exit scene mode, restore legacy view
        exitSceneMode();
        forceResetToBaseMap();
        announceToScreenReader('Simulation reset');
    } catch (error) {
        console.error('Error resetting simulation:', error);
        showError('Failed to reset simulation.');
    }
}

// --- Legacy alert rendering ---

function renderAlert() {
    if (!currentScenario || isSceneMode()) return;

    try {
        clearAlerts();
        const alertData = currentScenario.alerts[currentSeverity];
        if (!alertData) return;

        let targetSurfaceType = currentScenario.surface;
        const vehicle = VEHICLES[currentVehicle];
        if (targetSurfaceType === 'driver-cluster' && !vehicle.surfaces.includes('driver-cluster')) {
            targetSurfaceType = 'center-console';
        }

        const targetSurface = targetSurfaceType === 'center-console' ? centerConsole : driverCluster;
        if (!targetSurface) return;

        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'assertive');

        if (alertData.video) {
            alert.className = `alert use-video ${currentSeverity}`;
            alert.style.position = 'absolute';
            alert.style.top = '0%';
            alert.style.left = '0';
            alert.style.width = '100%';
            alert.style.height = '100%';
            alert.style.zIndex = '10';

            const video = document.createElement('video');
            video.src = alertData.video;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.style.width = '40%';
            video.style.height = '40%';
            video.style.objectFit = 'contain';
            video.onerror = () => {
                if (alertData.image) {
                    renderImageAlert(alert, alertData, true);
                } else {
                    renderStyledAlert(alert, alertData);
                }
            };
            alert.appendChild(video);
        } else if (alertData.image) {
            renderImageAlert(alert, alertData, true);
        } else {
            renderStyledAlert(alert, alertData);
        }

        targetSurface.appendChild(alert);
    } catch (error) {
        console.error('Error rendering alert:', error);
        showError('Failed to display alert.');
    }
}

function renderImageAlert(alert, alertData, isOverlay = false) {
    alert.className = `alert use-image ${currentSeverity}`;
    if (isOverlay) {
        alert.style.position = 'absolute';
        alert.style.top = '0';
        alert.style.left = '0';
        alert.style.width = '100%';
        alert.style.height = '100%';
        alert.style.zIndex = '10';
    }
    const img = document.createElement('img');
    img.src = alertData.image;
    img.alt = `${alertData.title}: ${alertData.message}`;
    img.style.width = '40%';
    img.style.height = '40%';
    img.style.objectFit = 'contain';
    img.onerror = () => renderStyledAlert(alert, alertData);
    alert.appendChild(img);
}

function renderStyledAlert(alertElement, alertData) {
    alertElement.className = `alert ${currentSeverity}`;
    const icon = document.createElement('div');
    icon.className = 'alert-icon';
    icon.textContent = alertData.icon;
    icon.setAttribute('aria-hidden', 'true');
    const title = document.createElement('div');
    title.className = 'alert-title';
    title.textContent = alertData.title;
    const message = document.createElement('div');
    message.className = 'alert-message';
    message.textContent = alertData.message;
    alertElement.appendChild(icon);
    alertElement.appendChild(title);
    alertElement.appendChild(message);
}

function clearAlerts() {
    try {
        if (centerConsole) {
            centerConsole.querySelectorAll('.alert').forEach(a => a.remove());
        }
        if (driverCluster) {
            driverCluster.querySelectorAll('.alert').forEach(a => a.remove());
        }
    } catch (error) {
        console.error('Error clearing alerts:', error);
    }
}

function forceResetToBaseMap() {
    try {
        if (centerConsole) {
            centerConsole.innerHTML = '<img src="./assets/screens/center-console/Rivian-tablet-view.png" alt="Center console display" class="default-screen-image">';
        }
        if (driverCluster) {
            driverCluster.innerHTML = '<img src="./assets/screens/driver-cluster/alerts/BASE IC MAP.png" alt="Driver cluster display" class="default-screen-image" id="driver-cluster-default">';
        }
    } catch (error) {
        console.error('Error resetting to base map:', error);
    }
}

function showAudioInfo() {}

function announceToScreenReader(message) {
    try {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
        console.error('Error announcing to screen reader:', error);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
