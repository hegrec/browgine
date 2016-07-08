import Vec2 from 'vector2-node';
import Input from './../input';

const MESSAGE_NAME = 'playerInput';

function shorten(value) {
    return Math.round(value * 100) / 100;
}

export default class NetPlayerInput {
    constructor(input) {
        this.up = input.up;
        this.down = input.down;
        this.left = input.left;
        this.right = input.right;
        this.aimVector = new Vec2(shorten(input.aimVector.x), shorten(input.aimVector.y));
        this.attack = input.attack;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMessagePayload() {
        return [this.getInput()];
    }

    getInput() {
        const input = new Input();

        input.up = this.up;
        input.down = this.down;
        input.left = this.left;
        input.right = this.right;
        input.attack = this.attack;
        input.aimVector = this.aimVector;

        return input;
    }
}
