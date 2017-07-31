$(document).ready(function() {

    window.CHAT = {
        user: null,
        toUser: { _guid: 1 },
        socket: null,
        // 设置用户唯一标识
        _guid: function() {
            return new Date().getTime() + "" + Math.floor(Math.random() * 899 + 100);
        },
        // 注册
        registe: function() {
            var username = $("#r_username").val();
            var password = $("#r_password").val();
            var confirmpwd = $("#confirmpwd").val();
            if (username.trim().length != 0) {
                if (password.trim().length != 0 && password == confirmpwd) {
                    var newUser = {
                        "name": username,
                        "pwd": password,
                        "_guid": this._guid()
                    }
                    $.ajax({
                        url: '/registe?' + new Date(),
                        type: 'POST',
                        data: newUser,
                        success: function(selfNum, status, err) {
                            if (status == "success") {
                                $("#registe_tab").removeClass('active');
                                $("#registe").removeClass('active');
                                $("#login").addClass('active');
                                $("#login_tab").addClass('active');
                                $(".message").html("请使用登录码：<i><b class='number'>" + JSON.parse(selfNum)._index + "</b></i>登录").slideDown();
                            };
                        }
                    })
                };
            }
            return false;
        },
        login: function() {
            var userNum = $("#l_userNum").val();
            var pwd = $("#l_password").val();
            if (userNum.trim().length != 0 && pwd.trim().length != 0) {
                var user = {
                    "userNum": userNum,
                    "pwd": pwd
                }
                var that = this;
                $.ajax({
                    url: '/login',
                    type: 'POST',
                    // dataType: 'default: Intelligent Guess (Other values: xml, json, script, or html)',
                    data: user,
                    success: function(user, status) {
                        $("#login_registe_js").hide();
                        $("#wrapper").show();
                        that.init(JSON.parse(user));

                    }
                });
            };
        },
        init: function(user) {
            this.user = user;

            $(".self").html(user.name);

            //连接websocket后端服务器
            this.socket = io.connect();
            var that = this;

            //告诉服务器端有用户登录
            this.socket.emit('login', user);

            this.newRoom(this.user);
            $("#send").on("click", function() {
                var msg = $("#msg").val();
                if (msg.trim().length != 0) {
                    that.sendMsg(msg);
                };

            });
            // 加载列表
            var uList = [];

            this.socket.on('userlist', function(obj) {
                uList = obj.list;
                // 有新用户登录时，更新在线用户的列表
                that.socket.on('updateList', function(newUser) {
                        var f = true;
                        for (var i in uList) {
                            if (uList[i]._index == newUser._index) {
                                f = false;
                            }
                        }
                        if (f) {
                            uList.push(newUser);
                        };
                        if (newUser.name == $(".to").html()) {
                            alert("对方已上线，可以继续聊天了哦~");

                        };
                        $(".user").remove();
                        for (var key in uList) {
                            if (uList[key].online == true) {
                                var html = '';
                                html += '<li class="user">';
                                html += '<a href="javascript:;" >';
                                html += "<span class='_index'>" + uList[key]._index + "</span>" + "----";
                                html += "<span class='_name'>" + uList[key].name + "</span>";
                                html += "<span class='newMsgTip  pull-right'></span>"
                                html += '</a>';
                                html += '</li>';
                                $(".userList").append(html);
                            };
                            uList[key]['msgArr'] = [];

                        };

                        // 双击创建房间
                        $('.user').on('dblclick', function() {
                            var to = $($(this)[0]).children('a').children('._index').html();
                            for (var key in uList) {
                                if (uList[key]._index == to) {
                                    that.toUser = uList[key];
                                    that.newRoom(that.toUser);
                                };
                            }
                            var toName = $($(this)[0]).children('a').children('._name').html();
                            $(".to").html(toName);
                            for (var key in that.toUser.msgArr) {
                                var isW = (that.toUser.msgArr[key].flag == "word") ? true : false,
                                    isme = (that.user._guid == that.toUser.msgArr[key].from._guid) ? true : false,
                                    contentDiv;
                                var fromSpan = '<span class="msgFrom">' + that.toUser.msgArr[key].from.name + '</span>';
                                if (isW) {
                                    contentDiv = '<div class="msgContent">' + that.replace_em(that.toUser.msgArr[key].content) + '</div>';

                                } else {

                                    contentDiv = '<div class="msgContent">' + '<img class="check" src="' + that.replace_em(that.toUser.msgArr[key].content) + '"/>' + '</div>';
                                };
                                var section = '<section class="newMsg service">' + fromSpan + contentDiv + '</section>';
                                if (!isme) {

                                    var msgBox = '<div class="msgWrap">' + section + '</div>';
                                    $("#showMsg").append(msgBox);
                                    that.scrollBottom();
                                };
                            };
                            $($(this)[0]).children('a').children('.newMsgTip').removeClass('new');
                            $('[data-toggle="offcanvas"]').trigger('click');
                            if (!$("._index").siblings('.newMsgTip').hasClass('new')) {
                                $(".newTip i").removeClass('newTip_length');
                            };
                        })

                    })
                    //用户退出时，更新在下列表
                that.socket.on("offline", function(offUser) {
                    for (var j = 0; j < $(".user").length; j++) {
                        if ($($(".user")[j]).children('a').children('._index').html() == offUser._index) {
                            $($(".user")[j]).remove();
                        }

                    }
                    if (offUser.name == $(".to").html()) {
                        alert("对方已下线或断开连接！请选择其他人聊天。");

                    };
                })
            });
            $("#sendImg").on('click', function() {
                var src = $("#preview").attr("src");
                $("#previewBox").stop().hide();
                if (src != '') {
                    that.sendImg(src);
                };
                // src = '';
            });
            this.socket.on('getMsg', function(newObj) {
                newObj = JSON.parse(newObj);

                // 保存消息队列
                for (var key in uList) {
                    if (uList[key]._guid == newObj[newObj.length - 1].from._guid) {
                        uList[key]['msgArr'].push(newObj[newObj.length - 1]);
                        var _user = $("._index");
                        for (var key in _user) {
                            if (_user[key].innerHTML == newObj[newObj.length - 1].from._index) {
                                if (that.user.name == newObj[newObj.length - 1].from.name) {} else {
                                    $(_user[key]).siblings('.newMsgTip').addClass("new")
                                    if ($(".newMsgTip").hasClass('new')) {
                                        $(".newTip i").addClass('newTip_length');
                                    };
                                };
                            };
                        }
                    };
                };

                var isto = (that.toUser._guid == newObj[newObj.length - 1].from._guid) ? true : false;
                var isW = (newObj[newObj.length - 1].flag == "word") ? true : false,
                    // isme = (that.user._guid == newObj[newObj.length - 1].from._guid) ? true : false,
                    contentDiv, fromSpan, section, msgBox;
                if (isto) {

                    for (var j in uList) {
                        if (uList[j]._guid == newObj[newObj.length - 1].from._guid) {
                            fromSpan = '<span class="msgFrom">' + uList[j]['msgArr'][uList[j].msgArr.length - 1]['from'].name + '</span>';
                            if (isW) {
                                contentDiv = '<div class="msgContent">' + that.replace_em(uList[j].msgArr[uList[j].msgArr.length - 1].content) + '</div>';
                            } else {
                                contentDiv = '<div class="msgContent">' + '<img class="check" src="' + that.replace_em(uList[j].msgArr[uList[j].msgArr.length - 1].content) + '"/>' + '</div>';
                            };
                            section = '<section class="newMsg service">' + fromSpan + contentDiv + '</section>';
                            msgBox = '<div class="msgWrap">' + section + '</div>';
                            $("#showMsg").append(msgBox);
                            that.scrollBottom();
                        };
                    }
                    //
                    for (var key in $("._index")) {
                        if ($("._index")[key].innerText == newObj[newObj.length - 1].from._index) {
                            $($("._index")[key]).siblings('.newMsgTip').removeClass('new');


                        };

                    }

                }
            });

        },
        // 创建新房间
        newRoom: function(to) {
            $("#showMsg").html('');
            this.socket.emit('newRoom', {
                    'from': this.user,
                    'to': to
                })
        },
        // 发送消息
        sendMsg: function(msg) {

            if (msg.trim() != '') {
                this.socket.emit('getMsg', {
                    'from': this.user,
                    'to': this.toUser || { _guid: 1 },
                    'project': 'p2p',
                    'flag': 'word',
                    'content': msg
                })
            };
            $("#msg").val('').blur();

            var fromSpan = '<span class="msgFrom pull-right">' + this.user.name + '</span>';
            var contentDiv = '<div class="msgContent pull-right">' + this.replace_em(msg) + '</div>';
            var section = '<section class="newMsg pull-right selfName clearfix">' + fromSpan + contentDiv + '</section>';
            var msgBox = '<div class="msgWrap clearfix">' + section + '</div>';
            $("#showMsg").append(msgBox)

            this.scrollBottom();
        },
        replace_em: function(str) {
            str = str.replace(/\</g, '&lt;');
            str = str.replace(/\>/g, '&gt;');
            str = str.replace(/\n/g, '<br/>');
            str = str.replace(/\[em_([0-9]*)\]/g, '<img src="images/face/$1.gif" border="0" />');
            return str;
        },
        // 发送图片
        sendImg: function(src) {
            if (src != '') {
                this.socket.emit('getMsg', {
                    'from': this.user,
                    'to': this.toUser,
                    'project': 'p2p',
                    'flag': 'img',
                    'content': src
                })
            };
            var fromSpan = '<span class="msgFrom pull-right">' + this.user.name + '</span>';
            var contentDiv = '<div class="msgContent pull-right">' + '<img class="check" src="' + src + '"/>' + '</div>';
            var section = '<section class="newMsg pull-right selfName clearfix">' + fromSpan + contentDiv + '</section>';
            var msgBox = '<div class="msgWrap clearfix">' + section + '</div>';
            $("#showMsg").append(msgBox);
            this.scrollBottom();
        },
        scrollBottom: function() { // 接收新消息时，聊天框自动滚到最下方
            var h = $("#message_box")[0].scrollHeight;

            $("#message_box").scrollTop(h);
        }
    };
    $("#registeBtn").on("click", function() {
        CHAT.registe();
    });
    $("#registeBtn").on("touchstart", function(e) {

        CHAT.registe();
    });
    $("#loginBtn").on("click", function() {
        CHAT.login();
        // CHAT.recMsg();
    });
    $("#loginBtn").on("touchend", function() {
        CHAT.login();
        // CHAT.recMsg();
    });

    $("#img").on("click", function() {
        $("#photo").on('click');
    });
    // 匹配表情字符
    $('#emotion').qqFace({ //表情转换
        'id': 'facebox', //表情盒子的ID
        'assign': 'msg', //给那个控件赋值
        'path': 'images/face/' //表情存放的路径
    });
    $("#msg").blur(function() {
        $("#facebox").css("display", "none");
    });
    // 选择图片并预览
    // var fullPageBtn = $('button.btn');
    $("#photo").on('change', function() {
        var reader = new FileReader();
        reader.onload = function(e) {
            $("#preview").attr("src", this.result);
            $("#preview").css("width", winH + 'px');
            $("#previewBox").hide().stop().fadeIn();
            $("#preview").on('click', function() {
                $("#previewBox").hide();
            });
        }
        reader.readAsDataURL(this.files[0])
    });
    // 点击发送后的图片查看
    var winH = $(".container").innerHeight();
    $("body").delegate('.check', 'click', function() {
        var img = $(this).attr("src");
        $("#check").attr("src", img);
        $("#check").css("width", winH + 'px');
        $("#scan").show();
        $("#check").click(function() {
            $("#scan").hide();
        });
    });
    $("#img").on('click', function() {
        $("#photo").trigger('click');
    });

});
