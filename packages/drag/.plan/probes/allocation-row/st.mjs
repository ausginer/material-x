// node --allow-natives-syntax st.mjs: the values %GetOptimizationStatus returns for each tier.
function f(a) {
  return a.x + 1;
}
const o = { x: 1 };
console.log('fresh', %GetOptimizationStatus(f));
f(o);
console.log('called once', %GetOptimizationStatus(f));
%CompileBaseline(f);
console.log('baseline', %GetOptimizationStatus(f));
%PrepareFunctionForOptimization(f);
f(o);
%OptimizeMaglevOnNextCall(f);
f(o);
console.log('maglev', %GetOptimizationStatus(f));
%OptimizeFunctionOnNextCall(f);
f(o);
console.log('turbofan', %GetOptimizationStatus(f));
%DeoptimizeFunction(f);
console.log('deopted', %GetOptimizationStatus(f));
