const BASE_URL = "http://192.168.0.11:3030/";
const API_URL = "API/"
var socket = io.connect();
var id=0;
var ispatternAdd = false; //대화 패턴 추가 플래그 
function MakingUserListPage(){
    $.ajax({
        type: "get",
        url : BASE_URL+"userlist",
        timeout : 2000,
        success: function(data){
            UpdateUserListView(data);            
        },
        error: function(err){
            //console.log(err)
        }
    });
}

function UpdateUserListView(user_list){
    var container=$('#people');
    container.empty();
    for(var i=0;i<user_list.length;i++){
        var list=$('<li class="person" data-chat="person'+i+'">'
                    +'<img src= "'+user_list[i].img+'" />'
                    +'<span class="name">'+user_list[i].user_name+'</span>'
                    +'<span class="preview">12cm_osp</span></li>');
        container.append(list);
    }
}

function Login(){
  var container = $('#curtain');
  container.append(makingLoginForm());

  activateBlackBackground();

  return false;
}

function Logout(){
    $.ajax({
        type: "get",
        url : BASE_URL+"users/logout",
        timeout : 2000,
        success: function(data){
            toastr.success('로그아웃 되었습니다.');
            setTimeout(function(){
                location.replace(BASE_URL);
            }, 1000);
        },
        error: function(err){
            toastr.warning(err.responseJSON.message);
        }
    });
}

function activateBlackBackground(){
    $('#curtain').css("display", "block");
}
var loginFlag = true;

function SignIn(){
    var url = BASE_URL + "regist";
    $(location).attr('href', url);
}

function getChange(data){
  var s='<option value="'+3+'">'+3+'</option>';
  var id='#todobox'+data;
  $(id).append(s);//s에 option추가하면됨!!!!!
}

$(document).ready(function(){
  toastr.options = {
    positionClass : "toast-top-center"
  }
  MakingUserListPage();
  var socket = io.connect();
  $('.chat[data-chat=person1]').addClass('active-chat');
  $('.person[data-chat=person1]').addClass('active');
    
});

$('#send').click(function(){
  socket.emit('fromClient', $('#m').val(),$('#userImg').val(), $('#user_id').val());
  var output='<div class="bubble me">';
   output+=$('#m').val();
   output+='</div>';
   $('#person1').append(output);
   $("#person1").scrollTop($("#person1").prop("scrollHeight"));
   $('#m').val('');

  return false;
});
socket.on('imageCheck',function(){
  toastr.success('이미지 파일이 아닙니다.');
});
socket.on('new_user',function(new_user){
    MakingUserListPage();
});
socket.on('logout',function(){
    MakingUserListPage();
});
socket.on('pwdCheck',function(){
  toastr.success('비밀번호를 다시 확인하십시오.');
});
socket.on('req answer', function(msg, userimg){
    var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
    message+=msg;
    message+='</div>';
    $('#person1').append(message);
    $("#person1").scrollTop($("#person1").prop("scrollHeight"));
})
socket.on('bot_Voice',function(msg,userimg,voice){
  var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
  message+=msg;
  message+='<audio autoplay src="./public/voice/'+voice+'"></audio>';
  message+='</div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));

  MakingUserListPage();
});


socket.on('scheduleList', function(msg, userimg)
{
   var message = '<div class="replies"><img class="image" src="'+userimg+'" alt="" />';
  message += '<div class="bubble you"><form method="POST" action="schedule" class="timer">';
  id++;
  message += '사용자 : <select class="userbox" onchange="getChange(this.form.userbox.id);" name="userbox" id="'+id+'">';
  message += '<option value="'+1+'">'+1+'</option><option value="'+2+'">'+2+'</option></select></br>';
  message += '할 일 : <select class="todobox" name="todobox" id="todobox'+id+'">';
  message += '<option value="'+2+'">'+2+'</option></select></br>';
  message += '<input type="button" onclick="submitFunc(this.form);" value="취소"></input>';
  message += '</form></div></div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  $('#search_txt').val('');
});

socket.on('learning',function(msg,userimg){
  var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
    message+=msg;
    message+='<audio autoplay src="./public/voice/dodo.mp3"></audio>';
    message+='</div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  MakingUserListPage();
});

socket.on('danbiOut', function(userimg,voice){
  var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
    message+='힝 단비 나감';
    message+='<audio autoplay src="'+voice+'"></audio>';
    message+='</div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
   MakingUserListPage(); 
});
socket.on('idDB_check',function(id){
  toastr.success(id+' 가 이미 있습니다.');
});
socket.on('success_sign',function(msg){
  toastr.success('회원가입 되었습니다.');
  setTimeout(function(){
      $(location).attr('href',BASE_URL);
  },2000);
});
socket.on('success_login',function(msg){
  toastr.success('로그인 되었습니다.');
  $(location).attr('href',BASE_URL+"main");
});
socket.on('showSchedule', function(user_list, userimg){
  var message = '<div class="replies"><img class="image" src="'+userimg+'" alt="" />';
  message += '<div class="bubble you"><form method="POST" action="schedule" class="timer">';
  message += '사용자 : <select class="userbox" name="userbox" id="userbox">';
    message += '<option value=""></option>';
  for(var i=0;i<user_list.length;i++){
    if(user_list[i].user_name != "danbi"){
      message +='<option value="'+user_list[i].user_name+'">'+user_list[i].user_name+'</option>';
    }
  }

  message += '</select></br>';
  message += '<select class="hour" name="hour" id="hour">';
  for(var i=0;i<12;i++){
     message +='<option value="'+i+'">'+i+'</option>';
  }
  message += '</select>시간 : <select class="minute" name="minute" id="minute">';
  for(var i=0;i<60;i++){
    message+='<option value="'+i+'">'+i+'</option>';
  }
  message += '</select>분 : </br><textarea id="todo" name="todo" class="todo">해야할 일</textarea></br>';
  message+='<input type="button" onclick="submitFunc(this.form);" value="등록"></input>';
  //message += '<input type="submit" class="write-link send scheduleBtn" id="scheduleBtn">submit</input>';
  message += '</form></div></div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  $('#search_txt').val('');
})
socket.on('usernameList', function(usernameList, userimg)
{
  var message = '<div class="replies"><img class="image" src="'+userimg+'" alt="" />';
  message += '<div class="bubble you"><form method="POST" action="schedule" class="timer">';
  id++;
  message += '사용자 : <select class="userbox" onchange="getChange(this.form.userbox2.id);" name="userbox2" id="'+id+'">';
  message += '<option value=""></option>';
  for(var i=0;i<usernameList.length;i++){

      message +='<option value="'+usernameList[i]+'">'+usernameList[i]+'</option></br>';
  }
  message += '</select>할 일 : <select class="todobox_2" name="todobox_2" id="todobox'+id+'">';

  message += '</select><br><input type="button" onclick="cancelFunc(this.form);" value="취소"></input>';
  message += '</form></div></div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  $('#search_txt').val('');
});

function cancelFunc(form){
  var data = {
    username : form.userbox2.value,
    todo : form.todobox_2.value,
  }
  
  socket.emit('cancelSchedule',data);
  toastr.success(data.todo + '가 취소 되었습니다.');
}

function submitFunc(form){
   var data={
    writer : form.userbox.value,
    hour : form.hour.value,
    min : form.minute.value,
    todo: form.todo.value,
  };
  
  socket.emit('startScheduler',data);
  toastr.success('스케쥴이 등록 되었습니다.');
}
function checkSigninValue(data){
  if(!data.name || 
    !data.id  ||
    !data.password ||
    !data.password2 ||
    !data.image ||
    !data.path)
  {
    return false; // 데이터가 안들어왔을 때 
  }
  else
    return true;
}
function signinFunc(form){
  var data={
    name:form.name.value,
    id:form.id.value,
    password:form.password.value,
    password2:form.password2.value,
    image:form.image.files,
    path:form.image.value
  };
  // if(checkSigninValue(data))
  //   socket.emit('registData',data);
  // else
  if(!checkSigninValue(data)) data = false;
  socket.emit('registData',data);
}
socket.on('noSignData', function(){
  toastr.success('빈 칸을 채워주세요');
})
socket.on('toAllClient', function(msg,userimg){
    var submsg = msg.substring(0,14);
  if(submsg == "./public/image"){
   var message= ('<div class="replies">' + '<img class="image" src="'+userimg+'" alt="" />');
   message += '<div class="bubble you">';
   message += '<img src="' +msg+'" alt="" />';
   message += '</div>' + '</div>';

  }
  else if(submsg == "./public/voice"){
    var message= ('<div class="replies">' + '<img class="image" src="' +userimg+'" alt="" />');
    message += '<div class="bubble you">';
    message += '<audio autoplay controls="controls"  src="'+msg+'"></audio>';
    message += '</div>' + '</div>';
  }
  else{
    var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
    message+=msg;
    message+='</div>';
    
  }
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  $('#search_txt').val('');
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
});

function getChange(_id){
  var todoid='#todobox'+_id;
  //
  var id = "#"+ _id;
  var username = $(id).val();
  var scheduleList;
  socket.emit('getSchedules',username);
  socket.on('receiveSchedules',function(schedules){
    // scheduleList = schedules;
  
 // alert(scheduleList);
 $(todoid).empty();
  //var s='<option value="'+3+'">'+3+'</option>';
  var s = "";
  for(var i=0;i<schedules.length;i++){

      s +='<option value="'+schedules[i]+'">'+schedules[i]+'</option></br>';
  }
  
  $(todoid).append(s);//s에 option추가하면됨!!!!!
  });
}
socket.on('showHELP', function(msg,userimg){

   var message='<div class="replies"><img class="image" src="'+ userimg +'" alt="" /><div class="bubble you">';
   message+=msg;
   message+='</div>';
  $('#person1').append(message);
  $("#person1").scrollTop($("#person1").prop("scrollHeight"));
  $('#search_txt').val('');
});

$('#m').keydown(function(event){
  var user=$('#user').val();
  var msg=$('#m').val();
  if(event.keyCode == 13)
  {
    $('#send').click();
  }
  //socket.emit('keyDown',msg, event.keyCode);
  if(!$('#m').val())
  {
    socket.emit('keyDown',user,msg, event.keyCode);
  }
  else
  {
    socket.emit('keyDown',user, msg, event.keyCode);
  }

});


socket.on('typing', function(msg,inputKey){ //user is typing ....
  if(inputKey)
  {
    $('#search_txt').val(msg+' is typing..');
  }
  else
    $('#search_txt').val('');
})