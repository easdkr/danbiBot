var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var util = require('util');
var bodyParser = require('body-parser');
app.engine('html',require('ejs').renderFile);
var io = require('socket.io')(http);
const url = require('url');
const wenSocket = require('ws');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var db = mongoose.connection;
var mongodb = require('mongodb').MongoClient;
app.use('/',express.static(__dirname));
app.set('views',__dirname+'/views');
app.set('view engine', 'ejs');
var chatbotCall = "chatbot"
var session = require('express-session');
var cookieParser = require('cookie-parser');
var user_list=[];
var count = 0;
var query;
var question=0;
var isExistDb;//db에 도움말 기능에서 추가할 질문이 있는지 여부 
var scheduleList = [];
var scheduleCount = 0;
var notInDbCommandArray = ["단비야 공부해야지","단비야 나가","단비야 스케쥴러","단비야 스케쥴 보여줘"];
var schedule
var notInDbCommand = "단비야 공부해야지/단비야 나가/단비야 스케쥴러/단비야 스케쥴 보여줘/";
var config = {
    sid : 'Danbibot',
  secret: 'Danbibot2017',
};
var outvoice=['neomuhae.mp3','daddo.mp3','uaaaaa.mp3'];

app.use(cookieParser(config.secret));
app.use(session({
    sid : config.sid,
  secret: config.secret,
  cookie: {  maxAge: 1000 * 60 * 60 }// 쿠키 유효기간 1시간
}));
/*bodyParser setting 해주는 부붑인거 같음 나중에 찾아볼것 */
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

/*db setting*/
var dbaddr = "mongodb://192.168.0.11:27017/testosp";
db.on("error", console.error.bind(console,"connection error:"));
db.once("open",function(){
  console.log("Database connect successfully");
});
mongoose.connect(dbaddr);
/*db setting ok*/

/* 몽고 db 스키마, 모델 만들어주기 나중에 이부분에 계속 추가 해주세요 */
var userSchema = new mongoose.Schema({
  userid:{type:String, require:true},
  password: {type:String, require:true},
  nickname: {type:String, require:true},
  imagePath: {type:String, require:true}
});

var recordSchema = new mongoose.Schema({
  room:{type: String, require:true},
  botStatus: {type: Boolean, require:true},
  record:[{
    time : String,
    writer : String,
    message : String
  }]
});

var userModel = mongoose.model("users",userSchema);
var recordModel = mongoose.model("chat",recordSchema);
/*아이디 체크하는 부분? */
app.post('/checkid', multipartMiddleware, function(req, res){
      console.log("idcheck");
});

/*세션 처리? */
app.get('/', function(req, res){
    if(isLogin(req,res))
    {
      res.redirect('/main');
    }
    else
    {
      res.render('login',{
        user_id : req.session.user_id,
        user_name : req.session.user_name,
        img:req.session.img,
    });
  }
});
/*로그인 체크?*/
app.get('/main',function(req,res){
  if(isLogin(req,res)){
    res.render('test',{
      user_id : req.session.user_id,
      user_name : req.session.user_name,
      img:req.session.img,
  });
  }else{
    res.redirect('/');
  }
});
/*회원 가입*/
app.get('/regist', function(req, res){
  res.render('regist.ejs');
});
/*소켓 연결*/
io.on('connection', function(socket){
  /*registData : 회원 가입 데이터 받기 */

  app.post('/chatsignup',multipartMiddleware,function(data,res){
    if(!data) {socket.emit('noSignData'); return false;}
    userModel.findOne({userid:data.body.id}, function(err, member){ //등록 전에 이미 등록된 아이디인지 체크
      if(member == null)
      {
            if(data.body.password != data.body.password2)//비밀 번호 확인 체크
            {
              res.redirect('./views/pwdCheck.html');
              return;
            } 
            else
            {
              if(data.files.image){ //파일을 받음 
                var image = data.files.image;
                var imageName = image.name;
                var imagePath = image.path;
                var imageType = image.type;
                if(imageType.indexOf('image') != -1){ //이미지 파일이면,
                  var outputPath = "./public/image/" +imageName;
                  fs.rename(imagePath,outputPath,function(err){ //outputPath에 저장
                    var userInfo = new userModel({
                      userid:data.body.id,
                      password:data.body.password,
                      nickname:data.body.name,
                      imagePath:outputPath
                    });
                    console.log(err);
                   userInfo.save(function(err,userInfo){
                      if(err) return console.error(err);
                      console.dir(userInfo);
                      res.redirect('./views/signSuccess.html');
                    }); //end of userInfo.save
                  }); //end of fs.rename(imagePath,outputPath,function(err)
                }// end of if(imageType.indexOf('image') != -1)
                else //이미지 파일이 아닌 경우 할 일(1)
                {
                  fs.unlink(imagePath,function(err){});
                  res.redirect('./views/imageCheck.html');
                }//end of end of if(imageType.indexOf('image') != -1) else
              }//end of if(data.image)
            }//end of if(data.password != data.password2)의 else
      } // end if(member == null) 
      else{ // if(member == null)의 else 
        res.redirect('./views/idCheck.html');
        return;
      }
     });//end of userModel.findOne({userid:data.id}, function(err, member)
  });//end of app.post
  

  socket.on('getSchedules',function(username){
    var todoList = []; //스케쥴러 할일 리스트 
    for(var i = 0 ; i < scheduleList.length;i++){
      if(scheduleList[i].username == username) //스케쥴러의 유저 이름 별로 할 일 가져오기
        todoList.push(scheduleList[i].todo);
    }//end for
    socket.emit('receiveSchedules',todoList);
  }); //end of socket.on('getSchedules',function(username)

  socket.on('fromClient', function(msg,userimg,userid){
    if(msg)
    {
      socket.broadcast.emit('toAllClient', msg,userimg);
      var currentTime = getLocalTimeString(); //현재 시간 받아오기 
      var recordData = {
          time : currentTime,
          writer : userid,
          message : msg
      }//대화 정보 json
      updeteChatRecord(recordData,"1"); //대화 정보 db에 update
      botResponse(msg,socket);
    } // end of if(msg)
  });//end of socket.on('fromClient', function(msg,userimg,userid)
  /*user is typing 처리*/
  socket.on('keyDown', function(user,msg, inputKey){  
    if(inputKey == 13 || (inputKey == 8 && !msg))
      socket.broadcast.emit('typing',user,false);
    else
      socket.broadcast.emit('typing',user,true);
  });
  /*로그인 소켓 받는 부분*/
  socket.on('login',function(data){
    io.sockets.emit('new_user',data);
  });
  /*스케쥴러 소켓 받는 부분*/
  socket.on('startScheduler',function(data){
    scheduler(data);
  });
  /*스케쥴러 취소 소켓 */
  socket.on('cancelSchedule',function(scheduleData){
    cancelSchedule(scheduleData.username,scheduleData.todo);
  });
});//io.on('connection', function(socket)

// Login & Logoff
app.get('/users/login',function(req,res){
  var loginedUser; //login 한 유저 정보 저장할 json
  var getted_user_id = req.query.user_id;
  var getted_user_pwd = req.query.user_password;
  //db에서 user정보 찾음
  userModel.findOne({userid:getted_user_id},
    function(err,userData){ //findOne callback
      if(err) return res.status(500).json({error: err});
      if(!userData) return res.status(404).json({error: 'user is not find'});
      //password 체크 
      if(userData.password == getted_user_pwd){
        //logined user info val setting
        loginedUser = {
             user_name : userData.nickname,
             user_id : userData.userid,
             img: userData.imagePath
        };
        //로그인 정보가 있을 때
        if(isLogined(loginedUser)) {
          var rv = {
            err : 1,
            message : '중복로그인'
          };
          res.status(400).send(rv);
          return;
        }
        //push session
        req.session.user_id = loginedUser.user_id;
        req.session.user_name = loginedUser.user_name;
        req.session.img = loginedUser.img;
        //push user list 
        user_list.push(loginedUser);
        res.json(loginedUser);
        //현재 봇이 채팅방에 있으면 입장 알림
        if(botStatus() == true){
          var answer = loginedUser.user_name + "이 들어와또!!";
          io.emit('toAllClient',answer,'./public/image/danbi.jpg');
        }
        //db의 userlist에 추가 해주기
        updateDbUserList(loginedUser.user_name);
      }//end of if(userData.password == getted_user_pwd)
      else{ // if(userData.password == getted_user_pwd)의 else
        var rv = {
            err : 1,
            message : '로그인 정보가 올바르지 않습니다.'
        };
        res.status(400).send(rv);
      }
  }); //end of function(err,userData)
}); //end of app.get('/users/login',function(req,res)

/*로그인 되어 있는지 체크하는 부분?*/
app.get('/users/login/check',function(req,res){
  if(req.session.user_id != null && req.session.user_id != ""){
    res.json({
        user_name: req.query.user_name,
        user_id : req.session.user_id,
        user_password : req.query.user_password
    });
    return;
  }//end of if(req.session.user_id != null && req.session.user_id != "")
  else{ // if(req.session.user_id != null && req.session.user_id != "")의 else
    var rv = {
        err : 1,
        message : '로그인을 먼저 해주세요.'
    };
    res.status(400).send(rv);
  } //end else
}); //end of app.get('/users/login/check',function(req,res)

/*로그 아웃 요청*/
app.get('/users/logout',function(req,res){
  if (isLogin(req,res) == false) return; //로그인 된 상태가 아니면 return
  var answer = req.session.user_name + "이 나가또.."; //유저 퇴장 챗봇 알림말 
  mongodb.connect(dbaddr,function(err,db){
    if(err) throw err;
    var myquery = {query : "단비야 방에 누구 있어?"};
    var newvalue = {$pull : {res : req.session.user_name}};
    db.collection('botdial').updateOne(
    myquery, newvalue,
    function(err,result){ if(err) throw err;});
    
    var index;
    for(var i= 0; i < user_list.length;i++){
      if(req.session.user_id == user_list[i].user_id)
        index = i;
    }//세션에서 인덱스 찾아서 
    user_list.splice(index,1); //유저 리스트에서 pull

    res.clearCookie(req.session.user_id); // 세션 쿠키 삭제
    res.send({message : '성공 적으로 로그아웃 되었습니다.'}); //로그아웃 성공 메세지 보내기 
    io.sockets.emit("logout"); //로그 아웃 소켓 보내기 
    //세션 삭제
    req.session.destroy(function(err){
      if(err) res.status(400).send(err);
    }); //end of req.session.destroy(function(err)
  });//end of mongodb.connect(dbaddr,function(err,db)
  if(botStatus() == true) //봇이 현재 채팅 방에 있으면 퇴장 알림말 client로 보내기
    io.emit('toAllClient',answer,'./public/image/danbi.jpg');
});//end of app.get('/users/logout',function(req,res)

/* userlist를 client로 보내줌*/
app.get('/userlist',function(req,res){ 
  if (isLogin(req,res) == false) return false;
  res.json(user_list);
});//and of app.get('/userlist',function(req,res)

http.listen(3030, function(){//server 시작 해주는 부분
  /*디비의 userlist 초기화*/ 
  mongodb.connect(dbaddr,function(err,db){
    if(err) throw err;
    var myquery = {query : "단비야 방에 누구 있어?"}; 
    var newvalue = {$set : {res : [] }};
    db.collection('botdial').updateOne(
    myquery, newvalue,
    function(err,result){ if(err) throw err;});    
  });
  console.log('listening on *:3030');
});

/*이미 로그인 된 유저인지 체크*/   
function isLogined(loginedUser){
  for(var i = 0; i<user_list.length;i++){
    if(user_list[i].user_id == loginedUser.user_id)
      return true;
  }
  return false;
}
/*세션에서 로그인 된 유저가 있는지 체크*/
function isLogin(req,res){
    if (req.session.user_id != null && req.session.user_id != "")
        return true;
    else
        return false;
} 
/*chatbot이 활성화 된 상태인지 체크*/
function botStatus(){
  for(var i = 0; i < user_list.length; i++){
    if(user_list[i].user_name == "danbi")
      return true;
  }
  return false;
}
/*chatbot 활성화 : chatbot을 유저리스트에 push*/
function activateBot(){
  var danbi = {
    user_name : "danbi",
    user_id : "danbi",
    img : "./public/image/danbi.jpg"
  };
  user_list.push(danbi);
  pause(500);
}
/*chatbot 응답... /거의 전체적인 응답을 담당 */
function botResponse(msg, socket)
{
  if(botStatus() == true){
    /*단비 학습 부분*/
    if(question==1||question==2) {learning(msg,socket); return;};
    /*메세지(msg)에 따른 chatbot응답 처리 (not in database) */
    if(msg == "단비야 도움말"){
      mongodb.connect(dbaddr, function(err,db){
        db.collection('botdial').find({}).toArray(
          function(err,result){
            var command = "";
            for(var i=0; i<result.length; i++){
              command += (result[i].query +'/');
            }
            command += notInDbCommand;
            io.emit('showHELP',command,'./public/image/danbi.jpg'); /*명령어들 client로 보내주는 부분*/
          });//end of function(err,result)
      });//end of mongodb.connect(dbaddr, function(err,db)
    }//end of if(msg == "단비야 도움말")
    else if(msg == "단비야 공부해야지"){ //단비 대화 패턴 확장 
      io.emit('learning', "질문 모 할꼰데..?", './public/image/danbi.jpg');
      learning(msg,socket); 
      question = 1; //learning에서 쓰일 flag(question) =1 로 변경
      /*question==1 //질문 뭐할껀지 client에서 받았을 때
        question==2 //디비에 대화 패턴 등록해줌 
      */
    } 
    else if(msg == "단비야 나가"){ //chatbot 비활성화
      var index;
      for(var i=0; i<user_list.length; i++){
          if(user_list[i].user_name == "danbi")
              index = i;
      }//user_list에서 chatbot index 찾기
      user_list.splice(index,1); //user list에서 chatbot pull
      io.sockets.emit("danbiOut",'./public/image/danbi.jpg','./public/voice/'+outvoice[Math.floor(Math.random()*outvoice.length)]); //단비 아웃 emit
    }
    else if(msg == "단비야 스케쥴러") //user_list와함께 클라이언트로 스케쥴러 요청 
      socket.emit('showSchedule', user_list , './public/image/danbi.jpg');
    else if(msg == "단비야 스케쥴 보여줘"){ //스케쥴 목록 보여주기
      var usernameList = []; //user_name_list를 저장할 list
      for (var i = 0; i < scheduleList.length; i++) {
        if(!usernameList.includes(scheduleList[i].username))
          usernameList.push(scheduleList[i].username);
      } //스케쥴러에 스케쥴을 등록한 유저 목록 push 
      socket.emit('usernameList', usernameList , './public/image/danbi.jpg');
    }
    /*메세지(msg)에 따른 chatbot응답 처리 (in database) */
    mongodb.connect(dbaddr, function(err,db){
      db.collection('botdial').findOne({query : msg}, function(err,result){
        var response = ""; //client로 응답을 보낼 변수 
        if(result){ //db에서 res를 가져오면 
          //단비 대화 패턴에 따라 response 만들어주는 부분 
          if(msg == "단비야 안녕") //트리거 사용해서 수정 할 수 있을 거 같은데.... (2) 할 일 
            response = result.res[getSalutationIndex()];
          else if(msg == "단비야 방에 누구 있어?")
            response = getUserList(result.res);
          else //일반적인 대화패턴 출력
            response = result.res[Math.floor(Math.random() * result.res.length)];
          //response 만들기 끝 
          io.emit('toAllClient',response,'./public/image/danbi.jpg');
         }//if(result)
         else return;
      }); //end of db.collection('botdial').findOne({query : msg}, function(err,result)
    });//end of mongodb.connect(dbaddr, function(err,db)
  } //end of if(botStatus() == true)
  else{ //bot(단비)이 현재 대화방에 없을때
    if(msg == chatbotCall){ //msg가 chatbotCall이면 추가
      activateBot(); //chatbot 활성화 
      io.emit('bot_Voice','Danbi 왔따!!!', './public/image/danbi.jpg','hhh.mp3');
    }//end of if(msg == chatbotCall)
  }//end of else
}//end of function botResponse(msg, socket)

/*pause 함수*/
function pause(numberMillis) {
  var now = new Date();
  var exitTime = now.getTime() + numberMillis;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime) return;
  }
}
/*시간에 따라 인덱스 return 해주는 function */
function timechecker(hour){
  if(0<=hour && hour<7) return 0;
  else if(7<=hour && hour<12) return 1;
  else if(12<=hour&& hour<18) return 2;
  else if(18<=hour && hour<24)  return 3;
}
/*userlist를 문자열로 세팅해주는 function */
function sendUserlist(){
  var users = "/";
  for(var i =0; i < user_list.length;i++){
    users += user_list[i].user_name;
    users += "/";
  }
  return users;
}
/*userlist 문자열에 "있오.." 문자 추가해주는 function..?*/
function getUserList(UserList){
  var users =  "";
  users += (UserList+" 있오..");
  return users; 
}
/*db에 userlist 추가해주는 function*/
function updateDbUserList(user_name){
  mongodb.connect(dbaddr,function(err,db){
    if(err) throw err;
    var myquery = {query : "단비야 방에 누구 있어?"};
    var newvalue = {$push : {res : user_name}};
    db.collection('botdial').updateOne(
      myquery, newvalue,
      function(err,result){
        if(err) throw err;
    }); //end of db.collection('botdial').updateOne
  }); //end of mongodb.connect(dbaddr,function(err,db)
}
/*단비 인사말 인덱스 가져오기*/ 
function getSalutationIndex() { 
  var hour = new Date().getHours();
  var index = timechecker(hour);
  return index;
}
/*스케쥴러 리스트에서 timeoutIDIndex 받아오는 function*/
function findTimeoutIdIndex(username, todo){
  for(var i =0;i < scheduleList.length;i++){
    if(scheduleList[i].username == username && scheduleList[i].todo == todo)
      return i;
  }
  return -1; //없으면 -1 리턴해서 처리
}
/*스케쥴 취소 function*/
function cancelSchedule(username,todo){
  var index = findTimeoutIdIndex(username,todo);
  if(index != -1){
    clearTimeout(scheduleList[index].timeoutId);
    clearInterval(scheduleList[index].intervalId);
    pullSchedule(findTimeoutIdIndex(username,todo));
  }
}
/*스케쥴러 리스트에서 pull해주는 function*/
function pullSchedule(index){
  scheduleList.splice(index,1);
}
function schedulerAlert(counter,inteverMsg){
  voice=["hhh.mp3","uaa.mp3","mom.mp3","neomuhae.mp3"];
  if(counter <= 300 && counter%20 == 0) //5분 이하는 20초 마다 알람
    io.emit('bot_Voice', inteverMsg[Math.floor(Math.random()*inteverMsg.length)],'./public/image/danbi.jpg', voice[Math.floor(Math.random()*voice.length)]);
  else if(counter <= 600 && counter%60 == 0)  //5분에서 10분 사이는 1분마다 알람
    io.emit('bot_Voice',  inteverMsg[Math.floor(Math.random()*inteverMsg.length)],'./public/image/danbi.jpg',  voice[Math.floor(Math.random()*voice.length)]);
  else if(counter > 600 && counter%300 == 0)  //10분 이상은 5분마다 알람
    io.emit('bot_Voice',  inteverMsg[Math.floor(Math.random()*inteverMsg.length)],'./public/image/danbi.jpg',  voice[Math.floor(Math.random()*voice.length)]);
}
/*스케쥴러 function*/
function scheduler(timerVal){
  var name_ = timerVal.writer;
  var todo_= timerVal.todo;
  var ms = toMilliseconds(timerVal.hour, timerVal.min); //전체 시간을 millsecond단위로 만들어주기 
  var counter = ms/1000; //초단위로 counter 만들어주기 
  var timeMsg = timerVal.writer + "아," + timerVal.todo + "다 했오?";
  var inteverMsg = [timerVal.writer + "아," + timerVal.todo + "빨리 해!",
                    timerVal.writer+"아, " + "할 일 아직 남아 있을걸???",
                    timerVal.writer+"아, "+timerVal.todo+"하고 있는거 맞지??"];


  var timeoutId = setTimeout(function() {
    console.log('['+scheduleCount+']'+'setTimeout Start');
    io.emit('bot_Voice', timeMsg,'./public/image/danbi.jpg','hhh.mp3' );
    pullSchedule(findTimeoutIdIndex(name_,todo_));
    clearTimeout(timeoutId);
    console.log('['+scheduleCount+']'+'clearInterval');
  },ms);//end of setTimeout(function()

  var intervalId =setInterval(function() {
    counter--;
    //스케쥴이 다되면 clear해주는 부분 
    if(counter == 1){
      clearInterval(intervalId);
    }
    console.log('['+timerVal.todo+']' + counter);
    schedulerAlert(counter,inteverMsg);
  },1000); //end of setInterval(function()

  var scheduleInfo = { //스케쥴 정보 json
    username : name_,
    todo : todo_,
    timeoutId : timeoutId,
    intervalId : intervalId
  };
  scheduleList.push(scheduleInfo); //스케쥴 리스트에 push
}
/*시간을 ms 단위로 리턴해주는 부분*/
function toMilliseconds(hour,min){
  var ms = 0;
  ms += 60*1000*min;
  ms += 60*60*1000*hour;
  return ms;
}

function learning(msg, socket){
  var answer;
  if(question==2){//답변 받았을때 디비에 넣어버림
    answer=msg;
    UpdateBotDialog(answer);
    question = 0;
    io.emit("req answer", "공부 다해쪄><", './public/image/danbi.jpg');
  }
  else if(question==1){ //질문 뭐할껀지 client에서 받았을 때 
      query=msg;
      if(notInDBCommandInterrupt(msg)){
        io.emit("req answer","이거 안배우끄야!!!",'./public/image/danbi.jpg');
        question = 0;
        return false;
      }
      findQueryForLearning(query);
      io.emit("req answer", "답변은..?", './public/image/danbi.jpg');
      question=2; 
  }
}
/*db에 없는 이미 있는 명령어를 학습하려고 시도할 때,*/
function notInDBCommandInterrupt(msg){
  for(var i = 0 ; i < notInDbCommandArray.length;i++){
    if(msg == notInDbCommandArray[i]) return true; //array에 있으면 true
  }
  return false; //없는 명령어이면 false
}
function UpdateBotDialog(answer){
  console.log("[2:"+isExistDb+"]");
  var myquery = {query:query};
  var updateResponse = {$pull : {res:answer}};

  if(isExistDb){
    mongodb.connect(dbaddr,function(err,db){
      db.collection('botdial').updateOne(
        myquery,{$push : {res:answer}},
        function(err,result){ if(err) console.log(err);}
      );//db.collection('botdial').updateOne
    });//mongodb.connect(dbaddr,function(err,db)
  }//end of if(isExistDb)
  else{
    mongodb.connect(dbaddr,function(err,db){
      db.collection('botdial').insertOne(
        {query:query,res:[answer]},
        function(err,result){ if(err) console.log(err);}
      );//db.collection('botdial').insertOne
    });//mongodb.connect(dbaddr,function(err,db)
  }//end of if(isExistDb) else
}
/*현재 db에 질문=query가 있는지 확인*/
function findQueryForLearning(query){
  console.log("[1:"+query+"]");
  mongodb.connect(dbaddr,function(err,db){
    if(err) throw err;
    db.collection('botdial').findOne(
      {query: query},
      function(err,result){ //없는 질문이면 result == null 
        if(result) isExistDb = true;
        else isExistDb= false;
      }//end of function(err,result)
    );//end of db.collection('botdial').findOne
  });//end of mongodb.connect 
}
/*현재 시간 가져오는 function*/
function getLocalTimeString(){
  var now = new Date();
  return now.toLocaleString();
}
/*대화 기록 저장하는 function*/
function updeteChatRecord(recordData,room_num){
  recordModel.update(
    {room:room_num},
    {$push:{"record" : recordData}},
    {safe:true, upset:true, new:true},
    function(err,model){}    
  );
}