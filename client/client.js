import Vec2 from 'vector2-node';
import constants from './../common/constants';
import Renderer from './renderer';
import Chat from './chat';
import ClientEntityManager from './lib/entity-manager';
import ClientNetworkManager from './lib/network-manager';
import Input from '../common/input';
import NetChatMessage from '../common/net/chat-message';
import NetDisconnect from '../common/net/disconnect';
import NetLoadEntity from '../common/net/load-entity';
import NetLoadGame from '../common/net/load-game';
import NetPlayerInput from '../common/net/player-input';
import NetRemoveEntity from '../common/net/remove-entity';
import NetUpdateEntity from '../common/net/update-entity';

const KEY_W = 87;
const KEY_A = 65;
const KEY_D = 68;
const KEY_S = 83;
const KEY_SPACE = 32;
const DEBUG = true;

export default class Client {
    constructor() {
        const host = `http://${window.location.hostname}:8888`;

        this.entityManager = new ClientEntityManager();
        this.networkManager = new ClientNetworkManager(host);

        this.localPlayer = null;
        this.width = window.innerWidth - 300;
        this.height = window.innerHeight;

        this.renderer = new Renderer(this.width, this.height);
        this.canvas = this.renderer.getRenderer();
        this.chat = new Chat();
        this.chat.setChatListener((message) => {
            this.networkManager.sendMessage(new NetChatMessage(message));
        });

        this.networkManager.on(NetChatMessage, (message) => {
            this.chat.newMessage(message.getText());
        });

        this.networkManager.on(NetDisconnect, () => {
            let msg = 'You have been disconnected from the server. Refresh your browser to reconnect';
            this.chat.newMessage(msg)
        });

        this.networkManager.on(NetUpdateEntity, (entityData) => {
            let networkedData = entityData.getUpdatedEntity();

            this.updateEntity(networkedData);
        });

        this.networkManager.on(NetRemoveEntity, (message) => {
            const entityId = message.getUniqueId();
            const removedEntity = this.entityManager.removeEntity(entityId);

            this.renderer.removeEntity(removedEntity);
        });

        this.networkManager.on(NetLoadEntity, (message) => {
            const networkEntityData = message.getEntityData();
            const uniqueId = networkEntityData.uniqueId;
            const className = networkEntityData.className;
            const instanceData = networkEntityData.instanceData;

            this.createEntity(className, uniqueId, instanceData);
        });

        this.networkManager.on(NetLoadGame, (message) => {
            const worldMap = message.getMapData();
            const localPlayerId = message.getLocalPlayerId();
            for (let entity of this.entityManager.getEntities()) {
                if (entity.uniqueId === localPlayerId) {
                    this.localPlayer = entity;
                    break;
                }
            }

            this.renderer.renderWorld(worldMap);
        });

        this.canvas.setAttribute('tabindex', 0);
        this.canvas.focus();
        this.canvas.addEventListener('click', (evt) => {
            evt.target.focus();
        });

        this.canvas.addEventListener('keydown', (evt) => {
            let keyCode = evt.keyCode;

            if (!this.localPlayer || !this.localPlayer.input) {
                return;
            }

            this.localPlayer.hasInput = true;

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

        this.canvas.addEventListener('keyup', (evt) => {
            let keyCode = evt.keyCode;

            if (!this.localPlayer || !this.localPlayer.input) {
                return;
            }

            this.localPlayer.hasInput = true;

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

        if (DEBUG) {
            window.getEntities = () => {
                return this.entityManager.getEntities();
            };

            window.getEntity = (id) => {
                return this.entityManager.getEntityById(id);
            };
        }

        this.tick();
    }

    createEntity(className, uniqueId, instanceData) {
        const entity = this.entityManager.createEntity(className, uniqueId, instanceData);

        this.renderer.addEntity(entity);

        if (DEBUG) {
            this.renderer.debugEntity(entity);
        }

        return entity;
    }

    updateEntity(entityData) {
        let updatedEntity = this.entityManager.updateEntity(entityData);

        if (updatedEntity) {
            this.renderer.updateRenderable(updatedEntity);
        }
    }

    tick() {
        let cameraPos = new Vec2(0, 0);
        // start the timer for the next animation loop
        requestAnimationFrame(() => {
            this.tick();
        });

        if (this.localPlayer) {
            let lastInput = this.localPlayer.input.toString();

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

            if (this.localPlayer.input.toString() !== lastInput || this.localPlayer.hasInput === true) {
                this.localPlayer.hasInput = false;
                this.networkManager.sendMessage(new NetPlayerInput(this.localPlayer.input));
            }

            cameraPos.x = playerPos.x;
            cameraPos.y = playerPos.y;
        }

        this.renderer.render(cameraPos);
    }
}

//TODO: init elsewhere
let game = new Client();
