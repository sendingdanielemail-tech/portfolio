# Safety Notification Simulator — Project Summary

## Overview
Web-based safety notification simulator for Amazon delivery drivers (Rivian vehicle). Displays alert overlays on a full-screen Rivian dashboard with driver cluster (IC) and center console screens.

---

## File Structure
```
safety-notification-simulator/
├── index.html          — App shell, DOM structure
├── app.js              — All rendering logic, audio, event handling
├── config.js           — Scenarios and vehicle definitions
├── styles.css          — Layout, positioning, control panel styles
├── assets/
│   ├── vehicles/rivian-interior.png
│   ├── windshield/street-view.png
│   ├── animations/
│   │   └── medium-alert-front-collision.mp4   ← video alert
│   └── screens/
│       ├── driver-cluster/alerts/
│       │   ├── BASE IC MAP.png                ← always-visible base layer
│       │   ├── ALT-warning-HIGH.png
│       │   ├── ALT-warning-MID.png
│       │   ├── Front collision — LOW/MID/HIGH.png
│       │   ├── PED WARNING — MID/MID-1/HIGH.png
│       │   └── SIDE COLLISION — MID/MID-1/HIGH.png
│       └── center-console/
│           ├── Rivian-tablet-view.png
│           ├── REVERSING ALERT LOW/MID/HIGH.png
└── alignment-tool.html / full-alignment-tool.html
```

---

## Scenarios (defined in config.js)

| ID | Name | Surface | Severities |
|----|------|---------|------------|
| `front-collision-alt` | Front Collision Alt | driver-cluster | MID (video), HIGH (image) |
| `front-collision` | Front Collision | driver-cluster | LOW, MID, HIGH (images) |
| `pedestrian-warning` | Pedestrian Warning | driver-cluster | LOW, MID, HIGH (images) |
| `side-impact-warning` | Side Impact Warning | driver-cluster | LOW, MID, HIGH (images) |
| `reversing-alert` | Reversing Alert | center-console | LOW, MID, HIGH (images) |

---

## Audio (Web Audio API — no external files needed)
- **LOW**: Silent
- **MID**: Single beep at 500Hz, 0.18s
- **HIGH**: 7 rapid beeps at 850Hz, 0.12s each

---

## Video Alert Configuration (app.js — renderAlert function)

The `front-collision-alt` MID severity uses a video overlay on the driver cluster.

**Current settings:**
```javascript
video.style.width = '40%';
video.style.height = '40%';
video.style.objectFit = 'contain';

alert.style.top = '0%';       // vertical position of the container
alert.style.left = '0';
alert.style.width = '100%';
alert.style.height = '100%';
```

**To add a video to any scenario**, set a `video` key in config.js:
```javascript
mid: {
    video: './assets/animations/YOUR-FILE.mp4',
    image: './assets/screens/...fallback.png',  // optional fallback
    title: '...',
    message: '...'
}
```

---

## Screen Positioning (styles.css)

### Driver Cluster (IC)
```css
.driver-cluster {
    top: 39.4%;
    left: 19.2%;
    width: 30.1%;
    height: 19.1%;
}
```

### Center Console
```css
.center-console {
    top: 48.2%;
    left: 55%;
    width: 40.9%;
    height: 38%;
    transform: perspective(1000px) rotateY(-6.5deg) rotateX(-0.5deg) rotateZ(6deg);
}
```

### Control Panel
```css
.control-panel {
    top: 120px;
    left: 20px;
    width: 336px;
    padding: 24px;
}
```

---

## Adding New Video Alerts

1. Drop the `.mp4` file into `assets/animations/`
2. In `config.js`, add `video: './assets/animations/YOUR-FILE.mp4'` to the desired severity
3. Video size and position are controlled in `app.js` → `renderAlert()`:
   - `video.style.width / height` — scale of the video
   - `alert.style.top` — vertical offset within the IC surface

---

## Known Notes
- Videos autoplay, loop, and are muted (audio handled by Web Audio API)
- If a video fails to load, it falls back to `image` if defined, then to a styled text alert
- The `BASE IC MAP.png` is always visible as the base layer; alerts render on top at `z-index: 10`
- Ford and Mercedes vehicle configs exist in `config.js` but are not active in the UI yet
