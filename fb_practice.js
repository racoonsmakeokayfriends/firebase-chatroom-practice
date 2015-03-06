
$(document).ready(function() {
  var MAX_PLAYERS = 4;

  // CREATE A REFERENCE TO FIREBASE
  var fb = new Firebase('https://fbchatroompractice.firebaseio.com/');
  var all_users_ref = fb.child('all_users')
  // var lobby_list_ref = fb.child('lobby_list');
  var chat_rooms_ref = fb.child('chat_room_list');

  // REGISTER DOM ELEMENTS
  var $username_field = $('#username_input');
  var $lobby_select_field = $('#lobby_type_input');
  var $enter_lobby_btn = $('#enter_lobby_btn');
  var $validation_text = $('.validation_text');

  var $lobby_list = $('.available_user_list');

  var $signin_container = $('.signin');
  var $lobby_container = $('.lobby');

  var my_name = 'noone';
  var my_data = {id:'',name:'',status:''};

  //// USER ATTEMPTS TO ENTER LOBBY
  $enter_lobby_btn.click(function () {
    if ($username_field.val() == '') {
      // $validation_text.text('That username is taken by another user, please choose another.');
      $validation_text.text('You must specify a username');
      return;
    }
    var username = $username_field.val();
    var user_data = {name:username,status:'lobby'};
    my_name = username;
    // todo: check this username doesnt already exist
    $signin_container.addClass('hidden');
    $lobby_container.removeClass('hidden');

    // lobby_list_ref.push({name:username});
    try_create_user(username,user_data);
  });

  //// USER SELECTS/DESELECTS A PLAYER
  $(document).on('click','.lobby li.user',function (argument) {
    $(this).toggleClass('selected');
    $(this).children('i').toggleClass('fa-check-square-o');
    $(this).children('i').toggleClass('fa-square-o');
  });

  //// USER ATTEMPTS TO START A CHAT
  $('#propose_chat_btn').click(function () {
    // check that no more than X users are chosen
    if ($lobby_list.children('li.user.selected').length > MAX_PLAYERS) {
      // todo: let the user know this cant happen
      return;
    }
    // todo: ask the selecting users if they consent
    // attempt to create a chat room
    var user_list = [];
    user_list.push(my_data)
    $lobby_list.children('li.user.selected').each(function () {
      user_list.push({id:$(this).attr('id'),name:$(this).children('.username').text(),status:'lobby'});
    });
    invite_users(user_list);
    try_create_chatroom(user_list);
  });

  function get_user_id(snapshot) {
    return snapshot.key().replace(/[^a-z0-9\-\_]/gi,'');
  }


  function try_create_user(username,user_data) {
    all_users_ref.child(username).transaction(function(current_user_data) {
      if (current_user_data === null) {
        return user_data;
      }
    }, function(error, committed) {
      user_created(username, committed);
    });

    // this snippet makes it so the user is deleted when they leave the page
    // Get a reference to my own presence status.
    var connected_ref = new Firebase('https://fbchatroompractice.firebaseio.com//.info/connected');
    connected_ref.on('value', function(is_online) {
      if (is_online.val()) {
        all_users_ref.child(username).onDisconnect().remove();
      }
      else {
      }
    });

    all_users_ref.child(username).on('child_changed',function (snapshot) {
      if (snapshot.val().status == 'invited') {
        $('#invitation').removeClass('hidden')
      }
    });
  };

  function user_created(username,success) {
    if (!success) {
      $validation_text.text('That username is taken by another user, please choose another.');
      $signin_container.removeClass('hidden');
      $lobby_container.addClass('hidden');
      my_name = '';
    } else {       
      // user successfully created
    }
  }

  //// update our lobby list when a user enters
  all_users_ref.on('child_added',function (snapshot) {
    //GET DATA
    var data = snapshot.val();
    var username = data.name || 'anonymous';

    if (username == my_name) {
      my_data.id = get_user_id(snapshot);
      my_data.name = username;
      my_data.status = 'lobby';
      return;
    }

    //CREATE ELEMENTS MESSAGE & SANITIZE TEXT
    var user_element = $('<li class="user">');
    user_element.attr('id',get_user_id(snapshot))
    user_element.append($('<i class="fa fa-square-o"></i>'));
    var name_element = $('<strong class="username"></strong>');
    name_element.text(username);
    user_element.append(name_element);

    //ADD PLAYER
    $lobby_list.append(user_element);

    //SCROLL TO BOTTOM OF MESSAGE LIST
    //messageList[0].scrollTop = messageList[0].scrollHeight;
  });

  //// update our lobby list when a user leaves
  all_users_ref.on('child_removed', function(snapshot) {
    $('.available_user_list').children('#' + get_user_id(snapshot))
      .remove();
  });

  all_users_ref.on('child_changed',function(snapshot,prev_child_name) {
    if (snapshot.val().status != 'lobby') {
      $('.available_user_list').children('#' + get_user_id(snapshot))
      .remove();
    }
    // check if its us&we got a invitation
    if (get_user_id(snapshot) == my_data.id && snapshot.val().status == 'invited') {
      $('#invitation-md').removeClass('hidden');
    }
  });


  function invite_users(user_list) {
    for (var i = 0; i < user_list.length; i++) {
      all_users_ref.child(user_list[i].id).child('status').set('invited');
    };
  }

  function try_create_chatroom(user_list) {

    // var my_chatroom_ref = chat_rooms_ref.push();
    // for (var i = 0; i < user_list.length; i++) {
    //   all_users_ref.child(user_list[i].id).child('status').set('chatting');
    //   my_chatroom_ref.child('users').push(user_list[i]);
    // };

    // $('.lobby').addClass('hidden');
    // $('.chat_room').removeClass('hidden');
  }

  $('.md .btn.close').click(function() {
    $(this).parents('.md').addClass('hidden');
  });

  $('#invite-yes-btn').click(function () {
    all_users_ref.child(my_data.id).child('status').set('accepted');
  });
  $('#invite-no-btn').click(function () {
    all_users_ref.child(my_data.id).child('status').set('rejected');
  });
});  


/*
  TODO:
  [ ] users leaving
  [ ] the self being in the lobby list
*/

