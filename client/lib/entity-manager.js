import _ from 'lodash';
import Vec2 from 'vector2-node';

export default class ClientEntityManager {
    constructor() {
        this.entities = [];
        this.registeredEntities = {};
        this.registeredModels = {};

        this.registerEntities();
        this.registerModels();
    }

    getEntities() {
        return this.entities;
    }

    registerModels() {
        const hash2 = require('../../models/*.json', {expand: true, hash: true});

        // Iterate the /entities/ folder
        _.forOwn(hash2, (loadedModel, requirePath) => {

            let modelName = requirePath.replace('.json', ''),
                rawMesh = loadedModel.mesh,
                builtMesh = [];

            for (let i = 0; i < rawMesh.length; i++) {
                builtMesh.push(new Vec2(rawMesh[i][0], rawMesh[i][1]));
            }

            loadedModel.name = modelName;
            loadedModel.mesh = builtMesh;

            this.registeredModels[modelName] = loadedModel;
        });
    }

    registerEntities() {
        let hash = require('../../entities/**/shared.js', {expand: true, hash: true});
        let hash2 = require('../../entities/**/client.js', {expand: true, hash: true});
        let rawEntities = {};
        let resolvedEntities = {};
        let resolveEntity = (entityName) => {
            let entity = rawEntities[entityName];

            if (entity.baseClass == null) {
                return rawEntities[entityName];
            }

            let parentType = _.clone(resolveEntity(entity.baseClass));

            return _.merge(parentType, _.clone(rawEntities[entityName]))
        };

        // Iterate the /entities/ folder
        _.forOwn(hash2, (entityObject, requirePath) => {
            let entityName = requirePath.split('/')[0];
            rawEntities[entityName] = entityObject;
        });

        //All raw entities are loaded, make them inherit up their chain
        _.forOwn(rawEntities, (entity, entityName) => {
            resolvedEntities[entityName] = resolveEntity(entityName);
        });

        this.registeredEntities = resolvedEntities;
    }

    createEntity(entityClass, uniqueId, instanceData) {
        const manager = this;
        let Entity = () => {};
        let entityPrototype = this.registeredEntities[entityClass];
        let createdEntity;

        Entity.prototype = Object.create(entityPrototype);
        Entity.prototype.setModel = function (modelIdentifier) {
            this.model = manager.registeredModels[modelIdentifier];
            this.physicsState.setMesh(this.model.mesh);
            this.setTexture('/images/' + this.model.texture);
        };

        createdEntity = new Entity();
        createdEntity._internalInit();
        createdEntity.uniqueId = uniqueId;
        createdEntity.setModel(instanceData.model.name);
        this.entities.push(createdEntity);
        createdEntity.init();

        return createdEntity;
    }

    updateEntity(entityData) {
        let updatedEntity = null;

        for (let entity of this.entities) {
            if (entity.uniqueId === entityData.uniqueId) {
                updatedEntity = entity;
                break;
            }
        }

        if (updatedEntity === null) {
            return;
        }

        updatedEntity.setPos(new Vec2(entityData.x, entityData.y));
        updatedEntity.setAngle(entityData.angle);
        updatedEntity.getPhysicsState().buildAABB();

        return updatedEntity;
    }

    removeEntity(uniqueId) {
        let entity = null;

        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].uniqueId === uniqueId) {
                entity = this.entities.splice(i, 1)[0];
                break;
            }
        }

        return entity;
    }

    getEntityById(uniqueId) {
        for (let entity of this.entities) {
            if (entity.uniqueId == uniqueId) {
                return entity;
            }
        }

        return null;
    }
}
