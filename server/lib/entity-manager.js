import _ from 'lodash';
import fs from 'fs';
import path from 'path';

const ENTITY_FOLDER = path.resolve(__dirname, '../../entities');

export default class EntityManager {
    constructor() {
        this.players = [];
        this.entities = [];
        this.entitiesCreated = 0;
        this.registeredEntities = {};

        this.handlePlayerDisconnected = function() {};
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

        createdEntity = new Entity();
        createdEntity._internalInit();
        createdEntity.uniqueId = this.entitiesCreated++;
        createdEntity.entityId = this.entities.push(createdEntity);

        createdEntity.init();

        if (entityClass === 'player') {
            this.players.push(createdEntity);
        }

        return createdEntity;
    }

    removeEntity(entity) {
        const index = entity.entityId;

        this.entities.splice(index, 1);

        if (entity.isPlayer()) {
            let i = 0;
            while (i < this.players.length) {
                let player = this.players[i];
                if (player.uniqueId == entity.uniqueId) {
                    this.players.splice(i, 1);
                    this.handlePlayerDisconnected(player);
                    break;
                }

                i++;
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

    setPlayerDisconnectedHandler(handler) {
        this.handlePlayerDisconnected = handler;
    }

}
