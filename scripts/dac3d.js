let width = 0;
let height = 0;

let perspective = 512.0;
let wall = 0 - perspective;

let zzero = 512.0;
let xzero = 160.0;
let yzero = 160.0;

let scale = 1;

let perspectiveScale = perspective * scale;

export function resizeStage(canvas, ctx) {
    width = isNaN(canvas.clientWidth) ? 100 : canvas.clientWidth;
    height = isNaN(canvas.clientHeight) ? 100 : canvas.clientHeight;
    scale = Math.sqrt(width * width + height * height) / 800.0;
    perspectiveScale = perspective * scale;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    xzero = (width / 2) | 0;
    yzero = (height / 2) | 0;
}

export function renderStage(stage, ctx) {
    stage.sort((a,b) => b.z - a.z);
    
    for(const poly of stage) if (poly.z > wall) {
        switch (poly.type) {
            case 0:
                ctx.globalAlpha = 1;
                ctx.fillStyle = poly.col;
                ctx.strokeStyle = poly.col;

                ctx.beginPath();

                ctx.moveTo(poly.points[0][0], poly.points[0][1]);

                for(let i=1; i<poly.points.length; i++) ctx.lineTo(poly.points[i][0], poly.points[i][1]);

                ctx.fill();
                ctx.stroke();
                break;

            case 1:
                ctx.globalAlpha = poly.alpha;
                const mul = scale * poly.scale;
                const shift = Math.floor(poly.sprite.hd * mul);
                const dim = Math.floor(poly.sprite.d * mul);

                ctx.drawImage(poly.sprite.img, poly.point[0] - shift, poly.point[1] - shift, dim, dim);
                break;
        }
    }
}

function colorLuminance(hex, lum) {
    // validate hex string  
    hex = String(hex).replace(/[^0-9a-f]/gi, '');

    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    lum = lum || 0;
    // convert to decimal and change luminosity  
    let rgb = "#";

    for (let i = 0; i < 3; i++) {
        const c = parseInt(hex.substr(i * 2, 2), 16);

        rgb += Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16).padStart(2, "0");
    }

    return rgb;
}

function convert2d(point, r) {
    const zp = perspectiveScale / (point[2] + zzero);
    r[0] = (point[0] * zp + xzero) | 0;
    r[1] = (point[1] * zp + yzero) | 0;
}

//-- 3D Object Handler Object --------------------------------------------------------------------

const colsteps = 48;
const colmul = (colsteps - 0.0001) / (Math.PI / 2);

export class object3d {
    pts = [];
    polys;
    cols;
    pt;
    pt3d;
    pgr;

    constructor(object, size) {
        this.polys = object[1];

        for (let i = 0; i < (object[0].length - 2); i += 3) {
            this.pts.push([object[0][i] * size, object[0][i + 1] * size, object[0][i + 2] * size]);
        }

        this.cols = new Array(object[2].length);
        this.pt = new Array(this.pts.length);
        this.pt3d = new Array(this.pts.length);
        this.pgr = new Array(this.polys.length);

        for (let i = 0; i < this.cols.length; i++) {
            this.cols[i] = new Array(colsteps);

            for (let p = 0; p < colsteps; p++) {
                this.cols[i][p] = colorLuminance(object[2][i], (((colsteps - p) / colsteps) - 1) / 1.2);
            }
        }

        for (let i = 0; i < this.pgr.length; i++) {
            this.pgr[i] = { 
                type: 0, 
                len: this.polys[i].length - 1, 
                points: [], 
                col: "ffffff", 
                z: 0 
            };

            let p = this.polys[i].length - 1;
            this.polys[i][p] = this.cols[this.polys[i][p]];
            p--;
            while (p--) {
                this.pgr[i].points[p] = new Array(2);
            }
        }

        for (let i = 0; i < this.pts.length; i++) {
            this.pt[i] = new Array(2);
            this.pt3d[i] = new Array(3);
        }
    }
    
    //main rendering routines to perform transformations and then add polygons to the stage for rendering
    draw(s, m) {
        for (let i = 0; i < this.pts.length; i++) {
            convert2d(V3_mul4x4(m, this.pts[i], this.pt3d[i]), this.pt[i]);
        }

        for(let i=0; i<this.polys.length;i++) {
            const poly = this.polys[i];
            const norm = new Array(3);
            V3_normal(this.pt3d[poly[1]], this.pt3d[poly[0]], this.pt3d[poly[2]], norm);

            if (norm[2] > 0) {
                const pg = this.pgr[i];
                const a = Math.min((colmul * Math.acos(norm[2] / V3_length(norm))) | 0, colsteps - 1);

                pg.col = poly[pg.len][a];

                let z = 0;

                for(let p = 0; p < pg.len; p++) {
                    const pp = poly[p];
                    pg.points[p] = this.pt[pp];
                    z += this.pt3d[pp][2];
                }

                pg.z = z / pg.len;

                s.push(pg);
            }
        }
    }
}

//-- Particle Engine -----------------------------------------------------

class particle {
    ttl;
    pos;
    vel;
    obj;

    constructor(sprite, pos, vel, ttl) {
        this.pos = [...pos];
        this.vel = [...vel];
        this.ttl = ttl;
        this.obj = { 
            type: 1, 
            point: new Array(2), 
            sprite: sprite, 
            alpha: 1, 
            z: 0, 
            scale: 1 
        };

        this.updatePos(Math.random() / 2);
    }

    updatePos(mul) {
        this.pos[0] += this.vel[0] * mul;
        this.pos[1] += this.vel[1] * mul;
        this.pos[2] += this.vel[2] * mul;
    }

    update(ms) {
        this.updatePos(ms);

        return this.ttl -= ms;
    }

    reset(pos, vel, ttl) {
        this.pos = [...pos];
        this.vel = [...vel];

        this.updatePos(Math.random() / 2);

        this.ttl = ttl;
    }

    draw(s, max) {
        convert2d(this.pos, this.obj.point);

        this.obj.alpha = Math.min(0.35, this.ttl / max);
        this.obj.z = this.pos[2];
        this.obj.scale = (this.obj.z / -4000) + 1;

        s.push(this.obj);
    }
}

export class particleEngine {
    particles = new Array();
    ml;
    mlm;
    mlfade;
    s;
    img;

    constructor(img, spray, minlife, maxlife) {
        this.ml = minlife;
        this.mlm = maxlife - minlife;
        this.mlfade = maxlife * 2;
        this.s = spray;
        this.img = { 
            img: new Image(), 
            hd: -9000, 
            d: 0 
        };

        this.img.img.onload = () => {
            this.img.d = this.img.img.width;
            this.img.hd = this.img.img.width / 2;
        };

        this.img.img.src = img;
    }

    changeParticle(img) {
        this.img.img.src = img;
    }

    render(s, pos, dir, ms, n) {
        let newParticles = n;

        for(const p of this.particles) if (p.update(ms) < 0) {
            if (newParticles > 0) {
                const vel = this.computeVel(dir);
                const ttl = Math.random() * this.mlm + this.ml;

                p.reset(pos, vel, ttl);
                p.draw(s, this.mlfade);
                --newParticles;
            }
        } else {
            p.draw(s, this.mlfade);
        }

        while (newParticles--) {
            const vel = this.computeVel(dir);            
            const ttl = Math.random() * this.mlm + this.ml;
            const p = new particle(this.img, pos, vel, ttl);

            this.particles.push(p);
            p.draw(s, this.mlfade);
        }
    }

    computeVel(dir) {        
        const tm = new Array(16);
        const vel = new Array(3);

        M4x4_rotateZ((Math.random() - 0.5) * this.s, M4x4_I, tm);
        M4x4_rotateY((Math.random() - 0.5) * this.s, tm, tm);
        M4x4_rotateX((Math.random() - 0.5) * this.s, tm, tm);
        V3_mul4x4(tm, dir, vel);

        return vel;
    }

    renderOff(s, ms) {
        for(const p of this.particles) if (p.update(ms) >= 0) {
            p.draw(s, this.mlfade);
        }

        this.particles = this.particles.filter((p) => p.ttl >= 0);
    }
}

//-- Object Creation Routines --------------------------------------------

export function createCube(col) {
    return [
        [1, 1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1],
        [[1, 0, 5, 6, 0],
         [5, 4, 7, 6, 0],
         [7, 4, 3, 2, 0],
         [0, 1, 2, 3, 0],
         [0, 3, 4, 5, 0],
         [1, 6, 7, 2, 0]],
        [col]
    ];
}

export function createStar(col) {
    return [
        [1, 1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, 4, 0, 0, 0, 4, 0, -4, 0, 0, 0, -4, 0, 0, 0, 4, 0, 0, -4],
        [
            [8, 0, 5, 0],
            [8, 5, 6, 0],
            [8, 1, 0, 0],
            [8, 6, 1, 0],
            [13, 5, 4, 0],
            [13, 4, 7, 0],
            [13, 7, 6, 0],
            [13, 6, 5, 0],
            [9, 4, 5, 0],
            [9, 3, 4, 0],
            [9, 0, 3, 0],
            [9, 5, 0, 0],
            [10, 2, 7, 0],
            [10, 3, 2, 0],
            [10, 4, 3, 0],
            [10, 7, 4, 0],
            [12, 1, 2, 0],
            [12, 0, 1, 0],
            [12, 2, 3, 0],
            [12, 3, 0, 0],
            [11, 2, 1, 0],
            [11, 7, 2, 0],
            [11, 1, 6, 0],
            [11, 6, 7, 0]
        ],
        [col]
    ];
}

export function createTorus(d1, d2, r1, r2, col) {
    let i, j;
    const obj = [[], [], [col]];
    const rpi1 = (Math.PI * 2) / d1;
    const rpi2 = (Math.PI * 2) / d2;
    const pts = new Array();
    const cir = new Array();
    let tm;

    cir.push([0, r2, 0]);

    let tm1 = new Array(16);
    M4x4_rotateX(rpi2, M4x4_I, tm1);
    for (i = 1; i < d2; i++) {
        cir.push(V3_mul4x4(tm1, cir[i - 1]));
    }

    for (i = 0; i < d2; i++) {
        cir[i] = V3_add(cir[i], [0, r1, 0]);
    }

    let tm2 = new Array(16);
    M4x4_rotateZ(rpi1, M4x4_I, tm2);
    for (i = 0; i < d2; i++) {
        pts.push(cir[i]);
    }
    for (j = 1; j < d1; j++) {
        for (i = 0; i < d2; i++) {
            pts.push(V3_mul4x4(tm2, pts[((j - 1) * d2) + i]));
        }
        for (i = 1; i < d2; i++) {
            obj[1].push([(j) * d2 + (i), (j) * d2 + (i - 1), (j - 1) * d2 + (i - 1), (j - 1) * d2 + (i), 0]);
        }
        obj[1].push([(j) * d2, (j) * d2 + (i - 1), (j - 1) * d2 + (i - 1), (j - 1) * d2, 0]);
    }
    for (i = 1; i < d2; i++) {
        obj[1].push([(i), (i - 1), (j - 1) * d2 + (i - 1), (j - 1) * d2 + (i), 0]);
    }
    obj[1].push([0, (i - 1), (j - 1) * d2 + (i - 1), (j - 1) * d2, 0]);

    for (j = 0; j < pts.length; j++) {
        obj[0].push(pts[j][0]);
        obj[0].push(pts[j][1]);
        obj[0].push(pts[j][2]);
    }

    return obj;
}

export function createAWing() {
    return [
            [8, 30, -8, 0, 30, -14, 0, 16, -16, 8, 16, -6, -8, 16, -6, -8, 30, -8, 0, -11, -2, 0, 48, -8, 17, 35, -8, 17, 40, -18, 17, 65, -18, 17, 65, -8, 17, 65, 8, 17, 65, 13, 17, 40, 13, 17, 35, 8, -17, 35, -8, -17, 40, -18, -17, 65, -18, -17, 65, -8, -17, 35, 8, -17, 40, 13, -17, 65, 13, -17, 65, 8, 24, 61, -3, 24, 61, 4, 24, 63, 4, 24, 63, -3, 10, 61, -3, 10, 61, 4, 10, 63, 4, 10, 63, -3, 17, 61, 8, 17, 63, 8, 17, 61, -8, 17, 63, -8, -24, 61, -3, -24, 61, 4, -24, 63, 4, -24, 63, -3, -10, 61, -3, -10, 61, 4, -10, 63, 4, -10, 63, -3, -17, 61, 8, -17, 63, 8, -17, 61, -8, -17, 63, -8, 24, 30, -3, 24, 30, 4, 24, 55, 4, 24, 55, -3, 17, 48, 8, 10, 48, 4, 10, 55, 4, 17, 55, 8, 17, 30, -8, 17, 55, -8, 10, 55, -3, 10, 48, -3, 17, 48, -8, 17, 30, 8, -17, 55, 8, -24, 55, 4, -24, 55, -3, -17, 55, -8, -10, 55, -3, -10, 55, 4, -24, 30, 4, -24, 30, -3, -10, 48, 4, -17, 48, 8, -17, 30, -8, -17, 48, -8, -10, 48, -3, -17, 30, 8, 32, 30, -3, 32, 30, 3, -32, 30, 3, -32, 30, -3, 33, -1, 0, 33, 35, 0, 33.5, 35, 0.25, 33.5, -1, 0.25, 33.5, 35, -0.25, 33.5, -1, -0.25, -33.5, -1, -0.25, -33.5, 35, -0.25, -33.5, 35, 0.25, -33.5, -1, 0.25, -33, 35, 0, -33, -1, 0, -32, 1, 2, -33, 1, 2, -33, 3, 0, -32, 3, 0, 32, 1, 2, 33, 1, 2, 33, 3, 0, 32, 3, 0, -32, 1, -2, -33, 1, -2, 32, 1, -2, 33, 1, -2, -17, -28, 0, 17, -28, 0, -6, 48, -4, 6, 48, -4, 6, 48, 4, -6, 48, 4],
            [
                [0, 1, 2, 3, 0],
                [4, 2, 1, 5, 0],
                [2, 6, 3, 0],
                [4, 6, 2, 0],
                [7, 1, 0, 1],
                [7, 5, 1, 1],
                [8, 9, 10, 11, 2],
                [11, 10, 9, 8, 2],
                [12, 13, 14, 15, 2],
                [15, 14, 13, 12, 2],
                [16, 17, 18, 19, 2],
                [19, 18, 17, 16, 2],
                [20, 21, 22, 23, 2],
                [23, 22, 21, 20, 2],
                [24, 25, 26, 27, 1],
                [27, 26, 25, 24, 1],
                [28, 29, 30, 31, 1],
                [31, 30, 29, 28, 1],
                [32, 29, 30, 33, 1],
                [33, 30, 29, 32, 1],
                [34, 24, 27, 35, 1],
                [35, 27, 24, 34, 1],
                [34, 28, 31, 35, 1],
                [35, 31, 28, 34, 1],
                [32, 25, 26, 33, 1],
                [33, 26, 25, 32, 1],
                [36, 37, 38, 39, 1],
                [39, 38, 37, 36, 1],
                [40, 41, 42, 43, 1],
                [43, 42, 41, 40, 1],
                [44, 41, 42, 45, 1],
                [45, 42, 41, 44, 1],
                [46, 36, 39, 47, 1],
                [47, 39, 36, 46, 1],
                [46, 40, 43, 47, 1],
                [47, 43, 40, 46, 1],
                [44, 37, 38, 45, 1],
                [45, 38, 37, 44, 1],
                [48, 49, 50, 51, 1],
                [52, 53, 54, 55, 1],
                [56, 48, 51, 57, 1],
                [57, 58, 59, 60, 1],
                [55, 50, 49, 61, 1],
                [57, 51, 50, 55, 54, 58, 3],
                [62, 63, 64, 65, 66, 67, 3],
                [64, 63, 68, 69, 1],
                [62, 67, 70, 71, 1],
                [65, 64, 69, 72, 1],
                [73, 74, 66, 65, 1],
                [75, 68, 63, 62, 1],
                [61, 56, 76, 77, 2],
                [78, 79, 72, 75, 2],
                [80, 81, 82, 83, 4],
                [83, 82, 84, 85, 4],
                [85, 84, 81, 80, 4],
                [86, 87, 88, 89, 4],
                [89, 88, 90, 91, 4],
                [91, 90, 87, 86, 4],
                [92, 93, 94, 95, 4],
                [95, 94, 93, 92, 4],
                [96, 97, 98, 99, 4],
                [99, 98, 97, 96, 4],
                [100, 101, 94, 95, 4],
                [95, 94, 101, 100, 4],
                [102, 103, 98, 99, 4],
                [99, 98, 103, 102, 4],
                [71, 52, 61, 75, 2],
                [72, 5, 7, 73, 2],
                [0, 56, 60, 7, 2],
                [104, 79, 78, 2],
                [77, 76, 105, 2],
                [78, 75, 104, 2],
                [105, 61, 77, 2],
                [104, 72, 79, 2],
                [76, 56, 105, 2],
                [75, 61, 105, 104, 1],
                [56, 0, 3, 6, 105, 1],
                [5, 72, 104, 6, 4, 1],
                [105, 6, 104, 1],
                [106, 107, 108, 109, 5],
                [58, 54, 53, 59, 1],
                [107, 59, 53, 108, 2],
                [74, 70, 67, 66, 1],
                [74, 106, 109, 70, 2],
                [73, 60, 59, 74, 2],
                [70, 53, 52, 71, 2]
        ],
        ["#111111", "#AA2222", "#666666", "#EEAAAA", "#333333", "#222222"]
    ];
}

//-- mjs library -----------------------------------------------------------------

export function V3_mul4x4(m, v, r) {
    if (r == undefined)  r = new Array(3);

    let v0 = v[0];
    let v1 = v[1];
    let v2 = v[2];
    let w = v0 * m[3] + v1 * m[7] + v2 * m[11] + m[15];

    r[0] = (v0 * m[0] + v1 * m[4] + v2 * m[8] + m[12]) / w;
    r[1] = (v0 * m[1] + v1 * m[5] + v2 * m[9] + m[13]) / w;
    r[2] = (v0 * m[2] + v1 * m[6] + v2 * m[10] + m[14]) / w;

    return r;
}

export function V3_add(a, b, r) {
    if (r == undefined) r = new Array(3);

    r[0] = a[0] + b[0];
    r[1] = a[1] + b[1];
    r[2] = a[2] + b[2];

    return r;
}

export function V3_normal(a, b, c, r) {
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const a0 = a[0] - b0;
    const a1 = a[1] - b1;
    const a2 = a[2] - b2;
    const c0 = c[0] - b0;
    const c1 = c[1] - b1;
    const c2 = c[2] - b2;

    r[0] = a1 * c2 - a2 * c1;
    r[1] = a2 * c0 - a0 * c2;
    r[2] = a0 * c1 - a1 * c0;
}

export function V3_length(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function V3_normalize(a, r) {
    if (r == undefined) r = new Array(3);

    let im = 1.0 / V3_length(a);
    r[0] = a[0] * im;
    r[1] = a[1] * im;
    r[2] = a[2] * im;

    return r;
}

export function V3_scale(a, k, r) {
    if (r == undefined) r = new Array(3);

    r[0] = a[0] * k;
    r[1] = a[1] * k;
    r[2] = a[2] * k;

    return r;
}

export function V3_neg(a, r) {
    if (r == undefined) r = new Array(3);

    r[0] = -a[0];
    r[1] = -a[1];
    r[2] = -a[2];
    
    return r;
}

//-- M4x4 ----------------------------------------------------------------------------------

export const M4x4_I = [1.0, 0.0, 0.0, 0.0,
                       0.0, 1.0, 0.0, 0.0,
                       0.0, 0.0, 1.0, 0.0,
                       0.0, 0.0, 0.0, 1.0];


export function M4x4_clone(m) {
    return [...m];
}

export function M4x4_rotate(angle, axis, m, r) {
    if (r == undefined) r = new Array(16);

    const a0 = axis[0];
    const a1 = axis[1];
    const a2 = axis[2];
    const l = Math.sqrt(a0 * a0 + a1 * a1 + a2 * a2);

    let x = a0;
    let y = a1;
    let z = a2;

    if (l != 1.0) {
        const im = 1.0 / l;
        x *= im;
        y *= im;
        z *= im;
    }

    const c = Math.cos(angle);
    const c1 = 1 - c;
    const s = Math.sin(angle);
    const xs = x * s;
    const ys = y * s;
    const zs = z * s;
    const xyc1 = x * y * c1;
    const xzc1 = x * z * c1;
    const yzc1 = y * z * c1;

    const m11 = m[0];
    const m21 = m[1];
    const m31 = m[2];
    const m41 = m[3];
    const m12 = m[4];
    const m22 = m[5];
    const m32 = m[6];
    const m42 = m[7];
    const m13 = m[8];
    const m23 = m[9];
    const m33 = m[10];
    const m43 = m[11];

    const t11 = x * x * c1 + c;
    const t21 = xyc1 + zs;
    const t31 = xzc1 - ys;
    const t12 = xyc1 - zs;
    const t22 = y * y * c1 + c;
    const t32 = yzc1 + xs;
    const t13 = xzc1 + ys;
    const t23 = yzc1 - xs;
    const t33 = z * z * c1 + c;

    r[0] = m11 * t11 + m12 * t21 + m13 * t31;
    r[1] = m21 * t11 + m22 * t21 + m23 * t31;
    r[2] = m31 * t11 + m32 * t21 + m33 * t31;
    r[3] = m41 * t11 + m42 * t21 + m43 * t31;
    r[4] = m11 * t12 + m12 * t22 + m13 * t32;
    r[5] = m21 * t12 + m22 * t22 + m23 * t32;
    r[6] = m31 * t12 + m32 * t22 + m33 * t32;
    r[7] = m41 * t12 + m42 * t22 + m43 * t32;
    r[8] = m11 * t13 + m12 * t23 + m13 * t33;
    r[9] = m21 * t13 + m22 * t23 + m23 * t33;
    r[10] = m31 * t13 + m32 * t23 + m33 * t33;
    r[11] = m41 * t13 + m42 * t23 + m43 * t33;

    if (r != m) {
        r[12] = m[12];
        r[13] = m[13];
        r[14] = m[14];
        r[15] = m[15];
    }

    return r;
}

export function M4x4_rotateX(angle, m, r) {
    if (r == undefined) r = new Array(16);

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const a12 = m[4];
    const a22 = m[5];
    const a32 = m[6];
    const a42 = m[7];
    const a13 = m[8];
    const a23 = m[9];
    const a33 = m[10];
    const a43 = m[11];

    r[0] = m[0];
    r[1] = m[1];
    r[2] = m[2];
    r[3] = m[3];
    r[4] = a12 * c - a13 * s;
    r[5] = a22 * c - a23 * s;
    r[6] = a32 * c - a33 * s;
    r[7] = a42 * c - a43 * s;
    r[8] = a12 * s + a13 * c;
    r[9] = a22 * s + a23 * c;
    r[10] = a32 * s + a33 * c;
    r[11] = a42 * s + a43 * c;
    r[12] = m[12];
    r[13] = m[13];
    r[14] = m[14];
    r[15] = m[15];

    return r;
}

export function M4x4_rotateY(angle, m, r) {
    if (r == undefined) r = new Array(16);

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const a11 = m[0];
    const a21 = m[1];
    const a31 = m[2];
    const a41 = m[3];
    const a13 = m[8];
    const a23 = m[9];
    const a33 = m[10];
    const a43 = m[11];

    r[0] = a11 * c + a13 * s;
    r[1] = a21 * c + a23 * s;
    r[2] = a31 * c + a33 * s;
    r[3] = a41 * c + a43 * s;
    r[4] = m[4];
    r[5] = m[5];
    r[6] = m[6];
    r[7] = m[7];
    r[8] = a13 * c - a11 * s;
    r[9] = a23 * c - a21 * s;
    r[10] = a33 * c - a31 * s;
    r[11] = a43 * c - a41 * s;
    r[12] = m[12];
    r[13] = m[13];
    r[14] = m[14];
    r[15] = m[15];

    return r;
}

export function M4x4_rotateZ(angle, m, r) {
    if (r == undefined) r = new Array(16);

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const a11 = m[0];
    const a21 = m[1];
    const a31 = m[2];
    const a41 = m[3];
    const a12 = m[4];
    const a22 = m[5];
    const a32 = m[6];
    const a42 = m[7];

    r[0] = a11 * c - a12 * s;
    r[1] = a21 * c - a22 * s;
    r[2] = a31 * c - a32 * s;
    r[3] = a41 * c - a42 * s;
    r[4] = a11 * s + a12 * c;
    r[5] = a21 * s + a22 * c;
    r[6] = a31 * s + a32 * c;
    r[7] = a41 * s + a42 * c;
    r[8] = m[8];
    r[9] = m[9];
    r[10] = m[10];
    r[11] = m[11];
    r[12] = m[12];
    r[13] = m[13];
    r[14] = m[14];
    r[15] = m[15];

    return r;
}

export function M4x4_translate3(v, m, r) {
    const x = v[0];
    const y = v[1];
    const z = v[2];

    if (r == m) {
        m[12] += m[0] * x + m[4] * y + m[8] * z;
        m[13] += m[1] * x + m[5] * y + m[9] * z;
        m[14] += m[2] * x + m[6] * y + m[10] * z;
        m[15] += m[3] * x + m[7] * y + m[11] * z;
        return m;
    }

    if (r == undefined) r = new Array(16);

    const m11 = m[0];
    const m21 = m[1];
    const m31 = m[2];
    const m41 = m[3];
    const m12 = m[4];
    const m22 = m[5];
    const m32 = m[6];
    const m42 = m[7];
    const m13 = m[8];
    const m23 = m[9];
    const m33 = m[10];
    const m43 = m[11];

    r[0] = m11;
    r[1] = m21;
    r[2] = m31;
    r[3] = m41;
    r[4] = m12;
    r[5] = m22;
    r[6] = m32;
    r[7] = m42;
    r[8] = m13;
    r[9] = m23;
    r[10] = m33;
    r[11] = m43;
    r[12] = m11 * x + m12 * y + m13 * z + m[12];
    r[13] = m21 * x + m22 * y + m23 * z + m[13];
    r[14] = m31 * x + m32 * y + m33 * z + m[14];
    r[15] = m41 * x + m42 * y + m43 * z + m[15];

    return r;
}