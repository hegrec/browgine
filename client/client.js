var _ = require('lodash');
var client = require('socket.io-client');
var Vec2 = require('vector2-node');
var constants = require('./../common/constants');
var Renderer = require('./renderer');
var Chat = require('./chat');
var Input = require('../common/input');
var socket = client.connect('http://localhost:8888', {
    'reconnect': false
});

var KEY_W = 87;
var KEY_A = 65;
var KEY_D = 68;
var KEY_S = 83;
var KEY_SPACE = 32;

function Client() {
    var self = this;


    this.entities = [];
    this.registeredEntities = {};
    this.registerEntities();
    this.localPlayer = null;
    this.width = window.innerWidth - 300;
    this.height = window.innerHeight;

    this.renderer = new Renderer(this.width, this.height);
    this.chat = new Chat();
    this.chat.setChatListener(function(message) {
        socket.emit('chat', message);
    });

    socket.on('disconnect', function() {
        var msg = 'You have been disconnected from the server. Refresh your browser to reconnect';
        self.chat.newMessage(msg)
    });

    socket.on('playerName', function(data) {

        _.each(self.entities, function (entity) {
            if (entity.uniqueId == data.uniqueId) {
                entity.renderable.name.setText(data.name);
                return false;
            }
        })
    });

    socket.on('updateEntity', function(entityData) {
        var updatedEntity = null;

        self.entities.forEach(function(entity) {
            if (entity.uniqueId === entityData.uniqueId) {
                updatedEntity = entity;
            }
        });

        if (updatedEntity === null) {
            return;
        }

        updatedEntity.setPos(new Vec2(entityData.x, entityData.y));
        updatedEntity.setAngle(entityData.angle);
        updatedEntity.getPhysicsState().buildAABB();

        updatedEntity.entityRenderable.x = entityData.x*64;
        updatedEntity.entityRenderable.y = -entityData.y*64;

        updatedEntity.entityRenderable.graphic.rotation = Math.PI - entityData.angle;

        var debugString = "Pos: (" + updatedEntity.getPos().x + ', ' + updatedEntity.getPos().y + ')';
        debugString += '\r\nAng: ' + updatedEntity.getAngle() * 180 / Math.PI;

        updatedEntity.debugText.text = debugString;

        updatedEntity.debugLines.clear();
        updatedEntity.debugLines.beginFill(0x00FF00);
        updatedEntity.debugLines.lineStyle(2, 0x00FF00, 1);
        var mesh = updatedEntity.getLocalMesh();


        mesh.forEach(function(vertex, index) {
            var screenPos = self.renderer.worldToScreen(vertex);
            var nextPos = self.renderer.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
            updatedEntity.debugLines.moveTo(screenPos.x, screenPos.y);
            updatedEntity.debugLines.lineTo(nextPos.x, nextPos.y);
        });

        updatedEntity.debugLines.endFill();

        updatedEntity.aabbDebug.clear();
        updatedEntity.aabbDebug.beginFill(0xFF0000);
        updatedEntity.aabbDebug.lineStyle(2, 0xFF0000, 1);
        var aabb = updatedEntity.getLocalAABB();

        var vec1 = self.renderer.worldToScreen(aabb.min);
        var vec2 = self.renderer.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
        var vec3 = self.renderer.worldToScreen(aabb.max);
        var vec4 = self.renderer.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));
        updatedEntity.aabbDebug.moveTo(vec1.x, vec1.y);
        updatedEntity.aabbDebug.lineTo(vec2.x, vec2.y);

        updatedEntity.aabbDebug.moveTo(vec2.x, vec2.y);
        updatedEntity.aabbDebug.lineTo(vec3.x, vec3.y);

        updatedEntity.aabbDebug.moveTo(vec3.x, vec3.y);
        updatedEntity.aabbDebug.lineTo(vec4.x, vec4.y);

        updatedEntity.aabbDebug.moveTo(vec4.x, vec4.y);
        updatedEntity.aabbDebug.lineTo(vec1.x, vec1.y);

        updatedEntity.aabbDebug.endFill();

    });

    socket.on('removeEntity', function(entityId) {
        _.each(self.entities, function(entity, index) {
            if (entity.uniqueId != entityId) {
                return;
            }

            self.renderer.removeEntity(entity);
            self.entities.splice(index, 1);

            return false;

        });
    });

    socket.on('newEntity', function(networkEntityData) {
        var uniqueId = networkEntityData.uniqueId;
        var className = networkEntityData.className;

        var entity = self.createEntity(className, uniqueId);
    });

    socket.on('loadEntity', function(networkEntityData) {
        var uniqueId = networkEntityData.uniqueId;
        var className = networkEntityData.className;
        var entity = self.createEntity(className, uniqueId);
        console.log(networkEntityData);
        if (networkEntityData.isLocalPlayer) {
            self.localPlayer = entity;
            self.localPlayer.input = new Input();
        }
    });

    socket.on('load', function(data) {
        self.renderer.renderWorld(data.map);
    });

    $('#game canvas').attr('tabIndex', 0).focus();
    $('#game canvas').on('click', function(evt) {
        $(this).focus();
    });
    $('#game canvas').keydown(function(evt) {
        var keyCode = evt.keyCode;

        if (!self.localPlayer || !self.localPlayer.input) {
            return;
        }

        if (keyCode == KEY_W) {
            self.localPlayer.input.up = 1;
        } else if (keyCode == KEY_A) {
            self.localPlayer.input.left = 1;
        } else if (keyCode == KEY_S) {
            self.localPlayer.input.down = 1;
        } else if (keyCode == KEY_D) {
            self.localPlayer.input.right = 1;
        } else if (keyCode == KEY_SPACE) {
            self.localPlayer.input.attack = 1;
        }
    });

    $('#game canvas').keyup(function(evt) {
        var keyCode = evt.keyCode;

        if (!self.localPlayer || !self.localPlayer.input) {
            return;
        }
        if (keyCode == KEY_W) {
            self.localPlayer.input.up = 0;
        } else if (keyCode == KEY_A) {
            self.localPlayer.input.left = 0;
        } else if (keyCode == KEY_S) {
            self.localPlayer.input.down = 0;
        } else if (keyCode == KEY_D) {
            self.localPlayer.input.right = 0;
        } else if (keyCode == KEY_SPACE) {
            self.localPlayer.input.attack = 0;
        }
    });

    this.tick();
}

Client.prototype.registerEntities = function() {
    var hash = require('../entities/**/shared.js', { expand: true, hash: true });
    var hash2 = require('../entities/**/client.js', { expand: true, hash: true });
    var rawEntities = {};
    var resolvedEntities = {};

    // Iterate the /entities/ folder
    _.forOwn(hash2, function(entityObject, requirePath) {
        var entityName = requirePath.split('/')[0];
        rawEntities[entityName] = entityObject;
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

Client.prototype.getEntityById = function(uniqueId) {
    var i = 0;
    for (i; i<this.entities.length; i++) {
        if (this.entities[i].uniqueId == uniqueId) {
            return this.entities[i];
        }
    }

    return null;
};

Client.prototype.createEntity = function(entityClass, uniqueId) {
    var Entity = function () {},
        entityPrototype = this.registeredEntities[entityClass],
        createdEntity,
        self = this;

    Entity.prototype = Object.create(entityPrototype);

    createdEntity = new Entity();
    createdEntity.uniqueId = uniqueId;
    createdEntity.entityRenderable = new PIXI.Container();
    createdEntity._internalInit();
    this.entities.push(createdEntity);
    createdEntity.init();



    var debugLines = new PIXI.Graphics();
    debugLines.beginFill(0x00FF00);
    debugLines.lineStyle(2, 0x00FF00, 1);
    var mesh = createdEntity.getMesh();


    mesh.forEach(function(vertex, index) {
        var screenPos = self.renderer.worldToScreen(vertex);
        var nextPos = self.renderer.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
        debugLines.moveTo(screenPos.x, screenPos.y);
        debugLines.lineTo(nextPos.x, nextPos.y);
    });

    debugLines.endFill();

    createdEntity.debugLines = debugLines;
    createdEntity.entityRenderable.addChild(debugLines);


    var debugLines2 = new PIXI.Graphics();
    debugLines2.beginFill(0xFF0000);
    debugLines2.lineStyle(2, 0xFF0000, 1);
    var aabb = createdEntity.getLocalAABB();

    var vec1 = this.renderer.worldToScreen(aabb.min);
    var vec2 = this.renderer.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
    var vec3 = this.renderer.worldToScreen(aabb.max);
    var vec4 = this.renderer.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));


    debugLines2.moveTo(vec1.x, vec1.y);
    debugLines2.lineTo(vec2.x, vec2.y);

    debugLines2.moveTo(vec2.x, vec2.y);
    debugLines2.lineTo(vec3.x, vec3.y);

    debugLines2.moveTo(vec3.x, vec3.y);
    debugLines2.lineTo(vec4.x, vec4.y);

    debugLines2.moveTo(vec4.x, vec4.y);
    debugLines2.lineTo(vec1.x, vec1.y);

    debugLines2.endFill();

    createdEntity.aabbDebug = debugLines2;
    createdEntity.entityRenderable.addChild(debugLines2);


    var opts = {
        font: 'Arial',
        size: 16,
        strokeSize: 2,
        stroke: 0xffffff,
        color: 0
    };

    var debugString = "Pos: (" + createdEntity.getPos().x + ', ' + createdEntity.getPos().y + ')';

    createdEntity.debugText = this.renderer.createText(debugString, opts, createdEntity.entityRenderable);
    createdEntity.debugText.position.y = 64;

    if (entityClass == 'player') {
        createdEntity.setTexture('/images/player.png');
    } else {
        createdEntity.setTexture('/images/box.jpg');
    }

    this.renderer.addEntity(createdEntity);

    return createdEntity;
};

Client.prototype.tick = function() {
    var self = this,
        cameraPos = new Vec2(0, 0);
    // start the timer for the next animation loop
    requestAnimationFrame(function() {
        self.tick();
    });

    if (this.localPlayer) {

        var mouseWorldPos = this.renderer.getMouseWorldPos();
        var playerPos = this.localPlayer.getPos();

        var aimVec = new Vec2(
            mouseWorldPos.x - playerPos.x,
                mouseWorldPos.y - playerPos.y
        ).normalize();

        if (isNaN(aimVec.x)) {
            aimVec.x = 0;
        }

        if (isNaN(aimVec.y)) {
            aimVec.y = 0;
        }

        this.localPlayer.input.aimVector = {x: aimVec.x, y: aimVec.y};
/*
        var debugText = '(' + mouseWorldPos.x + ', ' + mouseWorldPos.y + ')\r\n';
            debugText += "Position: (" + self.localPlayer.position.x + ", " + self.localPlayer.position.y + ')';

        self.debugText.text = debugText;
*/
        socket.emit('playerInput', this.localPlayer.input);

        cameraPos.x = playerPos.x;
        cameraPos.y = playerPos.y;
    }



    this.renderer.render(cameraPos);
};

window.createGameClient = function() {
    return new Client();
};