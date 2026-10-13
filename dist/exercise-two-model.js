'use strict';
function tunedComplexCell(x,y){return{type:'V1 complex cell',orientation:60,spatial_frequency:5,sigma:.16,aspect:.90,x,y,baseline_hz:.7,maximum_hz:95,response_exponent:1.2,latency_s:.04,sustained_fraction:.4,onset_gain:1,adaptation_tau_s:.18};}
function exerciseTwoModel(){return tunedComplexCell(-.75,0);}
function exerciseThreeModel(){return tunedComplexCell(-1.05,.65);}
if(typeof module!=='undefined')module.exports={exerciseTwoModel,exerciseThreeModel};
