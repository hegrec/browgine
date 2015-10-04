import constants from './../../common/constants';
import Vec2 from 'vector2-node';
import PhysicsState from './../../common/physicsState';

var BaseEntity = {
    uniqueId: 0,
    isBeingRemoved: 0,
    modelName: 'base',
    physicsType: constants.PHYSICS_TYPE_SIMULATE,
    appliedForce: null,
    appliedTorque: null,
    physicsState: null,
    lastPhysicsState: null,
    localMin: null,
    localMax: null,

    _internalInit: function () {
        this.appliedForce = new Vec2(0, 0);
        this.appliedTorque = new Vec2(0, 0);
        this.physicsState = new PhysicsState();
        this.lastPhysicsState = new PhysicsState();

    },
    init: function() {},
    shouldRemove: function (bool) {
        this.isBeingRemoved = bool;
    },

    applyImpulse: function (impulse, offset) {
        this.physicsState.momentum = this.getPhysicsState().momentum.add(impulse);
        this.physicsState.recalculate();
    },

    think: function () {
    },

    setPos: function (vec) {
        this.physicsState.position.x = vec.x;
        this.physicsState.position.y = vec.y;
    },

    setAngle: function(angDegrees) {
        this.physicsState.angle = angDegrees;
    },

    getPos: function () {
        return this.physicsState.position.copy();
    },

    getAngle: function () {
        return this.physicsState.angle;
    },

    getModel: function () {
        return this.modelName;
    },

    setModel: function (model) {
        this.modelName = model;
    },

    getMesh: function () {
        return this.physicsState.getMesh();
    },

    getLocalMesh: function () {
        return this.physicsState.getLocalMesh();
    },

    isPlayer: function () {
        return false;
    },

    getPhysicsType: function () {
        return this.physicsType;
    },

    getAppliedForce: function () {
        return this.appliedForce;
    },

    getAppliedTorque: function () {
        return this.appliedTorque;
    },

    physicsSimulate: function () {
        return new Vec2(0, 0);
    },

    getVelocity: function () {
        return this.physicsState.velocity.copy();
    },
    getAABB: function () {
        return {
            min: this.getPos().add(this.physicsState.aabbMin),
            max: this.getPos().add(this.physicsState.aabbMax)
        }
    },
    getLocalAABB: function () {
        return {
            min: this.physicsState.aabbMin,
            max: this.physicsState.aabbMax
        }
    },
    getPhysicsState: function () {
        return this.physicsState;
    },

    getLastPhysicsState: function () {
        return this.lastPhysicsState;
    },

    clearAppliedForce: function () {
        this.appliedForce.x = 0;
        this.appliedForce.y = 0;
    },

    clearAppliedTorque: function () {
        this.appliedTorque.x = 0;
        this.appliedTorque.y = 0;
    },

    applyForce: function (forceVector) {
        this.appliedForce.add(forceVector);
    }
}


module.exports = BaseEntity;
