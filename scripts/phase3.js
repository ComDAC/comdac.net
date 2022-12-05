import * as site from "./site.js";
import * as stats from "./stats.js";

const vertexShaderCode = `
    attribute vec2 spritePosition; 
    uniform vec2 screenSize; 

    void main() {
        vec4 screenTransform = vec4(2.0 / screenSize.x, -2.0 / screenSize.y, -1.0, 1.0);
        gl_Position = vec4(spritePosition * screenTransform.xy + screenTransform.zw, 1.0, 1.0);
        gl_PointSize = 48.0;
    }
`;
 
const fragmentShaderCode = `
    uniform sampler2D spriteTexture;

    void main() {
        gl_FragColor = texture2D(spriteTexture, gl_PointCoord);
    }
`;

class page {
    stats;
    gl;
    shaderProgram;
    textureFiles = ["../images/db1.png","../images/db2.png","../images/db3.png","../images/db4.png","../images/db5.png","../images/db6.png","../images/db7.png"];
    glTexture = [7];
    ballMul = 10;
    balls = [];
    lastFrame = 0;

    dom = {
        divCanvas: null,
        cnvs: null,
        divLoadingMessage: null
    };

    createShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if (success) {
          return shader;
        }
       
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if (success) {
          return program;
        }

        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }

    loadTexture(gl, image) {
        const texture = gl.createTexture();
    
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    
        return texture;
    }

    radQuarter = Math.PI / 2;
    rad3Quarter = (3 * Math.PI) / 2;
    radFull = Math.PI * 2;
    padding = 24;

    initBalls() {
        const totalBalls = this.textureFiles.length * this.ballMul;

        for(let i=0; i<totalBalls; i++) {
            this.balls.push({
                x: Math.random() * this.gl.canvas.width,
                y: Math.random() * this.gl.canvas.height,
                vel: (Math.random() * 0.3) + 0.1,
                dir: Math.random() * this.radFull,
                closest: null
            });
        }
    }

    processBalls(time) {
        this.balls.forEach(b => {

            let closest = this.balls.find(bf => {
                return ((bf !== b) && (bf != b.closest) && ((Math.sqrt(Math.pow(bf.x - b.x,2) + Math.pow(bf.y - b.y,2))) < 48));  
            });

            if (closest != null) {
                b.dir = this.clipRadian(b.dir - closest.dir);
                closest.dir = this.clipRadian(closest.dir - b.dir);
                b.closest = closest;
                closest.closest = b;                
            }

            if ((b.x < this.padding) && (b.dir > this.radQuarter) && (b.dir < this.rad3Quarter)) {
                b.dir = this.bounceHorizontal(b.dir);
            }

            if ((b.x > (this.gl.canvas.width - this.padding)) && ((b.dir < this.radQuarter) || (b.dir > this.rad3Quarter))) {
                b.dir = this.bounceHorizontal(b.dir);
            }

            if ((b.y < this.padding) && ((b.dir > Math.PI) && (b.dir < this.radFull))) {
                b.dir = this.bounceVertical(b.dir);
            }

            if ((b.y > (this.gl.canvas.height - this.padding)) && (b.dir < Math.PI) && (b.dir > 0)) {
                b.dir = this.bounceVertical(b.dir);
            }

            this.applyMotion(b, time);
        });
    }

    bounceHorizontal(dir) {
        if (dir > Math.PI) {
            dir = (this.rad3Quarter - dir) + this.rad3Quarter;
        } else if (dir < Math.PI) {
            dir = this.radQuarter - (dir - this.radQuarter);
        } else {
            dir += Math.PI;
        }

        return this.clipRadian(dir);
    }

    bounceVertical(dir) {
        if (dir > this.radQuarter) {
            dir = this.radFull - dir;
        } else if (dir < this.radQuarter) {
            dir = (Math.PI - dir) + Math.PI;
        } else {
            dir += Math.PI;
        }

        return this.clipRadian(dir);
    }

    clipRadian(r) {
        if (r < 0) {
            r += this.radFull;
        } else if (r > this.radFull) {
            r -= this.radFull;
        }

        return r;
    }

    getX(b) {
        return b.vel * Math.cos(b.dir);
    }

    getY(b) {
        return b.vel * Math.sin(b.dir);
    }

    applyMotion(b, time) {
        b.x += this.getX(b) * time;
        b.y += this.getY(b) * time;
    }

    updatePointsArray(gl, points, shaderProgram, name) {
        const glBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);

        const loc = gl.getAttribLocation(shaderProgram, name);

        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    loop = (ct) => {
        requestAnimationFrame(this.loop);

        this.stats.begin();

        const ms = ct - this.lastFrame;
        this.lastFrame = ct;
        
        this.processBalls(ms);

        const points = new Float32Array(this.balls.length * 2);

        this.balls.forEach((b, i) => {
            points[i*2] = Math.round(b.x);
            points[i*2+1] = Math.round(b.y);
        });
        
        this.updatePointsArray(this.gl, points, this.shaderProgram, "spritePosition");

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        for (let i = 0; i < this.glTexture.length; i++) {            
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture[i]);

            this.gl.drawArrays(this.gl.POINTS, i * this.ballMul, this.ballMul);
        }

        this.stats.end();
    } 

    initTextures(done) {
        let loadCounter = 0;

        this.textureFiles.forEach((tf, i) => {
            loadCounter++;

            const img = new Image();
            img.src = tf;

            img.onload = () => {
                this.glTexture[i] = this.loadTexture(this.gl, img);

                loadCounter--;
                if (loadCounter === 0) {
                    done();
                }
            };
        });
    }

    init(done) {        
        const vertexShader = this.createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderCode);
        const fragmentShader = this.createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderCode);

        this.shaderProgram = this.createProgram(this.gl, vertexShader, fragmentShader);

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.clearColor(0, 0, 0, 1);

        this.gl.useProgram(this.shaderProgram);

        this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "screenSize"), this.gl.canvas.width, this.gl.canvas.height);

        this.gl.useProgram(this.shaderProgram);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);   

        this.initBalls();

        this.initTextures(done);
    }
    
    //-- entry points ----------------------------

    onLoad = () => {
        this.stats = stats.init();
 
        this.gl = this.dom.cnvs.getContext("webgl");

        this.gl.canvas.width = this.dom.divCanvas.clientWidth;
        this.gl.canvas.height = this.dom.divCanvas.clientHeight;

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.init(() => {
            this.dom.divLoadingMessage.style.display = "none";

            requestAnimationFrame(this.loop);
        });
    }

    onResize = () => {
        this.gl.canvas.width = this.dom.divCanvas.clientWidth;
        this.gl.canvas.height = this.dom.divCanvas.clientHeight;
        
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "screenSize"), this.gl.canvas.width, this.gl.canvas.height);
    }
}

site.registerPage(page);