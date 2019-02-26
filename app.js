process.setMaxListeners(0);
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const server = require(__dirname + "/server.js");
const proxyCheker = require(__dirname + "/proxyCheker.js");
const getProxy = require(__dirname + "/getProxy.js");

server();
proxyCheker();
getProxy();