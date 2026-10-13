# Visual Neuron Lab — acquisition prototype

Four panels: stimulus monitor, live voltage/spikes, Python stimulus protocol, and webcam/recording controls with a revealable complex-cell receptive field. Static files are in `dist/`.

## Usage

The rig starts with simulated-screen input selected and spontaneous activity. The input selector switches explicitly between the direct simulated display and webcam/video pixels. Start the webcam and grant camera permission. Point it at the generated stimulus monitor, optionally full screen. The cropped live camera image actually drives the neuron. Use the zoom slider or mouse wheel, click the full-camera overview to move the crop center, or drag the live image to pan. Reset crop restores the central 1× region. The crop preserves a 3:2 aspect ratio and remains within the source frame.

Present a grating manually or run the Python example. Start recording before the experiment, stop afterward, and download one ZIP. There is no analysis workspace in this version. A direct-input testing mode remains available in the input selector; simulated-screen input is the default for debugging.

Python is loaded in a separate worker via pinned Pyodide 0.27.7. Its standard-library code constructs a finite stimulus sequence using `grating(...)` and `blank(...)`. Stimulus rendering and acquisition run separately. The page needs internet on the first Python load; manual controls do not depend on Pyodide.

## Recording format

- `voltage.bin`: one channel, float32 little-endian, microvolts, 20,000 samples/second. No header; sample 0 is time 0. These are the same voltage samples sent to the live trace.
- `metadata.json`: sample count, sample rate, units, creation time, model parameters, simulation seed, source code captured at record start and protocol-start notes.
- `stimuli.json`: exact simulation sample indices and seconds for stimulus onsets and offsets (exclusive), stimulus type, source and parameters. `stimulus_origin_sample` preserves the original phase clock if recording begins mid-stimulus; it may be negative. `phase_at_onset_deg` also records that phase explicitly.
- `camera_frames.json`: per-frame simulation receipt sample/time, capture wall-clock time, video media time and contrast/filter-response metrics. Camera frames are processed locally and images/video are not saved or uploaded. Initial crop settings, input source and subsequent crop/source changes are preserved in metadata. The generated stimulus log describes display commands; it is not a measured optical-onset log.

The simulation has a fixed 1 ms integration step and 20 kHz voltage sampling, independent of display refresh. Timestamp values describe simulation events, not measured physical monitor presentation. Rendering may lag behind the worker. Keeping the tab hidden pauses the simulation and logs the pause; simulated time does not advance while paused. Acquisition automatically stops at five minutes.

Data remains in memory until downloaded and is lost if the tab is closed. The editor is saved in browser local storage when available. A new recording replaces the previous recording after a confirmation.

## Model

One teaching V1 complex cell: quadrature Gabor energy, contrast scaling, squared response nonlinearity, 40 ms response latency and 35 ms rate smoothing, stochastic spikes with 2 ms refractory period. Camera pixels are sampled to 72×48 grayscale, mean-subtracted within the receptive field, correlated with both Gabor components, contrast-normalized and gated before response generation. No new camera frame for 300 ms returns drive to zero. Synthetic voltage combines correlated broadband background, broadband 1/f-like field activity, slow drift, 50 Hz interference, small unresolved spikes, and a main multiphasic unit whose amplitude and width vary between events. The online monitor does not use generator spike times; it detects threshold crossings from its own viewing signal. Raw voltage remains unchanged in the worker and export.

## Validation

Checked orientation preference, low orthogonal drive, near phase invariance, zero-contrast response, exact protocol boundaries and sample counts, binary equality to live data, little-endian encoding, ZIP CRC integrity, Python helpers/example, and UI logic with a mock DOM. Webcam updates additionally checked pixel-based orientation/phase responses, independence from the generated stimulus, stale-frame fallback, crop bounds across landscape/portrait camera dimensions, and camera recording metadata. No visual browser or real-camera QA was available in the build environment. Browser Pyodide loading remains to be verified in a real browser.

## Live scope

One scrolling voltage trace replaces the raster. X buttons and editable values set a 10 ms to 10 s time window; Y buttons and editable values set a ±10 to ±5,000 µV range. Wheel zooms time; Shift-wheel zooms voltage. Fit estimates a voltage range from the current window. Desktop quadrants scroll internally to keep the stimulus on screen.

Viewing presets: raw, spikes (300–6,000 Hz), LFP (1–200 Hz), and custom. Filters are causal second-order Butterworth high/low-pass sections without notch filtering. Changing the filter rebuilds the displayed history and resets the detection/waveform view. Filters never touch acquisition or exported raw data.

The Auto threshold button sets the threshold once to −4.5 × robust noise σ (median absolute deviation / 0.67449). Noise readout updates independently, but neither new data nor filter/factor changes alter the threshold. The threshold can also be typed, dragged, or set by Shift-clicking the trace; these actions select manual mode. Detection uses a 1.5 ms refractory period and local-peak alignment. The unit inset overlays the last 40 detected 4 ms snippets with their mean. These are threshold-detected candidates, not spike sorting.

Validated filter passband, low/high-frequency rejection and attenuation, spike detection against simulator ground truth, waveform extraction, and bit-identical raw export despite viewing filter changes. Visual browser QA remains unavailable.

## Prototype 04

The unit inset has independent X (0.2–4 ms) and Y (±10–2,000 µV) zoom, buttons, numeric inputs, wheel/Shift-wheel zoom, horizontal drag panning and Fit. Custom high/low-pass edits apply immediately when valid; invalid intermediate edits preserve the last valid filter. There is no Apply button and no notch filter.

Drag the stimulus monitor header to detach it into a fixed viewport window. It is moved outside scroll containers, so scrolling either the page or a quadrant cannot change its position. Corner shortcuts, resizing, Dock and browser-local position persistence are supported.

LFP synthesis sums 12 independent stationary relaxation processes with log-spaced corner frequencies from 0.15 to 160 Hz. Equal process variances approximate a 1/f power spectrum across the central band. Each process has 20 µV standard deviation; the sum is interpolated between 1 ms updates. A 160 s realization yielded a Welch PSD slope of −1.077 over 1–80 Hz and a standard deviation of 71.0 µV. This is a broadband teaching approximation, not recorded biological LFP.

Verified threshold remains fixed across incoming samples and filter changes, unit zoom and floating-window control logic, and the LFP spectrum. Browser visual QA remains unavailable.

## Exercise 1 module (prototype 05)

Default route `#exercise-1` selects the webcam exploration exercise; `#debug` retains the full instructor interface. `exercises.js` only configures/rearranges existing controls. `exercise-one-model.js` owns the exercise-specific cell parameters. Later exercises can be separate modules sharing the same acquisition, camera, scope and export.

Exercise 1 hides generated stimuli, Python and receptive-field answers. Students see the webcam, live scope/audio, short paired instructions and optional raw recording. Camera controls expose start/stop and mirror, with device selection/crop available behind an optional button. The camera-view header can be dragged into a fixed floating window and docked again. Mirroring transforms both the displayed crop and the processed pixels; source crop geometry remains in camera coordinates.

Pair numbers deterministically select orientation and receptive-field position. The neuron is a quadrature-energy complex cell with broader angular tuning than the debug cell (sigma 0.16, aspect 0.70, preferred spatial frequency 4 cycles/screen, exponent 1.5). A numerical camera-input check produced drive 0.982 at preference, 0.325 at +30°, near zero at +90°, and 1.000 at quadrature phase. Repeat stimuli give variable spikes but the same cell properties. Instructions ask for three repetitions and swapping presenter/observer roles.

Exercise/pair changes are blocked while recording. Recorded model and exercise context are snapshots, so changing mode after stopping does not relabel existing recordings. Validated selector/configuration logic, deterministic pair identity, broad tuning, phase behavior, recording guards, profile snapshots, and HTML structure. No real-camera or visual-browser QA was available.

## Prototype 06: focused hand exploration

The hand exercise no longer exposes recording or numbered participant groups. Mirror is on by default; camera selection, crop and zoom are visible; the separate crop overview is hidden. The goal is to discover what makes one fixed neuron fire. Debug recording is preserved.

Exercise 1 spontaneous unit firing is 0.3 Hz. Its evoked response combines a sustained fraction of 0.4 with a positive drive-change component that adapts over 180 ms, producing a stronger onset and lower sustained rate. Existing latency and rate smoothing are preserved. The initial viewing threshold is −70 µV to reduce background crossings; manual and one-shot estimation remain available.

## Prototype 07

Rendering now starts on DOMContentLoaded, after the later trace/waveform scripts have initialized. Previously requestAnimationFrame could execute between loading app.js and scope-ui.js; drawTrace was then undefined and no further frame was scheduled. The next frame is now scheduled before drawing, with a guarded error display, so a drawing error cannot permanently kill the loop.

Default trace window is 3 seconds. Waveform view is hidden initially and can float by dragging its header, with Dock and saved positioning. Hand-exercise spontaneous rate is 0.7 Hz. No tests were run for this update at the user's request.

## Prototype 08

The floating waveform window uses an invisible docking marker, while the camera keeps its visible placeholder. A corner handle resizes waveform width/height, and the canvas adapts to its displayed size.

Hand exploration now uses an elongated OFF-center simple dark-bar model: one narrow negative central subfield with two lighter flanks. Its signed response requires the center to be darker than both flanks, suppressing white bars and isolated paper edges. The RF has no repeating multi-cycle carrier. Show RF beside the video temporarily displays the actual model orientation, center and subfield dimensions on the live processed image. The overlay is not fed back into the neuron. Debug retains the complex cell.

No tests run, as requested.

## Prototype 09

Pause view captures the trace history, detections and waveform snippets for inspection while acquisition, stimulus presentation and sound continue. X/Y zoom remains active on the frozen data. Resume returns to current live data. Switching exercise resumes viewing.

Removed panel numbers and live detected-rate/noise/clock readouts. Explore text now focuses on black-bar position, orientation, width/length and motion, without prescribed repetition counts or role swapping. Custom filter controls are no longer hidden by exercise-mode CSS; selecting Custom exposes editable fields and valid input edits still apply immediately. Blank intermediate inputs preserve the last valid filter. No tests run.

## Prototype 10: Exercise 2

The #exercise-2 route configures orientation tuning with a complex cell and webcam input by default, retaining direct-screen input for debugging. Recording controls are hidden. Python grating/bar/blank sequences and manual presentation share the same rig. The camera view is named Visual input — what the monkey sees; in Exercise 2 it is docked above the generated monitor inside the same draggable/floating display group.

Manual selection offers grating and black bar. Present stimulus toggles on/off. Wheel rotates orientation in 5° steps, and pointer dragging changes position. Bar width/length are adjustable; Python bar() is also supported. Removed angle presets, separate blank/grating presentation buttons, full-screen button, and the specified installation/Python startup copy. No tests run.
