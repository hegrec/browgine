export default class Chat {
    constructor() {
        this.contentElement = $('.chat-content');
        this.inputElement = $('#chat-input');
        this.chatListener = () => {};

        this.inputElement.on('keypress', (evt) => {
            if (evt.charCode === 13) {

                let value = evt.target.value;

                console.log(value);
                this.chatListener(value);
                evt.target.value = '';
            }
        });

        $('.chat-submit').on('click', () => {
            let value = this.inputElement.val();
            this.chatListener(value);
            this.inputElement.val('');
        });
    };

    newMessage(msg) {
        this.contentElement.append('<li>' + msg + '</li>');
    };

    setChatListener(func) {
        this.chatListener = func;
    };
}
