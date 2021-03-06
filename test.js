require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const nodemailer = require('nodemailer');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');


app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

//Database connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "shangans_cangua",
  password: "webcuadancephung",
  database: "shangans_cangua",
});

const server = http.createServer(app);
const io = socketio(server, {
  
      origin: "https://cocangua-server.herokuapp.com/"
  }
);

//Socketio
// io.on('connection', socket =>{
//   console.log('new user');
//   socket.emit('welcome-message', 'Xin chao may thang dau buoi, day la web cua cac bo');
// })

app.get("/", (req, res) => {
    res.send("ok");
})

app.use(express.static(__dirname + '/index.html'));
app.post("/api/signup", async (req, res) => {
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
        "INSERT INTO `users`(`username`, `email`, `gender`, `avatar`, `wins`, `password`)" +
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
app.post("/api/signin", (req, res) => {
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
app.post('/api/getInfo', (req, res) =>{
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
app.post("/api/resetPasswordRequest", (req, res) =>{
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
app.post('/api/resetPasswordConfirm',  (req, res) =>{
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
      }else{
          res.json({status : "error", message: "Username or key invalid"});
      }
    }
  })
})


//Create a room
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWFhYWFhYSIsImlhdCI6MTYxNzE4NDQwMSwiZXhwIjoxNjE3MjI3NjAxfQ.SZoeIC2gr4Wwj59AuV7i9feE97LvbChBD5kmWwET5bs"
// }
app.post("/api/createRoom", (req, res) =>{
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({ status : error, message : err});
    }else{
      console.log(user);
      const username = user.user;
      const sqlGetUser = "select id, username, wins, gender, avatar from users where username = '" + username + "';";
      connection.query(sqlGetUser, (err, result1) =>{
        if(err){
          res.json({status : "error", message: err})
        }else{
          const userId = result1[0].id;
          const roomId = userId + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const sql = "INSERT INTO rooms(roomId, host, user1, user2, user3, user4, results, participant, status, timestamp) VALUES ('" + roomId + "', " + userId + ", " + userId + ", null, null , null, '[]', 1, 1, NOW())";
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
app.post('/api/findRoom', (req, res) =>{
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
app.post('/api/updateUser', (req, res) =>{
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
app.post('/api/updatePassword', (req, res) =>{
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
app.post('/api/adminGetUsers', (req, res) =>{
  jwt.verify(req.body.token, 'daylamabimatkhongtknaoduocdongvao', (err, user) =>{
    if(err){
      res.json({status : "error", message: err})
    }else{
      const username = user.user;
      if(username != "admin"){
        res.json({status : "error", message: "Access denied"});
      }else{
        const sql = "select id, username, email, gender, wins, avatar from users";
        connection.query(sql, (err, result) =>{
          res.send(result);
        })
      }
    }
  });
})


//Remove an user from the system
app.post("/api/removeUser", (req, res) =>{
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
server.listen(5000);
