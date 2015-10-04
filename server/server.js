import _ from 'lodash';
import striptags from 'striptags';
import fs from 'fs';
import path from 'path';
import Vec2 from 'vector2-node';
import Physics from './physics';
import WorldMap from './worldmap';
import socketIo from 'socket.io';

export default class GameServer {
    constructor(options) {
        this.connectedPlayers = [];
        this.registeredEntities = {};
        this.registeredModels = {};
        this.entities = [];
        this.tickLengthMs = 1000 / 33;
        this.frame = 0;
        this.entitiesCreated = 0;
        this.playerSpawn = new Vec2(2, -2);
        this.previousTick = Date.now();
        this.worldMap = new WorldMap();
        this.physics = new Physics(this.worldMap);
        this.io = socketIo.listen(options.socketIoPort);
    }

    start() {
        console.log("Starting server");

        this.registerModels();
        this.registerEntities();


        this.io.on('connection', (socket) => {
            let player = this.playerConnected(socket);

            socket.on('chat',  (message) => {
                this.playerSay(player, message);
            });
        });
        this.tick();
    }

    /**
     * Load up the models for use with entities
     * A model is just a mesh combined with a matching image.
     */
    registerModels() {
        let modelsFolder = path.resolve(__dirname, '../models');
        let modelsFound = fs.readdirSync(modelsFolder);

        for (let modelFile of modelsFound) {
            let loadedModel = require(path.join(modelsFolder, modelFile));
            let modelName = modelFile.replace('.json', '');
            let rawMesh = loadedModel.mesh;
            let builtMesh = [];

            for (let i = 0; i < rawMesh.length; i += 2) {
                builtMesh.push(new Vec2(rawMesh[i], rawMesh[i + 1]));
            }

            loadedModel.mesh = builtMesh;

            this.registeredModels[modelName] = loadedModel;
        }
    }

    /**
     * Scan the /entities/ folder and build the inheritance chain for each entity based on
     * merging shared and server functionality
     * combined with entity baseClass inheritance.
     */
    registerEntities() {
        let entitiesFolder = path.resolve(__dirname, '../entities');
        let entitiesFound = fs.readdirSync(entitiesFolder);
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
        for (let entityName of entitiesFound) {
            let entityFolder = path.resolve(__dirname, '../entities/', entityName);
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

    /**
     * Handle player chat input
     * TODO: Extract these if statements to a ChatCommand class
     * @param player
     * @param message
     */
    playerSay(player, message) {
        let chatArgs = message.split(' ')

        if (message.indexOf('/setname') === 0) {
            let name = message.replace('/setname ', '').substring(0, 30);
            player.setName(name);

            this.io.emit('playerName', {
                uniqueId: player.uniqueId,
                name: name
            });

            player.socket.emit('chatted', 'Your name has been set to ' + name);

            return;
        }

        if (message.indexOf('/impulse') === 0) {
            let magnitude = chatArgs[1] || 10;

            for (let entity of this.entities) {

                if (!entity.isPlayer()) {
                    let mag = magnitude - Math.random() * magnitude * 2;
                    let mag2 = magnitude - Math.random() * magnitude * 2;
                    let vec = new Vec2(mag, mag2);
                    entity.applyImpulse(vec);
                }
            }

            player.socket.emit('chatted', 'You impulsed the entities');

            return;
        }

        if (message.indexOf('/shoot') === 0) {
            let force = chatArgs[1] || 10;
            let entity = this.getEntityById(args[2]);
            let vec = player.getAimVector().scale(force);
            entity.applyImpulse(vec);

            player.socket.emit('chatted', 'You shot the entity');

            return;
        }

        if (message.indexOf('/spawn') === 0) {
            let classType = chatArgs[1] || 'base';
            let entity = this.createEntity(classType);
            let pos = player.getPos().add(player.getAimVector().scale(2));

            entity.setPos(pos);
            entity.applyImpulse(player.getAimVector().scale(5));
            entity.setAngle(player.getAimVector().angle());

            player.socket.emit('chatted', 'You spawned an entity');

            return;
        }

        //TODO: Remove HTML formatting from the server
        message = '<b>' + striptags(player.getName()) + '</b>: ' + striptags(message);

        console.log(message);

        this.io.emit('chatted', message);
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

    /**
     * Represents a single step in time on the server
     * Here we run the game update  and set the next tick based on a framerate delta
     */
    tick() {
        let now = Date.now();

        this.frame++;
        if (this.previousTick + this.tickLengthMs <= now) {
            let delta = (now - this.previousTick) / 1000;
            this.previousTick = now;
            this.update(now, delta);
            //console.log('delta', delta, '(target: ' + this.tickLengthMs +' ms)', 'node ticks', this.frame)
            this.frame = 0;
        }

        if (Date.now() - this.previousTick < this.tickLengthMs - 16) {
            setTimeout( () => {
                this.tick();
            });
        } else {
            setImmediate( () => {
                this.tick();
            });
        }
    }

    /**
     * Validate lagged players and run all physics and player input commands to modify the active game state
     * @param currentTime
     * @param deltaTime
     */
    update(currentTime, deltaTime) {
        let index = 0;
        this.validateConnectedPlayers(currentTime);

        while (index < this.entities.length) {
            let entity = this.entities[index];
            entity.think();

            if (entity.isPlayer() && entity.input.attack) {
                this.playerAttack(entity);
            }

            if (entity.isBeingRemoved) {
                this.removeEntity(entity, index);
            } else {
                index++;
            }
        }

        this.physics.simulate(deltaTime, this.entities);

        this.sendGameState();
    }

    /**
     * A player had sent an attack input and it is being processed now.
     * @param player
     */
    playerAttack(player) {
        if (Date.now() - player.lastAttackTime < player.attackDelay) {
            return;
        }

        player.lastAttackTime = Date.now();

        //TODO: Remove this test code
        let entity = this.createEntity('longblock');
        let pos = player.getPos().add(player.getAimVector().scale(2));

        entity.setPos(pos);
        entity.applyImpulse(player.getAimVector().scale(5));
        entity.setAngle(player.getAimVector().angle());
    }

    /**
     * A new socket io socket has connected to the server, create a player and store the socket
     * @param socket
     */
    playerConnected(socket) {
        let IPAddress = socket.handshake.address;
        let player = this.createEntity('player');
        let gameData = {
            map: this.worldMap.getTileMap()
        };

        player.setSocket(socket);

        player.playerId = this.connectedPlayers.push(player);
        this.sendNewEntity(player.socket.broadcast, player);

        console.log('Player (' + IPAddress + ') has connected');
        player.setPos(this.playerSpawn);

        socket.on('playerInput', (data) => {
            player.lastInputTime = Date.now();

            player.input.up = data.up;
            player.input.down = data.down;
            player.input.left = data.left;
            player.input.right = data.right;
            player.input.attack = data.attack;
            player.input.aimVector = new Vec2(data.aimVector.x, data.aimVector.y);

            player.physicsState.angle = Math.PI / 2 + player.input.aimVector.angle();
        });


        socket.emit('load', gameData);
        this.io.emit('chatted', 'A new player has connected');
        socket.emit('chatted', 'Welcome to the server! There are currently ' + this.connectedPlayers.length + ' players online.');

        for (let entity of this.entities) {
            let entityData = this.getEntityNetworkData(entity);
            if (entity.uniqueId === player.uniqueId) {
                entityData.isLocalPlayer = true;
            }

            socket.emit('loadEntity', entityData);
        }

        return player;
    }

    validateConnectedPlayers(currentTime) {
        for (let player of this.connectedPlayers) {
            if (currentTime - player.lastInputTime > 1000) {
                console.log("should remove this player");
                player.shouldRemove(true);
            }
        }
    }

    sendGameState() {

        for (let entity of this.entities) {
            let entityData = {
                x: entity.getPhysicsState().position.x,
                y: entity.getPhysicsState().position.y,
                uniqueId: entity.uniqueId,
                angle: entity.getPhysicsState().angle
            };

            this.io.emit("updateEntity", entityData)
        }
    }

    createEntity(entityClass) {
        let Entity = function () {};
        let entityPrototype = this.registeredEntities[entityClass];
        let createdEntity;

        if (entityPrototype == null) {
            console.log(`Error: Entity of class ${entityClass} is not defined. Not creating...`);
            return;
        }

        Entity.prototype = Object.create(entityPrototype);
        Entity.prototype.getClass = function () {
            return entityClass;
        };

        createdEntity = new Entity();
        createdEntity._internalInit();
        createdEntity.uniqueId = this.entitiesCreated++;
        this.entities.push(createdEntity);

        createdEntity.init();

        if (!createdEntity.isPlayer()) {
            this.sendNewEntity(this.io, createdEntity);
        }

        return createdEntity;
    }

    getEntityNetworkData(entity) {
        return {
            className: entity.getClass(),
            uniqueId: entity.uniqueId,
            instanceData: {
                model: entity.getModel()
            }
        };
    }

    sendNewEntity(socket, newEntity) {
        let entityData = this.getEntityNetworkData(newEntity);

        console.log("Creating entity ", entityData);

        socket.emit('newEntity', entityData);
    }

    getAllEntities() {
        return this.entities;
    }

    removeEntity(entity, index) {
        console.log("removing entity at index " + index);

        this.entities.splice(index, 1);

        if (entity.isPlayer()) {
            let i = 0;
            while (i < this.connectedPlayers.length) {
                let player = this.connectedPlayers[i];
                if (player.playerId == entity.playerId) {
                    this.connectedPlayers.splice(i, 1);
                    this.io.emit('chatted', player.getName() + ' has disconnected');
                    player.disconnect();
                    break;
                }

                i++;
            }
        }

        this.io.emit("removeEntity", entity.uniqueId);
    }
}
