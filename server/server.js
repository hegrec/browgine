import Vec2 from 'vector2-node';
import ChatHandler from './lib/chat-handler';
import EntityManager from './lib/entity-manager';
import NetworkManager from './lib/network-manager';
import Physics from './physics';
import WorldMap from './worldmap';
import NetChatMessage from '../common/net/chat-message';
import NetLoadEntity from '../common/net/load-entity';
import NetLoadGame from '../common/net/load-game';
import NetPlayerInput from '../common/net/player-input';
import NetRemoveEntity from '../common/net/remove-entity';
import NetUpdateEntity from '../common/net/update-entity';

const PLAYER_TIMEOUT = 3; // X seconds without activity and player is logged out.

export default class GameServer {
    constructor(options) {
        this.entityManager = new EntityManager(this);
        this.networkManager = new NetworkManager(options.socketIoPort);
        this.tickLengthMs = 1000 / 20;
        this.frame = 0;
        this.playerSpawn = new Vec2(2, -2);
        this.previousTick = Date.now();
        this.worldMap = new WorldMap();
        this.physics = new Physics(this.worldMap);
        this.chatHandler = new ChatHandler();
    }

    start() {
        this.entityManager.registerEntities();

        this.networkManager.initialize();
        this.networkManager.setPlayerChatHandler(this.playerSay.bind(this));
        this.networkManager.setPlayerInitHandler(this.playerInit.bind(this));
        this.networkManager.setPlayerConnectedHandler(this.playerConnected.bind(this));

        console.log("Server online!");

        this.tick();
    }

    /**
     * Handle player chat input
     * @param player
     * @param message
     */
    playerSay(player, message) {
        if (this.chatHandler.handleChatCommand(player, message)) {
            const saidMessage = player.getName() + ': ' + message;

            console.log(saidMessage);

            this.networkManager.broadcastMessage(new NetChatMessage(saidMessage));
        }
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
        let entities = this.entityManager.getEntities();
        let index = 0;

        this.validateConnectedPlayers(currentTime);

        while (index < entities.length) {
            let entity = entities[index];
            entity.think();

            if (entity.isPlayer() && entity.input.attack) {
                this.playerAttack(entity);
            }

            if (entity.isBeingRemoved) {
                this.removeEntity(entity);
            } else {
                index++;
            }
        }

        this.physics.simulate(deltaTime, entities);

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
     * A new socket io socket has connected to the server, create a player entity
     * @param socket
     */
    playerInit() {
        return this.createEntity('player');
    }

    playerConnected(player) {
        const ipAddress = player.getIPAddress();
        const playerCount = this.entityManager.getPlayers().length;
        let loadMessage = new NetLoadGame(this.worldMap.getTileMap(), player.uniqueId);

        player.on(NetChatMessage, (chatMessage) => {
            this.playerSay(player, chatMessage.getText());
        });

        player.on(NetPlayerInput, (inputMessage) => {

            player.lastInputTime = Date.now();
            player.input = inputMessage.getInput();
            player.physicsState.angle = Math.PI / 2 + player.input.aimVector.angle();
        });

        player.sendMessage(loadMessage);
        player.sendMessage(new NetChatMessage(`Welcome to the server! There are currently ${playerCount} players online.`));
        this.networkManager.broadcastMessage(new NetChatMessage('A new player has connected'));

        for (let entity of this.entityManager.getEntities()) {
            if (entity !== player) {
                player.sendMessage(new NetLoadEntity(entity.getEntityNetworkData()));
            }
        }
        console.log(`Player (${ipAddress}) has connected`);
        player.setPos(this.playerSpawn);
    }

    validateConnectedPlayers(currentTime) {
        for (let player of this.entityManager.getPlayers()) {
            if (currentTime - player.lastInputTime > PLAYER_TIMEOUT * 1000) {
                console.log(player.uniqueId, 'lagged out');
                player.laggedOut = true;
                player.shouldRemove(true);
            }
        }
    }

    sendGameState() {
        for (let entity of this.entityManager.getEntities()) {
            let entityData = entity.getUpdateData();

            this.networkManager.broadcastMessage(new NetUpdateEntity(entityData));
        }
    }

    playerDisconnected(player) {
        const uniqueId = player.uniqueId;
        let message = player.laggedOut ? `Player ${uniqueId} has lagged out` : `Player ${uniqueId} has disconnected`;

        console.log(message);

        player.disconnect();
        this.networkManager.broadcastMessage(new NetChatMessage(player.getName() + ' has disconnected'));
    }

    createEntity(entityClass) {
        let entity = this.entityManager.createEntity(entityClass);

        this.sendNewEntity(entity);

        return entity;
    }

    sendNewEntity(newEntity) {
        this.networkManager.broadcastMessage(new NetLoadEntity(newEntity.getEntityNetworkData()));
    }

    removeEntity(entity) {
        const uniqueId = entity.uniqueId;
        this.entityManager.removeEntity(entity);

        if (entity.isPlayer()) {
            this.playerDisconnected(entity);
        }

        this.networkManager.broadcastMessage(new NetRemoveEntity(uniqueId));
    }
}
