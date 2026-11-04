// Se ejecuta al compilar: cifra app/index.html (queda app/app.bin) y pone la clave dentro de main.js.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { encrypt } = require('./crypt');
const src = path.join(__dirname, 'app', 'index.html'), dst = path.join(__dirname, 'app', 'app.bin'), mainP = path.join(__dirname, 'main.js');
if (!fs.existsSync(src)) { console.log('Nada que proteger.'); process.exit(0); }
const key = crypto.randomBytes(32).toString('hex');
const m = fs.readFileSync(mainP, 'utf8');
if (!m.includes('__CLAVE__')) throw new Error('main.js no tiene el marcador de clave');
fs.writeFileSync(dst, encrypt(fs.readFileSync(src), key));
fs.unlinkSync(src);
fs.writeFileSync(mainP, m.replace('__CLAVE__', key));
console.log('App protegida.');
