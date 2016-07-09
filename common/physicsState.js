let Vec2 = require('vector2-node'),
    _ = require('lodash');

export default class PhysicsState {
    constructor() {
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
    }

    clone() {
        let cloneState = new PhysicsState();
        let clonedMesh = [];

        cloneState.angle = this.angle;
        cloneState.momentum = this.momentum.clone();
        cloneState.position = this.position.clone();
        cloneState.velocity = this.velocity.clone();

        _.each(this.mesh,(vertex) => {
            clonedMesh.push(vertex.clone());
        });

        cloneState.setMesh(clonedMesh);

        return cloneState;
    }

    setMass(newMass) {
        this.mass = newMass;
        this.inverseMass = 1 / newMass;
    }

    recalculate() {
        this.velocity.x = this.momentum.x * this.inverseMass;
        this.velocity.y = this.momentum.y * this.inverseMass;

        this.angularVelocity = this.angularMomentum * this.inverseInertia;
        this.buildAABB();
    }

    setMesh(mesh) {
        let minX = 99999;
        let maxX = -99999;
        let minY = 99999;
        let maxY = -99999;

        this.vertices = mesh;

        this.vertices.forEach((vertex) => {
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

    getMesh() {
        let copy = [];

        this.vertices.forEach((vertex) => {
            let vert = vertex.copy();
            vert.rotate(this.angle);
            vert = vert.add(this.position);

            copy.push(vert);
        });

        return copy;
    }

    getLocalMesh() {
        let copy = [];

        this.vertices.forEach((vertex) => {
            let vert = vertex.copy();
            vert.rotate(this.angle);

            copy.push(vert);
        });

        return copy;
    }

    buildAABB() {
        /*
        let orientation = this.angle;
        let corner1x = -this.halfWidth;
        let corner2x = this.halfWidth;
        let corner1y = -this.halfHeight;
        let corner2y = this.halfHeight;
        let sin_o = Math.sin(orientation);
        let cos_o = Math.cos(orientation);

        let xformed1x = corner1x * cos_o - corner1y * sin_o;
        let xformed2x = corner1x * sin_o + corner1y * cos_o;
        let xformed1y = corner2x * cos_o - corner2y * sin_o;
        let xformed2y = corner2x * sin_o + corner2y * cos_o;

        let ex = Math.max(Math.abs(xformed1x), Math.abs(xformed2x));
        let ey = Math.max(Math.abs(xformed1y), Math.abs(xformed2y));

        this.aabbMin.x = -ex;
        this.aabbMin.y = -ey;
        this.aabbMax.x = ex;
        this.aabbMax.y = ey;*/
        let mesh = this.getLocalMesh();
        let index;

        this.aabbMin.x = null;
        this.aabbMin.y = null;
        this.aabbMax.x = null;
        this.aabbMax.y = null;

        for (index = 0; index < mesh.length; index++) {
            let mX = mesh[index].x;
            let mY = mesh[index].y;
            if (this.aabbMin.x === null || mX < this.aabbMin.x) {
                this.aabbMin.x = mX;
            }

            if (this.aabbMin.y === null || mY < this.aabbMin.y) {
                this.aabbMin.y = mY;
            }

            if (this.aabbMax.x === null || mX > this.aabbMax.x) {
                this.aabbMax.x = mX;
            }

            if (this.aabbMax.y === null || mY > this.aabbMax.y) {
                this.aabbMax.y = mY;
            }
        }
    }

    getMass() {
        return this.mass;
    }
}
