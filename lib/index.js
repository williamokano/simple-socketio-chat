import Express from 'express';
import Http from 'http';
import SocketIO from 'socket.io';
import request from 'request';

const app = new Express();
const server = Http.Server(app);
const io = SocketIO(server);
const port = process.env.PORT || 3000;
let emoticons = {};

request('https://twitchemotes.com/api_cache/v2/global.json', (error, response, body) => {
    if (!error && response.statusCode === 200) {
    emoticons = JSON.parse(body);
}
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let clients = 0;
let nicks = {};

io.on('connection', (socket) => {
    clients++;
// socket.broadcast.emit('chat message', 'Um usuário se conectou');
// io.emit('chat message', `${clients} usuários online`);

socket.on('disconnect', () => {
    clients--;
// io.emit('chat message',  `${socket.nick} caiu fora!`);
// io.emit('chat message', `${clients} usuários online`);
delete nicks[socket.nick];
io.emit('update online', Object.keys(nicks).sort());
});

// Send to the user who's online
//socket.emit('update online', Object.keys(nicks));

socket.on('chat message', (msg) => {
    msg = msg.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
    return '&#' + i.charCodeAt(0) + ';';
});

msg = msg.replace(/OkanoFace/, 'MingLee');
msg = msg.replace(/MaikyFace/, 'ResidentSleeper');
msg = msg.replace(/ThyagoFace/, 'BabyRage');

const twitchEmotes = Object.keys(emoticons.emotes);
twitchEmotes.forEach((item) => {
    let re = new RegExp(`\\b${item}\\b`, 'g');
msg = msg.replace(re, `[img=https://static-cdn.jtvnw.net/emoticons/v1/${emoticons.emotes[item].image_id}/1.0]${item}[/img]`);
});

if (socket.hasOwnProperty('nick')) {
    let regex = /^\/w\s([a-z\u00C0-\u00ffA-Z0-9]+)\s(.*)$/gmi;
    let matches = regex.exec(msg)
    if (matches) {
        const to = matches[1];
        const message = matches[2];

        // Check if not message himself
        if (to !== socket.nick) {

            if (nicks.hasOwnProperty(to)) {
                nicks[to].emit('private chat message', `${socket.nick}: ${message}`);
                socket.emit('private chat message', `${socket.nick}: ${message}`);
            } else {
                socket.emit('chat message', `${to} não encontrado.`);
            }
        } else {
            socket.emit('chat message', 'Can\'t message yourself, dumbass');
        }
    } else {
        io.emit('chat message', `${socket.nick}: ${msg}`);
    }
} else {
    socket.emit('chat message', 'Please register');
}
});

socket.on('digitando', (isTyping) => {
    io.emit('digitando', socket.nick, isTyping);
});

socket.on('register nick', (nick) => {

    let regex = /^([a-z\u00C0-\u00ffA-Z0-9]+)$/gmi;
let matches = regex.exec(nick);
if (matches === null || matches.length === 1) {
    console.log(matches);
    socket.emit('register nick', false);
} else {
    if (!(nick in nicks)) {
        socket.nick = nick;
        nicks[nick] = socket;
        //io.emit('chat message', `${nick} se conectou!`);
        io.emit('update online', Object.keys(nicks).sort());
        socket.emit('register nick', true);
    } else {
        socket.emit('register nick', false);
    }
}
});

});

server.listen(port, () => {
    console.log(`Listening on *:${port}`);
});