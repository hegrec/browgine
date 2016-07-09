import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import Vec2 from 'vector2-node';

const ENTITY_FOLDER = path.resolve(__dirname, '../../entities');
const MODELS_FOLDER = path.resolve(__dirname, '../../models');

export default class ServerEntityManager {
    constructor() {
        this.players = [];
        this.entities = [];
        this.entitiesCreated = 0;
        this.registeredEntities = {};
        this.registeredModels = {};

        this.registerEntities();
        this.registerModels();
    }

    registerModels() {
        const modelsFound = fs.readdirSync(MODELS_FOLDER);

        // Iterate the /entities/ folder
        for (let model of modelsFound) {
            let loadedModel = require(path.join(MODELS_FOLDER, model));
            let modelName = model.replace('.json', '');
            let rawMesh = loadedModel.mesh;
            let builtMesh = [];

            for (let i = 0; i < rawMesh.length; i++) {
                builtMesh.push(new Vec2(rawMesh[i][0], rawMesh[i][1]));
            }

            loadedModel.name = modelName;
            loadedModel.mesh = builtMesh;

            this.registeredModels[modelName] = loadedModel;
        };
    }


    /**
     * Scan the /entities/ folder and build the inheritance chain for each entity based on
     * merging shared and server functionality
     * combined with entity baseClass inheritance.
     */
    registerEntities() {
        const entitiesFound = fs.readdirSync(ENTITY_FOLDER);
        const rawEntities = {};
        const resolvedEntities = {};
        const resolveEntity = (entityName) => {
            const entity = rawEntities[entityName];

            if (entity.baseClass == null) {
                return rawEntities[entityName];
            }

            const parentType = _.clone(resolveEntity(entity.baseClass));

            return _.merge(parentType, _.clone(rawEntities[entityName]))
        };

        // Iterate the /entities/ folder
        for (let entityName of entitiesFound) {
            let entityFolder = path.resolve(ENTITY_FOLDER, entityName);
            let entityFilesFound = fs.readdirSync(entityFolder);

            // If there is a server.js, load it and cache the raw entity
            for (let fileName of entityFilesFound) {
                if (fileName == 'server.js') {
                    rawEntities[entityName] = require(path.join(entityFolder, 'server.js'));
                }
            }
        }

        //All raw entities are loaded, make them inherit up their chain
        for (let entityName of entitiesFound) {
            resolvedEntities[entityName] = resolveEntity(entityName);
        }

        this.registeredEntities = resolvedEntities;
    }

    createEntity(entityClass) {
        const manager = this;
        let Entity = function () {};
        let entityPrototype = this.registeredEntities[entityClass];
        let createdEntity;

        if (entityPrototype == null) {
            console.error(`Entity of class ${entityClass} is not defined. Not creating...`);
            return;
        }

        Entity.prototype = Object.create(entityPrototype);
        Entity.prototype.getClass = function () {
            return entityClass;
        };
        Entity.prototype.setModel = function (modelIdentifier) {
            this.model = manager.registeredModels[modelIdentifier];
            this.physicsState.setMesh(this.model.mesh);
        };

        createdEntity = new Entity();
        createdEntity._internalInit();
        createdEntity.uniqueId = this.entitiesCreated++;
        this.entities.push(createdEntity);

        createdEntity.init();

        if (entityClass === 'player') {
            this.players.push(createdEntity);
        }

        return createdEntity;
    }

    removeEntity(entity) {
        const uniqueId = entity.uniqueId;
        let i;

        for (i = 0; i < this.entities.length; i++) {
            if (this.entities[i].uniqueId === uniqueId) {
                this.entities.splice(i, 1);
                break;
            }
        }

        if (entity.isPlayer()) {
            for (i = 0; i < this.players.length; i++) {
                if (this.players[i].uniqueId === entity.uniqueId) {
                    this.players.splice(i, 1);
                    break;
                }
            }
        }
    }

    getEntities() {
        return this.entities;
    }

    getPlayers() {
        return this.players;
    }

    /**
     * Get an entity by id
     * TODO: Hashtable lookup to avoid O(n) search
     * @param uniqueId
     * @returns {*}
     */
    getEntityById(uniqueId) {
        for (let entity of this.entities) {
            if (entity.uniqueId == uniqueId) {
                return entity;
            }
        }

        return null;
    }
}
