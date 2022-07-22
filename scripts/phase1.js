import * as site from "./site.js";
import * as dac3d from "./dac3d.js";
import * as stats from "./stats.js";

class page {
    showGreenCube = true;
    showRedCube = true;
    showBlueStar = true;
    showTorus = true;
    showTorusParticles = true;
    showRotator = true;

    ctx;
    stats;

    dom = {
        cbRedCube: null,
        cbGreenCube: null,
        cbBlueStar: null,
        cbTorus: null,
        cbTorusParticles: null,
        cbRotator: null,
        divCanvas: null,
        cnvs: null
    };

    //-- main rendering code -----------------------------------------------------------------------

    stage = [];

    objPointX = [100, 0, 0];
    objPointY = [0, 100, 0];
    objPointZ = [-100, 0, 0];
    objs = [];

    caxis = [1, 1, 0];
    baxis = [0, 1, 1];

    ar = 0;
    ar2 = 0;
    vr = 0;
    tm = new Array(16);

    radTop = Math.PI * 2;

    lastFrame = 0;

    bpe = new Array();

    pelocation = [160, 0, 0];
    pedirection = [0, 0.12, 0];
    pev = new Array(3);
    ped = new Array(3);

    pzero = [0, 0, 0];
    bpedirection = [0, 0, 0.3];
    bped = new Array(3);

    init() {
        this.objs.push(new dac3d.object3d(dac3d.createCube("#ff0000"), 8));
        this.objs.push(new dac3d.object3d(dac3d.createCube("#00ff00"), 8));
        this.objs.push(new dac3d.object3d(dac3d.createStar("#0000ff"), 4));
        this.objs.push(new dac3d.object3d(dac3d.createTorus(30, 15, 30, 20, "#999999"), 1));
        this.objs.push(new dac3d.object3d(dac3d.createTorus(32, 3, 22, 3, "#ff0000"), 1));
        this.objs.push(new dac3d.object3d(dac3d.createTorus(32, 3, 22, 3, "#00ff00"), 1));
        this.objs.push(new dac3d.object3d(dac3d.createTorus(32, 3, 22, 3, "#0000ff"), 1));

        this.bpe.push(new dac3d.particleEngine("../images/particle-white.png", 0.25, 2000, 3000));
        this.bpe.push(new dac3d.particleEngine("../images/particle-white.png", 0.25, 2000, 3000));
        this.bpe.push(new dac3d.particleEngine("../images/particle-red.png", Math.PI / 2, 800, 1200));
        this.bpe.push(new dac3d.particleEngine("../images/particle-red.png", Math.PI / 2, 800, 1200));
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);
        
        this.stats.begin();

        const ms = ct - this.lastFrame;
        this.lastFrame = ct;

        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.stage = [];

        if (this.showRedCube) {
            dac3d.M4x4_rotateY(this.ar, dac3d.M4x4_I, this.tm);
            dac3d.M4x4_translate3(this.objPointX, this.tm, this.tm);
            dac3d.M4x4_rotateX(this.ar * 2, this.tm, this.tm);
            this.objs[0].draw(this.stage, this.tm);
            this.objs[4].draw(this.stage, this.tm);
        }

        if (this.showGreenCube) {
            dac3d.M4x4_rotateX(this.ar, dac3d.M4x4_I, this.tm);
            dac3d.M4x4_translate3(this.objPointY, this.tm, this.tm);
            dac3d.M4x4_rotateY(this.ar * 3, this.tm, this.tm);
            this.objs[1].draw(this.stage, this.tm);
            this.objs[5].draw(this.stage, this.tm);
        }

        if (this.showBlueStar) {
            dac3d.M4x4_rotate(this.ar, this.baxis, dac3d.M4x4_I, this.tm);
            dac3d.M4x4_translate3(this.objPointZ, this.tm, this.tm);
            dac3d.M4x4_rotateX(this.ar * 2, this.tm, this.tm);
            this.objs[2].draw(this.stage, this.tm);
            this.objs[6].draw(this.stage, this.tm);
        }

        if (this.showTorus || this.showTorusParticles) {
            dac3d.M4x4_rotate(this.ar2, this.caxis, dac3d.M4x4_I, this.tm);
            dac3d.M4x4_rotateX(this.ar * 2, this.tm, this.tm);
        }

        if (this.showTorus) {
            this.objs[3].draw(this.stage, this.tm);
        }

        if (this.showTorusParticles) {
            dac3d.V3_mul4x4(this.tm, this.bpedirection, this.bped);
            this.bpe[0].render(this.stage, this.pzero, this.bped, ms, 5);
            dac3d.V3_neg(this.bped, this.bped);
            this.bpe[1].render(this.stage, this.pzero, this.bped, ms, 5);
        } else {
            this.bpe[0].renderOff(this.stage, ms);
            this.bpe[1].renderOff(this.stage, ms);
        }

        this.ar += 0.001571 * ms;
        if (this.ar > this.radTop) this.ar -= this.radTop;

        this.ar2 += 0.0012 * ms;
        if (this.ar2 > this.radTop) this.ar2 -= this.radTop;

        if (this.showRotator) {
            this.vr += 0.0016 * ms;
            if (this.vr > this.radTop) this.vr -= this.radTop;

            dac3d.M4x4_rotateZ(this.vr, dac3d.M4x4_I, this.tm);

            dac3d.V3_mul4x4(this.tm, this.pelocation, this.pev);
            dac3d.V3_mul4x4(this.tm, this.pedirection, this.ped);
            this.bpe[2].render(this.stage, this.pev, this.ped, ms, 5);

            dac3d.M4x4_rotateZ(Math.PI, this.tm, this.tm);
            dac3d.V3_mul4x4(this.tm, this.pelocation, this.pev);
            dac3d.V3_mul4x4(this.tm, this.pedirection, this.ped);
            this.bpe[3].render(this.stage, this.pev, this.ped, ms, 5);
        } else {
            this.bpe[2].renderOff(this.stage, ms);
            this.bpe[3].renderOff(this.stage, ms);
        }

        dac3d.renderStage(this.stage, this.ctx);

        this.ctx.globalAlpha = 1;

        this.stats.end();
    }
    
    //-- entry points ----------------------------

    onLoad = () => {
        this.dom.cbRedCube.addEventListener("change", (e) => this.showRedCube = e.target.checked);        
        this.dom.cbGreenCube.addEventListener("change", (e) => this.showGreenCube = e.target.checked);        
        this.dom.cbBlueStar.addEventListener("change", (e) => this.showBlueStar = e.target.checked);        
        this.dom.cbTorus.addEventListener("change", (e) => this.showTorus = e.target.checked);        
        this.dom.cbTorusParticles.addEventListener("change", (e) => this.showTorusParticles = e.target.checked);        
        this.dom.cbRotator.addEventListener("change", (e) => this.showRotator = e.target.checked);

        this.stats = stats.init();
 
        this.ctx = this.dom.cnvs.getContext("2d");

        dac3d.resizeStage(this.dom.divCanvas, this.ctx);

        this.init();

        requestAnimationFrame(this.loop);
    }

    onResize = () => {
        dac3d.resizeStage(this.dom.divCanvas, this.ctx);
    }
}

site.registerPage(page);