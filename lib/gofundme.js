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

function getDonorData(html) {
    var $ = cheerio.load(html);
    var donations = parseInt($('div > div.donerscroll > span:nth-child(4)').text());
    donations += 1; 
    var nums = $('div > div.donerscroll > span:nth-child(3)').text();
    var startNum = parseInt(nums.split("-")[0])
    var i = 0;
    var donors = {}
    console.log(donations);
    $('div.doner').each(function(index, element){
        var index = donations - (startNum + i )
        var amountHtml = $(element).find("div.damt").text()
        var numb = amountHtml.match(/\d/g);
        var amount = parseInt(numb.join(""))
        donors[index] = {
            "name" : $(element).find("div.dname").text(),
            "message" : $(element).find("div.dcom").text(),
            "amount" : amount,
        }
        i += 1;
    });
    return donors
}

function recurseDonors(page, callback, preDonators) {
    page.evaluate(function() {
        return document.querySelector('div[class="donate_right"]').innerHTML
    }).then(function(html){
        var donors = merge(getDonorData(html), preDonators);
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
                        recurseDonors(page, callback, donors);
                    });
                }, 500);
            }
            else{
                callback(donors);
            }
        });
    });
}

function goFundMe(input, callback) {
    phantom.create().then(function(ph) {
        ph.createPage().then(function(page) {
            page.open(input.url).then(function(status) {
                page.property('content').then(function(content) {
                    var $ = cheerio.load(content),
                            title = $('.pagetitle').text(),
                            currency = $('div.raised > span.cur').text(),
                            goal = $('div.raised > span.goal').text().replace(currency, ""),
                            goalNumber = getNumber(goal),
                            donations = parseInt($('div.donate_right > div > div.donerscroll > span:nth-child(4)').text());
                            amountHtml = $("div.raised").text()
                    var numb = amountHtml.split('of')[0].match(/\d/g);
                    var amount = parseInt(numb.join(""))
                    var amountNumber = getNumber(amount)
                    var percentage = amountNumber / (goalNumber / 100 )
                    recurseDonors(page, function(donors){
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
