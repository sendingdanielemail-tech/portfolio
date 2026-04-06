# Safety Notification Simulator

An interactive web-based tool for visualizing and demonstrating how safety notifications and alerts appear to delivery drivers in real-world vehicle contexts.

## Features

- **Vehicle Selection**: Currently supports Rivian (additional vehicles in P1)
- **16 Safety Scenarios**: Including following too closely, speeding, pedestrian detection, and more
- **Severity Levels**: Mid and High severity options with distinct visual treatments
- **Real-time Alert Rendering**: Dynamic display on appropriate tablet surfaces
- **Audio Context**: Text descriptions of accompanying audio alerts
- **Clean Dark UI**: Professional interface with Helvetica typography

## Getting Started

### Local Development

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge)
2. No build process or dependencies required - pure HTML, CSS, and JavaScript

### Usage

1. **Select Vehicle Type**: Choose Rivian from the dropdown (default)
2. **Select Scenario**: Pick a safety hazard or event from the list
3. **Adjust Severity**: Toggle between Mid and High severity levels
4. **View Alert**: See the alert render in real-time on the appropriate tablet surface
5. **Check Audio**: Review the audio description that would accompany the alert
6. **Reset**: Click "Reset Simulation" to start over

## Project Structure

```
safety-notification-simulator/
├── index.html          # Main HTML structure
├── styles.css          # Dark theme styling with Helvetica
├── config.js           # Scenario configuration data
├── app.js              # Application logic
└── README.md           # This file
```

## Scenarios Included

1. Backup Camera Obstruction
2. Collision Warning
3. Delivery Zone Approaching
4. Distracted Driving Warning
5. Following Too Closely
6. Hard Braking Event
7. Lane Departure Warning
8. Low Battery Warning
9. Pedestrian Detected
10. Restricted Area Warning
11. Seatbelt Not Fastened
12. Sharp Turn Ahead
13. Speeding Alert
14. Stop Sign Ahead
15. Vehicle Maintenance Required
16. Weather Hazard Alert

## Configuration

Scenarios are defined in `config.js`. Each scenario includes:

- **id**: Unique identifier
- **name**: Display name
- **description**: Scenario description
- **surface**: Target tablet (`center-console` or `driver-cluster`)
- **audio**: Audio description text
- **alerts**: Alert content for each severity level (icon, title, message)

### Adding New Scenarios

Edit `config.js` and add a new scenario object to the `SCENARIOS` array:

```javascript
{
    id: 'new-scenario',
    name: 'New Scenario Name',
    description: 'Description of the scenario',
    surface: 'center-console', // or 'driver-cluster'
    audio: 'Audio description',
    alerts: {
        mid: {
            icon: '⚠️',
            title: 'Alert Title',
            message: 'Alert message'
        },
        high: {
            icon: '🛑',
            title: 'Urgent Title',
            message: 'Urgent message'
        }
    }
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Roadmap

### P1 (Q3-Q4 2026)
- Rivian 3D World Mode visualization
- Actual audio file playback
- Additional vehicle types (Ford, Mercedes)

### P2 (2027)
- Mobile responsive design
- Dynamic content management system
- Low severity level option

## Technical Notes

- Pure vanilla JavaScript - no frameworks required
- CSS Grid and Flexbox for responsive layout
- CSS animations for smooth alert transitions
- Accessible keyboard navigation
- ARIA labels for screen reader support

## License

Internal Amazon use only.

## Version

1.0.0 - P0 Launch (February 2026)
