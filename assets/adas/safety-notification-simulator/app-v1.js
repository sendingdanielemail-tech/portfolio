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

// All severity buttons (dynamic)
let severityButtons = [];

// State
let currentScenario = null;
let currentSeverity = 'low'; // Default to low
const currentVehicle = 'rivian'; // Fixed to Rivian only (Ford/Mercedes support coming in future)

// Audio context for Web Audio API
let audioContext = null;

// Initialize audio context (must be done after user interaction)
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Play alert sound based on severity
function playAlertSound(severity) {
    try {
        const ctx = initAudioContext();
        
        if (severity === 'low') {
            // No audio for low severity
            return;
        } else if (severity === 'mid') {
            // Single shorter lower-tone alert beep
            playBeep(ctx, 500, 0.18, 0);
        } else if (severity === 'high') {
            // Series of 7 rapid urgent beeps
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

// Play a single beep
function playBeep(ctx, frequency, duration, startDelay) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Envelope for smooth sound
    const now = ctx.currentTime + startDelay;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.05); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
    
    oscillator.start(now);
    oscillator.stop(now + duration);
}

// Cached sorted scenarios for performance
let sortedScenarios = [];

// Initialize
function init() {
    try {
        // Validate configuration loaded
        if (typeof SCENARIOS === 'undefined' || !Array.isArray(SCENARIOS)) {
            throw new Error('SCENARIOS configuration not loaded');
        }
        if (typeof VEHICLES === 'undefined' || !VEHICLES[currentVehicle]) {
            throw new Error('VEHICLES configuration not loaded');
        }

        // Cache scenarios in config order (no sorting)
        sortedScenarios = [...SCENARIOS];

        populateScenarios();
        attachEventListeners();
        loadVehicleImage();
        updateVehicleSurfaces();
        
        // Ensure clean base map state on startup
        forceResetToBaseMap();
    } catch (error) {
        console.error('Initialization failed:', error);
        showError('Failed to initialize simulator. Please refresh the page.');
    }
}

// Load vehicle background image with feedback
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

// Show error message to user
function showError(message) {
    if (errorMessage) {
        const errorText = errorMessage.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
        errorMessage.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
}

// Update visible surfaces based on vehicle
// NOTE: Currently only Rivian is active, but this supports Ford/Mercedes for future use
function updateVehicleSurfaces() {
    try {
        const vehicle = VEHICLES[currentVehicle];
        
        if (!vehicle) {
            console.warn(`Vehicle configuration not found for: ${currentVehicle}`);
            return;
        }
        
        // Show/hide surfaces based on vehicle capabilities
        if (vehicle.surfaces.includes('driver-cluster')) {
            driverCluster.style.display = 'flex';
        } else {
            driverCluster.style.display = 'none';
        }
        
        if (vehicle.surfaces.includes('center-console')) {
            centerConsole.style.display = 'flex';
        } else {
            centerConsole.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating vehicle surfaces:', error);
    }
}

// Populate scenario dropdown
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

// Event Listeners
function attachEventListeners() {
    try {
        scenarioSelect.addEventListener('change', handleScenarioChange);
        resetBtn.addEventListener('click', handleReset);
        minimizeBtn.addEventListener('click', togglePanel);
    } catch (error) {
        console.error('Error attaching event listeners:', error);
    }
}

// Handle severity button clicks
function handleSeverityClick(event) {
    try {
        const button = event.currentTarget;
        
        if (button.disabled) return;
        
        const severity = button.dataset.severity;
        
        // Update active state
        severityButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update current severity
        currentSeverity = severity;
        
        if (currentScenario) {
            renderAlert();
            showAudioInfo();
            playAlertSound(severity); // Play sound when severity changes
            announceToScreenReader(`Severity changed to ${severity}`);
        }
    } catch (error) {
        console.error('Error handling severity click:', error);
        showError('Failed to change severity level.');
    }
}

// Toggle control panel minimize/maximize
function togglePanel() {
    try {
        controlPanel.classList.toggle('minimized');
        
        if (controlPanel.classList.contains('minimized')) {
            minimizeBtn.setAttribute('aria-label', 'Maximize control panel');
        } else {
            minimizeBtn.setAttribute('aria-label', 'Minimize control panel');
        }
    } catch (error) {
        console.error('Error toggling panel:', error);
    }
}

function handleScenarioChange() {
    try {
        const scenarioId = scenarioSelect.value;
        
        if (!scenarioId) {
            clearAlerts();
            disableAllSeverityButtons();
            severityGroup.classList.add('hidden');
            audioInfo.classList.add('hidden');
            return;
        }
        
        // Show severity group when scenario is selected
        severityGroup.classList.remove('hidden');
        
        // Find scenario
        currentScenario = SCENARIOS.find(s => s.id === scenarioId);
        
        if (!currentScenario) {
            console.error(`Scenario not found: ${scenarioId}`);
            showError('Selected scenario not found.');
            return;
        }
        
        // Validate scenario has required data
        if (!currentScenario.alerts) {
            console.error(`Invalid scenario data for: ${scenarioId}`);
            showError('Scenario data is incomplete.');
            return;
        }
        
        // Enable/disable severity buttons based on available alerts
        updateSeverityButtons();
        
        // Select first available severity
        selectFirstAvailableSeverity();
        
        // DON'T render alert automatically - wait for user to select severity
        showAudioInfo();
        
        // Announce to screen readers
        announceToScreenReader(`Selected ${currentScenario.name}`);
    } catch (error) {
        console.error('Error handling scenario change:', error);
        showError('Failed to load scenario.');
    }
}

// Update severity buttons based on available alerts
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

// Disable all severity buttons
function disableAllSeverityButtons() {
    severityButtons.forEach(btn => btn.classList.remove('active'));
    severityButtonsContainer.innerHTML = '';
    severityButtons = [];
}

// Select first available severity level
function selectFirstAvailableSeverity() {
    severityButtons.forEach(btn => btn.classList.remove('active'));
    if (severityButtons.length > 0) {
        currentSeverity = severityButtons[0].dataset.severity;
    }
}

function handleReset() {
    try {
        // Reset selections
        scenarioSelect.value = '';
        currentSeverity = 'low'; // Reset to low
        
        // Reset state
        currentScenario = null;
        
        // Disable and clear severity buttons
        disableAllSeverityButtons();
        
        // Hide severity group and audio info
        severityGroup.classList.add('hidden');
        
        // Force reset to clean base map state
        forceResetToBaseMap();
        audioInfo.classList.add('hidden');
        
        // Announce to screen readers
        announceToScreenReader('Simulation reset');
    } catch (error) {
        console.error('Error resetting simulation:', error);
        showError('Failed to reset simulation.');
    }
}

function renderAlert() {
    if (!currentScenario) return;
    
    try {
        // Clear previous alerts
        clearAlerts();
        
        // Get alert data for current severity
        const alertData = currentScenario.alerts[currentSeverity];
        
        if (!alertData) {
            console.error(`Alert data not found for severity: ${currentSeverity}`);
            return;
        }
        
        // Determine target surface with fallback for vehicles without IC
        let targetSurfaceType = currentScenario.surface;
        const vehicle = VEHICLES[currentVehicle];
        
        // If scenario wants driver-cluster but vehicle doesn't have it, use center-console
        if (targetSurfaceType === 'driver-cluster' && !vehicle.surfaces.includes('driver-cluster')) {
            targetSurfaceType = 'center-console';
        }
        
        const targetSurface = targetSurfaceType === 'center-console' 
            ? centerConsole 
            : driverCluster;
        
        if (!targetSurface) {
            console.error('Target surface element not found');
            return;
        }
        
        // Create alert element
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'assertive');
        
        // Check if using video or image
        if (alertData.video) {
            alert.className = `alert use-video ${currentSeverity}`;
            alert.style.position = 'absolute';
            alert.style.top = '0%';
            alert.style.left = '0';
            alert.style.width = '100%';
            alert.style.height = '100%';
            alert.style.zIndex = '10'; // Above base image
            
            const video = document.createElement('video');
            video.src = alertData.video;
            video.autoplay = true;
            video.loop = true;
            video.muted = true; // Muted since we have Web Audio API sounds
            video.playsInline = true;
            video.style.width = '40%';
            video.style.height = '40%';
            video.style.objectFit = 'contain';
            
            video.onerror = () => {
                console.error('Failed to load alert video:', alertData.video);
                // Fallback to image if available
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
            // Use default styled alert
            renderStyledAlert(alert, alertData);
        }
        
        targetSurface.appendChild(alert);
    } catch (error) {
        console.error('Error rendering alert:', error);
        showError('Failed to display alert.');
    }
}

// Helper function to render image alerts
function renderImageAlert(alert, alertData, isOverlay = false) {
    alert.className = `alert use-image ${currentSeverity}`;
    
    if (isOverlay) {
        alert.style.position = 'absolute';
        alert.style.top = '0';
        alert.style.left = '0';
        alert.style.width = '100%';
        alert.style.height = '100%';
        alert.style.zIndex = '10'; // Above base image
    }
    
    const img = document.createElement('img');
    img.src = alertData.image;
    img.alt = `${alertData.title}: ${alertData.message}`;
    img.style.width = '40%';
    img.style.height = '40%';
    img.style.objectFit = 'contain';
    
    img.onerror = () => {
        console.error('Failed to load alert image:', alertData.image);
        // Fallback to styled alert
        renderStyledAlert(alert, alertData);
    };
    
    alert.appendChild(img);
}

// Render styled alert (non-image version)
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
        // Clear center console alerts (but keep default image)
        if (centerConsole) {
            const alerts = centerConsole.querySelectorAll('.alert');
            alerts.forEach(alert => alert.remove());
            // Keep default image visible
        }
        
        // Clear driver cluster alerts (but keep default image)
        if (driverCluster) {
            const alerts = driverCluster.querySelectorAll('.alert');
            alerts.forEach(alert => alert.remove());
            // Keep default image visible
        }
    } catch (error) {
        console.error('Error clearing alerts:', error);
    }
}

// Force reset to clean base IC map state
function forceResetToBaseMap() {
    try {
        // Clear all alerts from both surfaces
        if (centerConsole) {
            centerConsole.innerHTML = '<img src="./assets/screens/center-console/Rivian-tablet-view.png" alt="Center console display" class="default-screen-image">';
        }
        
        if (driverCluster) {
            driverCluster.innerHTML = '<img src="./assets/screens/driver-cluster/alerts/BASE IC MAP.png" alt="Driver cluster display" class="default-screen-image" id="driver-cluster-default">';
        }
        
        console.log('Reset to clean base IC map state');
    } catch (error) {
        console.error('Error resetting to base map:', error);
    }
}

function showAudioInfo() {}

// Announce changes to screen readers
function announceToScreenReader(message) {
    try {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
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
