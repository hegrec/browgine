let Vec2 = require('vector2-node');

export default class Renderer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.mapData = [];
        //texture cache
        this.textures = {};
        this.unitPixelSize = 32; //Vec2(1, 1) is 64x64 pixels

        this.renderer = new PIXI.WebGLRenderer(this.width, this.height);
        document.getElementById('game').appendChild(this.renderer.view);

        this.unitPixelSize = 32; //Vec2(1, 1) is 64x64 pixels

        // Does not move, fixed position (This is the HUD)
        this.stage = new PIXI.Container();
        this.interaction = new PIXI.interaction.InteractionManager(this.renderer);

        // Moves the game world as camera position changes
        this.gameLayer = new PIXI.Container();
        this.mapLayer = new PIXI.Container();
        this.entityLayer = new PIXI.Container();

        this.stage.addChild(this.gameLayer);
        this.gameLayer.addChild(this.mapLayer);
        this.gameLayer.addChild(this.entityLayer);
    }

    getRenderer() {
        return this.renderer.view;
    }

    createText(str, opts, parent) {
        opts = opts || {
                size: 16,
                font: 'Arial',
                stroke: 0,
                strokeSize: 0
            };

        let fontSize = opts.size,
            fontFamily = opts.font,
            color = opts.color,
            stroke = opts.stroke,
            strokeSize = opts.strokeSize;

        let text = new PIXI.Text(str, {
            font: fontSize + 'px ' + fontFamily,
            fill: color,
            stroke: stroke,
            strokeThickness: strokeSize
        });

        parent = parent || this.stage;

        parent.addChild(text);

        return text;
    }

    getTexture(path) {
        if (this.textures[path] == null) {
            this.textures[path] = PIXI.Texture.fromImage(path);
        }

        return this.textures[path];
    }

    addEntity(entity) {
        this.entityLayer.addChild(entity.entityRenderable);
    }

    removeEntity(entity) {
        this.entityLayer.removeChild(entity.entityRenderable);
    }

    getMouseWorldPos() {
        let mouseScreenPos = this.interaction.mouse.global;
        let x = (mouseScreenPos.x - this.gameLayer.x) / this.unitPixelSize;
        let y = (this.gameLayer.y - mouseScreenPos.y) / this.unitPixelSize;

        return new Vec2(x, y);
    }

    worldToScreen(vec) {
        return new Vec2(
            (-vec.x * this.unitPixelSize),
            (vec.y * this.unitPixelSize)
        );
    }

    renderWorld(data) {
        let middle = data.length / 2;
        data.forEach((row, y) => {
            row.forEach((value, x) => {
                let xCenter = (x - middle) * this.unitPixelSize;
                let yCenter = (y - middle) * this.unitPixelSize;

                let r = 0;
                let g = 150;
                let b = 0;

                if (value === 0) {
                    r = 255;
                    g = 255;
                    b = 255;
                }

                let color = (b) | (g << 8) | (r << 16);
                let entityRenderable;
                if (value === 1) {
                    var textureData = PIXI.Texture.fromImage('/images/grass.png');
                    entityRenderable = new PIXI.Container();
                    entityRenderable.addChild(new PIXI.Sprite(textureData));


                } else {

                    entityRenderable = new PIXI.Graphics();
                    entityRenderable.beginFill(color);
                    entityRenderable.drawRect(0, 0, this.unitPixelSize, this.unitPixelSize);
                    entityRenderable.endFill();
                }

                entityRenderable.position.x = xCenter;
                entityRenderable.position.y = yCenter;

                this.mapLayer.addChild(entityRenderable);

                this.mapData.push(entityRenderable);
            });
        });
    }

    render(cameraPos) {
        this.gameLayer.position.x = -cameraPos.x * this.unitPixelSize + this.width / 2;
        this.gameLayer.position.y = cameraPos.y * this.unitPixelSize + this.height / 2;
        this.renderer.render(this.stage);
    }
}
