import * as site from "./site.js";
import * as dac3d from "./dac3d.js";
import * as stats from "./stats.js";

class page {
    ctx;
    stats;

    dom = {
        divCanvas: null,
        cnvs: null
    };
    
    //-- main rendering code -----------------------------------------------------------------------

    stage = [];
    poly;
    point;
    sprite;
    points;
    mul;
    shift;
    dim;

    objs = [];

    caxis = [1, 1, 0];

    ar = 0;
    ar2 = 0;
    vr = 0;
    tm = new Array(16);

    radTop = Math.PI * 2;

    lastFrame = 0;

    bpe = new Array();

    awpos = [0, 0, 50];

    bpedirection = [0, 0.3, 0];
    bped = new Array(3);
    pleft = [-28, 90, 0];
    pright = [28, 90, 0];

    init() {
        this.objs.push(new dac3d.object3d(dac3d.createAWing(), 1.5));

        this.bpe.push(new dac3d.particleEngine("../images/particle-red.png", 0.25, 100, 200));
        this.bpe.push(new dac3d.particleEngine("../images/particle-red.png", 0.25, 100, 200));
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);

        this.stats.begin();

        const ms = ct - this.lastFrame;
        this.lastFrame = ct;

        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.stage = [];

        this.tm = dac3d.M4x4_clone(dac3d.M4x4_I);

        //translate ship
        dac3d.M4x4_rotate(this.ar2, this.caxis, this.tm, this.tm);
        dac3d.M4x4_rotateX(this.ar, this.tm, this.tm);
        dac3d.M4x4_rotateY(this.ar2, this.tm, this.tm);

        dac3d.V3_mul4x4(this.tm, this.bpedirection, this.bped);

        //translate ship pos in space
        dac3d.M4x4_translate3(this.awpos, this.tm, this.tm);
        dac3d.M4x4_rotateY(this.vr, this.tm, this.tm);

        //draw ship to stage
        this.objs[0].draw(this.stage, this.tm);

        this.bpe[0].render(this.stage, dac3d.V3_mul4x4(this.tm, this.pleft), this.bped, ms, 5);
        this.bpe[1].render(this.stage, dac3d.V3_mul4x4(this.tm, this.pright), this.bped, ms, 5);

        //adjust rotation amounts.
        this.ar += 0.001571 * ms;
        if (this.ar > this.radTop) this.ar -= this.radTop;

        this.ar2 += 0.0012 * ms;
        if (this.ar2 > this.radTop) this.ar2 -= this.radTop;

        this.vr += 0.0002 * ms;
        if (this.vr > this.radTop) this.vr -= this.radTop;

        dac3d.renderStage(this.stage, this.ctx);

        this.ctx.globalAlpha = 1;

        this.stats.end();
    }  
    
    //-- entry points ----------------------------

    onLoad = () => {
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