var margin = {top: 10, right: 10, bottom: 10, left: 10},
  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

var color = d3.scale.category20c();

var treemap = d3.layout.treemap()
  .size([width, height])
  .sticky(false)
  .children(function(d) { return d.children; });

var div = d3.select("body").append("div")
  .attr("id", "main")
  .style("position", "relative")
  .style("width", (width + margin.left + margin.right) + "px")
  .style("height", (height + margin.top + margin.bottom) + "px")
  .style("left", margin.left + "px")
  .style("top", margin.top + "px");

var original = [],
  working = [], // for filtering by industry
  exclusive = [], // for filtering by round
  nodes = [],
  root = {};

d3.json("../assets/industries.json", function(error, data) {
  data = data.slice(0, 3) // for testing purposes

  // save the dataset
  original = $.extend(true, [], data);
  working = $.extend(true, [], original);

  // make a list of industries
  var industries = [];
  $.each(working, function(index, value) {
    industries.push(value.name);
  });
  industries.sort();

  // add them to the html
  $.each(industries, function(index, value) {
    $("#industries").append($("<option />").val(value).text(value));
  });

  // from http://stackoverflow.com/a/3629861
  function union_arrays (x, y) {
    var obj = {};
    for (var i = x.length-1; i >= 0; -- i)
      obj[x[i]] = x[i];
    for (var i = y.length-1; i >= 0; -- i)
      obj[y[i]] = y[i];
    var res = []
    for (var k in obj) {
      if (obj.hasOwnProperty(k))
        res.push(obj[k]);
      }
    return res;
  }

  // make a list of rounds
  var rounds_present = [];
  $.each(working, function(x, y) {
    $.each(y.children, function(a, b) {
      $.each(b.children, function(index, value) {
        if (value.name) {
          rounds_present.push(value.name);
        }
      });
    });
  });
  $.unique(rounds_present);
  var rounds_usable = ["seed", "a", "b", "c", "d", "debt_round"];
  var rounds = rounds_present.filter(function(value) { 
    return rounds_usable.indexOf(value) > -1;
  });

  // add them to the html
  $.each(rounds, function(index, value) {
    $("#rounds").append($("<label />").text(value + ":"));
    $("#rounds").append($("<input />", { type: "checkbox", name: "round", value: value })); 
  });
  
  // create the root node
  root = {
    "name": "final",
    "children": $.extend(true, [], working)
  };

  // draw the treemap
  drawTree(root);

  // allow filtering by industry
  d3.select("#industries").on("change", function() {
    // removed all checked round boxes
    exclusive = [];
    $("input:checked").each(function() {
      $(this).prop("checked", false);
    });

    // get the selected industry and its children
    var name = this.value;
    if (name !== "all") {
      working = [];
      $.each(original, function(index, value) {
        if (name === value.name) {
          working = [{
            "name": name,
            "children": $.extend(true, [], value.children),
          }];
          return false;
        }
      });
    } else if (name === "all" && working !== []) {
      working = $.extend(true, [], original);
    }
    
    // update root node
    root = {
      "name": "final",
      "children": $.extend(true, [], working)
    };

    // remove old info
    d3.selectAll(".node").remove();
    clearDetails();

    // draw the treemap
    drawTree(root);
  });

  // allow filtering by round
  d3.selectAll("[name='round']").on("change", function() {
    // get list of checked boxes
    var checked = [];
    $("input:checked").each(function() {
      checked.push($(this).val());
    });

    // copy to exclusive array
    exclusive = $.extend(true, [], working);

    // remove all rounds that haven't been checked 
    if (checked.length !== 0) {
      $.each(exclusive, function(x, y) {
        var valid_industry = false;
        $.each(y.children, function(a, b) {
          var valid_company = false;
          $.each(b.children, function(index, value) {
            // if not a round that is checked, remove it
            if (checked.indexOf(value.name) == -1) {
              b.children[index] = null;
            } else {
              valid_company = true;
            }
          });
          if (!valid_company) {
            y.children[a] = null;
          } else {
            valid_industry = true;
            exclusive[x].children[a].children = exclusive[x].children[a].children.filter(function(d) {
              return d !== null;
            });
          }
        });
        if (!valid_industry) {
          exclusive[x] = null;
        } else {
          exclusive[x].children = exclusive[x].children.filter(function(d) {
            return d !== null;
          });
        }
      });
    }

    // update root node
    exclusive = exclusive.filter(function(d) {
      return d !== null;
    });
    root = {
      "name": "final",
      "children": $.extend(true, [], exclusive)
    };

    // remove old info
    d3.selectAll(".node").remove();
    clearDetails();

    // draw the treemap
    drawTree(root);
  });


  /* allow area change
  d3.selectAll("input").on("change", function change() {
    var value = this.value === "count"
        ? function() { return 1; }
        : function(d) { return d.amount; };

    nodes
        .data(treemap.value(value).nodes)
      .transition()
        .duration(1500)
        .call(position);
  });*/
});

function drawTree(root) {
  nodes = div.datum(root).selectAll(".node")
      .data(treemap.nodes)
    .enter().append("div")
      .attr("class", function(d) {
        if (d.company_permalink) {
          return "node com-" + d.company_permalink;
        } else if (d.parent && d.parent.company_permalink) {
          return "node leaf com-" + d.parent.company_permalink;
        } else {
          return "node";
        }
      })
      .call(position)
      .style("background", function(d) { return (d.children && d.company_permalink) ? color(d.name) : null; })
      .text(function(d) { return d.children ? null : d.name; });
};

function drawTimeline(rounds) {
  // dimensions of svg
  var w = 480 - margin.left - margin.right,
    h = 100 - margin.top - margin.bottom;

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
  var xScale = d3.time.scale()
    .domain([minDate, maxDate])
    .range([margin.left, w - margin.left - margin.right]);
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .ticks(d3.time.year, 1);

  // scale for the radius size
  var radiusSacle;
  if (dates.length > 1) {
    radiusSacle = d3.scale.linear()
      .domain(d3.extent(rounds, function(d) {
        return d.value;
      }))
      .range([6, 10]);
  } else {
    radiusSacle = d3.scale.linear()
      .domain(d3.extent(rounds, function(d) {
        return d.value;
      }))
      .range([8, 8]);
  }

  var svg = d3.select("#timeline")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0, " + h / 2 + ")")
    .call(xAxis)
   .selectAll("text")  
    .style("text-anchor", "end")
    .attr("font-size", "10px")
    .attr("dx", "-1.2em")
    .attr("dy", ".3em")
    .attr("transform", function(d) {
      return "rotate(-65)" 
    });

  svg.selectAll("circle")
    .data(rounds)
   .enter()
    .append("circle")
    .attr("cx", function(d) {
      return xScale(parseDate(d.date));
    })
    .attr("cy", function(d) {
      return h / 2;
    })
    .attr("r", function(d) {
      return radiusSacle(d.value);
    })
    .on("mouseover", function(d) {
      var html = ""
      if (d.name) {
        html += "<p>" + d.name + "</p>";
      } else {
        html += "<p>(name unavailable)</p>";
      }
      html += "<p>" + d.date + "</p>";
      var total = d3.format("$,d");
      html += "<p>" + total(d.value) + "</p>";
      $("#detail_round").html(html);
      d3.select(this).style("fill", "steelblue");
    })
    .on("mouseout", function(d) {
      $("#detail_round").html("");
      d3.select(this).style("fill", "black");
    });
};

function position() {
  this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
};

// from https://gist.github.com/biovisualize/1016860
var tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden");

// jQuery
$(document).ready(function() {
  // show detailed information on click
  $(document).on("click", ".leaf", function() {
    var classes = $(this).attr("class").split(" ");
    var company_permalink = classes[2].replace("com-", "");
    
    console.log(classes);

    // add clicked class
    if (d3.select(".com-" + company_permalink).classed("clicked")) {
      d3.selectAll(".com-" + company_permalink).classed("clicked", false);
      d3.selectAll(".node").style("opacity", 1.0);
      clearDetails();
      return false;
    } else {
      d3.selectAll(".clicked").classed("clicked", false);
      d3.selectAll(".com-" + company_permalink).classed("clicked", true);
    }
    
    // select company information
    var array = {};
    $.each(original, function(x, y) {
      $.each(y.children, function(index, value) {
        if (company_permalink === value.company_permalink) {
          array = value;
          return false;
        }
      });
    });

    // change opacity levels
    d3.selectAll(".node").style("opacity", 0.25);
    d3.selectAll(".com-" + company_permalink).style("opacity", 1.0);

    clearDetails();

    // display detail information
    var html = "<p>" + array.name + "</p>";
    var location = "(location unavailable)", places = [];
    if (array.state) {
      places.push(array.state);
    }
    if (array.country) {
      places.push(array.country);
    }
    if (array.state || array.country) {
      location = places.join(", ");
    }
    html += "<p>" + location + "</p>";
    var total = d3.format("$,d");
    html += "<p>" + total(array.total_raised) + " raised in total</p>";
    $("#detail_company").html(html);

    // display time line of rounds
    var rounds = [];
    $.each(original, function(x, y) {
      $.each(y.children, function(a, b) {
        if (b.company_permalink === company_permalink) {
          rounds = b.children;
          return false;
        }
      })
    })
    drawTimeline(rounds);
  });

  // highlight on mouseover
  $(document).on("mouseover", ".leaf", function() {
    var classes = $(this).attr("class").split(" ");
    var company_permalink = classes[2].replace("com-", "");
    if ($("#detail_company").html() === "") {
      d3.selectAll(".node").style("opacity", 0.25);
      d3.selectAll(".com-" + company_permalink).style("opacity", 1.0);
    } else {
      d3.selectAll(".com-" + company_permalink).style("opacity", 1.0);
    }

    // tooltip
    tooltip.style("visibility", "visible")
      .text(d3.select(".com-" + company_permalink).data()[0].name);
  });

  // un-highlight on mouseout
  $(document).on("mouseout", ".leaf", function() {
    var classes = $(this).attr("class").split(" ");
    var company_permalink = classes[2].replace("com-", "");
    if ($("#detail_company").html() === "") {
      d3.selectAll(".node").style("opacity", 1.0);
    } else if (!d3.select(".com-" + company_permalink).classed("clicked")) {
      d3.selectAll(".com-" + company_permalink).style("opacity", 0.25);
    }

    // tooltip
    tooltip.style("visibility", "hidden");
  });

  // move tooltip when mouse moves
  $(document).on("mousemove", ".leaf", function() {
    tooltip.style("top", (event.pageY - 10) + "px")
    .style("left", (event.pageX - 200) + "px");
  });

  // clear filters on click
  $("a").on("click", function() {
    // update root node
    root = {
      "name": "final",
      "children": $.extend(true, [], original)
    };

    // remove old info
    d3.selectAll(".node").remove();
    clearDetails();

    // reset all of the filters
    $("input:checked").each(function() {
      $(this).prop("checked", false);
    });
    $("#industries").val("all");

    // draw the treemap
    drawTree(root);
    $('[name=options]').val( '' );
  });
});

function clearDetails() {
  $("#detail_company").html("");
  $("#timeline").html("");
  $("#detail_round").html("");
}