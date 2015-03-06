$(document).ready(function() {

/* =========================================================
                    CONSTANTS & GLOBALS
   ========================================================= */

  var MAX_USERS = 4;
  // CREATE A REFERENCE TO FIREBASE
  var fb = new Firebase('https://fbchatroompractice.firebaseio.com/');
  var all_users_ref = fb.child('all_users')
  var chat_rooms_ref = fb.child('chat_room_list');

  // REGISTER DOM ELEMENTS
  var $PAGE_SIGNIN = $('#page-signin');
  var $PAGE_LOBBY = $('#page-lobby');
  var $PAGE_CHATROOM = $('#page-chatroom');

  var $SIGNIN_FIELD_USERNAME = $('#page-signin #username_field');
  var $SIGNIN_FIELD_LOBBY_TYPE = $('#page-signin #lobby_type_field');
  var $SIGNIN_BTN_ENTER_LOBBY = $('#page-signin #enter_lobby_btn');
  var $SIGNIN_MESSAGE = $('#signin_msg');

  var $LOBBY_BTN_PROPOSE_CHAT = $('#page-lobby #propose_chat_btn');
  var $LOBBY_LIST_USERS = $('#page-lobby #present_users');
  var $LOBBY_MD_INVITATION = $('#page-lobby #md-invitation');

  var $CHATROOM_USER_LIST = $('#page-chatroom #chatroom_user_list');

  // Some globals for this user
  var my_name = 'noone';
  var my_data = {id:'',name:'',status:''};
  var PLACEHOLDER_FLAG = 'sdfjweute8rteijdkfvnm';

  /*------------
       SIGNIN  
    ------------*/

  //// USER ATTEMPTS TO ENTER LOBBY
  $SIGNIN_BTN_ENTER_LOBBY.click(function () {
    if ($SIGNIN_FIELD_USERNAME.val() == '') {
      $SIGNIN_MESSAGE.text('You must specify a username');
      return;
    }
    var username = $SIGNIN_FIELD_USERNAME.val();
    var user_data = {name:username,status:'lobby'};
    my_name = username;
    try_create_user(username,user_data);
  });

  function try_create_user(username,user_data) {
    all_users_ref.child(username).transaction(function(current_user_data) {
      if (current_user_data === null) {
        return user_data;
      }
    }, function(error, committed) {
      user_created(username, committed);
    });
  };

  function user_created(username,success) {
    if (!success) {
      $SIGNIN_MESSAGE.text('That username is taken by another user, please choose another.');
      open_page($PAGE_SIGNIN);
      my_name = '';
      return;
    }
    open_page($PAGE_LOBBY);
    

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
        $LOBBY_MD_INVITATION.removeClass('hidden')
      }
    });
  };

  /*------------
        LOBBY  
    ------------*/

  //// USER SELECTS/DESELECTS A PLAYER
  $(document).on('click','#page-lobby #present_users li.user',function (argument) {
    $(this).toggleClass('selected');
    $(this).children('i').toggleClass('fa-check-square-o');
    $(this).children('i').toggleClass('fa-square-o');
  });

  //// USER ATTEMPTS TO START A CHAT
  $LOBBY_BTN_PROPOSE_CHAT.click(function () {
    // check that no more than X users are chosen
    if ($LOBBY_LIST_USERS.children('li.user.selected').length > MAX_USERS) {
      // TODO
      return;
    }
    // create a list of all selected users
    var user_list = [];
    user_list.push(my_data)
    $LOBBY_LIST_USERS.children('li.user.selected').each(function () {
      user_list.push({id:$(this).attr('id'),name:$(this).children('.username').text(),status:'lobby'});
    });

    invite_users(user_list);
    try_create_chatroom(user_list);
  });




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
    $LOBBY_LIST_USERS.append(user_element);

    //SCROLL TO BOTTOM OF MESSAGE LIST
    //messageList[0].scrollTop = messageList[0].scrollHeight;
  });

  //// update our lobby list when a user leaves
  all_users_ref.on('child_removed', function(snapshot) {
    $LOBBY_LIST_USERS.children('#' + get_user_id(snapshot)).remove();
  });

  //// update our lobby list when a user changes
  all_users_ref.on('child_changed',function(snapshot,prev_child_name) {
    // ensure the lobby list is up to date
    if (snapshot.val().status == 'lobby') {
      $LOBBY_LIST_USERS.children('#' + get_user_id(snapshot)).show();
    }
    if (snapshot.val().status != 'lobby') {
      $LOBBY_LIST_USERS.children('#' + get_user_id(snapshot)).hide();
    }

    // check if its us&we got a invitation
    if (get_user_id(snapshot) == my_data.id && snapshot.val().status == 'invited') {
      $LOBBY_MD_INVITATION.removeClass('hidden');
    }
  });


  function invite_users(user_list) {
    var chatroom_key = chat_rooms_ref.push({'date_created':'now'}).key();
    chat_rooms_ref.child(chatroom_key).child('user_list').child(PLACEHOLDER_FLAG).set('');
    for (var i = 0; i < user_list.length; i++) {
      all_users_ref.child(user_list[i].id).child('status').set('invited');
      all_users_ref.child(user_list[i].id).child('chatroom_key').set(chatroom_key);
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

  function join_chatroom() {
    var my_chatroom_ref = get_my_chatroom_ref();

    my_chatroom_ref.child('user_list').child(my_data.id).set({'time_entered':'now'});
    open_page($PAGE_CHATROOM);

    my_chatroom_ref.child('user_list').on('child_added', function (snapshot) {
      if (get_user_id(snapshot) == PLACEHOLDER_FLAG) return;
      var data = snapshot.val();      
      var user_element = $('<li class="user">');
      user_element.attr('val',get_user_id(snapshot));
      user_element.text(get_user_id(snapshot));
      $CHATROOM_USER_LIST.append(user_element);
    }); 

    my_chatroom_ref.child('user_list').on('child_removed', function (snapshot) {
      $CHATROOM_USER_LIST.children('[val="'+get_user_id(snapshot)+'"]').remove();
      // delete the entire chatroom when everyone leaves
      // note, it needs to be 1/we have the placeholder because if we get to 0, the userlist will delete itself
      my_chatroom_ref.child('user_list').once('value',function (snapshot) {
        if (snapshot.numChildren() == 1) {
          my_chatroom_ref.remove();
        }
      });
    });
  }


  $('#accept_invite_btn').click(function () {
    all_users_ref.child(my_data.id).child('status').set('chatroom');
    join_chatroom();
  });
  $('#reject_invite_btn').click(function () {
    all_users_ref.child(my_data.id).child('status').set('lobby');
  });

  $('#exit_chatroom_btn').click(function() {
    var my_chatroom_ref = get_my_chatroom_ref();
    my_chatroom_ref.child('user_list').child(my_data.id).remove();
    open_page($PAGE_LOBBY);
  });

/* =========================================================
                  GENERAL FUNCTIONALITY/HELPER
   ========================================================= */

  $('.md .md-close').click(function() {
    $(this).parents('.md').addClass('hidden');
  });

  function open_page($page_to_open) {
    $('.page').addClass('hidden');
    $page_to_open.removeClass('hidden');
  }

  function get_user_id(snapshot) {
    return snapshot.key().replace(/[^a-z0-9\-\_]/gi,'');
  }

  function get_my_chatroom_ref() {
    var my_user_ref = all_users_ref.child(my_data.id);
    var chatroom_key;
    my_user_ref.once('value',function(snapshot) { chatroom_key = snapshot.val()['chatroom_key']; });
    return chat_rooms_ref.child(chatroom_key);
  }

});  


/*
  TODO:
  [ ] users leaving
  [ ] the self being in the lobby list
  [ ] if i accept, then i join the chatroom

  [x] deleting empty chatrooms
  [ ] sending messages
  [ ] removing users who leave the chatroom
      [x] with button
      [ ] on disconnect
*/
