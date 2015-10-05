import _ from 'lodash';
import client from 'socket.io-client';
import Vec2 from 'vector2-node';
import constants from './../common/constants';
import Renderer from './renderer';
import Chat from './chat';
import Input from '../common/input';

const KEY_W = 87;
const KEY_A = 65;
const KEY_D = 68;
const KEY_S = 83;
const KEY_SPACE = 32;

export default class Client {
    constructor() {
        let host = window.location.hostname;

        this.socket = client.connect(`http://${host}:8888`, {
            'reconnect': false
        });

        this.entities = [];
        this.registeredEntities = {};
        this.registeredModels = {};
        this.registerModels();
        this.registerEntities();
        this.localPlayer = null;
        this.width = window.innerWidth - 300;
        this.height = window.innerHeight;

        this.renderer = new Renderer(this.width, this.height);
        this.chat = new Chat();
        this.chat.setChatListener((message) => {
            this.socket.emit('chat', message);
        });

        this.socket.on('disconnect', () => {
            let msg = 'You have been disconnected from the server. Refresh your browser to reconnect';
            this.chat.newMessage(msg)
        });

        this.socket.on('playerName', (data) => {

            for (let entity of this.entities) {
                if (entity.uniqueId == data.uniqueId) {
                    entity.renderable.name.setText(data.name);
                    return false;
                }
            }
        });

        this.socket.on('updateEntity', (entityData) => {
            let updatedEntity = null;

            for (let entity of this.entities) {
                if (entity.uniqueId === entityData.uniqueId) {
                    updatedEntity = entity;
                }
            }

            if (updatedEntity === null) {
                return;
            }

            updatedEntity.setPos(new Vec2(entityData.x, entityData.y));
            updatedEntity.setAngle(entityData.angle);
            updatedEntity.getPhysicsState().buildAABB();

            updatedEntity.entityRenderable.x = entityData.x * 64;
            updatedEntity.entityRenderable.y = -entityData.y * 64;

            updatedEntity.entityRenderable.graphic.rotation = Math.PI - entityData.angle;

            let debugString = "Pos: (" + updatedEntity.getPos().x + ', ' + updatedEntity.getPos().y + ')';
            debugString += '\r\nAng: ' + updatedEntity.getAngle() * 180 / Math.PI;

            updatedEntity.debugText.text = debugString;

            updatedEntity.debugLines.clear();
            updatedEntity.debugLines.beginFill(0x00FF00);
            updatedEntity.debugLines.lineStyle(2, 0x00FF00, 1);
            let mesh = updatedEntity.getLocalMesh();


            mesh.forEach((vertex, index) => {
                let screenPos = this.renderer.worldToScreen(vertex);
                let nextPos = this.renderer.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
                updatedEntity.debugLines.moveTo(screenPos.x, screenPos.y);
                updatedEntity.debugLines.lineTo(nextPos.x, nextPos.y);
            });

            updatedEntity.debugLines.endFill();

            updatedEntity.aabbDebug.clear();
            updatedEntity.aabbDebug.beginFill(0xFF0000);
            updatedEntity.aabbDebug.lineStyle(2, 0xFF0000, 1);
            let aabb = updatedEntity.getLocalAABB();

            let vec1 = this.renderer.worldToScreen(aabb.min);
            let vec2 = this.renderer.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
            let vec3 = this.renderer.worldToScreen(aabb.max);
            let vec4 = this.renderer.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));
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

        this.socket.on('removeEntity', (entityId) => {
            _.each(this.entities, (entity, index) => {
                if (entity.uniqueId != entityId) {
                    return;
                }

                this.renderer.removeEntity(entity);
                this.entities.splice(index, 1);

                return false;
            });
        });

        this.socket.on('newEntity', (networkEntityData) => {
            let uniqueId = networkEntityData.uniqueId;
            let className = networkEntityData.className;
            let instanceData = networkEntityData.instanceData;

            this.createEntity(className, uniqueId, instanceData);
        });

        this.socket.on('loadEntity', (networkEntityData) => {
            let uniqueId = networkEntityData.uniqueId;
            let className = networkEntityData.className;
            let instanceData = networkEntityData.instanceData;

            let entity = this.createEntity(className, uniqueId, instanceData);

            if (networkEntityData.isLocalPlayer) {
                this.localPlayer = entity;
                this.localPlayer.input = new Input();
            }
        });

        this.socket.on('load', (data) => {
            this.renderer.renderWorld(data.map);
        });

        $('#game canvas').attr('tabIndex', 0).focus();
        $('#game canvas').on('click', (evt) => {
            $(this).focus();
        });
        $('#game canvas').keydown((evt) => {
            let keyCode = evt.keyCode;

            if (!this.localPlayer || !this.localPlayer.input) {
                return;
            }

            if (keyCode == KEY_W) {
                this.localPlayer.input.up = 1;
            } else if (keyCode == KEY_A) {
                this.localPlayer.input.left = 1;
            } else if (keyCode == KEY_S) {
                this.localPlayer.input.down = 1;
            } else if (keyCode == KEY_D) {
                this.localPlayer.input.right = 1;
            } else if (keyCode == KEY_SPACE) {
                this.localPlayer.input.attack = 1;
            }
        });

        $('#game canvas').keyup((evt) => {
            let keyCode = evt.keyCode;

            if (!this.localPlayer || !this.localPlayer.input) {
                return;
            }
            if (keyCode == KEY_W) {
                this.localPlayer.input.up = 0;
            } else if (keyCode == KEY_A) {
                this.localPlayer.input.left = 0;
            } else if (keyCode == KEY_S) {
                this.localPlayer.input.down = 0;
            } else if (keyCode == KEY_D) {
                this.localPlayer.input.right = 0;
            } else if (keyCode == KEY_SPACE) {
                this.localPlayer.input.attack = 0;
            }
        });

        this.tick();
    }

    registerModels() {
        let hash2 = require('../models/*.json', {expand: true, hash: true});

        // Iterate the /entities/ folder
        _.forOwn(hash2, (loadedModel, requirePath) => {

            let modelName = requirePath.replace('.json', ''),
                rawMesh = loadedModel.mesh,
                builtMesh = [];

            for (let i = 0; i < rawMesh.length; i += 2) {
                builtMesh.push(new Vec2(rawMesh[i], rawMesh[i + 1]));
            }


            loadedModel.mesh = builtMesh;

            this.registeredModels[modelName] = loadedModel;
        });
    }

    registerEntities() {
        let hash = require('../entities/**/shared.js', {expand: true, hash: true});
        let hash2 = require('../entities/**/client.js', {expand: true, hash: true});
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

    getEntityById(uniqueId) {
        for (let entity of this.entities) {
            if (entity.uniqueId == uniqueId) {
                return entity;
            }
        }

        return null;
    }

    createEntity(entityClass, uniqueId, instanceData) {
        let Entity = () => {};
        let entityPrototype = this.registeredEntities[entityClass];
        let createdEntity;
        let opts = {
            font: 'Arial',
            size: 16,
            strokeSize: 2,
            stroke: 0xffffff,
            color: 0
        };

        Entity.prototype = Object.create(entityPrototype);

        createdEntity = new Entity();
        createdEntity.uniqueId = uniqueId;
        createdEntity.entityRenderable = new PIXI.Container();

        //Synchronized server networked things
        createdEntity.setModel(instanceData.model);

        createdEntity._internalInit();
        this.entities.push(createdEntity);
        createdEntity.init();

        let debugLines = new PIXI.Graphics();
        let mesh = createdEntity.getMesh();

        debugLines.beginFill(0x00FF00);
        debugLines.lineStyle(2, 0x00FF00, 1);

        mesh.forEach((vertex, index) => {
            let screenPos = this.renderer.worldToScreen(vertex);
            let nextPos = this.renderer.worldToScreen(mesh[index + 1 == mesh.length ? 0 : index + 1]);
            debugLines.moveTo(screenPos.x, screenPos.y);
            debugLines.lineTo(nextPos.x, nextPos.y);
        });

        debugLines.endFill();

        createdEntity.debugLines = debugLines;
        createdEntity.entityRenderable.addChild(debugLines);


        let debugLines2 = new PIXI.Graphics();
        let aabb = createdEntity.getLocalAABB();

        let vec1 = this.renderer.worldToScreen(aabb.min);
        let vec2 = this.renderer.worldToScreen(new Vec2(aabb.min.x, aabb.max.y));
        let vec3 = this.renderer.worldToScreen(aabb.max);
        let vec4 = this.renderer.worldToScreen(new Vec2(aabb.max.x, aabb.min.y));


        debugLines2.beginFill(0xFF0000);
        debugLines2.lineStyle(2, 0xFF0000, 1);

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

        let debugString = "Pos: (" + createdEntity.getPos().x + ', ' + createdEntity.getPos().y + ')';

        createdEntity.debugText = this.renderer.createText(debugString, opts, createdEntity.entityRenderable);
        createdEntity.debugText.position.y = 64;

        let model = this.registeredModels[instanceData.model];

        createdEntity.setTexture('/images/' + model.texture);

        this.renderer.addEntity(createdEntity);

        return createdEntity;
    }

    tick() {
        let cameraPos = new Vec2(0, 0);
        // start the timer for the next animation loop
        requestAnimationFrame(() => {
            this.tick();
        });

        if (this.localPlayer) {
            let mouseWorldPos = this.renderer.getMouseWorldPos();
            let playerPos = this.localPlayer.getPos();
            let aimVec = new Vec2(
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
            this.socket.emit('playerInput', this.localPlayer.input);

            cameraPos.x = playerPos.x;
            cameraPos.y = playerPos.y;
        }

        this.renderer.render(cameraPos);
    }
}

//TODO: init elsewhere
let game = new Client();
