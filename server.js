const express = require('express');
const app = express();
const url = require('url');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const getProxyType = require('check-proxy').ping;
const Proxy = require(__dirname + '/models/Proxy.js');

var mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/proxycombain");

//midleware
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

//http contrilers
const ping = function(req, res) {
    res.json(getProxyType(req.headers, req.query, req.body, req.cookies));
}

//routes   
app.get('/', ping);
app.post('/', ping);
app.get('/good', (req, res) => {
    Proxy.find({ anonymityLevel: 1, supportsHttps: true, isGoodInLastTest: true }, ["ipport"], { sort: { dateTest: -1 } }, (er, rez) => {
        //res.setHeader('Content-type', "application/octet-stream");
        //res.setHeader('Content-disposition', 'attachment; filename=file.txt');
        res.set("proxies-number", rez.length)
        res.send(rez.map(el => el.ipport).join("\r\n"));
    });
});


var http = require('http').Server(app);

var port = 9998;
module.exports = function() {
    http.listen(port, function() {
        console.log('listening on *:' + port);
    });
}