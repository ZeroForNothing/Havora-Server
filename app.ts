import axios from "axios";
import { Socket } from "socket.io";

require('dotenv').config();
//server initiate
export {}
const express = require('express')
const session = require('express-session')

const app = express()
app.use(express.json())
app.use(session({
  secret: "[(@]PMiY*Ltj4-Akm;gU{NMv?6)&{idGd<MOn<6^iM;J/o@|K,;96[K9'#sNX_~",
  saveUninitialized: true,
  resave: true
}));
const serverManager = require('http').Server(app)
const io = require("socket.io")(serverManager,
  {
    cors: {
      origin: "http://localhost",
      methods: ["GET", "POST"]
    }
  }
  ); 
  
  function serverLog(text : string) {
    console.log("Web Node Server =>", text);
  }
  
  serverManager.listen(process.env.PORT, () => serverLog(`Listening on port ${process.env.PORT}`));
  
  let WebServer = require('./Code/server')

  let nodeServer = new WebServer(io);

  const PlatformState = require('./Code/Utility/PlatformState')
  let platformState = new PlatformState();

interface createUser{
  token : string,
  error : number
}
app.post('/CreateUser', (req : any, res : any) => {

  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let email = req.body.email;
  let name = req.body.name;
  let password = req.body.password;
  let confPassword = req.body.confPassword;
  let gender = req.body.gender;
  let date = req.body.date;
  let termsOfService = req.body.termsOfService;
  let errorLog = null;
  let emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,4}))$/;
  const nameRegex = new RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");

  if (firstName.trim().length == 0) {
    errorLog = "Insert first name";
  }
  else if (!nameRegex.test(firstName.trim())) {
    errorLog = "Invalid first name";
  }
  else if (lastName.trim().length == 0) {
    errorLog = "Insert last name";
  }
  else if (!nameRegex.test(lastName.trim())) {
    errorLog = "Invalid last name";
  }
  else if (email.trim().length == 0) {
    errorLog = "Insert email";
  }
  else if (!emailRegex.test(email.trim())) {
    errorLog = "Invalid email";
  }
  else if (name.trim().length == 0) {
    errorLog = "Insert name";
  }
  else if (!nameRegex.test(name.trim())) {
    errorLog = "Invalid name";
  }
  else if (password.trim().length == 0) {
    errorLog = "Insert password";
  }
  else if (password.trim().length < 8) {
    errorLog = "Password must be minimum 8 characters long";
  }
  else if (confPassword.trim().length == 0) {
    errorLog = "Insert password confirmation";
  }
  else if (password.trim() !== confPassword.trim()) {
    errorLog = "Password confirmation doesn't match";
  }
  else if (gender != 0 && gender != 1) {
    errorLog = "Pick a gender";
  }
  else if (date.trim().length == 0) {
    errorLog = "Pick a date";
  } else if (!termsOfService) {
    errorLog = "Must accept terms of use";
  }

  if (errorLog != null)
    return res.json({
      error: errorLog
    })
  nodeServer.database.createUser(req.body,async (dataD : createUser) => {
      if (!dataD.error) {
        const result = await axios.post('/createPicTokenDirectory',{
          token : dataD.token
        }).then(function (response : any) {
            if(response && response.data && response.data.ok)
              return true;
            else
              return false;
        }).catch(function (error : any) {
            if(error) serverLog("createPicTokenDirectory: Encountered error couldn't create token directory")
            return false;
        });
        if(result) return res.json({ ok: true })
        else return res.json({ ok: false })
      }
      return res.json({ 
        ok: false,
        error : dataD.error
      })
  })
})

interface userSignIn{
  error : number,
  token :string
}
app.post('/LoginUser', (req : any, res : any) => {
  if(!platformState.isPlatform(req.body.platform)) return;
  let email = req.body.email;
  let password = req.body.password;
  if (email.trim().length == 0 || password.trim().length == 0) return res.json({ ok: false })
  serverLog(`Signin with ${email} on ${req.body.platform}`)
  nodeServer.database.userSignIn(req.body.email,req.body.password, async (dataD : userSignIn) => {
    const result = await axios.post('/createPicTokenDirectory',{
      token : dataD.token
    }).then(function (response : any) {
        if(response && response.data && response.data.ok)
          return true;
        else
          return false;
    }).catch(function (error : any) {
        if(error) serverLog("createPicTokenDirectory: Encountered error couldn't create token directory")
        return false;
    });
    if(result) return res.json({ 
      ok: true,
      email: email,
      platform: req.body.platform,
      error: dataD.error
    })
    else return res.json({ ok: false })
  })
})
interface socketLogin{
    platform : string;
    email : string;
}
io.on('connection', function (socket : Socket) {
  // serverLog("Connection Started ( Socket id: " + socket.id + " )")
  socket.on('socketLogin', function (data : socketLogin) {
    if (data.platform != null && data.email != null)
      nodeServer.onConnected(socket, data.platform, data.email);
  });
})