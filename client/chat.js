function Chat() {
    var self = this;
    this.contentElement = $('.chat-content');
    this.inputElement = $('#chat-input');
    this.chatListener = function () {};

    this.inputElement.on('keypress', function(evt) {
        if (evt.charCode === 13) {
            var value = $(this).val();
            self.chatListener(value);
            $(this).val('');
        }
    });

    $('.chat-submit').on('click', function(evt) {
        var value = self.inputElement.val();
        self.chatListener(value);
        self.inputElement.val('');
    });
}

Chat.prototype.newMessage = function(msg) {
    $('.chat-content').append('<li>' + msg + '</li>');
};

Chat.prototype.setChatListener = function(func) {
    this.chatListener = func;
};

module.exports = Chat;