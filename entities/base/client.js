var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

var BaseClientEntity = _.merge(BaseSharedEntity, {

    init: function() {},

    setTexture: function (texturePath) {
        var textureData = PIXI.Texture.fromImage(texturePath);
        var entityGraphic = new PIXI.Sprite(textureData);
        this.entityRenderable.addChild(entityGraphic);
        entityGraphic.anchor.x = 0.5;
        entityGraphic.anchor.y = 0.5;

        entityGraphic.click = function(data) {

            console.log("CLICKED!");
            console.log(data);
        };

        this.entityRenderable.graphic = entityGraphic;
    }
});

module.exports = BaseClientEntity;
