var Input = require('./../../common/input'),
    Vec2 = require('vector2-node');

var Player = {
    baseClass: "base",

    init: function () {
        this.lastInputTime = Date.now();
        this.input = new Input();
        this.lastAttackTime = 0;
        this.walkVelocity = new Vec2(0, 0);
        this.attackDelay = 500;
        this.name = "Unnamed Player";
    },
    getAimVector: function () {
        return this.input.aimVector.copy();
    },

    getName: function () {
        return this.name
    },

    setName: function (newName) {
        this.name = newName;
    },

    getVelocity: function () {
        return this.physicsState.velocity.copy().add(this.walkVelocity);
    },

    isPlayer: function () {
        return true;
    },

    physicsSimulate: function () {
        var position = new Vec2(0, 0),
            distance = 5;

        if (this.input.down)
        {
            position.y -= distance;
        }

        if (this.input.up)
        {
            position.y += distance;
        }

        if (this.input.right)
        {
            position.x += distance;
        }

        if (this.input.left)
        {
            position.x -= distance;
        }

        this.walkVelocity = position;

        //players don't create a force, but instead set velocity directly
        return new Vec2(0, 0);
    }
};

module.exports = Player;
