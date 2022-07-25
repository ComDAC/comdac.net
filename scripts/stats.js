/**
 * original source:
 * @author mrdoob / http://mrdoob.com/
 * 
 * masive custom modifications
 */

export function init(page) {
	let stats = new Stats("position:absolute; top:10px; right:10px;", page);
	
	document.body.appendChild(stats.container);

	return stats;
}

class Stats {
	mode = 0;
	container;
	memPanel;
	fpsPanel;
	msPanel;
	objPanel;
	beginTime;
	prevTime;
	frames;
	objArr;

	addPanel(panel) {
		this.container.appendChild(panel.canvas);
		return panel;
	}

	showPanel(id) {
		for (let i = 0; i < this.container.children.length; i++) {
			this.container.children[i].style.display = i === id ? 'block' : 'none';
		}

		this.mode = id;
	}

	panelClick = (e) => {
		e.preventDefault();

		this.showPanel(++this.mode % this.container.children.length);
	}

	constructor(style, page) {
		this.container = document.createElement('div');
		this.container.style.cssText = style;
		this.container.style.opacity = 0.9;
		this.container.style.zIndex = 10000;

		this.container.addEventListener("click", this.panelClick, false);

		this.beginTime = (performance || Date).now();
		this.prevTime = this.beginTime;
		this.frames = 0;

		this.fpsPanel = this.addPanel(new Panel('FPS', '#0ff', '#002'));
		this.msPanel = this.addPanel(new Panel('MS', '#0f0', '#020'));

		if (self.performance && self.performance.memory) {
			this.memPanel = this.addPanel(new Panel('MB', '#f08', '#201'));
		}

		if (page) {
			this.objPage = page;
			this.objPanel = this.addPanel(new Panel("OBJ", '#09f', '#002', true));
		}

		this.showPanel(0);
	}
	
	begin() {
		this.beginTime = (performance || Date).now();
	}

	end() {
		this.frames++;

		let time = (performance || Date).now();

		this.msPanel.update(time - this.beginTime, 200);

		if (time > this.prevTime + 1000) {
			this.fpsPanel.update((this.frames * 1000) / (time - this.prevTime), 100);

			this.prevTime = time;
			this.frames = 0;

			if (this.memPanel) {
				let memory = performance.memory;
				this.memPanel.update(memory.usedJSHeapSize / 1048576, memory.jsHeapSizeLimit / 1048576);
			}

			if (this.objPanel) {
				this.objPanel.update(this.objPage.stage.length, 4000);
			}
		}

		return time;
	}

	update() {
		this.beginTime = this.end();
	}
}


class Panel {
	canvas;

	context;
	pixelRatio;
	min = Infinity;
	max = 0;
	name;
	fg;
	bg;
	WIDTH;
	HEIGHT;
	TEXT_X;
	TEXT_Y;
	GRAPH_X;
	GRAPH_Y;
	GRAPH_WIDTH;
	GRAPH_HEIGHT;
	hideMinMax;

	constructor(name, fg, bg, hideMinMax) {
		this.name = name;
		this.fg = fg;
		this.bg = bg;
		this.hideMinMax = hideMinMax || false;
		this.pixelRatio = Math.round(window.devicePixelRatio || 1);
		this.WIDTH = 80 * this.pixelRatio;
		this.HEIGHT = 48 * this.pixelRatio;
		this.TEXT_X = 3 * this.pixelRatio;
		this.TEXT_Y = 2 * this.pixelRatio;
		this.GRAPH_X = 3 * this.pixelRatio;
		this.GRAPH_Y = 15 * this.pixelRatio;
		this.GRAPH_WIDTH = 74 * this.pixelRatio;
		this.GRAPH_HEIGHT = 30 * this.pixelRatio;

		this.canvas = document.createElement('canvas');
		this.canvas.width = this.WIDTH;
		this.canvas.height = this.HEIGHT;
		this.canvas.style.cssText = 'width:80px;height:48px';

		this.context = this.canvas.getContext('2d');
		this.context.font = 'bold ' + (9 * this.pixelRatio) + 'px Helvetica,Arial,sans-serif';
		this.context.textBaseline = 'top';

		this.context.fillStyle = this.bg;
		this.context.fillRect(0, 0, this.WIDTH, this.HEIGHT);

		this.context.fillStyle = this.fg;
		this.context.fillText(this.name, this.TEXT_X, this.TEXT_Y);
		this.context.fillRect(this.GRAPH_X, this.GRAPH_Y, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);

		this.context.fillStyle = this.bg;
		this.context.globalAlpha = 0.9;
		this.context.fillRect(this.GRAPH_X, this.GRAPH_Y, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);
	}

	update(value, maxValue) {
		this.min = Math.min(this.min, value);
		this.max = Math.max(this.max, value);

		this.context.fillStyle = this.bg;
		this.context.globalAlpha = 1;
		this.context.fillRect(0, 0, this.WIDTH, this.GRAPH_Y);
		this.context.fillStyle = this.fg;

		if (this.hideMinMax) {
			this.context.fillText(Math.round(value) + ' ' + this.name, this.TEXT_X, this.TEXT_Y);
		} else {
			this.context.fillText(Math.round(value) + ' ' + this.name + ' (' + Math.round(this.min) + '-' + Math.round(this.max) + ')', this.TEXT_X, this.TEXT_Y);
		}

		this.context.drawImage(this.canvas, this.GRAPH_X + this.pixelRatio, this.GRAPH_Y, this.GRAPH_WIDTH - this.pixelRatio, this.GRAPH_HEIGHT, this.GRAPH_X, this.GRAPH_Y, this.GRAPH_WIDTH - this.pixelRatio, this.GRAPH_HEIGHT);

		this.context.fillRect(this.GRAPH_X + this.GRAPH_WIDTH - this.pixelRatio, this.GRAPH_Y, this.pixelRatio, this.GRAPH_HEIGHT);

		this.context.fillStyle = this.bg;
		this.context.globalAlpha = 0.9;
		this.context.fillRect(this.GRAPH_X + this.GRAPH_WIDTH - this.pixelRatio, this.GRAPH_Y, this.pixelRatio, Math.round((1 - (value / maxValue)) * this.GRAPH_HEIGHT));
	}
}