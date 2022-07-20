import * as site from "./site.js";
import * as dac3d from "./dac3d.js";

class page {
    ctx;

    //-- main rendering code -----------------------------------------------------------------------

    stage = [];
    objs = [];

    ar = 0;
    vr = 0;
    tm = new Array(16);

    radTop = Math.PI * 2;

    lastFrame = 0;

    bpe = new Array();

    pelocation = [120, 0, 0];
    pedirection = [0, 0.12, 0];
    pev = new Array(3);
    ped = new Array(3);

    dom = {
        divCanvas: null,
        cnvs: null
    }

    init() {
        this.objs.push(new dac3d.object3d(dac3d.createCube("#666666"), 23));

        this.bpe.push(new dac3d.particleEngine("images/particle-red.png", Math.PI / 2, 800, 1200));
        this.bpe.push(new dac3d.particleEngine("images/particle-red.png", Math.PI / 2, 800, 1200));
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);

        let ms = ct - this.lastFrame;
        this.lastFrame = ct;

        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.stage = [];

        dac3d.M4x4_rotateY(this.ar, dac3d.M4x4_I, this.tm);
        dac3d.M4x4_rotateX(this.ar * 2, this.tm, this.tm);
        this.objs[0].draw(this.stage, this.tm);

        this.ar += 0.001571 * ms;
        if (this.ar > this.radTop) this.ar -= this.radTop;

        this.vr += 0.0016 * ms;
        if (this.vr > this.radTop) this.vr -= this.radTop;

        dac3d.M4x4_rotateZ(this.vr, dac3d.M4x4_I, this.tm);

        dac3d.V3_mul4x4(this.tm, this.pelocation, this.pev);
        dac3d.V3_mul4x4(this.tm, this.pedirection, this.ped);
        this.bpe[0].render(this.stage, this.pev, this.ped, ms, 5);

        dac3d.M4x4_rotateZ(Math.PI, this.tm, this.tm);
        dac3d.V3_mul4x4(this.tm, this.pelocation, this.pev);
        dac3d.V3_mul4x4(this.tm, this.pedirection, this.ped);
        this.bpe[1].render(this.stage, this.pev, this.ped, ms, 5);

        dac3d.renderStage(this.stage, this.ctx);

        this.ctx.globalAlpha = 1;
    }

    //-- entry points ----------------------------
    onLoad = () => {
        this.ctx = this.dom.cnvs.getContext("2d");

        dac3d.resizeStage(this.dom.divCanvas, this.ctx);

        this.init();

        requestAnimationFrame(this.loop);
    }

    onResize = () => {
        dac3d.resizeStage(this.divCanvas, ctx);
    }
}

site.registerPage(page);
