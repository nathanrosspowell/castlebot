# castlebot

This is a Slack Bot to track #castle37.


## Installation

As simple as installing any other global node package. Be sure to have npm and node (`>= 0.10` version, or io.js `>= 1.0`) installed and launch:

```bash
$ npm install -g castlebot
```


## Running the CastleBot

To run the CastleBot you must have an [API token](#getting-the-api-token-for-your-slack-channel) to authenticate the bot on your slack channel. Once you get it (instructions on the next paragraph) you just have to run:


```bash
CASTLEBOT_API_KEY=somesecretkey castlebot
```


## Getting the API token for your Slack channel

To allow the CastleBot to connect your Slack channel you must provide him an API key. To retrieve it you need to add a new Bot in your Slack organization by visiting the following url: https://*yourorganization*.slack.com/services/new/bot, where *yourorganization* must be substituted with the name of your organization (e.g. https://*loige*.slack.com/services/new/bot). Ensure you are logged to your Slack organization in your browser and you have the admin rights to add a new bot.

You will find your API key under the field API Token, copy it in a safe place and get ready to use it.


## Configuration

The CastleBot is configurable through environment variables. There are several variable available:

| Environment variable | Description |
|----------------------|-------------|
| `CASTLEBOT_API_KEY` | this variable is mandatory and must be used to specify the API token needed by the bot to connect to your Slack organization |
| `CASTLEBOT_DB_PATH` | optional variable that allows you to use a different database or to move the default one to a different path |
| `CASTLEBOT_NAME` | the name of your bot, it’s optional and it will default to castlebot |
| `CASTLEBOT_NAME` | the name of your bot, it’s optional and it will default to castlebot |
| `CASTLEBOT_GO_FUND_ME` | the go fund me URL (defaults to 'castle37')|
| `CASTLEBOT_REFRESH_RATE` | the time in seconds between scraping the go fund me URL (defaults to '300', 5 mins)|



## Launching the bot from source

If you downloaded the source code of the bot you can run it using NPM with:

```bash
$ npm start
```

Don't forget to set your `CASTLEBOT_API_KEY` environment variable bedore doing so. Alternatively you can also create a file called `token.js` in the root folder and put your token there (you can use the `token.js.example` file as a reference).


## The Making of

CastleBot is based on the brilliant [NorrisBot](https://github.com/lmammino/norrisbot) and it's tutorial.

The NorrisBot has been developed in collaboration with [Scotch.io](https://scotch.io). A [very detailed article](https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers) has been published to explain every single line of code. It also explains you how to deploy the bot on a free Heroku instance, so you should give it a shot! 

Enjoy your reading!


## License

Licensed under [MIT License](LICENSE). © Luciano Mammino.
