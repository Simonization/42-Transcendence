// Minimal SMTP sink: accepts any mail (any AUTH) and appends each message to a log file.
// The scripts read the log to pick up e-mail verification links and 2FA codes (lib.js: waitMail).
// usage: node smtp.js [port] [logfile]   (defaults come from config.js)
const net = require('net');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const port = Number(process.argv[2] || cfg.SMTP_PORT);
const log = path.resolve(process.argv[3] || cfg.MAIL_LOG);
fs.mkdirSync(path.dirname(log), { recursive: true });

net.createServer((s) => {
  let data = false, buf = '', msg = '';
  s.write('220 sink\r\n');
  s.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (data) {
        if (line === '.') { data = false; fs.appendFileSync(log, msg + '\n=====END=====\n'); msg = ''; s.write('250 ok\r\n'); }
        else msg += line + '\n';
        continue;
      }
      const c = line.slice(0, 4).toUpperCase();
      if (c === 'EHLO') s.write('250-sink\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (c === 'AUTH') s.write('235 ok\r\n');
      else if (c === 'DATA') { data = true; s.write('354 go\r\n'); }
      else if (c === 'QUIT') { s.write('221 bye\r\n'); s.end(); }
      else s.write('250 ok\r\n');
    }
  });
  s.on('error', () => {});
}).listen(port, '127.0.0.1', () => console.log('SMTP sink on', port, '->', log));
