# Assets Guide - Layered Structure

## Asset Layers Overview

The simulator uses a three-layer approach:

1. **Vehicle Background** - The driver's view of the vehicle interior
2. **Screen UI** - The default screen content (maps, navigation, default elements)
3. **Alerts** - The safety notifications that appear on top

## Folder Structure

```
assets/
├── vehicles/              # Layer 1: Vehicle interior backgrounds
│   ├── rivian-interior.jpg
│   ├── ford-interior.jpg
│   └── mercedes-interior.jpg
│
├── screens/               # Layer 2: Screen UI elements
│   ├── center-console/    # Center console/aftermarket tablet screen UIs
│   │   ├── rivian-default.png      # Rivian center console
│   │   ├── rivian-navigation.png
│   │   ├── ford-default.png        # Ford aftermarket tablet
│   │   └── mercedes-default.png    # Mercedes aftermarket tablet
│   │
│   └── driver-cluster/    # Driver cluster screen UIs (Rivian only)
│       ├── rivian-default.png
│       └── rivian-speedometer.png
│
└── alerts/                # Layer 3: Alert overlays (optional)
    ├── backup-camera-obstruction-mid.png
    ├── backup-camera-obstruction-high.png
    ├── collision-warning-mid.png
    ├── collision-warning-high.png
    └── [scenario-id]-[severity].png
```

## Vehicle-Specific Surfaces

### Rivian
- **Instrument Cluster (IC)**: Driver-side digital display
- **Center Console**: Large center tablet
- Both surfaces can display alerts

### Ford Transit & Mercedes Sprinter
- **Aftermarket Tablet Only**: Single tablet mounted in center
- Only center-console surface is used
- Scenarios configured for IC will automatically fall back to center console

## How It Works

### Layer 1: Vehicle Background
- Shows the full vehicle interior from driver's perspective
- Applied to the entire vehicle view container
- File: `assets/vehicles/[vehicle-name]-interior.jpg`

### Layer 2: Screen UI
- Shows the default screen content (maps, gauges, etc.)
- Applied as background to the tablet surface
- File: `assets/screens/[surface-type]/[vehicle]-[ui-state].png`
- Surface types: `center-console` or `driver-cluster`
- UI states: `default`, `navigation`, `speedometer`, etc.

### Layer 3: Alerts
- Safety notifications that overlay on top of screen UI
- Can be custom images OR styled HTML elements (current default)
- File: `assets/alerts/[scenario-id]-[severity].png`

## Adding Your Assets

### Step 1: Add Vehicle Interior
Drop your vehicle interior photo:
```
assets/vehicles/rivian-interior.jpg
```

**Specs:**
- Format: JPG or PNG
- Resolution: 1920x1080 or higher
- Aspect ratio: 16:9
- File size: Under 500KB (optimized)

### Step 2: Add Screen UI Images
Drop screen UI images for each tablet surface:

**For Rivian (has both IC and center console):**
```
assets/screens/center-console/rivian-default.png
assets/screens/driver-cluster/rivian-default.png
```

**For Ford/Mercedes (aftermarket tablet only):**
```
assets/screens/center-console/ford-default.png
assets/screens/center-console/mercedes-default.png
```

**Specs:**
- Format: PNG with transparency (recommended)
- Resolution: Match tablet dimensions
  - Center console: 400x250px (or match your actual tablet size)
  - Driver cluster (Rivian only): 350x180px
- File size: Optimized for web
- Should show: Maps, navigation, gauges, default screen content

**Note:** Ford and Mercedes don't need driver-cluster images since they only have the aftermarket tablet. Scenarios configured for IC will automatically display on the center console for these vehicles.

**Naming convention:**
- `[vehicle]-default.png` - Default screen state
- `[vehicle]-navigation.png` - Navigation view (if different)
- `[vehicle]-speedometer.png` - Speedometer view (if different)

### Step 3: Add Alert Images (Optional)
If you want custom alert graphics instead of styled HTML:
```
assets/alerts/speeding-alert-mid.png
assets/alerts/speeding-alert-high.png
```

**Specs:**
- Format: PNG with transparency
- Resolution: Match tablet dimensions
- File size: Optimized for web

Then update `config.js`:
```javascript
alerts: {
    mid: {
        image: './assets/alerts/speeding-alert-mid.png',
        icon: '🚦', // Fallback
        title: 'Speed Limit',
        message: 'Reduce speed to 25 mph'
    }
}
```

## Configuration Examples

### Using Different Screen UI States
In `config.js`, specify which screen UI to use:

```javascript
{
    id: 'delivery-zone-approaching',
    name: 'Delivery Zone Approaching',
    surface: 'center-console',
    screenUI: 'navigation', // Uses rivian-navigation.png
    audio: 'Single chime + voice: "Delivery zone ahead"',
    alerts: { /* ... */ }
}
```

### Using Custom Alert Images
```javascript
{
    id: 'collision-warning',
    name: 'Collision Warning',
    surface: 'driver-cluster',
    screenUI: 'default',
    audio: 'Urgent triple beep',
    alerts: {
        mid: {
            image: './assets/alerts/collision-warning-mid.png',
            icon: '⚠️', // Fallback if image fails to load
            title: 'Collision Risk',
            message: 'Reduce speed'
        },
        high: {
            image: './assets/alerts/collision-warning-high.png',
            icon: '🛑',
            title: 'COLLISION IMMINENT',
            message: 'BRAKE IMMEDIATELY'
        }
    }
}
```

## Adjusting Tablet Positions

If tablet surfaces don't align with your vehicle photo, edit `styles.css`:

```css
.center-console {
    bottom: 80px;    /* Distance from bottom */
    left: 50%;       /* Horizontal position */
    width: 400px;    /* Tablet width */
    height: 250px;   /* Tablet height */
}

.driver-cluster {
    top: 120px;      /* Distance from top */
    left: 50px;      /* Distance from left */
    width: 350px;    /* Tablet width */
    height: 180px;   /* Tablet height */
}
```

## Quick Start Checklist

**Rivian (both IC and center console):**
- [ ] Add vehicle interior: `assets/vehicles/rivian-interior.jpg`
- [ ] Add center console screen: `assets/screens/center-console/rivian-default.png`
- [ ] Add driver cluster screen: `assets/screens/driver-cluster/rivian-default.png`
- [ ] (Optional) Add custom alert images: `assets/alerts/[scenario]-[severity].png`

**Ford/Mercedes (aftermarket tablet only):**
- [ ] Add vehicle interior: `assets/vehicles/ford-interior.jpg` or `mercedes-interior.jpg`
- [ ] Add tablet screen: `assets/screens/center-console/ford-default.png` or `mercedes-default.png`
- [ ] (Optional) Add custom alert images: `assets/alerts/[scenario]-[severity].png`

**Then:**
- [ ] Open `index.html` in browser and test
- [ ] Adjust tablet positions in CSS if needed

## Tips

- **Screen UI images** should show what the driver normally sees (maps, gauges, etc.)
- **Alert images** should be the notification that appears on top
- Use PNG with transparency for screen UI and alerts for best layering
- Keep file sizes optimized for fast loading
- Test each layer individually to ensure proper alignment
- Use browser DevTools to inspect and adjust positioning

## Example Workflow

1. Take photo of Rivian interior → Save as `rivian-interior.jpg`
2. Screenshot center console with map → Save as `rivian-default.png` in `screens/center-console/`
3. Screenshot driver cluster with speedometer → Save as `rivian-default.png` in `screens/driver-cluster/`
4. Create alert graphic in design tool → Save as `speeding-alert-high.png` in `alerts/`
5. Update `config.js` to reference the alert image
6. Test in browser

## Need Help?

Share your assets and I can help with:
- Adjusting tablet positions to match your vehicle photo
- Optimizing image sizes
- Configuring scenarios to use your custom images
