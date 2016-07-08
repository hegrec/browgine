import NetChatMessage from '../../common/net/chat-message';

export default class ChatHandler {
    constructor(entityManager, networkManager) {
        this.entityManager = entityManager;
        this.networkManager = networkManager;
    }

    handleChatCommand(player, message) {
        let chatArgs = message.split(' ');

        if (message.indexOf('/setname') === 0) {
            let name = message.replace('/setname ', '').substring(0, 30);

            player.setName(name);

            player.sendMessage(new NetChatMessage(`Your name has been set to ${name}`));

            return false;
        }

        if (message.indexOf('/impulse') === 0) {
            let magnitude = chatArgs[1] || 10;

            for (let entity of this.entityManager.getEntities()) {

                if (!entity.isPlayer()) {
                    let mag = magnitude - Math.random() * magnitude * 2;
                    let mag2 = magnitude - Math.random() * magnitude * 2;
                    let vec = new Vec2(mag, mag2);
                    entity.applyImpulse(vec);
                }
            }

            player.sendMessage(new NetChatMessage('You impulsed the entities'));

            return false;
        }

        if (message.indexOf('/shoot') === 0) {
            let force = chatArgs[1] || 10;
            let entity = this.entityManager.getEntityById(args[2]);
            let vec = player.getAimVector().scale(force);
            entity.applyImpulse(vec);

            player.sendMessage(new NetChatMessage('You shot the entity'));

            return false;
        }

        if (message.indexOf('/spawn') === 0) {
            let classType = chatArgs[1] || 'base';
            let entity = this.entityManager.createEntity(classType);
            let pos = player.getPos().add(player.getAimVector().scale(2));

            entity.setPos(pos);
            entity.applyImpulse(player.getAimVector().scale(5));
            entity.setAngle(player.getAimVector().angle());

            player.sendMessage(new NetChatMessage('You spawned an entity'));

            return false;
        }

        return true;
    }
}
