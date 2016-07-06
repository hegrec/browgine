import Vec2 from 'vector2-node';

const MESSAGE_NAME = 'playerInput';

function shorten(value) {
    return Math.round(value * 100) / 100;
}

export default class NetPlayerInput {
    constructor() {
        const input = arguments[0];
        this.up = shorten(input.up);
        this.down = shorten(input.down);
        this.left = shorten(input.left);
        this.right = shorten(input.right);
        this.aimVector = new Vec2(input.aimVector.x, input.aimVector.y);
        this.attack = shorten(input.attack);
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMessagePayload() {
        return this.getInput();
    }

    getInput() {
        return {
            up: this.up,
            down: this.down,
            left: this.left,
            right: this.right,
            attack: this.attack,
            aimVector: this.aimVector
        };
    }
}
