import _ from 'lodash';
import Vec2 from 'vector2-node';
import SAT from 'sat';
import constants from './../common/constants';
import QuadTree from './../common/quadtree';

export default class Physics {
    constructor(worldMap) {
        this.worldMap = worldMap;
        this.tree = new QuadTree(0, worldMap.getBounds());
    }

    simulate(deltaTime, entities) {
        let index;
        for (index = 0; index < entities.length; index++) {
             this.simulateSim(deltaTime, entities[index]);
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
        let collisions = [];
        let index;

        this.tree.clear();

        for (index = 0; index < entities.length; index++) {
            this.tree.insert(entities[index]);
        }

        // Check each entity against the map
        for (index = 0; index < entities.length; index++) {
            const entity = entities[index];
            let currentTile = this.worldMap.getTileAtPos(entity.getPos());

            //If the type type is a wall (0)
            if (currentTile !== 1) {
                //console.log("Entity " + entity.uniqueId + ' is colliding with world ' + currentTile, entity.getPos());

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

        // Check each entity against each other
        for (index = 0; index < entities.length; index++) {
            let entity = entities[index];
            let possibleCollidingEntities = this.tree.retrieve(entity);
            let innerIndex;

            for (innerIndex = 0; innerIndex < possibleCollidingEntities.length; innerIndex++) {
                let entity2 = possibleCollidingEntities[innerIndex];
                let colliding;

                if (entity2 === entity) {
                    continue;
                }

                colliding = this.isColliding(entity, entity2);

                if (colliding) {
                    let collisionData = {
                        minimalTranslation: colliding,
                        entity1: entity,
                        entity2: entity2
                    };

                    collisions.push(collisionData);
                }
            }
        }

        //we have an array of all collisions in the map, resolve them now
        for (index = 0; index < collisions.length; index++) {
            const collision = collisions[index];

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
        }
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
        let index;
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

        for (index = 0; index < mesh1.length; index++) {
            verts1.push(new V(mesh1[index].x, mesh1[index].y));
        }

        poly1 = new P(new V(pos1.x, pos1.y), verts1);

        for (index = 0; index < mesh2.length; index++) {
            verts2.push(new V(mesh2[index].x, mesh2[index].y));
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
