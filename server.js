const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");
const bodyParser = require("body-parser");
const app = express();
const sanitizeMiddleware = require("sanitize-middleware");
const shortid = require("shortid");
const cors = require("cors");
const xss = require("xss");
const marked = require("marked");
const { RateLimiterMemory } = require('rate-limiter-flexible');

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(cookieParser());
app.use(cors());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

const rateLimiter = new RateLimiterMemory(
  {
    points: 5, // 5 points
    duration: 3, // per second
  });

var chname = "Chatbot";
var users = [];
var usersTyping = [];

app.use(function(req, res, next, socket) {
  users = users.filter(u => u != getUsername(socket));
  usersTyping = usersTyping.filter(u => u != getUsername(socket));
  next();
});

users.push = function() {
  Array.prototype.push.apply(this, arguments);
  this.sort();
};
usersTyping.push = function() {
  Array.prototype.push.apply(this, arguments);
  this.sort();
};

app.use(express.static("public"));
app.use(express.static("dist"));
app.use("/socket.io", express.static("node_modules/socket.io"));
app.use(sanitizeMiddleware());

function getUsername(socket) {
  return xss(
    cookie.parse(socket.request.headers.cookie)["username"].toString()
  );
}

app.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

app.get("/chat", (req, res) => {
  if (req.cookies.username) {
    res.render("chat", { title: "Chat" });
  } else {
    res.redirect("/");
  }
});

app.post("/login", (req, res) => {
  req.body.username = req.body.username;
  const count = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
  if (!req.body.username) {
    res.cookie("username", "Anoumous_" + shortid.generate());
    res.redirect("/chat");
  } else {
      res.cookie("username", req.body.username);
      res.redirect("/chat");
  }
});

app.get("/docs/api", (req, res) => {
  res.render("docs/api", { title: "API docs" });
});

// Socket code

io.on("connection", socket => {
  if (users.includes(getUsername(socket))){
    socket.emit("chat message", chname, 'Username alredy in use!<br /><a href="../">Choose an another username</a>');
    socket.disconnect(true);
    return;
  }
  users.push(getUsername(socket));
  io.emit("user connect", getUsername(socket));
  io.emit("typing on", usersTyping);
  socket.on("disconnect", () => {
    io.emit("user disconnect", getUsername(socket));
    users = users.filter(u => u != getUsername(socket));
    usersTyping = usersTyping.filter(u => u != getUsername(socket));
  });
});

io.on("connection", socket => {
  socket.on("chat message", async function(msg){
      var userip = socket.handshake.headers["X-Forwarded-For"];
      //Also, repl.it gives fake IPs, not the real ones
      if (typeof msg !== "string"){
        socket.emit("chat message", chname, "Your message looks kinda sus.");
        return;
      }
      try {
        await rateLimiter.consume(userip);
      } catch {
        socket.emit("chat message", chname, "You are now rate-limited!");
        return;
      }
      io.emit("chat message", getUsername(socket), marked(xss(msg));
      if (msg == "/users") {
        io.emit("chat message", chname, xss(users));
      } else if (msg == "/help") {
        io.emit(
          "chat message",
          chname,
          "Chatrim - The next-gen chat system<br />Commands: /help, /users, /sus"
        );
      } else if (msg == "/sus") {
        io.emit("chat message", chname, "You sus too, " + getUsername(socket));
      }
  });
});

io.on("connection", socket => {
  socket.on("user typing", user => {
    if (user !== getUsername(socket)){
      return;
    }
    usersTyping = usersTyping.filter(u => u != user);
    usersTyping.push(user);
    io.emit("typing on", usersTyping);
  });
});

io.on("connection", socket => {
  socket.on("typing off", user => {
    if (user !== getUsername(socket)){
      return;
    }
    usersTyping = usersTyping.filter(function(value, index, arr) {
      return value != user;
    });
    io.emit("typing on", usersTyping);
  });
});

// API code
app.post("/api/send", (req, res) => {
  io.emit("chat message", req.body.username, req.body.message);
  res.send(200, "OK");
});

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
