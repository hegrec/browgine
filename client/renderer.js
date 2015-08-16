var Vec2 = require('vector2-node');

function Renderer(width, height) {
    this.width = width;
    this.height = height;
    this.mapData = [];
    //texture cache
    this.textures = {};
    this.unitPixelSize = 64; //Vec2(1, 1) is 64x64 pixels

    this.renderer = new PIXI.WebGLRenderer(this.width, this.height);
    document.getElementById('game').appendChild(this.renderer.view);

    this.unitPixelSize = 64; //Vec2(1, 1) is 64x64 pixels

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

Renderer.prototype.getRenderer = function() {
    return this.renderer.view;
};

Renderer.prototype.createText = function(str, opts, parent) {
    opts = opts || {
        size: 16,
        font: 'Arial',
        stroke: 0,
        strokeSize: 0
    };

    var fontSize = opts.size,
        fontFamily = opts.font,
        color = opts.color,
        stroke = opts.stroke,
        strokeSize = opts.strokeSize;

    var text = new PIXI.Text(str, {
        font: fontSize + 'px ' + fontFamily,
        fill: color,
        stroke: stroke,
        strokeThickness: strokeSize
    });

    parent = parent || this.stage;

    parent.addChild(text);

    return text;
};

Renderer.prototype.getTexture = function(path) {
    if (this.textures[path] == null) {
        this.textures[path] = PIXI.Texture.fromImage(path);
    }

    return this.textures[path];
};

Renderer.prototype.addEntity = function (entity) {
    this.entityLayer.addChild(entity.entityRenderable);
};

Renderer.prototype.removeEntity = function (entity) {
    this.entityLayer.removeChild(entity.entityRenderable);
};

Renderer.prototype.getMouseWorldPos = function () {
    var mouseScreenPos = this.interaction.mouse.global;
    var x = (mouseScreenPos.x - this.gameLayer.x) / this.unitPixelSize;
    var y = (this.gameLayer.y - mouseScreenPos.y) / this.unitPixelSize;

    return new Vec2(x, y);
};

Renderer.prototype.worldToScreen = function(vec) {
    return new Vec2(
        (-vec.x * this.unitPixelSize),
        (vec.y * this.unitPixelSize)
    );
};

Renderer.prototype.renderWorld = function(data) {
    var middle = data.length / 2;
    var self = this;
    data.forEach(function(row, y) {
        row.forEach(function (value, x) {
            var xCenter = (x - middle) * self.unitPixelSize;
            var yCenter = (y - middle) * self.unitPixelSize;

            var r = 0;
            var g = 150;
            var b = 0;

            if (value === 0) {
                r = 255;
                g = 255;
                b = 255;
            }

            var color = (b) | (g << 8) | (r << 16);
            var entityRenderable = new PIXI.Graphics();
            entityRenderable.beginFill(color);
            entityRenderable.drawRect(0, 0, self.unitPixelSize, self.unitPixelSize);
            entityRenderable.endFill();

            entityRenderable.position.x = xCenter;
            entityRenderable.position.y = yCenter;

            self.mapLayer.addChild(entityRenderable);

            self.mapData.push(entityRenderable);
        });
    });
};

Renderer.prototype.render = function(cameraPos) {
    this.gameLayer.position.x = -cameraPos.x*this.unitPixelSize + this.width / 2;
    this.gameLayer.position.y = cameraPos.y*this.unitPixelSize + this.height / 2;
    this.renderer.render(this.stage);
};

module.exports = Renderer;