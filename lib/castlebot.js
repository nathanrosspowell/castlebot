'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var GoFundMe = require('./gofundme');
var express = require('express');
var app     = express();

/* ----------------------------------------------------------------------------------------------
 * R10?
 *
 */
app.set('port', (process.env.PORT || 5000));

//For avoidong Heroku $PORT error
app.get('/', function(request, response) {
    var result = 'App is running'
    response.send(result);
}).listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});


/* ----------------------------------------------------------------------------------------------
 * CastleBot constructor.
 *
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

/* ----------------------------------------------------------------------------------------------
 * Main entry point and high level functions
 *
 */
CastleBot.prototype.run = function () {
    CastleBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

CastleBot.prototype._onStart = function () {
    var self = this
    self._loadBotUser();
    self._connectDb();
    self._firstRunCheck();
    self._checkForNewDonors();
    var update = function(self) {
        self._checkForNewDonors()
    }
    setInterval(update, 15 * 1000, self);
};

CastleBot.prototype._onMessage = function (message) {
    var self = this;
    console.log("[Debug][_onMessage] Got message:",message)
    if (self._isForCastleBot(message)){
        console.log("WE MADE IT BOTS!");
        var output = "Donate: url: 'https://www.gofundme.com/39t6wr3c";
        if (self._isCastle37(message)){
            output = "#Castle37 :european_castle::37:"
        }
        var channel = self._getChannelById(message.channel);
        self.postMessageToChannel(channel.name, output, {as_user: true});
    }
};

CastleBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

CastleBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

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

/* ----------------------------------------------------------------------------------------------
 * Functions that reply to slack
 *
 */
CastleBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name,
        'CastleBot is monitoring https://www.gofundme.com/39t6wr3c\n*Donate now!* :european_castle::37: #castle37',
        {as_user: true});
};

CastleBot.prototype._checkForNewDonors = function () {
    var self = this;
    self.db.get('SELECT donation_id FROM donors ORDER BY donation_id DESC LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        console.log(">>>>>>",record);
        var lastCount = typeof record.donation_id !== "undefined" ? record.donation_id : 0
        var input = {
            //url: 'https://www.gofundme.com/39t6wr3c',
            url: 'https://www.gofundme.com/tprseancullen',
            lastCount: record.donation_id
        }
        console.log("GoFundMe: ", input);
        GoFundMe(input, function(data){
            console.log(" >>>>>fetched ", data.donations, data);
            self._getDonors(function(dbDonors){
                console.log(" >>>>>dbDonors ");
                var processedDonors = 0; 
                var newDonors = [];
                for( var i in data.donors){
                    console.log("testing", i);
                    if (!(i in dbDonors)) {
                        var d = data.donors[i];
                        newDonors.push({
                            id: i,
                            name: d.name,
                            amount: d.amount,
                            message: d.message
                       });
                    }
                    else {
                        console.log("In old data", i, data.donors[i].name, dbDonors[i].name);
                    }
                }

                console.log("Loop", newDonors.length);
                for ( var i = 0; i < newDonors.length; ++i ) {
                    var d = newDonors[i];
                    console.log("Loop", i, d);
                    self.db.run('INSERT INTO donors (donation_id, name, amount, message) VALUES (?,?,?,?)',
                            [d.id, d.name, d.amount, d.message],
                            function (err) {
                        if (err) {
                            console.log("ERR:", err);
                        }
                        processedDonors++;
                        console.log("Done:", processedDonors);
                        if (processedDonors == newDonors.length) {
                            console.log("Finidhesd:", processedDonors);
                            var message ="*New Castle Donations!*"
                            var spacer = "\n\n"
                            message += spacer + spacer;
                            for ( var j = newDonors.length -1; j > -1; --j ) {
                                var n = newDonors[j];
                                message += "_*"+n.name+"*_ donated *"+data.currency+n.amount.toString() +"*\n"
                                if(n.message){
                                    message += "\n>"+n.message + "\n"
                                }
                                message += spacer
                            }
                            message += "New Total: *"+data.currency+data.amount+"*" + spacer

                            message += ":moneybag: ᕦ( ͡° ͜ʖ ͡°)ᕤ :moneybag:        :arrow_right::arrow_right::arrow_right:        :european_castle:\n\n"
                            self.postMessageToChannel(self.channels[0].name, message, {as_user: true});
                        }
                    });
                }
                console.log("Done loops");
            });
            console.log("tried to get donors");
        });
    });
};

CastleBot.prototype._replyWithDbList = function (originalMessage) {
    var self = this;
    self._getDonors(function(donors){
        var message = "Donors:\n"
        for (var i in donors) {
            var d = donors[i]
            message += "\n" + i + ". " + d.name + " - " + d.amount
            var msg = d.message;
            if (msg){
                message += "\n>" + msg
            }
        }
        console.log(message);
        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, message, {as_user: true});
    });
};

/* ----------------------------------------------------------------------------------------------
 * Helpers
 *
 */
CastleBot.prototype._getDonors = function (callback) {
    var self = this;

    console.log(" _getDonors");
    self.db.all('SELECT id, donation_id, name, amount, message FROM donors ORDER BY donation_id ASC', function (err, records) {
        if (err) {
            callback({})
            return console.log('DATABASE ERROR:', err);
        }

        console.log(" looping donors");
        var donors = {};
        for (var i = 0; i < records.length; i++) {
            var d = records[i]
            donors[d.donation_id] = {
                name: d.name,
                amount: d.amount,
                message: d.message
            }
        }
        callback(donors);
    });
};

/* ----------------------------------------------------------------------------------------------
 * Channel / message helpers
 *
 */
CastleBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

CastleBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' && message.channel[0] === 'C';
};

CastleBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

CastleBot.prototype._messageContains = function (message, text) {
    console.log("_messageContains", message.text, text);
    var lower = message.text.toLowerCase()
    var ret = lower.indexOf(text) > -1;
    console.log("Does '", lower, "' contain '", text, "' : ", ret);
    return ret
};

/* ----------------------------------------------------------------------------------------------
 * All message filtering
 *
 */

CastleBot.prototype._passesCastleFilter = function (message) {
    var self = this;
    console.log("_passesCastleFilter");
    return self._messageContains(message, 'castle bot') ||
           self._isCastle37(message) ||
           self._messageContains(message, self.name) ||
           self._messageContains(message, self.user.id);
};

CastleBot.prototype._isCastle37 = function (message) {
    var self = this;
    console.log('_isCastle37');
    return self._messageContains(message, 'castle37');
};

CastleBot.prototype._isForCastleBot = function (message) {
    var self = this;
    console.log("_isForCastleBot");
    if (self._isChatMessage(message) && self._isChannelConversation(message) && !self._isFromCastleBot(message) && self._passesCastleFilter(message)) {
        return true;
    }
    return false;
};

CastleBot.prototype._isFromCastleBot = function (message) {
    return message.user === this.user.id;
};


module.exports = CastleBot;
