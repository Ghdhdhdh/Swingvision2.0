# SwingVision 2.0

A browser-based tennis line-calling and stats app. Everything runs on-device —
no backend, no upload of your video anywhere.

## Features

- **Homepage** introducing the product and workflow.
- **Live tracking** (`/track`): use your webcam or upload a recorded video,
  calibrate the court by clicking its four corners, and get a live ball
  trail with automatic **IN / OUT** line calls as the ball bounces.
- **Stats** (`/stats`): once a session ends, see shot count, in/out rate,
  average and top ball speed, a bounce heatmap on a court diagram, and a
  full shot log.

## How the tracking works

- Ball detection uses TensorFlow.js (`@tensorflow-models/coco-ssd`) running
  in the browser, filtered to the "sports ball" class.
- Court calibration computes a projective homography (DLT) from the four
  clicked court corners to real-world court coordinates in meters, so pixel
  positions can be mapped onto actual court geometry.
- Bounces are detected as a sign change in the ball's vertical screen
  velocity (falling, then rising), then classified IN/OUT against standard
  ITF singles/doubles court boundaries via the homography.
- Ball speed is estimated by mapping consecutive frames through the same
  homography and dividing by elapsed time.

This is a single-camera, browser-only approximation — it does not do full 3D
ball reconstruction — but it's enough to call lines and produce real stats
from a phone or laptop camera.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and produce a production build
npm run lint      # oxlint
```
