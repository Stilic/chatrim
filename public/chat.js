var socket = io();

var messages = document.getElementById("messages");
var form = document.getElementById("form");
var input = document.getElementById("input");

const oldtitle = document.title;
var newmsg = 0;

function addMessage(html) {
  var item = document.createElement("li");
  item.innerHTML = html;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return parts
      .pop()
      .split(";")
      .shift();
}

form.addEventListener("submit", function(e) {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
    socket.emit("typing off", getCookie("username"));
  }
});

socket.on("chat message", function(user, msg) {
  addMessage("<strong>" + user + "</strong>:<br />" + msg);
  ++newmsg;
  if (document.hidden) {
    document.title = "[" + newmsg + "] " + oldtitle;
  }
});

document.addEventListener("visibilitychange", event => {
  if (!document.hidden) {
    document.title = oldtitle;
    newmsg = 0;
  }
});

socket.on("user connect", function(user) {
  addMessage("<strong>" + user + "</strong> joined the chat");
});

socket.on("user disconnect", function(user) {
  addMessage("<strong>" + user + "</strong> exited the chat");
});

function updateTyping(msg) {
  var txt = document.getElementById("typing");
  txt.textContent = msg;
}

socket.on("typing on", function(users) {
  users = users.filter(u => u != getCookie("username"));
  if (users.length != 0) {
    if (users.length == 1) {
      updateTyping(decodeURIComponent(users) + " is typing...");
    } else {
      updateTyping(decodeURIComponent(users) + " are typing...");
    }
  } else {
    updateTyping("");
  }
});

function typing() {
  if (input.value != "") {
    socket.emit("user typing", getCookie("username"));
  } else {
    socket.emit("typing off", getCookie("username"));
  }
}

input.oninput = function() {
  typing();
};

window.onbeforeunload = function(){
   socket.emit("disconnect");
}