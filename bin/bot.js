#!/usr/bin/env node

'use strict';

/**
 * CastleBot launcher script.
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */

var CastleBot = require('../lib/castlebot');

/**
 * Environment variables used to configure the bot:
 *
 *  BOT_API_KEY : the authentication token to allow the bot to connect to your slack organization. You can get your
 *      token at the following url: https://<yourorganization>.slack.com/services/new/bot (Mandatory)
 *  BOT_DB_PATH: the path of the SQLite database used by the bot
 *  BOT_NAME: the username you want to give to the bot within your organisation.
 */
var token = process.env.CASTLEBOT_API_KEY || require('../token')
var dbPath = process.env.CASTLEBOT_DB_PATH
var name = process.env.CASTLEBOT_NAME
var goFundMe = process.env.CASTLEBOT_GO_FUND_ME
var refreshRate = process.env.CASTLEBOT_REFRESH_RATE

var castlebot = new CastleBot({
    token: token,
    dbPath: dbPath,
    name: name,
    goFundMe: goFundMe,
    refreshRate: refreshRate
})

castlebot.run()
