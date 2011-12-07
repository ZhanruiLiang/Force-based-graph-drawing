var X = 0;
var Y = 1;
window.onload = function(){
	var nodes = [];
	var edges = [];
	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");

	// algorithm constants
	var R = 6;
	var K_repulse = 4000000;
	var K_hook = 40;
	var DELTA_TIME = 0.02; // time count in second
	var DAMP = 0.9;
	var LOWEST_ENERGY = 5;
	var HOOK_LEN = 50;
	var BOUND = 1e4;
	var RANDOM_N = 40;

	// colors
	var COLOR_NODE = "rgba(0, 0, 255, 0.7)";
	var COLOR_NODE_SELECTED = "#FFFF22";
	var COLOR_EDGE = "#650555";

	var ST_EMPTY = "empty";
	var ST_CONNECT = "connect";
	var state = ST_EMPTY;
	var connect_source;

	var iteration_id;

	var minX, maxX, minY, maxY, x0, y0, w, h;
	var btn_start = document.getElementById("btn_start");
	var btn_stop = document.getElementById("btn_stop");
	var btn_clear = document.getElementById("btn_clear");
	var btn_next = document.getElementById("btn_next");
	var div_debug = document.getElementById("div_debug");
	btn_stop.disabled = true;

	function getMousePos(e){
		var x;
		var y;
		if (e.pageX || e.pageY) { 
			x = e.pageX;
			y = e.pageY;
		} else { 
			x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
			y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
		} 
		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;
		return [x, y]
	}

	// Array.prototype.remove = function(e){
	// 	var index = this.indexOf(e);
	// 	if(index >= 0)
	// 		this.splice(index, 1);
	// }

	function distance(v1, v2){
		var dx, dy;
		dx = v1[X] - v2[X];
		dy = v1[Y] - v2[Y];
		return Math.sqrt(dx * dx + dy * dy);
	}

	function repulseForce(v1, v2){
		// the repulse force that v2 give to v1, F = K |r| r
		var dx, dy, r;
		dx = v1[X] - v2[X];
		dy = v1[Y] - v2[Y];
		r = K_repulse * v1.mass * v2.mass / (Math.pow(dx * dx + dy * dy, 2) + 2 * R);
		return [dx * r, dy * r];
	}

	function hookForce(v1, v2){
		// the hook force thant v2 pull v1, F = k|r|
		var dx, dy, r, k;
		dx = v2[X] - v1[X];
		dy = v2[Y] - v1[Y];
		r = Math.sqrt(dx * dx + dy * dy) + 0.0001;
		k = K_hook * (1 - HOOK_LEN / r);
		return [k * dx, k * dy];
	}

	function init(){
		btn_start.disabled = false;
		btn_stop.disabled = true;
		minY = minX = 0;
		maxY = canvas.height;
		maxX = canvas.width;
		x0 = 0;
		y0 = 0;
		w = 1;
		h = 1;
		nodes = [];
		edges = [];
	}

	init();

	function start_demo(e){
		if(!iteration_id){
			iteration_id = setInterval(demoIteration, DELTA_TIME * 1000);
			btn_start.disabled = true;
			btn_stop.disabled = false;
			iter_count = 0;
		}
	}

	function stop_demo(e){
		if(iteration_id){
			clearInterval(iteration_id);
			iteration_id = false;
			btn_start.disabled = false;
			btn_stop.disabled = true;
		}
	}

	function random(){
		var n = RANDOM_N;
		var x, y;
		if(nodes.length == 0){
			for(var i =0; i < n; i++){
				x = Math.random() * canvas.width;
				y = Math.random() * canvas.height;
				nodes.push(Node([x, y]));
			}
		}else{
			n = nodes.length;
		}
		var m = n * 1.2 - edges.length;
		for(var i = 0; i < m; i++){
			var v1, v2;
			v1 = Math.ceil(Math.random() * (n - 1));
			v2 = Math.ceil(Math.random() * (n - 1));
			if(v1 != v2){
				console.log(v1, v2);
				edges.push([nodes[v1], nodes[v2]]);
			}
		}
		draw();
	}

	btn_start.onclick = start_demo;
	btn_stop.onclick = stop_demo;
	btn_clear.onclick = function(){
		stop_demo();
		init();
		draw();
	}
	btn_next.onclick = demoIteration;
	document.getElementById("btn_random").onclick = random;

	function demoIteration(){
		var force;
		var df;
		var total_energy = 0.0;
		iter_count ++;
		for(var i in nodes){
			var node = nodes[i];
			force = [0, 0];
			for(var j in nodes){
				var node1 = nodes[j];
				if(node != node1){
					df = repulseForce(node, node1);
					force = [force[X] + df[X], force[Y] + df[Y]];
				}
			}

			for(var j in edges){
				var edge = edges[j];
				var node1 = undefined;
				if(edge[0] == node) node1 = edge[1];
				else if(edge[1] == node) node1 = edge[0];

				if(node1){
					df = hookForce(node, node1);
					force[X] += df[X];
					force[Y] += df[Y];
				}
			}
			node.a[X] = force[X]/node.mass;
			node.a[Y] = force[Y]/node.mass;
		}

		var nodes1 = [];
		for(var i in nodes){
			var node = nodes[i];
			node.v[X] = (node.v[X] + DELTA_TIME * node.a[X]) * DAMP;
			node.v[Y] = (node.v[Y] + DELTA_TIME * node.a[Y]) * DAMP;
			node[X] += node.v[X] * DELTA_TIME;
			node[Y] += node.v[Y] * DELTA_TIME;
			// if(Math.abs(node[X]) > BOUND || Math.abs(node[Y]) > BOUND){
			// }else{
			// 	nodes1.push(node);
			// }

			total_energy += node.mass * (node.v[X] * node.v[X] + node.v[Y] * node.v[Y]);
			updateMaxMin(node);
		}
		if(iter_count > 10 && total_energy < LOWEST_ENERGY){
			stop_demo();
		}
		draw();
		// div_debug.innerHTML = (<div><p> E: {total_energy} </p><p> w: {w} h: {h} </p></div>);
	}

	function Node(pos){
		var node = pos;
		node.v = [0, 0];
		node.a = [0, 0];
		node.r = 3 + Math.random() * R;
		node.mass = node.r * node.r / 50;
		return node;
	}

	function updateMaxMin(xy){
		var tempw, temph;
		minX = Math.min(0, minX, xy[X]);
		maxX = Math.max(canvas.width, maxX, xy[X]);
		minY = Math.min(0, minY, xy[Y]);
		maxY = Math.max(canvas.height, maxY, xy[Y]);
		x0 = minX;
		y0 = minY;
		w = Math.max(canvas.width, maxX - minX) / canvas.width;
		h = Math.max(canvas.height, maxY - minY) / canvas.height;
		w = h = Math.max(w, h);
	}

	function boardXYToCanvasXY(boardXY){
		var x, y, xp, yp;
		x = boardXY[X];
		y = boardXY[Y];

		xp = (x - x0) / w;
		yp = (y - y0) / h;
		return [xp, yp];
	}

	function canvasXYToBoardXY(xy){
		var x, y, xp, yp
		x = xy[X]; y = xy[Y];
		xp = x0 + w * x;
		yp = y0 + h * y;
		return [xp, yp];
	}

	function draw(){
		minX = minY = 0;
		maxX = canvas.width;
		maxY = canvas.height;
		for(i in nodes){
			updateMaxMin(nodes[i]);
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var i,j,f,v1,v2, p1, p2;
		// draw the outline
		var outline = [[0, 0], [canvas.width, 0],
			[canvas.width , canvas.height], [0, canvas.height], [0,0]];

		ctx.beginPath();
		p1 = boardXYToCanvasXY(outline[0]);
		ctx.moveTo(p1[X], p1[Y]);
		for(i = 1; i < outline.length; i++){
			p1 = boardXYToCanvasXY(outline[i]);
			ctx.lineTo(p1[X], p1[Y]);
		}
		ctx.closePath();
		ctx.strokeStyle = "#a000aa";
		ctx.stroke();
		
		// draw nodes
		for(var i in nodes){
			var node = nodes[i];
			if(node == connect_source){
				ctx.fillStyle = COLOR_NODE_SELECTED;
			}else{
				ctx.fillStyle = COLOR_NODE;
			}
			ctx.beginPath();
			p1 = boardXYToCanvasXY(node);
			ctx.arc(p1[X], p1[Y], node.r, 0, Math.PI * 2, false);
			ctx.closePath();
			ctx.fill();
		}
		// draw edges
		ctx.strokeStyle = COLOR_EDGE;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for(var ei in edges){
			var e = edges[ei];
			p1 = boardXYToCanvasXY(e[0]);
			p2 = boardXYToCanvasXY(e[1]);
			ctx.moveTo(p1[X], p1[Y]);
			ctx.lineTo(p2[X], p2[Y]);
		}
		ctx.closePath();
		ctx.stroke();
		// draw extra edges
		return;
		ctx.lineWidth = 3;
		for(i = 0; i < nodes.length; i++){
			v1 = nodes[i];
			for(j = i+1; j < nodes.length; j++){
				v2 = nodes[j];
				f = distance(repulseForce(v1, v2), [0, 0]) / 5 * 100;
				f = Math.max(Math.min(100, f), 0)
				ctx.strokeStyle = "rgba(255, 255, 0," + f/100 + ")";
				p1 = boardXYToCanvasXY(v1);
				p2 = boardXYToCanvasXY(v2);
				ctx.beginPath();
				ctx.moveTo(p1[X], p1[Y]);
				ctx.lineTo(p2[X], p2[Y]);
				ctx.closePath();
				ctx.stroke();
			}
		}
	}


	function isPointInNode(pos, node){
		var dx = node[X] - pos[X];
		var dy = node[Y] - pos[Y];
		return dx * dx + dy * dy <= Math.pow((node.r + 2)*w, 2);
	}

	function handleClick(e){
		var pos = canvasXYToBoardXY(getMousePos(e));
		// test if click on a node
		// if yes: start connect or make edge
		// if not: add a new node

		var finished = false;
		for (var i in nodes){
			var node = nodes[i];
			if(isPointInNode(pos, node)){
				if(state == ST_EMPTY){
					//start connect
					state = ST_CONNECT;
					connect_source = node;
				}else if(state == ST_CONNECT){
					var connect_dest = node;
					if(connect_dest != connect_source){
						edges.push([connect_source, connect_dest]);
					}
					state = ST_EMPTY;
					connect_source = null;
				}
				finished = true;
				break;
			}
		}
		if(!finished){
			//add a node
			var node = Node(pos);
			nodes.push(node);
			updateMaxMin(node);
			if(state == ST_CONNECT){
				// connect the new node and connect_source
				edges.push([connect_source,  node]);
				state = ST_EMPTY;
			}
		}
		draw();
	}

	canvas.addEventListener("click", handleClick);
}
