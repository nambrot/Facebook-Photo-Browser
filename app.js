var static = require('node-static');
var file = new(static.Server)('./public', {cache: 1});
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response, function (e, res) {
            if (e && (e.status === 404)) { //still serve the index file
                file.serveFile('/index.html', 200, {cache: 84000}, request, response);
            }
        });
    });
}).listen(process.env.PORT || 3000);