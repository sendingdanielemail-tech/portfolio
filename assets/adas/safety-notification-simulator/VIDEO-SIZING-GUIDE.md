# Video Alert Sizing Guide

## Current Configuration

### Video Element Sizing (in app.js)
- **File**: `app.js`
- **Function**: `renderAlert()`
- **Video dimensions**: `40%` width × `40%` height
- **Position**: `top: 0%`

### Code Location
```javascript
// In renderAlert() function, around line 350-360
video.style.width = '40%';
video.style.height = '40%';

// Alert container positioning
alert.style.top = '0%';
```

## Adjustment History
1. Started at `30%` × `30%`
2. Increased to `110%` × `110%` (too large)
3. Reduced to `65%` × `65%`
4. Reduced to `50%` × `50%`
5. **Final**: `40%` × `40%`

## Position History
1. Started at `top: -10%`
2. Moved to `top: -15%`
3. Moved to `top: -5%`
4. Moved to `top: -3%`
5. **Final**: `top: 0%`

## Quick Reference for Future Edits

### To resize video:
```javascript
video.style.width = 'XX%';
video.style.height = 'XX%';
```

### To reposition video:
```javascript
alert.style.top = 'XX%';
```

### Files Involved:
- **Main logic**: `/Users/dhenny/Desktop/safety-notification-simulator/app.js`
- **Video file**: `./assets/animations/medium-alert-front-collision.mp4`
- **Base image**: `./assets/screens/driver-cluster/alerts/BASE IC MAP.png`

## Notes
- Video overlays on top of BASE IC MAP.png in the driver-cluster area
- Video uses `object-fit: contain` to maintain aspect ratio
- Alert container has `z-index: 10` to appear above base image