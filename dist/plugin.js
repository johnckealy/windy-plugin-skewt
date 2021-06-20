
/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(

/* Mounting options */
{
  "name": "windy-plugin-skewt",
  "version": "0.9.2",
  "author": "John C. Kealy",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/johnckealy/windy-plugin-skewt"
  },
  "description": "A plugin to plot skewT-logP diagrams in windy.com",
  "displayName": "SkewT",
  "hook": "contextmenu",
  "dependencies": [
    "https://d3js.org/d3.v4.js"
  ]
},

/* HTML */
'<div id="skewt-wraper" class="shy left-border right-border radar-wrapper"> <div id="navigator"> <div id="skewt-header"> <div id="ft-title"> <p id="initial-message">To display a Skew-T, click anywhere on the map.<br><br> Model ascents will appear wherever the picker is opened. Clicking the map also reveals the closest Radiosonde station. </p> </div> <div id="skewt-control-panel" style="display: none"> <span id="closebutton" class="controls">&#x2715;</span> <span id="zoom-out" class="controls">&#x1f50d&#x2212</span> <span id="zoom-in" class="controls">&#x1f50d&#x2b</span> </div> <div id="skewt-container"></div> <div id="sonde-btns"> <div> <input type="checkbox" id="show-sondes-checkbox" checked> <label for="show-sondes-checkbox"> Show Sondes</label> </div> <button id="close-tooltips"> CLEAR SONDES</button> </div> </div> </div> </div>',

/* CSS */
'.leaflet-top{transform:translate(35px, 75px)}.controls{background-color:rgba(0,0,0,0.5);border-radius:12px;font-size:15px;padding:5px}#navigator{position:absolute;top:100px;left:50px;font-size:25px}#closebutton,#zoom-out,#zoom-in{cursor:default}.css-icon{background:#0300be;border-radius:50%}.tooltip{font-size:18px;border-radius:10px;padding:10px}#sonde-btns{display:flex;justify-content:space-between;align-items:center;font-family:Arial,Helvetica,sans-serif}#sonde-btns button{padding:7px;color:white;border-radius:10px;background-color:#484848}#sonde-btns input{width:20px;height:20px}#initial-message{background-color:white;color:black;opacity:.7;padding:20px;border-radius:10px;max-width:500px}',

/* Constructor */
function() {

	const broadcast = W.require('broadcast');
	const map = W.require('map');
	const store = W.require('store');
	const picker = W.require('picker');
function cskewT(Pascent, Tascent, Tdascent, startpressure, endpressure) {

  if (zoomed) {
    var minT = Math.max(...Tascent) - 20.0;
    var maxT = minT + 30;
    startpressure = Pascent[0] + 70;
    endpressure = Pascent[0] - 400
  } else {
    var minT = Math.max(...Tascent) - 50.0;
    var maxT = minT + 80;
  }

  var P = [startpressure];
  var dp = -5;
  var pressure = startpressure;
  while (pressure > endpressure) {
    pressure = pressure + dp;
    P.push(pressure);
  };

  var minP = P[P.length - 1];
  var maxP = P[0];

  d3.select("#skewTbox").remove()
  window.svg = d3.select("#skewt-container").append("svg")
    .attr("height", h)
    .attr("width", w + barbsw)
    .attr('id', 'skewTbox');
  svg.append("rect")
    .attr("height", h)
    .attr("width", w)
    .attr("fill", "white")
    .attr("opacity", 0.8)
    .attr('id', 'skewTd3');

  draw_isopleths();
  skewT_main(Pascent, Tascent, Tdascent);

  function draw_isopleths() {

    for (var T = -80; T <= 40; T = T + 10) {
      draw_isotherm(T);
    };
    for (var p = 100; p <= 1000; p = p + 100) {
      draw_isobar(p);
    };
    for (var a = -80; a <= 150; a = a + 10) {
      draw_dry_adiabat(a, P);
    };

    draw_moist_adiabat(-47.0);
    draw_moist_adiabat(-37.0);
    draw_moist_adiabat(-27.0);
    draw_moist_adiabat(-17.0);
    draw_moist_adiabat(-7);
    draw_moist_adiabat(2.6);
    draw_moist_adiabat(12.15);
    draw_moist_adiabat(21.8);
    draw_moist_adiabat(31.6);
    draw_moist_adiabat(40);
    draw_moist_adiabat(50);
    draw_moist_adiabat(60);

    draw_Isohume(0.001);
    draw_Isohume(0.01);
    draw_Isohume(0.1);
    draw_Isohume(0.5);
    draw_Isohume(1.0);
    draw_Isohume(2.0);
    draw_Isohume(5.0);
    draw_Isohume(8.0);
    draw_Isohume(12.0);
    draw_Isohume(16.0);
    draw_Isohume(20.0);
  }

  function skewT_main(Pascent, Tascent, Tdascent) {

    var Pascent = interpolateArray(Pascent, P.length);
    var Tascent = interpolateArray(Tascent, P.length);
    var Tdascent = interpolateArray(Tdascent, P.length);

    Tascent.forEach((t, index) => {
      if (t < -300) Tascent[index] = null;
    })
    Tdascent.forEach((td, index) => {
      if (td < -300) Tdascent[index] = null;
    })

    plot_sounding();
    parcelAsc(Pascent, Tascent, Tascent[0], Pascent[0], Tdascent[0], maxP, minP, maxT, minT, svg, dp, P);

    function interpolateArray(data, fitCount) {

      var linearInterpolate = function (before, after, atPoint) {
        return before + (after - before) * atPoint;
      };

      var newData = new Array();
      var springFactor = new Number((data.length - 1) / (fitCount - 1));
      newData[0] = data[0];
      for (var i = 1; i < fitCount - 1; i++) {
        var tmp = i * springFactor;
        var before = new Number(Math.floor(tmp)).toFixed();
        var after = new Number(Math.ceil(tmp)).toFixed();
        var atPoint = tmp - before;
        newData[i] = linearInterpolate(data[before], data[after], atPoint);
      }
      newData[fitCount - 1] = data[data.length - 1];
      return newData;
    };

    function plot_sounding() {

      var Px = [];
      var Pdx = [];

      for (var i = 0; i < Pascent.length; i++) {
        var Tnew = Tascent[i] + -1 * (minT);
        var Tpx = w * Tnew / (maxT - minT);
        var Ppx = h * (Math.log(Pascent[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));
        Px.push([Tpx, Ppx]);
      };
      for (i = 0; i < Px.length; i++) {
        Px[i][0] = Px[i][0] + h - Px[i][1]
      };

      for (i = 0; i < Pascent.length; i++) {
        var Tnew = Tdascent[i] + -1 * (minT);
        var Tdpx = w * Tnew / (maxT - minT);
        var Ppx = h * (Math.log(Pascent[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));
        Pdx.push([Tdpx, Ppx]);
      };
      for (i = 0; i < Px.length; i++) {
        Pdx[i][0] = Pdx[i][0] + h - Pdx[i][1]
      };

      var lineGenerator = d3.line();
      var pathString = lineGenerator(Px);
      svg.append("path")
        .attr('d', pathString)
        .attr('id', 'SdTPath')
        .style("fill", 'none')
        .style("stroke-width", 4)
        .style("stroke", 'black');

      var pathStringTd = lineGenerator(Pdx);
      svg.append("path")
        .attr('d', pathStringTd)
        .style("fill", 'none')
        .attr('id', 'SdTdPath')
        .style("stroke-width", 4)
        .style("stroke-dasharray", ("8, 4"))
        .style("stroke", 'black');
    };

  };

  function draw_isobar(Pconst) {
    var Px = [];
    var Pt = [Pconst, Pconst]
    var Temps = [minT, maxT];

    for (var i = 0; i < Pt.length; i++) {
      var T = Temps[i] + -1 * (minT);
      var Tpx = w * T / (maxT - minT);
      var Ppx = h * (Math.log(Pt[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));

      Px.push([Tpx, Ppx]);
    };
    var lineGenerator = d3.line();
    var isoPathString = lineGenerator(Px);

    var strID = Pt + 'textid'
    svg.append("path")
      .attr('id', strID)
      .attr('d', isoPathString)
      .style("fill", 'none')
      .style("stroke-width", 1.5)
      .style("stroke", 'green');
    svg.append("g")
      .append("text")
      .style("font-size", "17px")
      .style('fill', "green")
      .attr("x", 20)
      .attr("transform", "translate(0,-3)")
      .append("textPath")
      .attr("xlink:href", "#" + strID)
      .text('\xa0\xa0' + Pconst + ' hPa');
  };

  function dry_adiabat_gradient(theta, pressure, temperature, dp) {

    var CONST_CP = 1.03e3
    var CONST_RD = 287.0
    var Po = 1000.0
    var theta = theta + 273.15
    var Tt = theta * (Math.pow((Po / pressure), (-CONST_RD / CONST_CP)))
    var Tt = Tt - 273.15
    var dt = Tt - temperature

    return [dp, dt]
  };

  function draw_moist_adiabat(Tbase) {
    var Pnew = 1050.0;
    var Tnew = Tbase;
    var Tnew_arr = [];
    var P_arr = [];
    var Px = [];

    for (var i = 0; i < P.length; i++) {
      var DPDT = wet_adiabat_gradient(-80.0, Pnew, Tnew, dp)
      Tnew = Tnew + DPDT[1];
      var T = Tnew + -1 * (minT);
      var Tpx = w * T / (maxT - minT);
      var Ppx = h * (Math.log(P[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));
      Px.push([Tpx, Ppx]);
      Pnew = Pnew + DPDT[0];

    };
    for (i = 0; i < Px.length; i++) {
      Px[i][0] = Px[i][0] + h - Px[i][1]
    };
    var lineGenerator = d3.line();
    var maPathString = lineGenerator(Px);

    svg.append("path")
      .attr('d', maPathString)
      .style("fill", 'none')
      .style("stroke-width", 1)
      .style("stroke", 'green');

  };

  function draw_isotherm(temp) {
    var Px = [];

    for (var i = 0; i < P.length; i++) {
      var T = temp + -1 * (minT);
      var Tpx = w * T / (maxT - minT);
      var Ppx = h * (Math.log(P[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));
      Px.push([Tpx, Ppx]);
    };

    for (i = 0; i < Px.length; i++) {
      Px[i][0] = Px[i][0] + h - Px[i][1]
    };
    var lineGenerator = d3.line();
    var pathString3 = lineGenerator(Px);

    var strID = 'textid' + temp

    svg.append("path")
      .attr('id', strID)
      .attr('d', pathString3)
      .style("fill", 'none')
      .style("stroke-width", 1)
      .style("stroke", 'green');

    if (temp == 0) {
      svg.select('#' + strID)
        .style("stroke-width", 1.2)
        .style("stroke", 'blue');
    };

    svg.append("text")
      .style("font-size", "17px")
      .style('fill', "green")
      .attr("transform", "translate(0,-3)")
      .append("textPath")
      .attr("xlink:href", "#" + strID)
      .text('\xa0\xa0\xa0\xa0\xa0\xa0' + temp + ' C');
  };

  function draw_Isohume(q) {
    var Px = [];

    for (var i = 0; i < P.length; i++) {
      var es = (P[i] * q) / (q + 622.0)
      var logthing = Math.pow((Math.log(es / 6.11)), (-1.0))
      var temp = Math.pow(((17.269 / 237.3) * (logthing - (1.0 / 17.269))), (-1.0))

      var T = temp + -1 * (minT);
      var Tpx = w * T / (maxT - minT);
      var Ppx = h * (Math.log(P[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));

      var TH = ((273.15 + T) * Math.pow((1000.0 / P[i]), -0.286)) - 273.15;
      Px.push([Tpx, Ppx]);
    };

    for (i = 0; i < Px.length; i++) {
      Px[i][0] = Px[i][0] + h - Px[i][1]
    };
    var lineGenerator = d3.line();
    var pathStringQ = lineGenerator(Px);

    var strID = temp + 'textid'

    svg.append("path")
      .attr('id', strID)
      .attr('d', pathStringQ)
      .style("fill", 'none')
      .style("stroke-width", 1)
      .style("stroke-dasharray", ("15, 8"))
      .style("stroke", 'green');

    svg.append("text")
      .style("font-size", "11px")
      .style('fill', "green")
      .attr("transform", "translate(0,-3)")
      .append("textPath")
      .attr("xlink:href", "#" + strID)
      .text('\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0' + q + ' g/kg');
  };

  function wet_adiabat_gradient(min_temperature, pressure, temperature, dp) {
    var CONST_CP = 1.03e3
    var CONST_K = 0.286
    var CONST_KELVIN = 273.15
    var CONST_L = 2.5e6
    var CONST_MA = 300.0
    var CONST_RD = 287.0
    var CONST_RV = 461.0
    var kelvin = temperature + CONST_KELVIN;
    var lsbc = (CONST_L / CONST_RV) * ((1.0 / CONST_KELVIN) - (1.0 / kelvin));
    var rw = 6.11 * Math.exp(lsbc) * (0.622 / pressure);
    var lrwbt = (CONST_L * rw) / (CONST_RD * kelvin);
    var nume = ((CONST_RD * kelvin) / (CONST_CP * pressure)) * (1.0 + lrwbt);
    var deno = 1.0 + (lrwbt * ((0.622 * CONST_L) / (CONST_CP * kelvin)));
    var gradi = nume / deno;
    var dt = dp * gradi;

    return [dp, dt]
  };

  function draw_dry_adiabat(Tbase, P) {
    var Pnew = 1050.0;
    var Tnew = Tbase;
    var Tnew_arr = [];
    var P_arr = [];
    var Px = [];
    for (var i = 0; i < P.length; i++) {
      var DPDT = dry_adiabat_gradient(Tbase, Pnew, Tnew, dp)
      Tnew = Tnew + DPDT[1];

      var T = Tnew + -1 * (minT);
      var Tpx = w * T / (maxT - minT);
      var Ppx = h * (Math.log(P[i]) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP));
      Px.push([Tpx, Ppx]);
      Pnew = Pnew + DPDT[0];

    };

    for (i = 0; i < Px.length; i++) {
      Px[i][0] = Px[i][0] + h - Px[i][1]
    };

    var lineGenerator = d3.line();
    var daPathString = lineGenerator(Px);

    svg.append("path")
      .attr('d', daPathString)
      .style("fill", 'none')
      .style("stroke-width", 1)
      .style("stroke", 'green');
  };

};

function cbarbs(Pascent, Tascent, U, V, current_timestamp, dataOptions, cmaxP, cminP) {

	let model;
	if (dataOptions.model != 'sonde') {
		model = window.currentModel.toUpperCase();
	} else {
		model = dataOptions.model.toUpperCase();
	}
	const CONTROLS_OFFSET = document.getElementById('skewt-control-panel').offsetHeight

	svg.append("rect")
		.attr("x", w - 0.65 * w)
		.attr("height", 0.05 * h)
		.attr("width", 0.65 * w)
		.attr("fill", "#424040")
		.attr("opacity", "1.0")

	var date = new Date(current_timestamp);
	var options = { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', timeZoneName: 'short' };
	date = date.toLocaleDateString("en-US", options);
	svg.append("g")
		.append("text")
		.html(model + '\xa0\xa0\xa0' + date)
		.attr("x", w - 0.64 * w)
		.attr("y", 0.035 * h)
		.attr("font-family", "sans-serif")
		.attr("font-family", "Arial")
		.attr("font-size", 0.03 * h + "px")
		.attr("fill", "#cccccc")
		.attr("id", "statsID");

	svg.append("g")
		.append("text")
		.html(date)
		.attr("x", w - 0.4 * w)
		.attr("y", 0.085 * h)
		.attr("font-family", "sans-serif")
		.attr("fill", '#bdbdbd')
		.attr("font-family", "Arial")
		.attr("font-size", 0.03 * h + "px")
	svg.append("g")
		.append("text")
		.html(date)
		.attr("x", w - 0.402 * w)
		.attr("y", 0.082 * h)
		.attr("font-family", "sans-serif")
		.attr("fill", 'black')
		.attr("font-family", "Arial")
		.attr("font-size", 0.03 * h + "px")
		.attr("id", "DateLabel");

	onmousemove = function (e) { wind_tooltip(e.clientX, e.clientY) }

	function wind_tooltip(x, y) {
		svg.select("#statsID").remove();
		svg.select('#tooltip-isobar').remove()

		y = y - y_offset - CONTROLS_OFFSET;
		var logP = (y / barbsh) * (Math.log(cmaxP) - Math.log(cminP)) + Math.log(cminP);

		var P = Math.exp(logP);

		var widx = closest(Pascent, P);
		var wdir = get_winddir(U[widx], V[widx]);
		var WSpeed = Math.sqrt(Math.pow(U[widx], 2) + Math.pow(V[widx], 2));
		WSpeed = (WSpeed > 700) ? '-' : WSpeed.toFixed(0)
		if (P >= 1050) {
			P = Pascent[0];
		} else if (P <= 170) {
			P = 170;
		}
		var z = 0.3048 * 145.36645 * (1 - ((P/Pascent[0])**(0.190284)))

		var Px = [[0, y], [w, y]];
		var lineGenerator = d3.line();
		var isoPathString = lineGenerator(Px);
		var strID = 'tooltip-isobar'
		svg.append("path")
			.attr('id', strID)
			.attr('d', isoPathString)
			.style("fill", 'none')
			.style("stroke-width", 0.5)
			.style("stroke", 'blue');

		svg.append("g")
			.append("text")
			.html(model + '\xa0\xa0\xa0' + z.toFixed(2) + " km \xa0\xa0  " + P.toFixed(0) + " hPa \xa0\xa0  " + WSpeed + " kt \xa0/\xa0" + Math.round(wdir) + "&#176\xa0\xa0\xa0\xa0 " + Tascent[widx].toFixed(1) + "&#176C")
			.attr("x", w - 0.64 * w)
			.attr("y", 0.035 * h)
			.attr("font-family", "sans-serif")
			.attr("font-family", "Arial")
			.attr("font-size", 0.03 * h + "px")
			.attr("fill", "#cccccc")
			.attr("id", "statsID");
	}

	window.svgbarbs = svg.append("rect")
		.attr('x', w)
		.attr("height", barbsh)
		.attr("width", barbsw)
		.attr("fill", "#424040")
		.attr("opacity", 1.0)
		.attr('id', 'barbsd3');

	for (var pp = 200; pp <= 1000; pp = pp + 50) {
		var widx = closest(Pascent, pp);
		draw_windbarbs(Pascent[widx], U[widx], V[widx]);
	};

	function draw_windbarbs(P, U, V) {

		var scale = 0.1;
		var barb05 = "m 0,0 200,0 m -20,0 25,35";
		var barb10 = "m 0,0 200,0 m 0,0 50,70";
		var barb15 = "m 0,0 200,0 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 25,35";
		var barb20 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70";
		var barb25 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 25,35";
		var barb30 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70";
		var barb35 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 25,35";
		var barb40 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 -50,-70";
		var barb45 = "m 0,0 200,0 m 0,0 50,70 m -35,0 -50,-70 m -35,0 50,70 m -35,0 -50,-70 m -35,0 m 0,0 25,35";
		var barb50 = "m 0,0 200,0 0,70 -50,-70";
		var barb60 = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70";
		var barb70 = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
		var barb80 = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
		var barb90 = "m 0,0 200,0 0,70 -50,-70 m -35,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70 m -35,0 m -50,-70 m 0,0 50,70";
		var barb100 = "m 0,0 200,0 0,70 -50,-70 m -10,0 m 0,0 0,70 -50,-70";
		var Nobarb = "";

		var VPpx = barbsh * (Math.log(P) - Math.log(cminP)) / (Math.log(cmaxP) - Math.log(cminP));
		var wdir = get_winddir(U, V);
		var WSpeed = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));

		if (WSpeed < 7.5) {
			var barbie = barb05;
		} else if ((WSpeed >= 7.5) && (WSpeed < 12.5)) {
			var barbie = barb10;
		} else if ((WSpeed >= 12.5) && (WSpeed < 17.5)) {
			var barbie = barb15;
		} else if ((WSpeed >= 17.5) && (WSpeed < 22.5)) {
			var barbie = barb20;
		} else if ((WSpeed >= 22.5) && (WSpeed < 27.5)) {
			var barbie = barb25;
		} else if ((WSpeed >= 27.5) && (WSpeed < 32.5)) {
			var barbie = barb30;
		} else if ((WSpeed >= 32.5) && (WSpeed < 37.5)) {
			var barbie = barb35;
		} else if ((WSpeed >= 37.5) && (WSpeed < 42.5)) {
			var barbie = barb40;
		} else if ((WSpeed >= 42.5) && (WSpeed < 47.5)) {
			var barbie = barb45;
		} else if ((WSpeed >= 47.5) && (WSpeed < 55.0)) {
			var barbie = barb50;
		} else if ((WSpeed >= 55.0) && (WSpeed < 65.0)) {
			var barbie = barb60;
		} else if ((WSpeed >= 65.0) && (WSpeed < 75.0)) {
			var barbie = barb70;
		} else if ((WSpeed >= 75.0) && (WSpeed < 85.0)) {
			var barbie = barb80;
		} else if ((WSpeed >= 85.0) && (WSpeed < 95.0)) {
			var barbie = barb90;
		} else {
			var barbie = Nobarb;
		}

		if (wdir >= 0 && wdir <= 360) {

			svg.append("path")
				.attr("stroke", "#cccccc")
				.style("stroke-width", "17px")
				.attr("fill", "#cccccc")
				.attr("d", barbie)
				.attr("transform", "translate(" + (w + barbsw / 2) + "," + VPpx + ") rotate(" + (wdir - 90) + ",0,0) scale(" + scale + ")  ");
		};
	};

	function closest(list, x) {
		var chosen = 0;
		for (var i in list) {
			var miin = Math.abs(list[chosen] - x);
			if (Math.abs(list[i] - x) < miin) {
				chosen = i;
			}
		}
		return chosen;
	};

	function get_winddir(u, v) {
		var wdir;
		if (v > 0) {
			wdir = ((180 / Math.PI) * Math.atan(u / v) + 180);
		}
		else if (u < 0 && v < 0) {
			wdir = ((180 / Math.PI) * Math.atan(u / v) + 0);
		}
		else if (u > 0 && v < 0) {
			wdir = ((180 / Math.PI) * Math.atan(u / v) + 360);
		}
		return wdir;
	};

};

const parcelAsc = (pressurehPa, temperatureC, surfaceTempC, surfacePresshPA, surfaceTdC, maxP, minP, maxT, minT, svg, Dp, P) => {

  const Cp = 1.03e3;
  const Rd = 287.0;

  const lambert = (xx, nb) => {
    const init = 1;
    const em = - Math.exp( -1.0 );
    const em9 = - Math.exp( -9.0 );
    const c13 = 1.0 / 3.0;
    const em2 = 2.0 / em;
    const s2 = Math.sqrt( 2.0 );
    let crude;

    if ( xx <= em9 ) {
      const zl = Math.log( -xx );
      const t = -1.0 - zl;
      const ts = Math.sqrt( t );
      crude = zl - ( 2.0 * ts ) / ( s2 + ( c13 - t / ( 2.7 + ts * 127.0471381349219 ) ) * ts );
    }
    else {
      const zl = Math.log( -xx );
      const eta = 2.0 - em2 * xx;
      crude = Math.log( xx / Math.log( - xx / ( ( 1.0 - 0.5043921323068457 * ( zl + 1.0 ) ) * ( Math.sqrt( eta ) + eta / 3.0 ) + 1.0 ) ) );
    }
    return crude;
  }

  const findLCL = (TC, TdC, pHP) => {
    const T = TC+273.15;
    const p = pHP*100.0;
    const es = 6.1078*Math.exp((17.269*TC)/(237.3+TC));
    const ee= 6.1078*Math.exp((17.269*TdC)/(237.3+TdC)) ;
    const RH = ee/es;
    const qv = 0.622*ee/(pHP-ee);

    const Ttrip = 273.16;
    const E0v   = 2.3740e6;
    const rgasa = 287.04;
    const rgasv = 461.0;
    const cva   = 719.0;
    const cvv   = 1418.0;
    const cvl   = 4119.0;
    const cpa   = cva + rgasa;
    const cpv   = cvv + rgasv;
    const cpm = (1-qv)*cpa + qv*cpv;
    const Rm = (1-qv)*rgasa + qv*rgasv;

    const a = (cpm/Rm) + (cvl-cpv)/rgasv;
    const b = -(E0v - Ttrip*(cvv-cvl))/(rgasv*T);
    const c = b/a;

    const L = lambert(Math.pow(RH,(1.0/a))*c*Math.exp(c), -1 );
    const Tlcl = T * c * ( Math.pow(L,-1.0 )  )  - 1.0
    const LCL = p*(Math.pow((Tlcl/T),(cpm/Rm)))
    const LCLHP = LCL/100.0;

    return LCLHP;
  }

  const wetAdiabatGradient = (pressure, temp) => {

    const L = 2.5e6;
    const RV = 461.0;

    temp += 273.15;
    let lsbc = (L / RV) * ((1.0 / 273.15) - (1.0 / temp));
    let rw = 6.11 * Math.exp(lsbc) * (0.622 / pressure);
    let lrwbt = (L * rw) / (Rd * temp);
    let nume = ((Rd * temp) / (Cp * pressure)) * (1.0 + lrwbt);
    let deno = 1.0 + (lrwbt * ((0.622 * L) / (Cp * temp)));
    let gradi = nume / deno;

    return Dp * gradi;
  }

  const closest = (list, x) => {
    let miin;
    let chosen = 0;
    for (var i in list) {
      miin = Math.abs(list[chosen] - x);
      if (Math.abs(list[i] - x) < miin) {
        chosen = i;
      };
    };
    return parseInt(chosen, 10);
  }

  const parcelAscent = temp => {
    const LCL = findLCL(temp, surfaceTdC, surfacePresshPA);
    let Px=[];
    let Tt;
    let dry = true;

    let isLiSet = false;
    P.forEach((p) => {
      const closestPidx = closest(pressurehPa, p)
      if ((p > LCL) && (p <= surfacePresshPA) ) {
        Tt = (temp+273.15)* ( (surfacePresshPA/p)**(-Rd/Cp) ) - 273.15
        let Tpx = window.w*(Tt - minT)/(maxT-minT);
        let Ppx = window.h*(Math.log(p)-Math.log(minP))/(Math.log(maxP)-Math.log(minP));
        if (temperatureC[closestPidx] > Tt) {
          Px.push([NaN, NaN]);
        } else {
          Px.push([Tpx, Ppx]);
        }
      } else if (p <= LCL) {
        if (dry) {
          temp = Tt
          dry = false;
        }
        let dt = wetAdiabatGradient(p, temp)
        temp+=dt;
        let Tpx = window.w*(temp-minT)/(maxT-minT);
        let Ppx = window.h*(Math.log(p)-Math.log(minP))/(Math.log(maxP)-Math.log(minP));
        if (temperatureC[closestPidx] > temp) {
          Px.push([NaN, NaN]);
        } else {
          Px.push([Tpx, Ppx]);
        }
      }
      if ((p<500) && (!isLiSet)) {
        let LI = temperatureC[closestPidx] - temp;
        LI = Math.round(LI * 10) / 10
        isLiSet = true;

        d3.select('#LIlevelid').remove()
        if (LI<0) {
          svg.append("g")
          .append("text")
          .style("font-size", "17px")
          .style('fill', "red")
          .attr("x", window.w - 80)
          .attr("transform", "translate(0,-4)")
          .attr('id', 'LIlevelid')
          .append("textPath")
          .attr("xlink:href", "#500,500textid")
          .text("LI: "+LI)
          .style("font-weight", "bold")
        }
      }

    });

    Px.forEach((px) => {
      px[0] = px[0] + window.h - px[1];
    });

    let lineGenerator = d3.line();
    let daPathString = lineGenerator(Px);

    d3.selectAll("path#parcelcurve").remove();

    svg.append("path")
      .attr("d", daPathString)
      .attr("id", "parcelcurve")
      .style("fill", 'none')
      .style("stroke-width", 4.0)
      .style("stroke", 'red');
  }

  parcelAscent(surfaceTempC);

  const drawSlider = () => {

    let tt = surfaceTempC - minT;
    let markerTpx = window.w*tt/(maxT-minT);
    let markerPpx = window.h*(Math.log(surfacePresshPA)-Math.log(minP))/(Math.log(maxP)-Math.log(minP));
    let markerTx = markerTpx + window.h - markerPpx;

    let valueLine = svg.append("line")
    .attr("x1", 0)
    .attr("x2", markerTx)
    .attr("y1", window.h)
    .attr("y2", window.h)
    .attr("id", "filledLineID")
    .style("stroke", 'red')
    .style("stroke-linecap", "round")
    .style("stroke-width", 5);

    let emptyLine = svg.append("line")
    .attr("x1", window.w)
    .attr("x2", window.w)
    .attr("y1", window.h)
    .attr("y2", window.h)
    .attr("id", "emptyLineID")
    .style("stroke", 'black')
    .style("stroke-width", 5);

    let valueRect = svg.append("circle")
    .attr("cx", markerTx)
    .attr("cy", markerPpx)
    .attr("id", "circleID")
    .attr("r", 7)
    .style("fill", 'purple')
    .call( d3.drag().on("drag", dragEnded));

  };

  const dragEnded = (surfaceTemp) => {
    let Tbase = surfaceTemp;

    let selectedValue = d3.event.x;

    if (selectedValue < 0)
    selectedValue = 0;
    else if (selectedValue > window.w)
    selectedValue = window.w;

    let markerPpx = window.h*(Math.log(surfacePresshPA)-Math.log(minP))/(Math.log(maxP)-Math.log(minP));
    let markerTx = selectedValue + window.h - markerPpx

    markerTx = markerTx - (window.h - markerPpx)

    const valueRect = d3.selectAll("circle#circleID")
    const valueLine = d3.selectAll("line#filledLineID")
    const emptyLine = d3.selectAll("path#emptyLineID")

    valueRect.attr("cx", markerTx);
    valueRect.attr("cy", markerPpx);
    valueLine.attr("x2", markerTx);
    emptyLine.attr("x1", markerTx);

    d3.event.sourceEvent.stopPropagation();

    let NormValue = (selectedValue-(window.h - markerPpx)) / window.w;
    Tbase = minT + NormValue*(maxT-minT);

    parcelAscent(Tbase)

    valueRect.raise();
  }

  drawSlider();
}

function getSurfacePressure(elevation, SLP) {
    const surfacePressure = SLP * Math.exp(-elevation/10000);
    return surfacePressure
}

function winds2UV(wdir, wspd) {
    wdir = 270 - wdir;
    var rad = 4.0*Math.atan(1)/180.
    var v = wspd*Math.sin(rad*wdir)
    var u = wspd*Math.cos(rad*wdir)
    return [u, v]
}

function set_dimensions() {
    const forecastTable = document.getElementsByClassName('table-wrapper')[0];
    let wHeight = window.innerHeight;
    if (forecastTable) {
        wHeight -= forecastTable.clientHeight;
    }

    window.w = 0.75 * wHeight;
    window.h = 0.7 * wHeight;

    window.barbsw = 0.08 * w;
    window.barbsh = h;

    window.x_offset = 50;
    window.y_offset = 90;
}

const pluginDataLoader = W.require('@plugins/plugin-data-loader');
var PickerOn = false;
var zoomed = false;
var startpressure = 1050;
var RetryAttemptsSpot = 0;
var RetryAttemptsAir = 0;
const SkewTApiPath = 'https://apiv2.skewt.org';
var sondeMarker;
window.currentModel = store.get('product')

const options = {
    key: 'psfAt10AZ7JJCoM3kz0U1ytDhTiLNJN3',
    plugin: 'windy-plugin-skewt'
}

const load = pluginDataLoader(options)

setInterval(function() {
    if (store.get('product') != window.currentModel) {
        window.currentModel = store.get('product')
        activate_SkewT();
    }
}, 2000);

const activate_SkewT = latLon => {

    set_dimensions();

    var btn = document.getElementById('close-tooltips')
        .addEventListener('click', () => {
            map.eachLayer(function (layer) {
                if (layer.options.pane === "tooltipPane") layer.removeFrom(map);
            });
        })

    let { lat, lon } = picker.getParams()
    PickerOn = true;

    if (zoomed) {
        var endpressure = 600;
    } else {
        var endpressure = 150;
    }
    document.getElementById('skewt-control-panel').style.display = "inline-block";

    set_dimensions();
    var introtext = document.getElementById('ft-title')
    introtext.style.display = "none";
    zoom_button();

    const dataOptions = {
        model: store.get('product'),
        lat: lat,
        lon: lon
    }

    const myIcon = L.divIcon({
        className: 'css-icon',
        iconSize: [15, 15]
    });

    const showSondesCB = document.getElementById('show-sondes-checkbox').checked

    if (sondeMarker) map.removeLayer(sondeMarker)
    sondeMarker = L.marker([lat, lon], { icon: map.myMarkers.pulsatingIcon }).addTo(map);

    if (showSondesCB) {
        fetch(`${SkewTApiPath}/api/nearest/?lat=${lat}&lon=${lon}`)
            .then(response => response.json())
            .then((sonde) => {
                const sondeValidtime = new Date(sonde.sonde_validtime)
                let sondeHour = sondeValidtime.getHours().toString()
                if (sondeHour.length === 1) {
                    sondeHour = '0' + sondeHour
                }

                let M = L.marker({ 'lat': sonde.lat, 'lon': sonde.lon }, { icon: myIcon, Id: sonde.wmo_id }).addTo(map);
                M.bindTooltip(`${sonde.station_name} (${sondeHour}Z)`, {
                    permanent: true,
                    direction: 'right',
                    interactive: true,
                    offset: [15, 0],
                    className: 'tooltip'
                })
                M.addEventListener('click', function () {
                    if (sondeMarker) map.removeLayer(sondeMarker)
                    sondeMarker = L.marker([sonde.lat, sonde.lon], { icon: map.myMarkers.pulsatingIcon }).addTo(map);
                    onMarkerClick(sonde.wmo_id, startpressure, endpressure);
                });
            });
    }

    var surfacePressureSpotForecast = [];
    var surfaceTempSpotForecast = [];
    var surfaceDewPointSpotForecast = [];
    var surfaceUWindSpotForecast = [];
    var surfaceVWindSpotForecast = [];

    load('forecast', dataOptions).then(({ data }) => {
        Object.keys(data.data).forEach((datetimeKey) => {
            data.data[datetimeKey].forEach((field) => {
                surfacePressureSpotForecast.push(field.pressure / 100)
                surfaceTempSpotForecast.push(field.temp)
                surfaceDewPointSpotForecast.push(field.dewPoint)
                let [u, v] = winds2UV(field.windDir, field.wind)
                u *= 1.94384;
                v *= 1.94384;
                surfaceUWindSpotForecast.push(u)
                surfaceVWindSpotForecast.push(v)
            })
        });
    });

    load('airData', dataOptions).then(({ data }) => {

        if (isNaN(surfaceTempSpotForecast[0])) {
            if (RetryAttemptsSpot < 3) {
                console.log('There was a problem loading the spot forecast, retrying...')
                setTimeout(function () { activate_SkewT(); }, 500);
                RetryAttemptsSpot += 1
            }
        }

        var current_timestamp = store.get('timestamp');
        var tidx = gettimestamp(current_timestamp, data.data.hours);

        try {
            var surfacePressure = getSurfacePressure(
                data.header.elevation, surfacePressureSpotForecast[tidx]
            )
            var surfaceTemp = surfaceTempSpotForecast[tidx];
            var surfaceDewPoint = surfaceDewPointSpotForecast[tidx];
        }
        catch (err) {
            if (RetryAttemptsAir < 3) {
                console.log("There was a problem with the data loader, retrying...")
                setTimeout(function () { activate_SkewT(); }, 1000);
                RetryAttemptsAir += 1
            }
        }

        const refPressures = [950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150];
        var Pascent = refPressures.filter((refPressure) => refPressure < surfacePressure);
        var Tdascent = get_data(data, Pascent, 'dewpoint', tidx);
        var Tascent = get_data(data, Pascent, 'temp', tidx);
        var Ums = get_data(data, Pascent, 'wind_u', tidx);
        var Vms = get_data(data, Pascent, 'wind_v', tidx);
        const U = Ums.map((datapoint => datapoint *= 1.94384));
        const V = Vms.map((datapoint => datapoint *= 1.94384));
        Pascent.unshift(surfacePressure);
        Tascent.unshift(surfaceTemp);
        Tdascent.unshift(surfaceDewPoint);
        U.unshift(surfaceUWindSpotForecast[tidx]);
        V.unshift(surfaceVWindSpotForecast[tidx]);

        Tascent = Tascent.map(t => Math.round(10 * (t - 273.15)) / 10);
        Tdascent = Tdascent.map(t => Math.round(10 * (t - 273.15)) / 10);

        draw_skewT(Pascent, Tascent, Tdascent, startpressure, endpressure);
        cbarbs(Pascent, Tascent, U, V, current_timestamp, dataOptions, startpressure, endpressure);
    });
}

picker.on('pickerOpened', activate_SkewT)
picker.on('pickerMoved', activate_SkewT)
store.on('timestamp', function () {
    if (PickerOn) {
        activate_SkewT();
    }
})

const close_skewT = () => {
    d3.select("#skewTbox").remove();
    PickerOn = false;
    const controls = document.getElementById('skewt-control-panel')
    controls.style.display = "none";
    const ftTitle = document.getElementById('ft-title')
    ftTitle.style.display = "display-block";
}
picker.on('pickerClosed', close_skewT)

function draw_skewT(Pascent, Tascent, Tdascent, startpressure, endpressure) {

    cskewT(Pascent, Tascent, Tdascent, startpressure, endpressure)
};

const onMarkerClick = (wmo_id, startpressure, endpressure) => {
    d3.selectAll('path').interrupt();
    const sonde = fetchSonde(wmo_id, startpressure, endpressure);
}

function fetchSonde(wmo_id, startpressure, endpressure) {
    fetch(`${SkewTApiPath}/api/sondes/?wmo_id=${wmo_id}`)
        .then(response => response.json())
        .then((sonde) => {
            const Pascent = sonde.pressurehPA;
            const Tascent = sonde.temperatureK.map((datapoint => datapoint -= 273.15));
            const Tdascent = sonde.dewpointK.map((datapoint => datapoint -= 273.15));
            const U = sonde.u_windMS.map((datapoint => datapoint *= 1.94384));
            const V = sonde.v_windMS.map((datapoint => datapoint *= 1.94384));
            const sonde_timestamp = sonde.sonde_validtime;
            const dataOptions = { model: 'sonde' }

            draw_skewT(sonde.pressurehPA, Tascent, Tdascent, startpressure, endpressure)
            cbarbs(Pascent, Tascent, U, V, sonde_timestamp, dataOptions, startpressure, endpressure);
        })
}

function zoom_button() {
    var zoomOut = document.getElementById('zoom-out')
    var zoomIn = document.getElementById('zoom-in')
    var closeButton = document.getElementById('closebutton')
    zoomIn.addEventListener("click", function () {
        zoomed = true;
        activate_SkewT();
    });
    zoomOut.addEventListener("click", function () {
        zoomed = false;
        activate_SkewT();
    });
    closeButton.addEventListener("click", function () {
        close_skewT();
    });
}

function gettimestamp(current_timestamp, h) {
    var i = 0;
    var minDiff = 99999999999;
    var tidx;
    for (i in h) {
        var m = Math.abs(current_timestamp - h[i])
        if (m < minDiff) {
            minDiff = m
            tidx = i
        };
    };
    return tidx;
};

function get_data(data, Pascent, field, tidx) {
    const ascent = Pascent.map((pLevel) => {
        return data.data[`${field}-${pLevel}h`][tidx];
    })
    return ascent
}

W.map.on("click", e => {
    broadcast.fire('rqstOpen', 'picker', { lat: e.latlng.lat, lon: e.latlng.lng })
    picker.on('pickerOpened', () => {
        document.getElementById('windy-plugin-skewt').style.display = 'block';
    });
})


});