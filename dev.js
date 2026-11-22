// Tiny local server: serves the site + /api functions (same code Vercel runs). Usage: npm start
const http=require('http'),fs=require('fs'),path=require('path');
try{for(const l of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!l.trim().startsWith('#'))process.env[m[1]]??=m[2].replace(/^["']|["']$/g,'')}}catch{console.log('! No .env file: copy .env.example to .env (needed for online payments)')}
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
http.createServer(async(q,s)=>{const p=decodeURIComponent(new URL(q.url,'http://x').pathname);
if(p.startsWith('/api/')){const n=path.basename(p.slice(5)),f=path.join(__dirname,'api',n+'.js');if(n.startsWith('_')||!fs.existsSync(f)){s.statusCode=404;return s.end('{}')}
let b='';for await(const c of q)b+=c;q.rawBody=b;try{q.body=b?JSON.parse(b):{}}catch{q.body={}}
s.status=c=>(s.statusCode=c,s);s.json=o=>(s.setHeader('Content-Type','application/json'),s.end(JSON.stringify(o)));return require(f)(q,s)}
let f=path.join(__dirname,p==='/'?'index.html':p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f+='.html';
if(!f.startsWith(__dirname)||/[\\/]\./.test(p)||!fs.existsSync(f)||/[\\/](node_modules|api)[\\/]/.test(p)){s.statusCode=404;s.setHeader('Content-Type','text/html');return fs.createReadStream(path.join(__dirname,'404.html')).pipe(s)}
s.setHeader('Content-Type',T[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(s)}).listen(3000,()=>console.log('Hasta-Kala running at http://localhost:3000'));
