# VirtualEphysRig

A browser-based simulated visual electrophysiology experiment for teaching. Current source: prototype 11.

## Exercises

- **Exercise 1 — Explore by hand:** hold a drawn black bar or other physical stimuli in front of the webcam to discover a simple cell's receptive field and orientation preference. Camera mirroring is enabled initially. Recording is hidden.
- **Exercise 2 — Orientation tuning:** present gratings or black bars manually or with a Python protocol. Mouse wheel changes orientation; dragging changes stimulus position. Recording is hidden.
- **Instructor / Debug:** direct-screen or webcam input, model inspection, and raw recording export.

The visual-input panel shows the selected source: cropped webcam pixels or the simulated stimulus screen. Visual input and stimulus monitor are separate and start docked. Drag their headers to float them; use Dock to return them. No corner-position selector is included.

## Run

Serve the contents of `dist/` with any static web server. For local development with Python installed:

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000. Routes are `#exercise-1`, `#exercise-2`, and `#debug`. Hosted camera access requires HTTPS; localhost also supports camera access. Students can use a hosted version in a browser without installing software.

The application has no build step or package dependencies. The Python editor loads pinned Pyodide 0.27.7 from its CDN and constructs a finite stimulus protocol using `grating(...)`, `bar(...)`, and `blank(...)`. Manual controls work independently of Python.

## Live signal

One scrolling voltage trace, adjustable time and voltage scales, instant viewing filters, manual threshold and one-shot automatic threshold estimation, spike audio, and a draggable/resizable waveform view. Pause view freezes the displayed trace while acquisition continues. Default time window: 3 seconds; waveform view is initially hidden.

The simulation uses a 20 kHz synthetic extracellular voltage signal. Exercise 1 uses an elongated dark-bar simple-cell model; Exercise 2 and Debug use quadrature Gabor complex-cell models. Responses include latency, an onset transient and sustained activity. This is a teaching simulation rather than recorded biological data.

## Debug recording export

A ZIP contains:

- `voltage.bin`: float32 little-endian, microvolts, one channel at 20,000 samples/s.
- `metadata.json`: sampling information, model and session details.
- `stimuli.json`: stimulus parameters and simulation timestamps.
- `camera_frames.json`: frame timing and response metrics, without images or video.

Viewing filters do not alter exported voltage. Camera images are processed locally. Recordings remain in browser memory until downloaded. Timestamps describe simulation events, not measured physical display onset. Hiding the browser tab pauses simulated time.

## Source layout

`app.js` coordinates controls and stimulus rendering; `acquisition-worker.js` and `engine.js` generate data; `camera.js` handles camera capture; `scope.js` and `scope-ui.js` handle display and detection. Exercise models and configuration are separate modules. Window modules handle dragging/docking. All application files are under `dist/`.

Prototype 11 JavaScript passed syntax checks. Browser and real-camera testing of this update has not been performed.
