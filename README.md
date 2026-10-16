# VirtualEphysRig

Browser-based simulated visual electrophysiology rig for teaching.

[Open the current Visual Neuron Lab Site](https://visual-neuron-rig-updated.pjendritza.chatgpt.site/)

## Run locally

Serve the `dist/` directory with any static server, for example:

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000/#exercise-1. Camera access requires HTTPS or localhost. The app has no build step. The optional Python stimulus editor downloads Pyodide on first use.

## Exercises

- **Exercise 1:** Explore a simulated dark-bar simple cell with webcam stimuli.
- **Exercise 2:** Present bars or gratings to study orientation tuning.
- **Exercise 3:** Map the neuron's spatial receptive field with gratings presented at different positions.
- **Exercise 4:** Identify a mystery neuron using uploaded or sample images, positional protocols, and the same raw-voltage recordings. Triple-R toggles instructor reveal mode; right-click a thumbnail to remove it and use Restore files to undo removals.

The mystery exercise is built into `dist/mystery-neuron.html`. To rebuild it after editing its adapters or shared rig code, run `node tools/mystery/build-mystery.cjs`. Python and the face detector download their runtimes on first use; image processing stays in the browser. Keep uploaded stimulus files alongside recordings (images are not embedded in the recording ZIP).

The source includes docked and floating stimulus and camera views, a hidden receptive-field overlay, a live trace, waveform inspection, viewing filters, selectable spike sounds, experiment recording, and resizable panels.

## Project status

This is ongoing work. The interface, exercises, and data formats may change as the teaching materials are developed and tested.
