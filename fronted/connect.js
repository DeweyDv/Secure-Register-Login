var playtopus = [] || {}

document.addEventListener('DOMContentLoaded', function () {
    const elements = [
        "/html/body/div[2]/playtopus/button",
        "/html/body/alertbox/alertbox_text",
        "/html/body/alertbox",
        "/html/body/div[2]"
    ]
    function document_path_finder(data) {
        return document.evaluate(data, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    if (window.top !== window) {
        document.write(`Playtopus client error.`)
        if (tunnel.connected) {
            tunnel.disconnect();
        }
    }

    const tunnel = io({
        auth: { token: `${Math.SQRT1_2 + Math.LOG10E + Math.LN10}` }
    });

    const captchas = {
        'zVQ4JC4NY0VIEWc3wIG3': { solve: '4 + 9 = ?' },
        'iUrykoTv6IcsLjScrY2W': { solve: '1 + 2 = ?' },
        'DcSpixnVvM9UuuPNQh8t': { solve: '0 + 9 = ?' },
        'knz1VFaXIosAjCRJRGXn': { solve: '7 + 3 = ?' },
        'j2JY3UjI2vlLCb7V15n7': { solve: '8 + 4 = ?' },
    };

    const containers = document.getElementsByClassName('container');

    tunnel.on('connect', () => {
        containers[0].style.display = 'none';
        containers[1].style.display = 'block';
        playtopus.push(tunnel)
    });
    tunnel.on('disconnect', () => { call_alert('Connection closed.', Number(Number.MAX_SAFE_INTEGER) / 10000) });
    tunnel.on('error', () => { call_alert('Connection error.', Number(Number.MAX_SAFE_INTEGER) / 10000) });
    tunnel.on('message', (msg) => {
        call_alert(msg, 2)
        if (msg == 'Login successful.') {
            setTimeout(() => {
                location.href = "../home"
            }, 2000)
        } else if (msg == 'Account created successfully.') {
            setTimeout(() => {
                location.href = "../index.html"
            }, 2000)
        }
    })
    function call_alert(message, time) {
        document_path_finder(`${elements[3]}`).style.opacity = '0.1'
        document_path_finder(`${elements[2]}`).style.display = 'block';
        document_path_finder(`${elements[1]}`).innerHTML = message;
        setTimeout(() => {
            document_path_finder(`${elements[3]}`).style.opacity = '1'
            document_path_finder(`${elements[2]}`).style.display = 'none';
            document_path_finder(`${elements[1]}`).innerHTML = 'Loading...'
        }, time * 1000)
    }
    tunnel.on('captcha', (token) => {
        playtopus.push(token)
    })
    tunnel.on('update_stats', (username, currency, days) => {
        console.log(username, currency, days);
        username = username.toString();
        currency = currency.toString();
        var start_date = new Date();
        start_date.setTime(start_date.getTime() + (days * 24 * 60 * 60 * 1000));
        var username_data = `username=${username};expires=${start_date.toUTCString()};path=/`;
        var currency_data = `currency=${currency};expires=${start_date.toUTCString()};path=/`;
        document.cookie = username_data;
        document.cookie = currency_data;
    })
    if (window.location.pathname == '/register/') {
        document_path_finder(`${elements[0]}`).onclick = function () {
            console.log('Register')
            if (captchas.hasOwnProperty(playtopus[1])) {
                var solve = captchas[playtopus[1]].solve;
                var client_input = prompt(solve);
                let input_username = document.getElementById('username').value;
                let input_mail = document.getElementById('email').value;
                let input_password = document.getElementById('password').value;
                let input_password_verify = document.getElementById('confirm-password').value;
                tunnel.emit('create_account', input_username, input_mail, input_password, input_password_verify, client_input)
            } else {
                call_alert('No captcha token found. Try again.', 5)
            }
        }
    } else if (window.location.pathname == '/' || window.location.pathname == '/index.html' || window.location.pathname == 'index') {
        document_path_finder(`${elements[0]}`).onclick = function () {
            console.log('Login')
            let input_username = document.getElementById('username').value;
            let input_password = document.getElementById('password').value;
            tunnel.emit('login_account', input_username, input_password)
        }
    } else if (window.location.pathname == '/home/' || window.location.pathname == '/home/index.html') {
        const local_Data = document.cookie.split(';');
        let username, currency;
        for (let i = 0; i < local_Data.length; i++) {
            const cookie = local_Data[i].trim();
            if (cookie.startsWith('username=')) {
                username = cookie.substring('username='.length, cookie.length);
            } else if (cookie.startsWith('currency=')) {
                currency = cookie.substring('currency='.length, cookie.length);
            }
        }
        if (!username || !currency) {
            location.href = '../index.html'
        } else {
            document.getElementsByClassName('username')[0].innerHTML = username;
            document.getElementsByClassName('money')[0].innerHTML = 'PlayCoins: ' + currency;
        }
    }
});