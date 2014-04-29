// variables for the treemap
var margin_tm = {top: 5, right: 5, bottom: 5, left: 5};
var width_tm = 790 - margin.left - margin.right,
  height_tm = 490 - margin.top - margin.bottom,
  transitioning,
  depth = 0,
  color_tm = d3.scale.category10();

// set up the treemap
var x_tm = d3.scale.linear()
  .domain([0, width_tm])
  .range([margin.left, width_tm + margin.left]);

var y_tm = d3.scale.linear()
  .domain([0, height_tm])
  .range([margin.left, height_tm + margin.left]);

var treemap = d3.layout.treemap()
  .children(function(d, depth) { return depth ? null : d._children; })
  .sort(function(a, b) { return a.value - b.value; })
  .ratio(height_tm / width_tm * 0.5 * (1 + Math.sqrt(5)))
  .round(false);