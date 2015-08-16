var Vec2 = require('vector2-node');

function PhysicsState() {
    this.position = new Vec2();
    this.momentum = new Vec2();
    this.angle = 0;
    this.angularMomentum = 0;

    this.velocity = new Vec2();
    this.angularVelocity = 0;
    this.spin = 0;

    this.size = 1;
    this.mass = 1;
    this.inverseMass = 1;
    this.inertia = 1;
    this.inverseInertia = 1;

    this.time = 0;
    this.elasticity = 0.5;

    this.vertices = [
        new Vec2(-0.5, 0.5),
        new Vec2(0.5, 0.5),
        new Vec2(0.5, -0.5),
        new Vec2(-0.5, -0.5)
    ];

    var minX = 99999,
        maxX = -99999,
        minY = 99999,
        maxY = -99999;

    this.vertices.forEach(function(vertex) {
        if (vertex.x < minX) {
            minX = vertex.x;
        }

        if (vertex.x > maxX) {
            maxX = vertex.x;
        }

        if (vertex.y < minY) {
            minY = vertex.y;
        }

        if (vertex.y > maxY) {
            maxY = vertex.y;
        }
    });

    this.halfHeight = (maxY - minY) / 2;
    this.halfWidth = (maxX - minX) / 2;

    this.aabbMin = new Vec2(0, 0);
    this.aabbMax = new Vec2(0, 0);

}

PhysicsState.prototype.clone = function(physicsState) {
    var cloneState = new PhysicsState();
    cloneState.position = this.position.clone();
    cloneState.momentum = this.momentum.clone();
    cloneState.angle = this.angle;
    cloneState.velocity = this.velocity.clone();

    return cloneState;
};

PhysicsState.prototype.setMass = function(newMass) {
    this.mass = newMass;
    this.inverseMass = 1 / newMass;
};
PhysicsState.prototype.recalculate = function() {
    this.velocity.x = this.momentum.x * this.inverseMass;
    this.velocity.y = this.momentum.y * this.inverseMass;

    this.angularVelocity = this.angularMomentum * this.inverseInertia;
    this.buildAABB();
};

PhysicsState.prototype.getMesh = function () {
    var copy = [],
        self = this;

    this.vertices.forEach(function(vertex) {
        var vert = vertex.copy();
        vert.rotate(self.angle);
        vert = vert.add(self.position);

        copy.push(vert);
    });

    return copy;
};

PhysicsState.prototype.getLocalMesh = function () {
    var copy = [],
        self = this;

    this.vertices.forEach(function(vertex) {
        var vert = vertex.copy();
        vert.rotate(self.angle);

        copy.push(vert);
    });

    return copy;
};

PhysicsState.prototype.buildAABB = function () {
    var orientation = this.angle;
    var sin_o = Math.sin(orientation);
    var cos_o = Math.cos(orientation);
    var corner1x = -this.halfWidth;
    var corner2x = this.halfWidth;
    var corner1y = -this.halfHeight;
    var corner2y = this.halfHeight;


    var xformed1x = corner1x * cos_o - corner1y * sin_o;
    var xformed2x = corner1x * sin_o + corner1y * cos_o;
    var xformed1y = corner2x * cos_o - corner2y * sin_o;
    var xformed2y = corner2x * sin_o + corner2y * cos_o;

    var ex = Math.max(Math.abs(xformed1x), Math.abs(xformed2x));
    var ey = Math.max(Math.abs(xformed1y), Math.abs(xformed2y));

    this.aabbMin.x = -ex;
    this.aabbMin.y = -ey;
    this.aabbMax.x = ex;
    this.aabbMax.y = ey;
};

PhysicsState.prototype.getMass = function() {
    return this.mass;
};

module.exports = PhysicsState;