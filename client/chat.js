export default class Chat {
    constructor() {
        this.contentElement = document.getElementById('chat-content');
        this.inputElement = document.getElementById('chat-input');
        this.sendElement = document.getElementById('chat-submit');
        this.chatListener = () => {};

        this.inputElement.addEventListener('keypress', (evt) => {
            if (evt.charCode === 13) {

                let value = evt.target.value;
                this.chatListener(value);
                evt.target.value = '';
            }
        });

        this.sendElement.addEventListener('click', () => {
            let value = this.inputElement.value;
            this.chatListener(value);
            this.inputElement.val('');
        });
    };

    newMessage(msg) {
        const node = document.createElement('li');
        node.innerHTML = msg;

        this.contentElement.appendChild(node);
    };

    setChatListener(func) {
        this.chatListener = func;
    };
}
