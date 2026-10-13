# VirtualEphysRig

Browser-based simulated visual electrophysiology rig for teaching. This repository contains the current source, including the waveform Clear control and audio startup fix. The [Visual Neuron Rig Site](https://visual-neuron-rig.pjendritza.chatgpt.site/) may still be on an earlier published version.

## Run locally

Serve the `dist/` directory with any static server, for example:

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000/#exercise-1. Camera access requires HTTPS or localhost. The app has no build step. The optional Python stimulus editor downloads Pyodide on first use.

## Exercises

- **Exercise 1:** Explore a simulated dark-bar simple cell with webcam stimuli.
- **Exercise 2:** Present bars or gratings to study orientation tuning.
- **Instructor / Debug:** Inspect the model and export raw recordings.

The source includes the docked and floating stimulus monitor and visual input, receptive-field overlay, live trace, waveform view, viewing filters, spike sound, and recording export in Debug mode.
