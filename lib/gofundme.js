var phantom = require('phantom');
var cheerio = require('cheerio');
var merge = require('merge'), original, cloned;

function getNumber(value) {
    var goal = value.toString()
    var multiplier = goal[goal.length-1];
    var goalNumber = 0;
    if (multiplier === 'k') {
        goalNumber = parseInt(goal.replace(/[,.]/g, ""));
        goalNumber *= 1000;
    }
    else if (multiplier === 'm'){
        goalNumber = parseFloat(goal.replace(/[,]/g, "."));
        goalNumber *= 1000000
    }
    else {
        goalNumber = parseInt(goal.replace(/[,.]/g, ""));
    }
    return goalNumber
}

function getDonorData(html, lastCount) {
    var $ = cheerio.load(html);
    var donations = getNumber($('div > div.donerscroll > span:nth-child(4)').text());
    donations += 1; 
    var nums = $('div > div.donerscroll > span:nth-child(3)').text();
    var startNum = parseInt(nums.split("-")[0])
    var i = 0;
    var donors = {}
    var earlyBailout = false;
    console.log("getDonorData - ", donations -1, startNum);
    $('div.doner').each(function(index, element){
        var index = donations - (startNum + i )
        var amountHtml = $(element).find("div.damt").text()
        var currency = $(element).find("div.damt > span").text()
        var numb = amountHtml.split(currency,2)[1].match(/\d/g);
        var amount = parseInt(numb.join(""))
        var name = $(element).find("div.dname").text()
        var message = $(element).find("div.dcom").text()

        console.log("NewEntry?", index, name);

        if ( lastCount < index ) {
            donors[index] = {
                "name" : $(element).find("div.dname").text(),
                "message" : $(element).find("div.dcom").text(),
                "amount" : amount,
            }
        }
        else {
            console.log("earlyBailout");
            earlyBailout = true;
        }
        i += 1;
    });
    var numDons =  0;
    for (var i in donors){
        numDons++
    }
    console.log("Adding", numDons);
    return {
        donors: donors,
        earlyBailout: earlyBailout
    }
}

function recurseDonors(page, lastCount, callback, preDonators) {
    console.log("recurseDonors");
    page.evaluate(function() {
        return document.querySelector('div[class="donate_right"]').innerHTML
    }).then(function(html){
        console.log("recurseDonors lastCount", lastCount);
        var newData = getDonorData(html, lastCount)
        var numDons =  0;
        var donors = merge(newData.donors, preDonators);
        for (var i in donors){
            numDons++
        }
        console.log("", numDons);
        if (newData.earlyBailout) {
            console.log("earlyBailout recurseDonors");
            callback(donors)
        }
        else {
            page.evaluate(function(){
                var a = document.querySelector("div > div.donerscroll > a.lr.pright.donationsPage");
                var finished = a === null;
                if ( !finished ) {
                    var e = document.createEvent('MouseEvents');
                    e.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    a.dispatchEvent(e);
                    waitforload = true;
                }
                return finished
            }).then(function(finished){
                if ( !finished ) {
                    setTimeout( function() {
                        page.evaluate(function() {
                            return document.querySelector('div[class="donate_right"]').innerHTML;
                        }).then(function(html){
                            recurseDonors(page, lastCount, callback, donors);
                        });
                    }, 500);
                }
                else{
                    callback(donors);
                }
            });
        }
    });
}

function goFundMe(input, callback) {


console.log("goFundMe")
    phantom.create().then(function(ph) {
        ph.createPage().then(function(page) {
            page.open(input.url).then(function(status) {
                page.property('content').then(function(content) {

console.log("content")

                    var $ = cheerio.load(content),
                            title = $('.pagetitle').text(),
                            currency = $('div.raised > span.cur').text(),
                            goal = $('div.raised > span.goal').text().replace(currency, ""),
                            goalNumber = getNumber(goal),
                            donations = parseInt($('div.donerscroll > span:nth-child(4)').text()),
                            amountHtml = $("div.raised").text()

console.log("vars", donations, goalNumber )
                    var numb = amountHtml.split('of')[0].match(/\d/g);
console.log("amount")
                    var amount = parseInt(numb.join(""))
console.log("amountNumber")
                    var amountNumber = getNumber(amount)
console.log("percentage")
                    var percentage = amountNumber / (goalNumber / 100 )
console.log("lastCount")
                    var lastCount = typeof input.lastCount !== "undefined" ? input.lastCount : 0;
console.log("log")
                    console.log("About to check donors", lastCount);
                    recurseDonors(page, lastCount, function(donors){
                        page.close();
                        ph.exit();
                        if ( callback !== "undefined" ) {
                            var data = {
                                title: title,
                                currency: currency,
                                amount: amount,
                                amountNumber: amountNumber,
                                goal: goal,
                                goalNumber: goalNumber,
                                donations: donations,
                                percentage: percentage,
                                donors: donors
                            }
                            callback(data)
                        }
                    });
                });
            });
        });
    });
}

module.exports = goFundMe
