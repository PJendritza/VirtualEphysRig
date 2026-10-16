# Face asset

`mystery-face.png` was generated with the built-in image-generation tool on 2026-10-16. It depicts a fictional adult, not an identified person. It is used as a sample stimulus and an illustrative RF marker; it is not the face detector's template or learned weights.

Generation prompt:

> Generate a square photorealistic scientific visual stimulus: one fictional adult human face looking directly at camera, neutral relaxed expression, eyes open, no glasses, no beard, short tidy dark hair, full head and upper neck centered, even soft frontal illumination, natural facial proportions and realistic skin texture. Plain uniform mid-gray (#808080) background. Head fills about 75% of image height. No text, no border, no graphic elements. Intended as a face-detector test stimulus and miniature receptive-field marker, not a cartoon or smiley.

The HTML embeds this asset so the exercise remains self-contained. The face runtime (MediaPipe Tasks Vision 0.10.21 / BlazeFace) and Python runtime (Pyodide 0.27.7) are loaded separately on demand.
