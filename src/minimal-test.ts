import type { Request, Response, Next } from 'restify';
const restify = require('restify');

const server = restify.createServer();

server.get('/', function(req: Request, res: Response, next: Next) {
    res.send('Hello');
    next();
});

server.listen(3978, function() {
    console.log('Server running');
});
