// for all elements
var margin = {top: 5, right: 5, bottom: 5, left: 5};

// variables for the treemap
var width_tm = 790 - margin.left - margin.right,
  height_tm = 490 - margin.top - margin.bottom,
  transitioning,
  depth = 0,
  color_tm = d3.scale.category10();

var money = d3.format("$,d");

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

// create the necessary html elements
var svg = d3.select("#treemap").append("svg")
    .attr("width", width_tm + margin.left + margin.right)
    .attr("height", height_tm + margin.bottom + margin.top)
    .style("margin", margin.top + "px")
  .append("g")
    .style("shape-rendering", "crispEdges");

var grandparent = d3.select("#grandparent").append("div")
    .attr("class", "grandparent");

var industries = d3.select("#industries");

var initVis = function(error, root, orgs) {
  // draw the bar charts
  drawBars(orgs);

  // set up the necessary tree structure
  root = {
    "name": "startup",
    "children": root
  };

  // display all industries on the sidebar
  industries.html(function() {
    var industries = [];
    for (var i in root.children) {
      industries.push(root.children[i].name);
    }
    industries.sort();
    for (var i in industries) {
      var string = "<div class='t-" + industries[i] + "'>" + industries[i] + "</div>";
      industries[i] = string;
    }
    var close = "<img class='close' src='./visualization/assets/close.png'>";
    return close + industries.join("");
  });

  // set up actions with industry controls
  $("#industries div").on("mouseover", function() {
    var industry = $(this).attr("class").split(" ")[0].substr(2);
    focus(industry);
  }).on("mouseout", function() {
    var industry = $(this).attr("class").split(" ")[0].substr(2);
    unfocus(industry);
  }).on("click", function() {
    if (depth === 0) {
      // create transition
      var industry = $(this).attr("class").split(" ")[0].substr(2);
      var event = document.createEvent("SVGEvents");
      event.initEvent("click", true, true);
      d3.select(".children .t-" + industry).node().dispatchEvent(event);

      // show close button
      industries.select(".close")
        .style("visibility", "visible");

      // make industries unclickable
      industries.selectAll("div")
        .classed("clickable", false);
    }
  });

  // set up actions with industry close button
  $("#industries .close").on("click", function() {
    if (depth === 1) {
      // hide button
      d3.select("#industries .close").style("visibility", "hidden");

      // make industries clickable
      d3.selectAll("#industries div")
        .classed("clickable", true)
        .style("color", "#000");

      // create transition
      var event = document.createEvent("SVGEvents");
      event.initEvent("click", true, true);
      grandparent.node().dispatchEvent(event);
    }
  });

  // make industries clickable initially
  d3.select("#industries .close").style("visibility", "hidden");
  d3.selectAll("#industries div")
    .classed("clickable", true);

  initialize(root);
  accumulate(root);
  layout(root);
  display(root);

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width_tm;
    root.dy = height_tm;
    root.depth = 0;
  }

  // aggregate the values for internal nodes
  function accumulate(d) {
    return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // compute the treemap layout recursively
  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
        .datum(d.parent)
        .on("click", transition);

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", function() {
          // check if at round level
          if (d.full_name) {
            depth = 2;
            // show the company profile
            profile(d);
          }
          // check if at company level
          else if (d._children[0].full_name) {
            depth = 1;
          }
          // check if at industry level
          else if (d._children[0]._children[0].full_name) {
            depth = 0;
          }
          return "depth"
        });

    // reset profile div if necessary
    if (depth === 1) {
      d3.select("#profile")
        .style("visibility", "hidden")
        .html("");
    } else if (depth === 0) {
      d3.select("#profile").style("visibility", "hidden");
    }

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .attr("class", function(d) {
          return "children t-" + d.name;
        })
        .on("click", function(d) {
          if (depth === 0) {
            // show close button
            d3.select("#industries .close")
              .style("visibility", "visible");

            // make industries unclickable
            d3.selectAll("#industries div")
              .classed("clickable", false);
          }
          transition(d);
        });

    g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
      .enter().append("rect")
        .attr("class", "child")
        .call(rect);

    g.append("rect")
        .attr("class", function(d, i) {
          return "parent t-" + d.name + " v-" + i;
        })
        .call(rect)
        .style("fill", function(d) { return color_tm(d.name); })
        .on("mouseover", function(d, i) {
          // highlight industry
          focus(d.name, i);

          // highlight company
          if (depth === 1) {
            d3.select("#profile")
              .style("visibility", "visible")
              .append("div")
              .attr("class", "name")
              .text(d.full_name);
          }
          // highlight round
          else if (depth === 2) {
            var html = "";
            if (d.name) {
              html += d.name + " | ";
            }
            html += d.date + " | ";
            html += money(d.value);
            d3.select("#profile").append("div").attr("class", "round").html(html);
            
            // highlight timeline
            d3.select("#profile svg .t-" + d.name + ".v-" + i).style("fill", "skyblue");
          }
        })
        .on("mouseout", function(d, i) {
          // highlight industry
          unfocus(d.name, i);
          
          // highlight company
          if (depth === 1) {
            d3.select("#profile")
              .style("visibility", "hidden")
              .select(".name").remove();
          }
          // highlight round
          else if (depth === 2) {
            d3.select("#profile .round").remove();

            // highlight timeline
            d3.select("#profile svg .t-" + d.name + ".v-" + i).style("fill", "black");
          }
        });

    g.append("clipPath")
        .attr("id", function(d, i) {
          return "clip-" + d.name + "-" + i;
        })
      .append("rect")
        .call(rect);

    g.append("text")
        .attr("dy", ".75em")
        .attr("clip-path", function(d, i) {
          return "url(#clip-" + d.name + "-" + i + ")";
        })
        .text(function(d) {
          if (d.area > 0.003)
            return d.name;
          else
            return "";
        })
        .call(text);

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;

      var g2 = display(d),
          t1 = g1.transition().duration(500),
          t2 = g2.transition().duration(500);

      // update the domain only after entering new elements.
      x_tm.domain([d.x, d.x + d.dx]);
      y_tm.domain([d.y, d.y + d.dy]);

      // enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.attr("x", function(d) { return x_tm(d.x) + 6; })
        .attr("y", function(d) { return y_tm(d.y) + 6; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x_tm(d.x); })
        .attr("y", function(d) { return y_tm(d.y); })
        .attr("width", function(d) { return x_tm(d.x + d.dx) - x_tm(d.x); })
        .attr("height", function(d) { return y_tm(d.y + d.dy) - y_tm(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + "." + d.name
        : d.name;
  }

  function profile(d) {
    var html = "";
    
    // hide industries close button
    d3.select("#industries .close").style("visibility", "hidden");

    // photo and name
    html += "<div>";
    html += "<img class='close' src='./visualization/assets/close.png'>";
    html += "<img class='logo' src ='http://fartpunch.com/wp-content/uploads/2012/11/341817_ermahgerd_sner.jpg' alt='logo'>";
    html += "<span>" + d.full_name + "</span>";
    html += "</div>";

    // details
    var location = [d.city, d.state, d.country];
    location = $.grep(location, function(n) { return(n) });
    html += "<p>F. " + d.founded + " | " + location.join(", ") + " | "
      + "<a href='" + d.url + "' target='_blank'>" + "<img class='web' src='./visualization/assets/web.png' alt='web'></a> "
      + "<a href='https://www.twitter.com/" + d.twitter_handle + "' target='_blank'>"
      + "<img class='twitter' src='./visualization/assets/twitter.png' alt='twitter'></a></p>";
    html += "<p>" + money(d.total_raised) + " raised in total</p>";
    
    d3.select("#profile").html(html);

    // funding timeline
    drawTimeline(d._children);

    $("#profile .close").on("click", function() {
      if (depth === 2) {
        // show industries button
        d3.select("#industries .close").style("visibility", "visible");

        var event = document.createEvent("SVGEvents");
        event.initEvent("click", true, true);
        grandparent.node().dispatchEvent(event);
      }
    });
  }
};

// wait until all data is loaded
queue()
  .defer(d3.json,"./visualization/assets/industries.json")
  .defer(d3.json,"./visualization/assets/financial_orgs.json")
  .await(initVis);

// focus
function focus(d, i) {  
  if (depth === 0) {
    // highlight industry
    industries.selectAll("div")
      .style("color", "darkgray");
    industries.select(".t-" + d)
      .style("color", "#000");

    // highlight treemap
    d3.select("#treemap .parent.t-" + d)
      .style("opacity", "0.25");
  } else {
    // highlight treemap
    d3.select("#treemap .parent.t-" + d + ".v-" + i)
      .style("opacity", "0.25");
  }
};

// unfocus
function unfocus(d, i) {
  if (depth === 0) {    
    // highlight industry
    industries.selectAll("div")
      .style("color", "#000");
    
    // highlight treemap
    d3.select("#treemap .parent.t-" + d)
      .style("opacity", "1.0");
  } else {
    // highlight treemap
    d3.select("#treemap .parent.t-" + d + ".v-" + i)
      .style("opacity", "1.0");
  }
};

// draw the timeline of round financing
function drawTimeline(rounds) {
  // dimensions of svg
  var width_tl = 290 - (2 * margin.left) - (2 * margin.right),
    height_tl = 80 - margin.top - margin.bottom;

  // parse dates
  var parseDate = d3.time.format("%m/%d/%y").parse;
  var dates = [];
  $.each(rounds, function(index, value) {
    dates.push(parseDate(value.date));
  });

  // give a buffer of one year on either side
  var minDate = new Date(d3.min(dates));
  minDate.setFullYear(minDate.getFullYear() - 1);
  var maxDate = new Date(d3.max(dates));
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  // create the scale and axis for the dates
  var x_tl = d3.time.scale()
    .domain([minDate, maxDate])
    .range([2 * margin.left, width_tl]);
  var xAxis_tl = d3.svg.axis()
    .scale(x_tl)
    .orient("bottom")
    .ticks(d3.time.year, 1);

  var svg_tl = d3.select("#profile")
    .append("svg")
    .attr("width", width_tl + margin.left + margin.right)
    .attr("height", height_tl + margin.bottom + margin.top);

  svg_tl.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, " + height_tl / 3 + ")")
      .call(xAxis_tl)

    .selectAll("text")  
      .style("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("dx", "-1.2em")
      .attr("dy", ".3em")
      .attr("transform", function(d) {
        return "rotate(-65)" 
      });

  svg_tl.selectAll("circle")
      .data(rounds)
    .enter()
      .append("circle")
      .attr("class", function(d, i) {
        return "t-" + d.name + " v-" + i;
      })
      .attr("cx", function(d) {
        return x_tl(parseDate(d.date));
      })
      .attr("cy", function(d) {
        return height_tl / 3;
      })
      .attr("r", function(d) {
        return 6;
    })
    .on("mouseover", function(d, i) {
      var html = "";
      if (d.name) {
        html += d.name + " | ";
      }
      html += d.date + " | ";
      html += money(d.value);
      d3.select("#profile").append("div").attr("class", "round").html(html);
      
      // highlight timeline
      d3.select(this).style("fill", "skyblue");

      // highlight treemap
      d3.select("#treemap .t-" + d.name + ".v-" + i).style("opacity", "0.25");
    })
    .on("mouseout", function(d, i) {
      d3.select("#profile .round").remove();

      // highlight timeline
      d3.select(this).style("fill", "black");

      // highlight treemap
      d3.select("#treemap .t-" + d.name + ".v-" + i).style("opacity", "1.0");
    });
};

// draw the bar charts
function drawBars(orgs) {
  var width_bc = 790 - (6 * margin.left) - margin.right,
    height_bc = 190 - margin.top - margin.bottom;

  var x_bc = d3.scale.ordinal()
    .rangeRoundBands([10, width_bc], .3);

  var y_bc = d3.scale.linear()
    .rangeRound([height_bc - 70, 0]);

  var color_bc = d3.scale.ordinal()
    .domain(["seed", "a", "b", "c", "d", "e"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]);

  var xAxis_bc = d3.svg.axis()
    .scale(x_bc)
    .orient("bottom");

  var yAxis_bc = d3.svg.axis()
    .scale(y_bc)
    .ticks(5)
    .orient("left");

  var svg_bc = d3.select("#bar").append("svg")
    .attr("width", width_bc + (6 * margin.left) + margin.right)
    .attr("height", height_bc + margin.top + margin.bottom)
    .style("margin", margin.top + "px")
    .append("g")
      .attr("transform", "translate(" + (6 * margin.left) + "," + margin.top + ")");

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

  orgs.sort(function(a, b) { return b.rounds_total - a.rounds_total; });

  x_bc.domain(orgs.map(function(d) { return d.name; }));
  y_bc.domain([0, d3.max(orgs, function(d) { return d.rounds_total; })]);

  svg_bc.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height_bc - 70) + ")")
    .call(xAxis_bc)
    .selectAll("text")
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
      .attr("y", 10)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Deals");

  var firm = svg_bc.selectAll(".firm")
    .data(orgs)
    .enter().append("g")
      .attr("class", function(d, i) {
        return "g org" + i;
      })
      .attr("transform", function(d) { return "translate(" + x_bc(d.name) + ",0)"; })
      .on("mouseover", function(d) {
        if (depth === 0) {
          // highlight firm
          d3.select(this)
            .style("opacity", "0.25");

          industries.selectAll("div")
            .style("color", "darkgray");
          d.industries_invested.forEach(function(d) {
            // highlight industry
            industries.select(".t-" + d)
              .style("color", "#000");

            // highlight treemap
            d3.select("#treemap .parent.t-" + d)
              .style("opacity", "0.25");
          });
        } else if (depth === 1) {
          // highlight firm
          d3.select(this)
            .style("opacity", "0.25");

          var industry = d3.select("#treemap .depth").data()[0].name;
          d.companies_invested[industry].forEach(function(d) {
            // highlight treemap
            d3.select("#treemap .parent.t-" + d)
              .style("opacity", "0.25");
          });
        }
      })
      .on("mouseout", function(d) {
        if (depth === 0) {
          // highlight firm
          d3.select(this)
            .style("opacity", "1.0");

          // highlight industry
          industries.selectAll("div")
            .style("color", "#000");
    
          // highlight treemap
          d3.selectAll("#treemap .parent")
            .style("opacity", "1.0");
        } else if (depth === 1) {
          // highlight firm
          d3.select(this)
            .style("opacity", "1.0");

          // highlight treemap
          d3.selectAll("#treemap .parent")
            .style("opacity", "1.0");
        }
      });

  firm.selectAll("rect")
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
    .attr("x", width_bc - 18)
    .attr("width", 8)
    .attr("height", 8)
    .style("fill", color_bc);

  legend.append("text")
    .attr("x", width_bc - 24)
    .attr("y", 3)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });
};