var _ = require('lodash'),
    Vec2 = require('vector2-node'),
    SAT = require('sat'),
    constants = require('./../common/constants');
function Physics(worldMap) {

    this.worldMap = worldMap;

}

Physics.prototype.simulate = function(deltaTime, entities) {
    var entity;
    for (var i = 0; i < entities.length; i++) {
        entity = entities[i];

        // System.out.println(e);
        if (entity.getPhysicsType() === constants.PHYSICS_TYPE_SIMULATE) {
            this.simulateSim(deltaTime, entity);
        } else if (entity.getPhysicsType() === constants.PHYSICS_TYPE_WALK) {
            this.simulateWalk(deltaTime, entity);
        }
    }

    this.collisionCheck(entities, deltaTime);
};

Physics.prototype.simulateSim = function(deltaTime, entity) {
    var sumOfForces = new Vec2(0, 0),
        sumOfTorques = new Vec2(0, 0),
        baseForce = entity.getAppliedForce(),
        baseTorque = entity.getAppliedTorque(),
        internalForce = entity.physicsSimulate(),
        state = entity.getPhysicsState();

    sumOfForces = sumOfForces.add(baseForce);
    sumOfTorques = sumOfTorques.add(baseTorque);

    entity.lastPhysicsState = entity.getPhysicsState().clone();

    entity.clearAppliedForce();
    entity.clearAppliedTorque();



    sumOfForces = sumOfForces.add(internalForce);
    state.momentum = state.momentum.add(sumOfForces.scale(deltaTime));
    state.angle += state.spin * deltaTime;
    //state.angularMomentum += sumOfTorques.scale(deltaTime);

    if (Math.abs(state.momentum.x) < 0.1) {
        state.momentum.x = 0;
    }

    if (Math.abs(state.momentum.y) < 0.1) {
        state.momentum.y = 0;
    }

    if (Math.abs(state.momentum.z) < 0.1) {
        state.momentum.z = 0;
    }

    state.recalculate();

    state.momentum.x *= 0.9;
    state.momentum.y *= 0.9;

    if (entity.isPlayer()) {
        state.position = state.position.add(entity.walkVelocity.copy().scale(deltaTime));
    }
    state.position = state.position.add(state.velocity.scale(deltaTime));
};

Physics.prototype.collisionCheck = function(entities, deltaTime) {
    var self = this;
    // Check each entity against the map
    _.each(entities, function(entity) {
        var currentTile = self.worldMap.getTileAtPos(entity.getPos());

        if (currentTile !== 1) {
            console.log("Entity " + entity.uniqueId + ' is colliding with world ' + currentTile, entity.getPos());

            var oldPos = entity.getLastPhysicsState().position.copy();
            var newPos = entity.getPos();
            var movementVector = entity.getPos().sub(oldPos);
            var potentialPosition = oldPos.copy();
            potentialPosition.x = newPos.x;

            var projectedTile = self.worldMap.getTileAtPos(potentialPosition);

            //collision while moving on x axis, kill the x component
            if (projectedTile !== 1 && (movementVector.x > 0 || movementVector.x < 0)) {
                potentialPosition.x = oldPos.x;
            }

            potentialPosition.y = newPos.y;
            projectedTile = self.worldMap.getTileAtPos(potentialPosition);

            if (projectedTile !== 1 && (movementVector.y > 0 || movementVector.y < 0)) {
                potentialPosition.y = oldPos.y;
            }

            projectedTile = self.worldMap.getTileAtPos(potentialPosition);

            if (projectedTile !== 1) {
                potentialPosition = entity.getLastPhysicsState().position;
            }

            entity.setPos(potentialPosition);
        }
    });

    var collisions = [];
    var pairMatches = {};

    // Check each entity against each other
    _.each(entities, function(entity) {
        var oldPos = entity.getLastPhysicsState().position.copy();
        var newPos = entity.getPos();
        var movementVector = entity.getPos().sub(oldPos);
        var potentialPosition = oldPos.copy();
        pairMatches[entity.uniqueId] = pairMatches[entity.uniqueId] || {};
        _.each(entities, function(entity2) {
            if (entity2 === entity) {
                return;
            }

            //pair previously checked
            if (pairMatches[entity.uniqueId][entity2.uniqueId]) {
                //return;
            }

            pairMatches[entity2.uniqueId] = pairMatches[entity2.uniqueId] || {};
            pairMatches[entity2.uniqueId][entity.uniqueId] = true;



            var colliding = self.isColliding(entity, entity2);

            if (colliding) {
                //console.log("entities are colliding ", entity.uniqueId, entity2.uniqueId, colliding);
                var collisionData = {
                    minimalTranslation: colliding,
                    entity1: entity,
                    entity2: entity2
                };

                collisions.push(collisionData);
            }
        });
    });


    //we have an array of all collisions in the map, resolve them now
    collisions.forEach(function(collision) {
        var vA = collision.entity1.getVelocity();
        var vB = collision.entity2.getVelocity();
        var relativeVelocity = vA.sub(vB);
        var contactVelocity = relativeVelocity.dot(collision.minimalTranslation.vector);

        if (contactVelocity >= 0) {
            return;
        }

        var e = 0.8;
        var j = -(1 + e) * contactVelocity;
        var massSum = collision.entity1.physicsState.inverseMass + collision.entity2.physicsState.inverseMass;
        j /= collision.minimalTranslation.vector.dot(collision.minimalTranslation.vector.copy().scale(massSum));

        var impulse = collision.minimalTranslation.vector.copy().scale(j);



        collision.entity1.physicsState.momentum.add(impulse);
        collision.entity1.physicsState.recalculate();

        collision.entity2.physicsState.momentum.sub(impulse);
        collision.entity2.physicsState.recalculate();
    });
};

Physics.prototype.isAABBColliding = function(a, b) {
    if (a.max.x < b.min.x || a.min.x > b.max.x) {
        return false;
    }

    if (a.max.y < b.min.y || a.min.y > b.max.y) {
        return false;
    }

    return true;
};

Physics.prototype.isColliding = function(entity, entity2) {
    var self = this,
        aabb1 = entity.getAABB(),
        aabb2 = entity2.getAABB();

    if (!this.isAABBColliding(aabb1, aabb2)) {
        return false;
    }


    var axes = [],
        axes2 = [],
        mesh1 = entity.getMesh(),
        mesh2 = entity2.getMesh();

    mesh1.forEach(function(vertex, index) {
        var point1 = vertex.copy();
        var point2 = mesh1[index + 1 == mesh1.length ? 0 : index + 1].copy();
        var edge = point1.sub(point2);

        var normal = new Vec2(-edge.y, edge.x);
        axes.push(normal.normalize());
    });

    mesh2.forEach(function(vertex, index) {
        var point1 = vertex.copy();
        var point2 = mesh2[index + 1 == mesh2.length ? 0 : index + 1].copy();

        var edge = point1.sub(point2);

        var normal = new Vec2(-edge.y, edge.x);
        axes2.push(normal.normalize());
    });

    var V = SAT.Vector;
    var P = SAT.Polygon;
    var verts1 = [];
    var pos1 = entity.getPos();
    for (var i=0;i<mesh1.length;i++) {
        var vert = mesh1[i];
        verts1.push(new V(vert.x, vert.y));
    }

    var poly1 = new P(new V(pos1.x, pos1.y), verts1);

    var verts2 = [];
    var pos2 = entity.getPos();
    for (var i=0;i<mesh2.length;i++) {
        var vert = mesh2[i];
        verts2.push(new V(vert.x, vert.y));
    }

    var poly2 = new P(new V(pos2.x, pos2.y), verts2);
    var response = new SAT.Response();
    var collided = SAT.testPolygonPolygon(poly1, poly2, response);

    if (!collided) {
        return false;
    }

    return {
        magnitude: response.overlap,
        vector: new Vec2(response.overlapN.x, response.overlapN.y).scale(-1)
    };
};

Physics.prototype.project = function (axis, mesh) {
    var min = axis.dot(mesh[0]),
        max = min;
    mesh.forEach(function (vertex) {
        var p = axis.dot(vertex);
        if (p < min) {
            min = p;
        } else if (p > max) {
            max = p;
        }
    });

    return {
        min: min,
        max: max
    };
};

Physics.prototype.overlaps = function (min1, max1, min2, max2) {
    return Math.min(max1, max2) - Math.max(min1, min2);
};

Physics.prototype.testSAT = function(axes1, axes2, mesh1, mesh2) {
    var self = this;
    var overlapping = true;
    var mtv = null; //minimum translation vector
    var mtvMag = 999999;
    axes1.forEach(function (axis) {
        var p1 = self.project(axis, mesh1);
        var p2 = self.project(axis, mesh2);
        var overlap = self.overlaps(p1.min, p1.max, p2.min, p2.max);

        if (!overlap) {
            overlapping = false;
            return false;
        }

        if (Math.abs(overlap) < mtvMag) {
            mtv = axis;
            mtvMag = overlap;
        }
    });

    axes2.forEach(function (axis) {
        var p1 = self.project(axis, mesh1);
        var p2 = self.project(axis, mesh2);
        var overlap = self.overlaps(p1.min, p1.max, p2.min, p2.max);

        if (!overlap) {
            overlapping = false;
            return false;
        }

        if (Math.abs(overlap) < mtvMag) {
            mtv = axis;
            mtvMag = overlap;
        }
    });

    if (!overlapping) {
        return false;
    }

    return {
        vector: mtv,
        magnitude: mtvMag
    };
};

module.exports = Physics;