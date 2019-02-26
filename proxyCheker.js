const mongoose = require('mongoose');
const checkProxy = require('check-proxy').check;
const Proxy = require(__dirname + '/models/Proxy.js');
mongoose.connect("mongodb://localhost/proxycombain");
//mongoose.set('debug', true);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let broProxyCheck = async function(proxy) {
    if ((proxy.dateGood && (Date.now() - proxy.dateGood) >= 259200000) || (!proxy.dateGood && (Date.now() - proxy.dateAdd) >= 259200000)) {
        //удаляем если прошло 3 суток
        //console.dir("del");
        //console.dir(proxy.ipport);
        await proxy.remove();
        return;
    }
    try {
        let rez = await checkProxy({
            testHost: 'proxychecker.bro-dev.tk',
            proxyIP: proxy.ip,
            proxyPort: proxy.port,
            localIP: "188.242.32.158",
            connectTimeout: 8,
            timeout: 32,
            /*websites: [{
                name: 'pickabu',
                url: 'https://pikabu.ru/html.php?id=terms',
                regex: /cs\.pikabu\.ru/gim, // expected result - regex
            }],*/
        });
        if (rez[0]) {
            proxy.protocol = rez[0].protocol;
            proxy.supportsHttps = rez[0].supportsHttps;
            proxy.anonymityLevel = rez[0].anonymityLevel;
            //proxy.pickabu = (typeof rez[0].websites.pickabu) == "object";
            //console.dir("good " + proxy.ip + ":" + proxy.port);
            proxy.good++;
            proxy.dateGood = Date.now();
            proxy.isGoodInLastTest = true;
        } else {
            throw ("прокси не работает");
        }
    } catch (er) {
        //console.dir(er + " " + proxy.ip + ":" + proxy.port);
        proxy.isGoodInLastTest = false;
        proxy.bad++;
    } finally {
        //console.dir("unlock");
        proxy.lock = false;
        await proxy.save({
            upsert: true
        });
        return;
    }
};
module.exports = async function() {
    let instance = 0;
    let maxInstance = 100;
    await Proxy.update({
        lock: true
    }, {
        lock: false
    }, {
        multi: true
    });
    while (true) {
        await sleep(111);
        await (async() => {
            //console.dir("потоков" + instance + "/" + maxInstance);
            if (instance >= maxInstance) {
                await sleep(1111);
                return;
            }
            let proxy = await Proxy.findOneAndUpdate({
                lock: {
                    $in: [false, null]
                }
            }, {
                dateTest: Date.now(),
                lock: true,
            }, {
                sort: {
                    dateTest: 1
                },
                upsert: true,
            });
            proxy.lock = true;
            try {
                if (proxy.ip && proxy.port) {
                    broProxyCheck(proxy).then(() => {
                        instance--;
                    });
                    instance++;
                } else {
                    console.dir(proxy);
                    console.dir("wat?");
                    await sleep(1111);
                }
            } catch (er) {
                console.error(er);
            }
        })()
    }
}