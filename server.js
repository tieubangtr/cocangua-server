require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const nodemailer = require('nodemailer');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');


var port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.options('*', cors());

//Socket IO
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  }
);
//Database connection
//Localhost xampp
// const connection = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "cangua",
// });
//Shangans.com database
// const connection = mysql.createConnection({
//   host: "localhost",
//   user: "shangans_cangua",
//   password: "webcuadancephung",
//   database: "shangans_cangua",
// });
//Heroku app mysql connect
const connection = mysql.createConnection({
  host: "us-cdbr-east-03.cleardb.com",
  user: "b75da25e30c1cd",
  password: "a3658172",
  database: "heroku_2e8bcab76e150c4"
});


//Socket.io handlers
//Room chat handlers

//Homepage
app.get('/', (req, res) =>{
  res.sendFile(path.join(__dirname+'/index.html'));
})

//Signup handler
//Check, add user to database
// {
//   "username": "dancephung6",
//   "gender": true,
//   "email": "tieubangtrw@gmail.com",
//   "password": "vietanh"
// }
app.post("/signup", async (req, res) => {
  
  const { username, password, gender, email } = req.body;
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  // console.log(users);
  // console.log(hashedPassword);
  //Check user
  var sqlCheckUser =
    "select count(id) as count from users where username = '" +
    req.body.username + 
    "' or email = '"+ req.body.email +"';";
  connection.query(sqlCheckUser, (err, results) => {
    let checkUser = 0;
    if (err) throw err;
    checkUser = parseInt(results[0].count);
    if (checkUser > 0) {
      res.send({ status: "error", message: "Username or email existed" });
    } else {
      //Insert new user
      var sql =
        "INSERT INTO `users`(`username`, `email`, `gender`,`avatar`, `wins`, `password`)" +
        "VALUES ('" +
        username +
        "', '" +
        email +
        "', '" +
        gender +
        "', 1, 0, '" +
        hashedPassword.toString() +
        "')";
      connection.query(sql, (err) => {
        if (err) res.json({ status: "error", message: err });
        res.json({ status: "success", message: "Successfully signup" });
      });
    }
  });
});

//Login handler
//Authorization and authentication handler
// {
//   "username": "aaaaaaa",
//   "password": "belolicute"
// }
app.post("/signin", (req, res) => {
  const requestedUsername = req.body.username;
  const requestedPassword = req.body.password;
  var sql =
  "select count(id) as count, username, password  from users where username = '" +
  requestedUsername +
  "';";
  connection.query(sql, async (err, results) => {
    let checkLogin = 0;
    if (err) throw err;
    checkLogin = parseInt(results[0].count);
    const userDataPassword = results[0].password;
    if (checkLogin > 0) {
      if (await bcrypt.compare(requestedPassword, userDataPassword)) {
        jwt.sign({user : requestedUsername}, 'daylamabimatkhongtknaoduocdongvao', { expiresIn: '12h'}, (err, token) =>{
          if(err){
            res.json({status : "error", message : err});
          }else{
            res.json({token})
          }
        })
      } else {
        res.json({ status: "error", message : "Wrong username or password" });
      }
    } else {
      //No user
      res.json({ status: "error", message: "Wrong username or password" });
    }
  });
});


//Get user info from token
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZGFuY2VwaHVuZzYiLCJpYXQiOjE2MTcxNzc3MjIsImV4cCI6MTYxNzIyMDkyMn0.H73fpq6ay77qflzvVwoXwNBERlQqMQOEFrefjwccwUI"
// }
app.post('/getInfo', (req, res) =>{
  console.log(req.body.token);
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({ status : error, message : err});
    }else{
      const username = user.user;
      const sql = "select id, username, email, gender, avatar, wins from users where username = '" + username + "' ;";
      connection.query(sql, async (err, result) =>{
        if(err){
          res.json(err);
        }else{
          res.json(result[0]);
        }
      })
    }
  })
});


//Reset password
const transporter = nodemailer.createTransport({
  host : 'shangans.com',
  secureConnection: false,
  tls: {
    rejectUnauthorized: false
  },
  port: 587,
  auth: {
    user: 'support@shangans.com',
    pass : 'webcuadancephung'
  }
})

//Send email to change password request
// {
//   "username" : "aaaaaaa"
// }
app.post("/resetPasswordRequest", (req, res) =>{
  const requestedUsername = req.body.username;
    const sql = "select email from users where username = '" + requestedUsername + "';";
    connection.query(sql, async (err, result1) =>{
      if(err){
        res.json(err);
      }else{
        const rdmtp = Math.random().toString(36).substring(2, 15) + requestedUsername + Math.random().toString(36).substring(2, 15);
        console.log(rdmtp);
        const salt = await bcrypt.genSalt();
        const hashedSky = await bcrypt.hash(rdmtp, salt);
        const sqlSetMtp = `update users set skymtp = '${hashedSky}' where username = '${requestedUsername}'`;
        const requestedEmail = result1[0].email;
        connection.query(sqlSetMtp, (err, result2) =>{
          if(err){
            res.json(err);
          }else{
            const mailOptions = {
              from : 'support@shangans.com',
              to : requestedEmail,
              subject: "Reset password of your account",
              text : "Hello '" + requestedUsername + "', \Here is your secret key, do not share this code: '"+ rdmtp +"'\Many thanks hehehe!"
            }
            transporter.sendMail(mailOptions, (err, result) =>{
              if(err){
                res.json(err);
              }else{
                res.json({ status: "success", message : "Email sent"});
              }
            })
            res.send("ok");
          }
        }) 
      }
    })
})

//Confirm reset password
// {
//   "key": "kyjvyx31c4faaaaaaagcx8yjdpwmv",
//   "username" : "aaaaaaa",
//   "password" : "lolicute"
// }
app.post('/resetPasswordConfirm',  (req, res) =>{
  const username = req.body.username;
  const skymtp = req.body.key;
  const newPassword = req.body.password;
  const sqlCheckUser = "select count(id) as count, skymtp from users where username = '" + username + "';";
  connection.query(sqlCheckUser, async (err, result) =>{
    let count = result[0].count;
    let dbSky = result[0].skymtp;
    if(count < 0){
      res.json({status : 'error', message : "Try again"});
    }else{
      if (await bcrypt.compare(skymtp, dbSky)) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const sql = "update users set password = '"+ hashedPassword.toString() +"' where username = '" + username + "' ;";
        connection.query(sql, async (err, result) =>{
          if(err){
            res.json({status : "error", messsage: err});
          }else{
            res.json({status : "success", message: "Successfully reset password"});
          }
        })
      }
    }
  })
})


//Create a room
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWFhYWFhYSIsImlhdCI6MTYxNzE4NDQwMSwiZXhwIjoxNjE3MjI3NjAxfQ.SZoeIC2gr4Wwj59AuV7i9feE97LvbChBD5kmWwET5bs"
// }
app.post("/createRoom", (req, res) =>{
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({ status : error, message : err});
    }else{
      console.log(user);
      const username = user.user;
      const sqlGetUser = "select id, username, wins, avatar, gender from users where username = '" + username + "';";
      connection.query(sqlGetUser, (err, result1) =>{
        if(err){
          res.json({status : "error", message: err})
        }else{
          const userId = result1[0].id;
          const roomId = userId + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const sql = "INSERT INTO rooms(roomId, host, user1, user2, user3, user4, results, status, timestamp) VALUES ('" + roomId + "', " + userId + ", " + userId + ", null, null , null, '[]', 1, NOW())";
          connection.query(sql, (err, result) =>{
            if(err){
              res.json({status : "error", message: err})
            }else{
              res.json({status : "success", rid: roomId});
            }
          })
        }
      })
    }
  })
})


//Find a room by room id
// {
//   "rid": "7k6o27kfys7mmu6ocmeli0i"
// }
app.post('/findRoom', (req, res) =>{
  const roomId = req.body.rid;
  const sql = "select * from rooms where roomId like '%"+ roomId +"%' and status = 1";
  connection.query(sql, (err, result) =>{
    if(err){
      res.json({status : "error", message: err})
    }else{
      res.json(result[0]);
    }
  });
})


//Change user's info
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWFhYWFhYSIsImlhdCI6MTYxNzE4NDQwMSwiZXhwIjoxNjE3MjI3NjAxfQ.SZoeIC2gr4Wwj59AuV7i9feE97LvbChBD5kmWwET5bs",
//   "email": "conmechungmay@gmail.com",
//   "gender" : false
// }
app.post('/updateUser', (req, res) =>{
  const userEmail = req.body.email;
  const gender = req.body.gender;
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({status : "error", message: err})
    }else{
      username = user.user;
      const sql = "update users set email = '" + userEmail + "', gender = " + gender + " where username = '"+ username +"';";
      connection.query(sql, (err, result) =>{
        if(err){
          res.json({status : "error", message: err})
        }else{
          res.json({status : "success", message: "Successfully change info"});
        }
      })
    }
  });
})

//Change user password
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWFhYWFhYSIsImlhdCI6MTYxNzE4NzYwNiwiZXhwIjoxNjE3MjMwODA2fQ.k27jBNYQ216VCpH5rVjbjIbwcJQBcu4-W9PYp63cXe0",
//   "old": "lolicute",
//   "new" : "belolicute"
// }
app.post('/updatePassword', (req, res) =>{
  const oldPass = req.body.old;
  const newPass = req.body.new;
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({status : "error", message: err})
    }else{
      const username = user.user;
      const sql = "select password from users where username = '"+ username +"';";
      connection.query(sql, async (err, result) =>{
        if(err){
          res.json({status : "error", message: err})
        }else{
          const userPassword = result[0].password;
          if (await bcrypt.compare(oldPass, userPassword)) {
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(newPass, salt);
            const sql = "update users set password = '"+ hashedPassword.toString() +"' where username = '" + username + "' ;";
            connection.query(sql, async (err, result) =>{
              if(err){
                res.json({status : "error", messsage: err});
              }else{
                res.json({status : "success", message: "Successfully update password"});
              }
            })
          }else{
            res.json({status : "error", messsge: "Wrong old password"});
          }
        }
      })
    }
  });
})

//Admin handlers
//Get all users in the system
app.post('/adminGetUsers', (req, res) =>{
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({status : "error", message: err})
    }else{
      const username = user.user;
      if(username != "admin"){
        res.json({status : "error", message: "Access denied"});
      }else{
        const sql = "select id, username, email, gender, wins from users";
        connection.query(sql, (err, result) =>{
          res.send(result);
        })
      }
    }
  });
})


//Remove an user from the system
app.post("/removeUser", (req, res) =>{
  const userId = req.body.id;
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    const username = user.user;
    if(username != "admin"){
      res.json({status : "error", message: "Access denied"});
    }else{
      const sql1 = "delete"
      const sql = "delete from users where id = "+userId+"";
      res.send(sql);
      // connection.query(sql, (err, result) =>{
      //   if(err){
      //     res.json({status : "error", message: "User was not deleted"});
      //   }else{
      //     res.json({status : "success", message: "User was deleted"});
      //   }
      // })
    }
  })
})

server.listen(port);
