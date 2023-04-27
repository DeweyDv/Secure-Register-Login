const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const config = require('./config.json');
const application = express();
const server = http.createServer(application);
const tunnel = socketio(server);
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

application.use(express.static(path.join(__dirname, config.serve_client)));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: config.mysql_pass,
  database: config.serve_database,
  port: config.mysql_port,
});

const loginAttempts = {};
const connections = {}

const captchas = {
  'zVQ4JC4NY0VIEWc3wIG3': { solve: '13' },
  'iUrykoTv6IcsLjScrY2W': { solve: '3' },
  'DcSpixnVvM9UuuPNQh8t': { solve: '9' },
  'knz1VFaXIosAjCRJRGXn': { solve: '10' },
  'j2JY3UjI2vlLCb7V15n7': { solve: '12' },
};

// tcp authentication
tunnel.use((tcp, next) => {
  const token = tcp.handshake.auth.token;
  if (token == `${Math.SQRT1_2 + Math.LOG10E + Math.LN10}`) {
    next();
  } else {
    tcp.disconnect(0)
  }
});

tunnel.on('connection', (tcp) => {
  const captchaToken = Object.keys(captchas)[Math.floor(Math.random() * Object.keys(captchas).length)];

  connections[tcp.id] = {
    tcp_id: tcp.id,
    captcha: captchaToken,
  };

  tcp.emit('captcha', captchaToken);

  // START ACCOUNT CREATION
  tcp.on('create_account', (input_username, input_mail, input_password, input_password_verify, captchax) => {

    const regex = /[^a-zA-Z0-9]/g;
    input_username = input_username.replace(regex, '');
    input_mail = input_mail.replace(regex, '');
    input_password = input_password.replace(regex, '');
    input_password_verify = input_password_verify.replace(regex, '');
    captchax = captchax.replace(regex, '');

    if (tcp.id === connections[tcp.id].tcp_id) {
      const captchaToken = connections[tcp.id].captcha;
      const captcha = captchas[captchaToken];
      if (captcha && captcha.solve === captchax) {

        const xssRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        if (xssRegex.test(input_username) || xssRegex.test(input_mail) || xssRegex.test(input_password)) {
          tunnel.emit('message', 'Invalid input');
          return;
        }
        if (input_username.length > 30 || input_mail.length > 100 || input_password.length < 3 || input_password.length > 40) {
          tunnel.emit('message', 'Invalid input');
          return;
        }
        if (input_password !== input_password_verify) {
          tunnel.emit('message', 'Password not match');
          return;
        }
        const selectSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const selectValues = [input_username, input_mail];
        connection.query(selectSql, selectValues, (error, results, fields) => {
          if (error) {
            console.error(error);
          } else if (results.length > 0) {
            tunnel.emit('message', 'Username or email already exists');
          } else {
            bcrypt.hash(input_password, 10, (err, hash) => {
              if (err) {
                console.error(err);
              } else {
                const insertSql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
                const insertValues = [input_username, input_mail, hash];
                connection.query(insertSql, insertValues, (error, results, fields) => {
                  if (error) {
                    console.error(error);
                  } else {
                    tunnel.emit('message', 'Account created successfully.');
                  }
                });
              }
            });
          }
        });
      } else {
        tcp.emit('message', 'Invalid math answer.');
      }
    }

  });
  // END ACCOUNT CREATION

  // START ACCOUNT LOGIN
  tcp.on('login_account', (input_username, input_password) => {
    var client_ipv4 = tcp.handshake.address;
  
    if (loginAttempts[client_ipv4] && loginAttempts[client_ipv4] >= 3) {
      tunnel.emit('message', 'Too many login attempts. Please try again later.');
      return;
    }
  
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [input_username], (error, results, fields) => {
      if (error) {
        console.error(error);
      } else if (results.length === 0) {
        loginAttempts[client_ipv4] = (loginAttempts[client_ipv4] || 0) + 1;
        tunnel.emit('message', 'Invalid username or password');
      } else {
        const user = results[0];
        bcrypt.compare(input_password, user.password, (err, result) => {
          if (err) {
            console.error(err);
          } else if (result) {
            tunnel.emit('update_stats',  user.username, user.balance, 1);
            tunnel.emit('message', 'Login successful.');
          } else {
            loginAttempts[client_ipv4] = (loginAttempts[client_ipv4] || 0) + 1;
            tunnel.emit('message', 'Invalid username or password');
          }
        });
      }
    });
  
    setTimeout(() => {
      delete loginAttempts[client_ipv4];
    }, 60000);
  });
  
  // END ACCOUNT LOGIN

  // START ON DISCONNECT
  tcp.on('disconnect', ()=> {
    delete connections[tcp.id];
  });
  // END ON DISCONNECT

});

server.listen(config.http_port, () => {
  console.log(`Server started on http://*:${config.http_port}`);
});