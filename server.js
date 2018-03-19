var mongoose = require('mongoose');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const checkProxy = require('check-proxy').check;
process.setMaxListeners(0);
var Proxy = require(__dirname + '/models/Proxy.js');
mongoose.connect("mongodb://localhost/proxycombain");
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/proxy/getall', (req, res) => {
    Proxy.find((er, rez) => {
        res.json(rez);
    });
});
app.get('/proxy/get', (req, res) => {
    Proxy.findOne().sort({
        date: -1
    }).limit(1).exec((er, rez) => {
        res.json(rez);
    });
});
http.listen(3333, function() {
    console.log('listening on *:3333');
});
io.on('connection', function(socket) {
    socket.on('addProxies', function(proxies, clb) {
        var regprox = /[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}:[0-9]{1,5}/g;
        var proxylist = proxies.match(regprox);
        proxylist = [...(new Set(proxylist))];
        proxylist = proxylist.map(ipport => {
            var ipports = ipport.split(":");
            return {
                ipport,
                port: ipports[1],
                ip: ipports[0],
            }
        });
        if (proxylist) {
            var bulk = Proxy.collection.initializeOrderedBulkOp();
            proxylist.forEach((el) => {
                bulk.find(el).upsert().updateOne(el);
            });
            bulk.execute(function(er, rez) {
                if (rez) {
                    var upserted = rez.getRawResponse().upserted;
                    if (upserted && upserted.length > 0) {
                        upserted = upserted.map((el) => {
                            var i = el.index;
                            proxylist[i]._id = el._id;
                            el = proxylist[i];
                            return el;
                        });
                        socket.emit('updateProxy', upserted);
                    }
                    clb("Добавленно " + rez.nUpserted + " записей");
                } else {
                    clb("Не добавленно");
                }
            });
        } else {
            clb("Не переданно не 1 прокси");
        }
    });
});
(async () => {
    await Proxy.update({
        lock: true
    }, {
        lock: false
    }, {
        multi: true
    });
    while (true) {
        var proxy = await Proxy.findOne().or([{
            lock: false
        }, {
            lock: null
        }]).sort({
            date: 1
        }).limit(1);
        proxy.date = Date.now();
        proxy.lock = true;
        proxy.protocol = "none";
        await proxy.save();
        try {
            var rez = await checkProxy({
                testHost: 'proxychecker.bro-dev.tk',
                proxyIP: proxy.ip,
                proxyPort: proxy.port,
                localIP: "188.134.2.171",
                connectTimeout: 8,
                timeout: 32,
                websites: [{
                    name: 'pickabu',
                    url: 'https://pikabu.ru/html.php?id=terms',
                    regex: /BlackBears/gim, // expected result - regex
                }],
            });
            if (rez[0]) {
                proxy.protocol = rez[0].protocol;
                proxy.supportsHttps = rez[0].supportsHttps;
                proxy.anonymityLevel = rez[0].anonymityLevel;
                proxy.pickabu = (typeof rez[0].websites.pickabu) == "object";
                console.dir("good");
                console.dir(proxy.ip);
                proxy.good.push({
                    date: Date.now()
                });
            } else {
                throw ("прокси не работает");
            }
        } catch (er) {
            console.dir(er);
            console.dir(proxy.ip);
            proxy.bad.push({
                date: Date.now()
            });
        } finally {
            await io.emit('updateProxy', [proxy]);
            proxy.lock = false;
            await proxy.save();
        }
    }
})()