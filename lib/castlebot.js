'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var GoFundMe = require('./gofundme');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "castlebot")
 *      dbPath : the path to access the database (will default to "data/castlebot.db")
 *
 * @param {object} settings
 * @constructor
 */
var CastleBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'castlerobot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'castlebot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(CastleBot, Bot);

/**
 * Run the bot
 * @public
 */
CastleBot.prototype.run = function () {
    CastleBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
CastleBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
CastleBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromCastleBot(message) ) {
        console.log("[Debug][_onMessage] Got message:",message)
        if (this._isMentioningCastle(message)) {
            console.log("[Debug][_onMessage] Is a castle message");
            this._replyWithDoners(message);
        }
    }
};

/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
CastleBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

CastleBot.prototype._replyWithDoners = function (originalMessage) {
    var self = this;
    var input = {
        url:  'https://www.gofundme.com/39t6wr3c' // 'https://www.gofundme.com/samyancey' //'https://www.gofundme.com/ShowerFlint5' 
    }
    console.log("GoFundMe: " + input.url);
    GoFundMe(input, function(data){
        console.log("GoFundMe:", data)
        var message = "Donors:\n"
        for ( var i in data.donors ) {
            message += "\n" + i + ". " + data.donors[i].name + " - " + data.currency.toString() + data.donors[i].amount
            var msg = data.donors[i].message;
            if (msg){
                message += "\n>" + msg
            }
        }
        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, message, {as_user: true});
    });

};

/**
 * Loads the user object representing the bot
 * @private
 */
CastleBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
CastleBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
CastleBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
CastleBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Castle Bot` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
CastleBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
CastleBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Castle Bot or the castlebot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
CastleBot.prototype._isMentioningChuckCastle = function (message) {
    return message.text.toLowerCase().indexOf('castle bot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

CastleBot.prototype._isMentioningCastle = function (message) {
    return message.text.toLowerCase().indexOf('castle37') > -1
};

/**
 * Util function to check if a given real time message has ben sent by the castlebot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
CastleBot.prototype._isFromCastleBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
CastleBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = CastleBot;
