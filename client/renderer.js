let Vec2 = require('vector2-node');

export default class Renderer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.mapData = [];
        //texture cache
        this.textures = {};
        this.unitPixelSize = 64; //Vec2(1, 1) is X by Y pixels

        this.renderer = new PIXI.WebGLRenderer(this.width, this.height);
        document.getElementById('game').appendChild(this.renderer.view);

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
        var texture = entity.getTexture() || 'box.jpg';

        var textureData = this.getTexture(texture);
        var entityGraphic = new PIXI.Sprite(textureData);

        entity.entityRenderable = new PIXI.Container();
        entity.entityRenderable.addChild(entityGraphic);

        entityGraphic.anchor.x = 0.5;
        entityGraphic.anchor.y = 0.5;

        entity.entityRenderable.graphic = entityGraphic;

        this.entityLayer.addChild(entity.entityRenderable);
    }

    updateRenderable(updatedEntity) {
        const newPos = updatedEntity.getPos();

        updatedEntity.entityRenderable.x = newPos.x * this.unitPixelSize;
        updatedEntity.entityRenderable.y = -newPos.y * this.unitPixelSize;

        updatedEntity.entityRenderable.graphic.rotation = Math.PI - updatedEntity.getAngle();

        let debugString = "Pos: (" + newPos.x + ', ' + newPos.y + ')';
        debugString += '\r\nAng: ' + updatedEntity.getAngleDegrees().toPrecision(6);
        debugString += '\r\nID : ' + updatedEntity.uniqueId;

        updatedEntity.debugText.text = debugString;

        updatedEntity.debugLines.clear();
        updatedEntity.debugLines.beginFill(0x00FF00);
        updatedEntity.debugLines.lineStyle(5, 0x00FF00, 1);
        let mesh = updatedEntity.getLocalMesh();


        mesh.forEach((vertex, index) => {
            let screenPos = this.worldToScreen(vertex);
            let nextPos = this.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
            updatedEntity.debugLines.moveTo(screenPos.x, screenPos.y);
            updatedEntity.debugLines.lineTo(nextPos.x, nextPos.y);
        });

        updatedEntity.debugLines.endFill();

        updatedEntity.aabbDebug.clear();
        updatedEntity.aabbDebug.beginFill(0xFF00FF);
        updatedEntity.aabbDebug.lineStyle(2, 0xFF00FF, 1);
        let aabb = updatedEntity.getLocalAABB();

        let vec1 = this.worldToScreen(aabb.min);
        let vec2 = this.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
        let vec3 = this.worldToScreen(aabb.max);
        let vec4 = this.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));
        updatedEntity.aabbDebug.moveTo(vec1.x, vec1.y);
        updatedEntity.aabbDebug.lineTo(vec2.x, vec2.y);

        updatedEntity.aabbDebug.moveTo(vec2.x, vec2.y);
        updatedEntity.aabbDebug.lineTo(vec3.x, vec3.y);

        updatedEntity.aabbDebug.moveTo(vec3.x, vec3.y);
        updatedEntity.aabbDebug.lineTo(vec4.x, vec4.y);

        updatedEntity.aabbDebug.moveTo(vec4.x, vec4.y);
        updatedEntity.aabbDebug.lineTo(vec1.x, vec1.y);

        updatedEntity.aabbDebug.endFill();
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

    debugEntity(entity) {
        let opts = {
            font: 'Arial',
            size: 16,
            strokeSize: 2,
            stroke: 0xffffff,
            color: 0
        };

        let debugLines = new PIXI.Graphics();
        let mesh = entity.getLocalMesh();

        debugLines.beginFill(0x00FF00);
        debugLines.lineStyle(5, 0x00FF00, 1);

        mesh.forEach((vertex, index) => {
            let screenPos = this.worldToScreen(vertex);
            let nextPos = this.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
            debugLines.moveTo(screenPos.x, screenPos.y);
            debugLines.lineTo(nextPos.x, nextPos.y);
        });

        debugLines.endFill();

        entity.debugLines = debugLines;
        entity.entityRenderable.addChild(debugLines);


        let debugLines2 = new PIXI.Graphics();
        let aabb = entity.getLocalAABB();

        let vec1 = this.worldToScreen(aabb.min);
        let vec2 = this.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
        let vec3 = this.worldToScreen(aabb.max);
        let vec4 = this.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));


        debugLines2.beginFill(0xFF0000);
        debugLines2.lineStyle(2, 0xFF0000, 1);

        debugLines2.moveTo(vec1.x, vec1.y);
        debugLines2.lineTo(vec2.x, vec2.y);

        debugLines2.moveTo(vec2.x, vec2.y);
        debugLines2.lineTo(vec3.x, vec3.y);

        debugLines2.moveTo(vec3.x, vec3.y);
        debugLines2.lineTo(vec4.x, vec4.y);

        debugLines2.moveTo(vec4.x, vec4.y);
        debugLines2.lineTo(vec1.x, vec1.y);

        debugLines2.endFill();

        entity.aabbDebug = debugLines2;
        entity.entityRenderable.addChild(debugLines2);

        let debugString = "Pos: (" + entity.getPos().x + ', ' + entity.getPos().y + ')';

        entity.debugText = this.createText(debugString, opts, entity.entityRenderable);
        entity.debugText.position.y = 16;

    }

    render(cameraPos) {
        this.gameLayer.position.x = -cameraPos.x * this.unitPixelSize + this.width / 2;
        this.gameLayer.position.y = cameraPos.y * this.unitPixelSize + this.height / 2;
        this.renderer.render(this.stage);
    }
}
