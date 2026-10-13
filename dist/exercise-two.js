'use strict';
function enterExerciseTwo(){cameraRFModel={...modelDisplay.model,...exerciseTwoModel()};$('showCameraRF').checked=false;$('cameraStatus').textContent='Point the webcam at the stimulus monitor, or select simulated screen input to drive the neuron directly.';}
function enterExerciseThree(){cameraRFModel={...modelDisplay.model,...exerciseThreeModel()};$('showCameraRF').checked=false;$('cameraStatus').textContent='Use the preferred orientation from Exercise 2 and map the shifted receptive field.';}
function leaveExerciseTwo(){}
