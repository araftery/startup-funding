// set up variables for the treemap
var margin_tm = {
  top: 0,
  right: 5,
  bottom: 5,
  left: 5
};
var width_tm = 800 - margin_tm.left - margin_tm.right,
  height_tm = 500 - margin_tm.top - margin_tm.bottom,
  transitioning,
  depth = 0;

var color_tm = d3.scale.ordinal()
  .domain(["advertising", "web"])
  .range(colorbrewer.RdYlBu[11]);

// set up the treemap
var x_tm = d3.scale.linear()
  .domain([0, width_tm])
  .range([0, width_tm + margin_tm.left + margin_tm.right]);

var y_tm = d3.scale.linear()
  .domain([0, height_tm])
  .range([margin_tm.top, height_tm + margin_tm.top + margin_tm.bottom]);

var treemap = d3.layout.treemap()
  .children(function(d, depth) { return depth ? null : d._children; })
  .sort(function(a, b) { return a.value - b.value; })
  .ratio(height_tm / width_tm * 0.5 * (1 + Math.sqrt(5)))
  .round(false);

// add the svg
var svg = d3.select("#treemap").append("svg")
    .attr("width", width_tm + margin_tm.left + margin_tm.right)
    .attr("height", height_tm + margin_tm.bottom + margin_tm.top)
  .append("g")
    .style("shape-rendering", "crispEdges");

// add the bread crumb bar
var grandparent = svg.append("g")
  .attr("class", "grandparent");


var initVis = function(error, root, orgs) {
  // set up the necessary tree structure
  root = {
    "name": "All Industries",
    "children": root
  };

  // draw the bar charts
  drawBarChart(orgs);

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

    function build_breadcrumb(d, first) {
      if (!first) {
        crumb = d3.select("ol.breadcrumb").insert("li", "li:first-child");
        crumb.append("a").html(name(d)).on("click", function(){ transition(d) });
      } else {
        var crumb = d3.select("ol.breadcrumb").append("li");
        crumb.html(name(d)).attr("class", "active");
      }

      if (d.parent) {
        return build_breadcrumb(d.parent)
      }
    };

    var breadcrumb = d3.select(".breadcrumb")
    
    // clear breadcrumbs
    breadcrumb.html("");
    build_breadcrumb(d, true);

    var g1 = svg.insert("g", ".grandparent")
      .datum(d)
      .attr("class", function() {
        // check if at round level
        if (d.full_name) {
          depth = 2;
        }
        // check if at company level
        else if (d._children[0].full_name) {
          depth = 1;
        }
        // check if at industry level
        else if (d._children[0]._children[0].full_name) {
          depth = 0;
        }

        // draw the sidebar
        drawSidebar(root, d, depth);

        return "depth"
      });

    var g = g1.selectAll("g")
      .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
      .attr("class", function(d, i) {
        return "children t-" + d.name + " v-" + i;
      })
      .on("click", transition);

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
      .style("fill", function(d) {
        if (depth !== 2) {
          return color_tm(d.name);
        } else {
          return color_bc(d.name);
        }})
      .on("mouseover", function(d, i) {
        hover(d.name, i);
        // add name of company
        if (depth === 1) {
          sidebar.append("div").attr("class", "name").text(d.full_name);
        }
      })
      .on("mouseout", function() {
        unhover();
        // add name of company
        if (depth === 1) {
          sidebar.select(".name").remove();
        }
      });

    g.append("clipPath")
      .attr("id", function(d, i) {
        return "clip-" + d.name + "-" + i;
      })
     .append("rect")
      .call(rect);

    g.append("text")
      .attr("class", function(d, i) {
        return "t-" + d.name + " v-" + i;
      })
      .attr("dy", ".75em")
      .attr("clip-path", function(d, i) {
        return "url(#clip-" + d.name + "-" + i + ")";
      })
      .text(function(d) {
        if (d.area < 0.003 || !d.name) {
          return "";
        }

        if (depth === 0) {
          return (d.name.replace(/_/g, " ")).replace(/\b./g, function(m){ return m.toUpperCase(); });
        } else if (depth === 1) {
          return d.full_name;
        } else if (depth === 2) {
          return d.name.replace(/_/g, " ");
        }
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
    var n =  "";

    if (!d.name) {
      n = "";
    } else if (d.full_name) {
      n = d.full_name;
    } else {
      n = (d.name.replace(/_/g, " ")).replace(/\b./g, function(m){ return m.toUpperCase(); });
    }

    return n;
  }
};

// wait until all data is loaded
queue()
  .defer(d3.json,"./visualization/assets/industries.json")
  .defer(d3.json,"./visualization/assets/financial_orgs.json")
  .await(initVis);

// highlight on mouseover
function hover(name, num) {
  // highlight treemap & sidebar
  d3.selectAll("#treemap .parent")
    .style("opacity", "0.25");
  d3.selectAll("#treemap .depth text")
    .style("opacity", "0.25");
  d3.selectAll("#sidebar .org")
    .style("color", "#ddd");

  if (depth === 0) {
    d3.select("#treemap .parent.t-" + name)
      .style("opacity", "1.0");
    d3.select("#treemap text.t-" + name)
      .style("opacity", "1.0");
   d3.select("#sidebar .org.t-" + name)
      .style("color", "#000");
  } else {
    d3.select("#treemap .parent.t-" + name + ".v-" + num)
      .style("opacity", "1.0");
    d3.select("#treemap text.t-" + name + ".v-" + num)
      .style("opacity", "1.0");
    sidebar.select(".org.t-" + name)
      .style("color", "#000");
    if (depth === 2) {
      sidebar.select("circle.t-" + name + ".v-" + num)
        .style("fill", "black");
      showRound(name, num);

      var round_data = d3.select("#treemap text.t-" + name + ".v-" + num).data()[0]
      round_data.investors.forEach(function(d){

        d = d.replace(/^[a-zA-Z]*$/, "_");
      });

        // highlight firms invested in this round
        d3.selectAll('#barchart .org')
          .style('opacity', function(d){
            var name = d3.select(this).attr('data-name');
            if (jQuery.inArray(name, round_data.investors) != -1)
            {
              d3.select('.x text.' + name.replace(/[^A-Za-z]+/g, ''))
                .style('opacity', 1);
              return 1;
            }
            else
            {
              d3.select('.x text.' + name.replace(/[^A-Za-z]+/g, ''))
                .style('opacity', .25);

              return .25;
            }
          });
          

    }
    else
    {
      // highlight firms invested in this company
      var company_data = d3.select("#treemap .parent.t-" + name + ".v-" + num).data()[0]

      company_data.investors.forEach(function(d){

        d = d.replace(/^[a-zA-Z]*$/, "_");
      });

        // highlight firms invested in this round
        d3.selectAll('#barchart .org')
          .style('opacity', function(d){
            var name = d3.select(this).attr('data-name');
            if (jQuery.inArray(name, company_data.investors) != -1)
            {
              d3.select('.x text.' + name.replace(/[^A-Za-z]+/g, ''))
                .style('opacity', 1);
              return 1;
            }
            else
            {
              d3.select('.x text.' + name.replace(/[^A-Za-z]+/g, ''))
                .style('opacity', .25);

              return .25;
            }
          });


    }
  }
};

// un-highlght on mouseout
function unhover() {
  // highlight all treemap & sidebar
  d3.selectAll("#treemap .parent")
    .style("opacity", "1.0");
  d3.selectAll("#treemap .depth text")
    .style("opacity", "1.0");
  d3.selectAll("#sidebar .org")
    .style("color", "#000");
  sidebar.selectAll("circle")
    .style("fill", "#ddd");
  sidebar.selectAll(".round").remove();
  sidebar.selectAll(".news .story")
    .style("background", "white");

  d3.selectAll('#barchart .org')
    .style('opacity', 1);

  d3.selectAll('.x text')
    .style('opacity', 1);

};

// highlight industry selectors
$(document).on("mouseover", "#sidebar .org", function() {
  var industry = $(this).attr("class").split(" ")[1].substr(2);
  hover(industry, null);
}).on("mouseout", "#sidebar .org", function() {
  unhover();
}).on("click", "#sidebar .org", function() {
  var industry = $(this).attr("class").split(" ")[1].substr(2);
  var event = document.createEvent("SVGEvents");
  event.initEvent("click", true, true);
  d3.select(".children .t-" + industry).node().dispatchEvent(event);
});

