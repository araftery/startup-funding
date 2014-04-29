var color_bc = d3.scale.ordinal()
  .domain(["seed", "a", "b", "c", "d", "e"])
  .range(colorbrewer.YlGn[6].reverse());

function drawBarChart(orgs) {
	// set up variables for the bar chart
	var margin_bc = {
		top: 5,
		right: 40,
		bottom: 5,
		left: 40
	};

  var width_bc = 1100 - margin_bc.left - margin_bc.right,
    height_bc = 200 - margin_bc.top - margin_bc.bottom;

  var x_bc = d3.scale.ordinal()
    .rangeRoundBands([0, width_bc], .4);

  var y_bc = d3.scale.linear()
    .rangeRound([height_bc - 70, 0]);

  var xAxis_bc = d3.svg.axis()
    .scale(x_bc)
    .orient("bottom");

  var yAxis_bc = d3.svg.axis()
    .scale(y_bc)
    .ticks(5)
    .orient("left");

  // add the svg
  var svg_bc = d3.select("#barchart").append("svg")
    .attr("width", width_bc + margin_bc.left + margin_bc.right)
    .attr("height", height_bc + margin_bc.top + margin_bc.bottom)
    .append("g")
      .attr("transform", "translate(" + margin_bc.left + "," + margin_bc.top + ")");

  // prepare the stacked bar chart
  orgs.forEach(function(d) {
    var y0 = 0;
    var order = ["seed", "a", "b", "c", "d", "e"];
    d.rounds = [];
    order.forEach(function(r) {
      d.rounds.push({
        name: r,
        y0: y0,
        y1: y0 += +d.round_codes[r]
      });
    });
    d.rounds_total = d.rounds[d.rounds.length - 1].y1;
  });

  // sort the orgs
  orgs.sort(function(a, b) { return b.rounds_total - a.rounds_total; });

  x_bc.domain(orgs.map(function(d) { return d.name; }));
  y_bc.domain([0, d3.max(orgs, function(d) { return d.rounds_total; })]);

  // create the bar chart
  svg_bc.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height_bc - 70) + ")")
    .call(xAxis_bc)
    .selectAll("text")
      .attr("class", function(d, i) { return "o-" + i; })
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", function(d) {
        return "rotate(-65)" 
      });

  svg_bc.append("g")
    .attr("class", "y axis")
    .call(yAxis_bc)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Deals");

  var org_bars = svg_bc.selectAll(".org")
    .data(orgs)
    .enter().append("g")
      .attr("class", function(d, i) {
        return "g org o-" + i;
      })
      .attr("transform", function(d) { return "translate(" + x_bc(d.name) + ",0)"; })
      .on("mouseover", function(d, i) {
      	hoverOrg(d, i);
      })
      .on("mouseout", function(d, i) {
      	 unhoverOrg(d, i);
      });

  org_bars.selectAll("rect")
    .data(function(d) { return d.rounds; })
    .enter().append("rect")
      .attr("width", x_bc.rangeBand())
      .attr("y", function(d) { return y_bc(d.y1); })
      .attr("height", function(d) { return y_bc(d.y0) - y_bc(d.y1); })
      .style("fill", function(d) { return color_bc(d.name); });

  var legend = svg_bc.selectAll(".legend")
    .data(color_bc.domain().slice().reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 10 + ")"; });

  legend.append("rect")
    .attr("x", width_bc + 18)
    .attr("width", 8)
    .attr("height", 8)
    .style("fill", color_bc);

  legend.append("text")
    .attr("x", width_bc + 12)
    .attr("y", 3)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });
};

// highlight on mouseover
function hoverOrg(d, i) {
  if (depth == 0 || depth == 1) {
    // highlight org
    d3.selectAll("#barchart .org")
      .style("opacity", "0.25");
    d3.selectAll("#barchart .tick text")
      .style("opacity", "0.25");
    d3.select("#barchart .org.o-" + i)
      .style("opacity", "1.0");
    d3.select("#barchart .tick text.o-" + i)
      .style("opacity", "1.0");
  }

  if (depth === 0) {
    // highlight treemap & sidebar
    d3.selectAll("#treemap .parent")
      .style("opacity", "0.25");
    d3.selectAll("#treemap .children text")
      .style("opacity", "0.25");
    d3.selectAll("#sidebar .org")
      .style("color", "#ddd");
    
    d.industries_invested.forEach(function(d) {
      d3.select("#treemap .parent.t-" + d + "")
        .style("opacity", "1.0");
      d3.select("#treemap text.t-" + d)
        .style("opacity", "1.0");
      d3.select("#sidebar .org.t-" + d)
        .style("color", "#000");
    });
  } else if (depth === 1) {
    // highlight treemap
    d3.selectAll("#treemap .parent")
      .style("opacity", "0.25");
    d3.selectAll("#treemap .depth text")
      .style("opacity", "0.25");
    
    var industry = d3.select("#treemap .depth").data()[0].name;
    d.companies_invested[industry].forEach(function(d) {
      d3.select("#treemap .parent.t-" + d)
        .style("opacity", "1.0");
      d3.select("#treemap text.t-" + d)
        .style("opacity", "1.0");
    });
  }
};

// un-highlght on mouseout
function unhoverOrg(d, i) {
  if (depth == 0 || depth == 1) {
    // highlight all orgs
    d3.selectAll("#barchart .org")
      .style("opacity", "1.0");
    d3.selectAll("#barchart .tick text")
      .style("opacity", "1.0");

    // highlight all treemap
    d3.selectAll("#treemap .parent")
      .style("opacity", "1.0");
    d3.selectAll("#treemap .depth text")
      .style("opacity", "1.0");

    // highlight all sidebar
    d3.selectAll("#sidebar .org")
      .style("color", "#000");
  }
};