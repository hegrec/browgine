/**
 * Get a basic input object for player movement commands
 * @constructor
 */
function Input() {
    this.up = 0;
    this.down = 0;
    this.left = 0;
    this.right = 0;
    this.jump = 0;
    this.use = 0;
    this.attack = 0;
    this.aimVector = {x: 0, y: 0};
}

module.exports = Input;