// Vehicle configuration
// NOTE: Ford and Mercedes are configured for future use but not currently active in the UI
const VEHICLES = {
    rivian: {
        name: 'Rivian',
        surfaces: ['driver-cluster', 'center-console'], // Has both IC and center console
        defaultSurface: 'driver-cluster'
    },
    // FUTURE: Ford Transit support
    ford: {
        name: 'Ford Transit',
        surfaces: ['center-console'], // Only aftermarket tablet
        defaultSurface: 'center-console'
    },
    // FUTURE: Mercedes Sprinter support
    mercedes: {
        name: 'Mercedes Sprinter',
        surfaces: ['center-console'], // Only aftermarket tablet
        defaultSurface: 'center-console'
    }
};

// Scenario configuration
const SCENARIOS = [
    {
        id: 'test-a',
        name: 'Test A',
        surface: 'driver-cluster',
        alerts: {
            '01': { video: './assets/screens/driver-cluster/TestABC/Test-A-01.mp4' },
            '02': { video: './assets/screens/driver-cluster/TestABC/Test-A-02.mp4' }
        }
    },
    {
        id: 'test-b',
        name: 'Test B',
        surface: 'driver-cluster',
        alerts: {
            '01': { video: './assets/screens/driver-cluster/TestABC/Test-B-01.mp4' },
            '02': { video: './assets/screens/driver-cluster/TestABC/Test-B-02.mp4' },
            '03': { video: './assets/screens/driver-cluster/TestABC/Test-B-03.mp4' }
        }
    },
    {
        id: 'test-c',
        name: 'Test C',
        surface: 'driver-cluster',
        alerts: {
            '01': { image: './assets/screens/driver-cluster/TestABC/Test-C-01-image-only.png' },
            '02': { video: './assets/screens/driver-cluster/TestABC/Test-C-02.mp4' },
            '03': { video: './assets/screens/driver-cluster/TestABC/Test-C-03.mp4' },
            '04': { video: './assets/screens/driver-cluster/TestABC/Test-C-04.mp4' }
        }
    }
];
