// A problem is a key (for fact stats) plus one or more layers. Each layer is a question
// t, its answer a, optional sub-line, and optional op {o,a,b} used to build plausible
// wrong answers in multiple-choice modes.
export const P=(key,layers,extra={})=>({key,layers,...extra});
export const X='×';
