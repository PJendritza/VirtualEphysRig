let python;
async function load(){postMessage({type:'status',message:'Loading browser Python…'});importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');python=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});}
const helpers=`
import json
_segments = []
def grating(orientation=0, duration=1, contrast=1, spatial_frequency=5, temporal_frequency=2, phase=0, x=0, y=0, radius=0.9):
    _segments.append({'duration': duration, 'stimulus': {'type': 'grating', 'orientation': orientation, 'contrast': contrast, 'spatial_frequency': spatial_frequency, 'temporal_frequency': temporal_frequency, 'phase': phase, 'x': x, 'y': y, 'radius': radius}})
    if len(_segments) > 1000: raise ValueError('Maximum 1,000 segments.')
def bar(orientation=0, duration=1, contrast=1, x=0, y=0, width=0.16, length=1.2):
    _segments.append({'duration': duration, 'stimulus': {'type': 'bar', 'orientation': orientation, 'contrast': contrast, 'x': x, 'y': y, 'width': width, 'length': length}})
    if len(_segments) > 1000: raise ValueError('Maximum 1,000 segments.')
def blank(duration=0.5):
    _segments.append({'duration': duration, 'stimulus': {'type': 'blank'}})
    if len(_segments) > 1000: raise ValueError('Maximum 1,000 segments.')
`;
onmessage=async e=>{try{if(!python)await load();postMessage({type:'status',message:'Compiling stimulus sequence…'});
  const ns=python.runPython('dict()');python.runPython(helpers,{globals:ns});await python.runPythonAsync(e.data.code,{globals:ns});
  const result=python.runPython('json.dumps(_segments)',{globals:ns});ns.destroy();postMessage({type:'result',segments:JSON.parse(result)});
}catch(err){postMessage({type:'error',message:String(err.message)});}};
