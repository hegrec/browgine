import _ from 'lodash';
import Vec2 from 'vector2-node';
import SAT from 'sat';
import constants from './../common/constants';

export default class Physics {
    constructor(worldMap) {
        this.worldMap = worldMap;
    }

    simulate(deltaTime, entities) {
        for (let entity of entities) {
            this.simulateSim(deltaTime, entity);
        }

        this.collisionCheck(entities, deltaTime);
    }

    simulateSim(deltaTime, entity) {
        let sumOfForces = new Vec2(0, 0);
        let sumOfTorques = new Vec2(0, 0);
        let baseForce = entity.getAppliedForce();
        let baseTorque = entity.getAppliedTorque();
        let internalForce = entity.physicsSimulate();
        let state = entity.getPhysicsState();

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
    }

    collisionCheck(entities, deltaTime) {
        // Check each entity against the map
        for (let entity of entities) {
            let currentTile = this.worldMap.getTileAtPos(entity.getPos());

            //If the type type is a wall (0)
            if (currentTile !== 1) {
                console.log("Entity " + entity.uniqueId + ' is colliding with world ' + currentTile, entity.getPos());

                let oldPos = entity.getLastPhysicsState().position.copy();
                let newPos = entity.getPos();
                let movementVector = entity.getPos().sub(oldPos);
                let potentialPosition = oldPos.copy();
                potentialPosition.x = newPos.x;

                let projectedTile = this.worldMap.getTileAtPos(potentialPosition);

                //collision while moving on x axis, kill the x component
                if (projectedTile !== 1 && (movementVector.x > 0 || movementVector.x < 0)) {
                    potentialPosition.x = oldPos.x;
                }

                potentialPosition.y = newPos.y;
                projectedTile = this.worldMap.getTileAtPos(potentialPosition);

                if (projectedTile !== 1 && (movementVector.y > 0 || movementVector.y < 0)) {
                    potentialPosition.y = oldPos.y;
                }

                projectedTile = this.worldMap.getTileAtPos(potentialPosition);

                if (projectedTile !== 1) {
                    potentialPosition = entity.getLastPhysicsState().position;
                }

                entity.setPos(potentialPosition);
            }
        }

        let collisions = [];
        let pairMatches = {};

        // Check each entity against each other
        for (let entity of entities) {
            let oldPos = entity.getLastPhysicsState().position.copy();
            let newPos = entity.getPos();
            let movementVector = entity.getPos().sub(oldPos);
            let potentialPosition = oldPos.copy();
            pairMatches[entity.uniqueId] = pairMatches[entity.uniqueId] || {};
            _.each(entities, (entity2)  => {
                if (entity2 === entity) {
                    return;
                }

                //pair previously checked
                if (pairMatches[entity.uniqueId][entity2.uniqueId]) {
                    //return;
                }

                pairMatches[entity2.uniqueId] = pairMatches[entity2.uniqueId] || {};
                pairMatches[entity2.uniqueId][entity.uniqueId] = true;


                let colliding = this.isColliding(entity, entity2);

                if (colliding) {
                    //console.log("entities are colliding ", entity.uniqueId, entity2.uniqueId, colliding);
                    let collisionData = {
                        minimalTranslation: colliding,
                        entity1: entity,
                        entity2: entity2
                    };

                    collisions.push(collisionData);
                }
            });
        }


        //we have an array of all collisions in the map, resolve them now
        collisions.forEach(function (collision) {
            let vA = collision.entity1.getVelocity();
            let vB = collision.entity2.getVelocity();
            let relativeVelocity = vA.sub(vB);
            let contactVelocity = relativeVelocity.dot(collision.minimalTranslation.vector);

            if (contactVelocity >= 0) {
                return;
            }

            let e = 0.8;
            let j = -(1 + e) * contactVelocity;
            let massSum = collision.entity1.physicsState.inverseMass + collision.entity2.physicsState.inverseMass;
            j /= collision.minimalTranslation.vector.dot(collision.minimalTranslation.vector.copy().scale(massSum));

            let impulse = collision.minimalTranslation.vector.copy().scale(j);


            collision.entity1.physicsState.momentum.add(impulse);
            collision.entity1.physicsState.recalculate();

            collision.entity2.physicsState.momentum.sub(impulse);
            collision.entity2.physicsState.recalculate();
        });
    }

    isAABBColliding(a, b) {
        if (a.max.x < b.min.x || a.min.x > b.max.x) {
            return false;
        }

        return !(a.max.y < b.min.y || a.min.y > b.max.y);
    }

    isColliding(entity, entity2) {
        let aabb1 = entity.getAABB();
        let aabb2 = entity2.getAABB();
        let mesh1;
        let mesh2;
        let poly1;
        let poly2;
        let response;
        let collided;
        let pos1 = entity.getPos();
        let pos2 = entity2.getPos();

        let verts1 = [];
        let verts2 = [];
        let P = SAT.Polygon;
        let V = SAT.Vector;

        if (!this.isAABBColliding(aabb1, aabb2)) {
            return false;
        }

        mesh1 = entity.getMesh();
        mesh2 = entity2.getMesh();

        for (let vert of mesh1) {
            verts1.push(new V(vert.x, vert.y));
        }

        poly1 = new P(new V(pos1.x, pos1.y), verts1);

        for (let vert of mesh2) {
            verts2.push(new V(vert.x, vert.y));
        }

        poly2 = new P(new V(pos2.x, pos2.y), verts2);
        response = new SAT.Response();
        collided = SAT.testPolygonPolygon(poly1, poly2, response);

        if (!collided) {
            return false;
        }

        return {
            magnitude: response.overlap,
            vector: new Vec2(response.overlapN.x, response.overlapN.y).scale(-1)
        };
    }
}
