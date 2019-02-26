"use strict";
process.setMaxListeners(0);
process.on('unhandledRejection', (reason, p) => {
    //console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
var mongoose = require('mongoose');
const cheerio = require('cheerio');
//mongoose.set('debug', true);
var Proxy = require(__dirname + '/models/Proxy.js');
var Page = require(__dirname + '/models/Page.js');
var SearchLog = require(__dirname + '/models/SearchLog.js');
mongoose.connect("mongodb://localhost/proxycombain");
var url = require('url');
var puppeteer = require('puppeteer');

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}
var getPage = async function(url) {
    var html = "";
    try {
        var args = [];
        //args.push('--user-data-dir=' + __dirname + '/pathtoprofile/');
        var browser = await puppeteer.launch({
            //  args: args,
        });
        var page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36");
        await page.goto(url, {
            "waitUntil": "networkidle0"
        });
        if (await page.$(".cf-browser-verification") != null) {
            await sleep(5000);
            await page.goto(url, {
                "waitUntil": "networkidle0"
            });
        };
        html = await page.evaluate(() => document.body.innerHTML);
        /*return new Promise(resolve => {
            try {
                thread++;
                cloudscraper.get(url, function(er, hz, data) {
                    resolve(data);
                });
            } catch (error) {
                resolve(error);
            } finally {}
        });*/
    } catch (er) {
        console.dir(er)
    } finally {
        await sleep(111);
        /*await page.close().catch(function() {
            console.dir(arguments);
        });*/
        await browser.close().catch(function() {
            console.dir(arguments);
        });
        await sleep(111);
        //console.dir(close);
    }
    return html;
};
const objToAr = function(obj) {
    let r = [];
    for (let key in obj) {
        r.push(key);
    }
    return r;
}
const arToObj = function(ar) {
    let r = {};
    try {
        for (let el of ar) {
            r[el] = true;
        }
    } catch (er) {
        console.error(er);
        console.error(ar);
    }
    return r;
}
const getLinksFromHtml = function(rawHtml, urlin) {
    var myurl = urlin;
    var urlrsrs = url.parse(myurl);
    var host = urlrsrs.protocol + "//" + urlrsrs.hostname;
    var hrefs = [];
    const $ = cheerio.load(rawHtml);
    $("a").each((i, el) => {
        hrefs.push($(el).attr("href"));
    });
    hrefs = hrefs.filter((el) => {
        if (!el) return false;
        if (el[0] == "j") return false;
        if (el[0] == "#") return false;
        return true
    });
    hrefs = hrefs.map((el) => {
        if (el[el.length] == "/") el = el.slice(0, -1);
        if (el[0] == "h") return el;
        if (el[0] == "/") return host + el;
        return host + "/" + el;
    });
    return hrefs;
};
var addProxiesToDB = function(rawHtml) {
    function getAllRegexp(str) {
        var regprox = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})[^0-9]{1,100}?([0-9]{2,5})/gs;
        var rez = [];
        var m;
        do {
            m = regprox.exec(str);
            if (m && m[1] && m[2]) {
                rez.push([m[1], m[2]]);
            }
        } while (m !== null)
        return rez;
    }
    var regexpstyle = /<style[^>]*>.*?<\/style>/gs;
    var regexpscript = /<script[^>]*>.*?<\/script>/gs;
    var regexptag = /<.*?>/gs;
    rawHtml = rawHtml.replace(regexpstyle, " ");
    rawHtml = rawHtml.replace(regexpscript, " ");
    rawHtml = rawHtml.replace(regexptag, " ");
    var proxylist = getAllRegexp(rawHtml);
    //console.dir(proxylist);
    //return;
    if (proxylist.length != 0) {
        var bulk = Proxy.collection.initializeOrderedBulkOp();
        proxylist.forEach((el) => {
            if (!el[0] || !el[1]) {
                return;
            }
            bulk.find({
                ipport: el[0] + ":" + el[1],
            }).upsert().updateOne({
                ipport: el[0] + ":" + el[1],
                ip: el[0],
                port: el[1],
            });
        });
        bulk.execute(function(er, rez) {
            //
        }, {
            w: 0
        });
    } else {}
    return proxylist.length;
}
var sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const insertLinksToDb = async(links) => {
    links = objToAr(arToObj(links));
    links = links.map(url => ({ url }));
    var bulk = Page.collection.initializeOrderedBulkOp();
    for (let link of links) {
        //console.dir(link);
        bulk.find(link).upsert().updateOne(link);
    }
    bulk.execute(function(er, rez) {
        //console.dir("link.Insert");
        //console.dir(JSON.stringify(arguments));
    }, {
        w: 0
    });
}

const getLinkFromSearch = async() => {
    let urls = [
        "https://duckduckgo.com/?q=proxy+list+free&t=h_&df=m&ia=web",
        "https://www.google.ru/search?q=proxy+list+free&tbs=qdr:m&num=100",
        "https://www.yandex.ru/search/?text=proxy%20list%20free&lr=2&within=2",
        "https://search.aol.com/aol/search?q=proxy+list+free&v_t=na&ei=UTF-8&fr2=time&age=1m&btf=m",
        "https://www.ask.com/web?q=proxy+list+free",
        "https://search.yahoo.com/search?p=proxy+list+free&ei=UTF-8&fp=1&fr2=time&age=1m&btf=m&fr=yfp-t",
        "https://www.bing.com/search?q=proxy+list+free&filters=ex1%3a%22ez3%22"
    ];
    //console.dir("step 1");
    let htmls = [];
    for (let url of urls) {
        let html = await getPage(url)
        htmls.push(html);
        console.dir(url);
        console.dir(html.length);
    }
    //console.dir("step 2");
    let links = {};
    for (let i = htmls.length; i--;) {
        Object.assign(links, arToObj(getLinksFromHtml(htmls[i], urls[i])));
    }
    htmls = false;
    //console.dir("links.length");
    links = shuffle(objToAr(links))
    let linkslength = links.length
    //console.dir(linkslength);
    for (let url of links) {
        //console.dir(linkslength--);
        //console.dir(url);
        let html = await getPage(url)

        //console.dir(html.length);
        let linksinner = getLinksFromHtml(html, url);
        linksinner.push(url);
        insertLinksToDb(linksinner);
    }
    //console.dir("end");

};
module.exports = async() => {
    var thread = 0;
    var maxthread = 2;

    (async() => {
        while (true) {
            if (thread >= maxthread) {
                await sleep(1000);
                continue;
            }
            let page = await Page.aggregate([
                { $match: { $or: [{ dateGrab: null }, { dateGrab: { $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000) }, proxyNumber: { $gte: 5 } }] } },
                { $sample: { size: 1 } }
            ])
            if (page.length === 0) {
                await sleep(60000);
                continue;
            }
            thread++;
            (async(pagedoc) => {
                let page = await Page.findOne(pagedoc);
                let html = await getPage(page.url);
                let proxyNumber = addProxiesToDB(html);
                if (proxyNumber >= 5) {
                    console.dir(page.url);
                    console.dir(proxyNumber);
                    let links = getLinksFromHtml(html, page.url);
                    insertLinksToDb(links);
                } else {
                    //await page.remove();
                }
                page.proxyNumber = proxyNumber;
                page.dateGrab = Date.now();
                page.save();
                thread--;
            })(page[0]);
        }
    })();
    while (true) {
        let searchLog = await SearchLog.findOne({ date: { $gte: new Date(new Date() - 28 * 60 * 60 * 24 * 1000) } })
        if (!searchLog) {
            console.dir("start getLinkFromSearch");
            await getLinkFromSearch();
            let searchLog = new SearchLog({
                date: Date.now()
            });
            await searchLog.save();
        }
        await sleep(600000)
    }
}