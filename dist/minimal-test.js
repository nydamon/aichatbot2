"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const restify = require('restify');
const server = restify.createServer();
server.get('/', function (req, res, next) {
    res.send('Hello');
    next();
});
server.listen(3978, function () {
    console.log('Server running');
});
//# sourceMappingURL=minimal-test.js.map