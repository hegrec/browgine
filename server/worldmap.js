/**
 * The worldmap
 * Each value in tileMap counts as a Vec2(1,1) size square
 * Only square maps are supported
 * @param size
 * @constructor
 */
function WorldMap() {
    this.tileMap = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,1,0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,0,1,1,0,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,0,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,1,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    this.centerIndex = Math.floor(this.tileMap.length / 2);
}

WorldMap.prototype.getTileAtPos = function(vec) {
    var x = this.centerIndex + Math.floor(vec.x+0.5);
    var y = this.centerIndex - Math.floor(vec.y+0.5);
    if (!this.tileMap[y]) {
        return null;
    }

    return this.tileMap[y][x];
};

WorldMap.prototype.getTileMap = function() {
    return this.tileMap;
};

module.exports = WorldMap;