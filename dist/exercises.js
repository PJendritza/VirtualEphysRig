
'use strict';
// Exercise configuration only; the camera, scope and acquisition remain shared.
let activeExercise='debug';
function exerciseStatus(text,error=false){$('exerciseStatus').textContent=text;$('exerciseStatus').classList.toggle('error',error);}
function applyExercise(exercise){if(recording){$('exerciseSelect').value=activeExercise;message('Stop recording before changing exercise.',true);return;}if(pausedScope)$('pauseViewing').click();if(activeExercise==='two'&&exercise!=='two')leaveExerciseTwo();if(exercise==='one'||exercise==='two'){dockMonitor();$('dockCamera').click();}activeExercise=exercise;$('exerciseSelect').value=exercise;document.body.dataset.exercise=exercise;send('stop');
  if(exercise==='one'){cameraRFModel={...modelDisplay.model,...exerciseOneModel()};if(compiling)cancelCompile();scope.setFilter({highpass:300,lowpass:6000});scope.setThreshold(-70);$('threshold').value=-70;$('filterPreset').value='spikes';$('highpass').value=300;$('lowpass').value=6000;$('reveal').checked=false;drawRF();$('inputSource').value='webcam';$('cameraStatus').textContent='Start the webcam. Hold paper, bars or gratings in front of it and watch/listen for spikes.';exerciseStatus('Goal: figure out what makes this neuron fire.');}
  else if(exercise==='two'){if(compiling)cancelCompile();$('reveal').checked=false;drawRF();$('inputSource').value='webcam';enterExerciseTwo();}
  else{cameraRFModel={...modelDisplay.model};$('reveal').checked=true;drawRF();$('inputSource').value='direct';positionMonitor();$('cameraStatus').textContent='Instructor / Debug: direct screen input selected; webcam is also available.';}
  send('exerciseProfile',{exercise});window.refreshVisualInput?.();const hash=exercise==='one'?'#exercise-1':exercise==='two'?'#exercise-2':'#debug';if(location.hash!==hash)history.replaceState(null,'',hash);
}
$('exerciseSelect').onchange=()=>applyExercise($('exerciseSelect').value);window.addEventListener('hashchange',()=>{const next=location.hash==='#debug'?'debug':location.hash==='#exercise-2'?'two':'one';if(next!==activeExercise)applyExercise(next);});applyExercise(location.hash==='#debug'?'debug':location.hash==='#exercise-2'?'two':'one');
