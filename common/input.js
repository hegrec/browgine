
export default class Input {
    constructor() {
        this.up = 0;
        this.down = 0;
        this.left = 0;
        this.right = 0;
        this.use = 0;
        this.attack = 0;
        this.aimVector = {x: 0, y: 0};
    }

    toString() {
        return this.up + ':' +
            this.down + ':' +
            this.left + ':' +
            this.right + ':' +
            this.use + ':' +
            this.aimVector.x + ':' +
            this.aimVector.y + ':' +
            this.attack;
    }
}
