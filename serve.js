const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const mimes = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req, res) => {
  let p = path.join(dir, req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(p).toLowerCase();
    res.writeHead(200, {'Content-Type': mimes[ext] || 'application/octet-stream'});
    res.end(d);
  });
}).listen(8478, () => console.log('Dreambox at http://localhost:8478'));
