var _ = require('lodash'),
    striptags = require('striptags'),
    fs = require('fs'),
    path = require('path'),
    Vec2 = require('vector2-node'),
    Physics = require('./physics'),
    WorldMap = require('./worldmap');
function Server(io) {
    var self = this;
    this.connectedPlayers = [];
    this.registeredEntities = {};
    this.entities = [];
    this.tickLengthMs = 1000/33;
    this.frame = 0;
    this.playerSpawn = new Vec2(2, -2);
    this.previousTick = Date.now();
    this.worldMap = new WorldMap();
    this.physics = new Physics(this.worldMap);
    this.io = io;
}

Server.prototype.start = function() {
    var self = this;

    console.log("Starting server");

    this.registerEntities();

    this.io.on('connection', function(socket) {
        var player = self.playerConnected(socket);

        socket.on('chat', function(message) {
            self.playerSay(player, message);
        });
    });
    self.tick();
};

Server.prototype.registerEntities = function() {
    var entitiesFolder = path.resolve(__dirname, '../entities');
    var entitiesFound = fs.readdirSync(entitiesFolder);
    var rawEntities = {};
    var resolvedEntities = {};

    // Iterate the /entities/ folder
    _.each(entitiesFound, function(entityName) {
        var entityFolder = path.resolve(__dirname, '../entities/', entityName);
        var entityFilesFound = fs.readdirSync(entityFolder);
        var entityModule = null;

        // If there is a server.js, load it and cache the raw entity
        _.each(entityFilesFound, function(fileName) {
            if (fileName == 'server.js') {
                rawEntities[entityName] = require(path.join(entityFolder, 'server.js'));
            }
        });
    });


    // Resolve entities all the way back to BaseEntity
    var resolveEntity = function(entityName) {
        var entity = rawEntities[entityName];

        if (entity.baseClass == null) {
            return rawEntities[entityName];
        }

        var parentType = _.clone(resolveEntity(entity.baseClass));

        return _.merge(parentType, _.clone(rawEntities[entityName]))
    };

    //All raw entities are loaded, make them inherit up their chain
    _.forOwn(rawEntities, function(entity, entityName) {
        resolvedEntities[entityName] = resolveEntity(entityName);
    });

    this.registeredEntities = resolvedEntities;
};

Server.prototype.playerSay = function(player, message) {
    if (message.indexOf('/setname') === 0) {
        var name = message.replace('/setname ','').substring(0,30);
        player.setName(name);

        this.io.emit('playerName', {
            uniqueId: player.uniqueId,
            name: name
        });

        player.socket.emit('chatted', 'Your name has been set to ' + name);

        return;
    }

    if (message.indexOf('/impulse') === 0) {
        var args = message.split(' ')[1] || 10;


        _.each(this.entities, function(entity) {

            if (!entity.isPlayer()) {
                var mag = args - Math.random()*args*2;
                var mag2 = args - Math.random()*args*2;
                var vec = new Vec2(mag, mag2);
                entity.applyImpulse(vec);
            }
        });

        player.socket.emit('chatted', 'You impulsed the entities');

        return;
    }

    if (message.indexOf('/shoot') === 0) {
        var args = message.split(' ');
        var force = args[1] || 10;
        var entity = this.getEntityById(args[2]);
        var vec = player.getAimVector().scale(force);
        entity.applyImpulse(vec);

        player.socket.emit('chatted', 'You shot the entity');

        return;
    }

        if (message.indexOf('/spawn') === 0) {
        var args = message.split(' ');
        var classType = args[1] || 'base';
        var entity = this.createEntity(classType);
        var pos = player.getPos().add(player.getAimVector().scale(2));
        entity.setPos(pos);
        entity.applyImpulse(player.getAimVector().scale(5));
        entity.setAngle(player.getAimVector().angle());

        player.socket.emit('chatted', 'You spawned an entity');

        return;
    }

    message = '<b>' + striptags(player.getName()) + '</b>: ' + striptags(message);

    console.log(message);

    this.io.emit('chatted', message);
};

Server.prototype.getEntityById = function(uniqueId) {
    var i = 0;
    for (i; i<this.entities.length; i++) {
        if (this.entities[i].uniqueId == uniqueId) {
            return this.entities[i];
        }
    }

    return null;
};

Server.prototype.tick = function() {
    var now = Date.now(),
        self = this;

    this.frame++;
    if (this.previousTick + this.tickLengthMs <= now) {
        var delta = (now - this.previousTick) / 1000;
        this.previousTick = now;
        this.update(now, delta);
        //console.log('delta', delta, '(target: ' + this.tickLengthMs +' ms)', 'node ticks', this.frame)
        this.frame = 0;
    }

    if (Date.now() - this.previousTick < this.tickLengthMs - 16) {
        setTimeout(function() {
            self.tick();
        })
    } else {
        setImmediate(function() {
            self.tick();
        })
    }
};

Server.prototype.update = function(currentTime, deltaTime) {
    var self = this,
        index = 0;
    this.validateConnectedPlayers(currentTime);

    while (index < this.entities.length) {
        var entity = this.entities[index];
        entity.think();

        if (entity.isPlayer() && entity.input.attack) {
            self.playerAttack(entity);
        }

        if (entity.isBeingRemoved) {
            self.removeEntity(entity, index);
        } else {
            index++;
        }
    }

    this.physics.simulate(deltaTime, this.entities);

    this.sendGameState();
};

Server.prototype.playerAttack = function(player) {
    if (Date.now() - player.lastAttackTime < player.attackDelay ) {
        return;
    }

    player.lastAttackTime = Date.now();

    var entity = this.createEntity('base');
    var pos = player.getPos().add(player.getAimVector().scale(2));
    entity.setPos(pos);
    entity.applyImpulse(player.getAimVector().scale(5));
    entity.setAngle(player.getAimVector().angle());

};

Server.prototype.playerConnected = function(socket) {
    var IPAddress = socket.handshake.address;
    var player = this.createEntity('player');
    player.setSocket(socket);

    player.playerId = this.connectedPlayers.push(player);
    var entityData = {
        className: player.getClass(),
        uniqueId: player.uniqueId
    };

    player.socket.broadcast.emit('newEntity', entityData);

    console.log('Player has connected (' + IPAddress + ')');
    player.setPos(this.playerSpawn);
    var gameData = {
        map: this.worldMap.getTileMap()
    };

    socket.on('playerInput', function(data) {
        player.lastInputTime = Date.now();

        player.input.up = data.up;
        player.input.down = data.down;
        player.input.left = data.left;
        player.input.right = data.right;
        player.input.attack = data.attack;
        player.input.aimVector = new Vec2(data.aimVector.x, data.aimVector.y);

        player.physicsState.angle = Math.PI/2 + player.input.aimVector.angle();
    });


    socket.emit('load', gameData);
    this.io.emit('chatted', 'A new player has connected');
    socket.emit('chatted', 'Welcome to the server! There are currently ' + this.connectedPlayers.length + ' players online.');

    _.each(this.entities, function(entity) {
        var entityData = {
            className: entity.getClass(),
            uniqueId: entity.uniqueId
        };

        if (entity.uniqueId === player.uniqueId) {
            entityData.isLocalPlayer = true;
        }

        socket.emit('loadEntity', entityData);
    });

    return player;
};

Server.prototype.validateConnectedPlayers = function(currentTime) {
    _.each(this.connectedPlayers, function(player) {
        if (currentTime - player.lastInputTime > 1000) {
            console.log("should remove this player");
            player.shouldRemove(true);
        }
    });
};

Server.prototype.sendGameState = function() {
    var self = this;

    _.each(this.entities, function(entity) {
        var entityData = {
            x: entity.getPhysicsState().position.x,
            y: entity.getPhysicsState().position.y,
            uniqueId: entity.uniqueId,
            angle: entity.getPhysicsState().angle
        };

        self.io.emit("updateEntity", entityData)
    });
};
var uniqueCount = 0;

Server.prototype.createEntity = function(entityClass) {
    var Entity = function () {},
        entityPrototype = this.registeredEntities[entityClass],
        createdEntity;

    Entity.prototype = Object.create(entityPrototype);

    createdEntity = new Entity();
    createdEntity._internalInit();
    createdEntity.uniqueId = uniqueCount++;
    this.entities.push(createdEntity);

    createdEntity.init();
    var entityData = {
        className: createdEntity.getClass(),
        uniqueId: createdEntity.uniqueId
    };

    console.log("Creating entity ", entityData);

    if (!createdEntity.isPlayer()) {
        this.io.emit('newEntity', entityData);
    }

    return createdEntity;
};

Server.prototype.spawnEntity = function(entity) {
    return entity;
};

Server.prototype.getAllEntities = function() {
    return this.entities;
};

Server.prototype.removeEntity = function(entity, index) {
    console.log("removing entity at index " + index);

    this.entities.splice(index, 1);

    if (entity.isPlayer()) {
        var i = 0;
        while (i < this.connectedPlayers.length) {
            var player = this.connectedPlayers[i];
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
};

module.exports = Server;