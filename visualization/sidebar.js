var sidebar = d3.select("#sidebar");
var money = d3.format("$,d");

function drawSidebar(root, d, depth) {
  var html = "";

  // display all industries on the sidebar
  if (depth === 0) {
    var industries = [];
    for (var i in root.children) {
      industries.push(root.children[i].name);
    }
    industries.sort();
    for (var i in industries) {
      html += "<div class='org t-" + industries[i] + "'>" +
        (industries[i].replace(/_/g, " ")).replace(/\b./g, function(m){ return m.toUpperCase(); }) + "</div>";
    }

    return sidebar.html(html);
  } else if (depth === 1) {
    return sidebar.html(html);
  }

  // show the profile of a company
  html += "<div class='name'>" + d.full_name + "</div>";
  var location = [d.city, d.state, d.country];
  location = $.grep(location, function(n) { return(n) });
  html += "<div class='details'><p>F. " + d.founded + " | " + location.join(", ") + " | "
    + "<a href='" + d.url + "' target='_blank'>" + "<img class='web' src='./visualization/assets/web.png' alt='web'></a> "
    + "<a href='https://www.twitter.com/" + d.twitter_handle + "' target='_blank'>"
    + "<img class='twitter' src='./visualization/assets/twitter.png' alt='twitter'></a></p>";
  html += "<p>" + money(d.total_raised) + " raised in total</p></div>";
  html += "<div class='overview'>" + d.overview + "</div>";
  html += "<br><div class='name'>Deals</div>";
  html += "<div class='news'><ul>";
  var news = [];
  d._children.forEach(function(d, i) {
    if (d.source_title) {
      html += "<li class='story t-" + d.name + " v-" + i + "'><a href=" + d.source + " target='_blank'>" +  d.source_title + "</a></li>";
    }
  });
  html += "</ul></div>";

  // draw the timeline
  sidebar.html(html)
  rounds = d._children;
  
  // set up variables for the bar chart
  var margin_tl = {
    top: 5,
    right: 10,
    bottom: 5,
    left: 10
  };
  var width_tl = 290 - margin_tl.left - margin_tl.right,
    height_tl = 80 - margin_tl.top - margin_tl.bottom;

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
    .range([margin_tl.left, width_tl]);
  var xAxis_tl = d3.svg.axis()
    .scale(x_tl)
    .orient("bottom")
    .ticks(d3.time.year, 1);

  var svg_tl = sidebar
    .append("svg")
    .attr("width", width_tl + margin_tl.left + margin_tl.right)
    .attr("height", height_tl + margin_tl.bottom + margin_tl.top);

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
      .style("fill", "#ddd")
      .attr("stroke", "skyblue")
      .attr("stroke-width", function(d) {
        if (d.source_title) {
          return "2";
        } else {
          return "0";
        }
      })
      .on("mouseover", function(d, i) {
        hover(d.name, i);
      })
      .on("mouseout", function(d, i) {
        unhover();
      });
};

function showRound(name, num) {
  // highlight story
  sidebar.select(".news .story.v-" + num)
    .style("background", "skyblue");

  var html = "";
  var d = sidebar.select("circle.t-" + name + ".v-" + num).data()[0];
  if (d.name) {
    html += d.name.replace(/_/g, " ") + " | ";
  }
  html += d.date + " | ";
  html += money(d.value);
  sidebar.append("div").attr("class", "round").html(html);
};

// highlight links on hover
$(document).on("mouseover", "#sidebar .news .story", function() {
  var name = $(this).attr("class").split(" ")[1].substr(2);
  var num = $(this).attr("class").split(" ")[2].substr(2);
  hover(name, num);
}).on("mouseout", "#sidebar .news .story", function() {
  unhover();
});