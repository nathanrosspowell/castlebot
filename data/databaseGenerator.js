'use strict';

/**
 * Command line script that generates a SQLite database file that contains tables for GoFundMe data.
 *
 * Usage:
 *
 *   node databaseGenerator.js [destFile]
 *
 *   destFile is optional and it will default to "castlebot.db"
 */

var path = require('path');
var request = require('request');
var Async = require('async');
var ProgressBar = require('progress');
var sqlite3 = require('sqlite3').verbose();
var GoFundMe = require('./../lib/gofundme');

var outputFile = process.argv[2] || path.resolve(__dirname, 'castlebot.db');
var db = new sqlite3.Database(outputFile);

// Prepares the database connection in serialized mode
db.serialize();
// Creates the database structure
db.run('CREATE TABLE info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
db.run('CREATE TABLE campaign (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
db.run('CREATE TABLE donors (id INTEGER PRIMARY KEY, donation_id INTEGER, name TEXT, amount INTEGER, message TEXT)');
// Get the GoFundMe data.
var input = {
    //url: 'https://www.gofundme.com/39t6wr3c'
    url: 'https://www.gofundme.com/tprseancullen'
}
console.log("GoFundMe: " + input.url);
GoFundMe(input, function(data){
    console.log("Adding", data.donations, "records...");
    for ( var i in data.donors ) {
        var d = data.donors[i];
            console.log(i, d);
        db.run('INSERT INTO donors (donation_id, name, amount, message) VALUES (?,?,?,?)',
                [i, d.name, d.amount, d.message],
                function (err) {
            if (err) {
                console.log("ERR:", err);
            }
        });
    }
    db.close();
});
