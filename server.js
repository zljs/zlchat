var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html')
})
http.listen(process.env.PORT || 5000, function() {
    console.log('Server starting on port 5000')
})
var userList = [];
var _index = 1000;
// 在线用户
var onlineUsers = {};
// 注册
app.post('/registe', function(req, res) {
    var newUser = req.body;
    for (var key in userList) {
        if (!onlineUsers.hasOwnProperty(newUser._guid)) {
            onlineUsers[newUser._guid] = newUser.name;
            //总人数+1
            _index++;
        }
    }
    newUser._index = _index;
    newUser.online = false;
    userList.push(newUser)
    res.writeHeader(200, { 'Content-Type': 'text/plain' });
    res.end(JSON.stringify(newUser));
})
// 登录
app.post('/login', function(req, res, next) {
        for (var key in userList) {
            if (req.body.userNum == userList[key]._index) {
                if (req.body.pwd == userList[key].pwd) {
                    userList[key].online = true;
                    res.writeHeader(200, { 'Content-Type': 'text/plain' });
                    res.end(JSON.stringify(userList[key]))
                }
            }
        }
    })
    // 退出
app.post('logout', function(req, res) {
    for (var key in userList) {
        if (req.body.name == userList[key].name) {
            userList[key].online = false;
        }
    }
})
var onlineList = {};
var listServer = {};
var roomServer = {};
io.on('connection', function(socket) {
    console.log('新用户已上线！');
    // 监听登录，更新列表数据
    socket.on('login', function(user) {
            socket.id = user._guid;
            listServer.id = socket;
            listServer.list = userList;
            onlineList[user._index] = user.name;
            socket.emit('userlist', { list: listServer.list });
            io.emit('updateList', user);
        })
    // 新房间
    socket.on('newRoom', function(roomInfo) {
        for (var key in userList) {
            if (userList[key]._index == roomInfo.from._index) {
                socket.id = userList[key]._guid;
                roomServer[userList[key]._guid] = socket;
            };
        }
    });
    // 发送消息
    var msgArr = [];
    socket.on("getMsg", function(obj) {
        for (var key in userList) {
            if (userList[key]._guid == obj.from._guid) {
                if (roomServer.hasOwnProperty(obj.to._guid)) {
                    msgArr.push(obj)
                    roomServer[msgArr] = msgArr;
                    roomServer[obj.to._guid].emit('getMsg', JSON.stringify(roomServer[msgArr]));
                }
            };
        }
    });
    //监听用户退出
    socket.on('disconnect', function() {
        var id = socket.id;
        for (var key in userList) {
            if (userList[key]._guid == id) {
                userList[key].online = false;
                io.emit('offline', userList[key]);
            };
        }
    });
})
