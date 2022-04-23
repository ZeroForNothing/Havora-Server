import { Socket } from "socket.io";

require('dotenv').config();
//server initiate
export {}
const express = require('express')
const session = require('express-session')
const formidable = require('formidable');
const bluebird = require('bluebird')
let {
  nanoid
} = require('nanoid')
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
  const sql = require('mssql');
  const fs = bluebird.promisifyAll(require('fs'));
  const path = require('path');
  
  
  function serverLog(text : string) {
    console.log("Web Node Server =>", text);
  }
  
  serverManager.listen(process.env.WEBPORT, () => serverLog(`Listening on port ${process.env.WEBPORT}`));
  
  let WebServer = require('./server')
  let nodeServer = new WebServer();
  
  const PlatformState = require('./Utility/PlatformState')
  let platformState = new PlatformState();

app.use('/MediaFiles', express.static(path.join(__dirname, 'MediaFiles')))

async function checkCreateUploadsFolder(uploadsFolder : string) {
  try {
    await fs.statAsync(uploadsFolder)
  } catch (e) {
    if (e && e.code == 'ENOENT') {
      serverLog('The uploads folder doesn\'t exist, creating a new one...')
      try {
        await fs.mkdirAsync(uploadsFolder)
      } catch (err) {
        serverLog('Error creating the uploads folder 1')
        return false
      }
    } else {
      serverLog('Error creating the uploads folder 2')
      return false
    }
  }
  return true
}

// Returns true or false depending on whether the file is an accepted type
function checkAcceptedExtensions(file : any) {
  const type = file.type.split('/').pop()
  const accepted = ['jpeg', 'jpg', 'png', 'mp4', 'mp3', 'mov', 'avi', 'mkv', 'x-matroska']
  if (accepted.indexOf(type) == -1) {
    return false
  }
  return true
}
async function ManageFile(file : any, uploadsFolder : string, fileName : string) {
  try {
    await fs.renameAsync(file.path, path.join(uploadsFolder, fileName))
  } catch (e) {
    serverLog('Error uploading the file')
    try {
      serverLog('Try again later removing temp file')
      await fs.unlinkAsync(file.path);
    } catch (e) { }
    return false
  }
  return true
}

app.post('/upload', async (req : any, res : any) => {
  let form = formidable.IncomingForm()
  let picToken = req.query.picToken;
  if (!picToken) res.json({ ok: false, error: 'Pictoken not found' })
  const uploadsTempFolder = path.join(__dirname, 'MediaTempFiles', 'PostFiles', picToken)
  const uploadsFolder = path.join(__dirname, 'MediaFiles', 'PostFiles', picToken)
  form.multiples = false
  form.uploadDir = uploadsTempFolder
  form.maxFileSize = 100 * 1024 * 1024 // 100 MB
  const folderCreationTempResult = await checkCreateUploadsFolder(uploadsTempFolder)
  const folderCreationResult = await checkCreateUploadsFolder(uploadsFolder)
  if (!folderCreationTempResult || !folderCreationResult)
    return res.json({ ok: false, error: "The uploads folder wasn't found" })
  // form.on('progress', (bytesReceived, bytesExpected) => {
  //   serverLog("File progress "+bytesReceived+" "+ bytesExpected)
  // });
  form.parse(req, async (err : any, fields : any, files : any) => {

    if (err) {
      serverLog('Error parsing the incoming form')
      return res.json({ ok: false, error: 'Error passing the incoming form' })
    }
    // If we are sending only one file:
    if (!files.files) {
      serverLog('No file selected')
      return res.json({ ok: false, error: 'No file selected' })
    }
    const file = files.files
    if (!checkAcceptedExtensions(file)) return res.json({ ok: false, error: 'Invalid file type' })

    const type = file.type.split('/').pop()
    const fileName = nanoid() + "." + type
    const fileManaged =  await ManageFile(file, uploadsTempFolder ,fileName)
    if(!fileManaged) res.json({ok: false, error: 'Error uploading the file'})
    serverLog('Successfully upload file to temp')
    return res.json({ ok: true, msg: true })
  })
})
app.post('/profileUpload', async (req : any, res : any) => {
  let form = formidable.IncomingForm()
  let picToken = req.query.picToken;
  let picType = req.query.picType;

  if (!picToken) res.json({ ok: false, error: 'Pictoken not found' })
  if (!picType || isNaN(picType)) res.json({ ok: false, error: 'Picture param invalid' })
  let fileLocationNeeded = '';
  if (picType == 1) fileLocationNeeded = 'ProfilePic'; else fileLocationNeeded = 'WallpaperPic';
  const uploadsTempFolder = path.join(__dirname, 'MediaTempFiles', fileLocationNeeded, picToken)
  const uploadsFolder = path.join(__dirname, 'MediaFiles', fileLocationNeeded, picToken)
  form.multiples = false
  form.uploadDir = uploadsTempFolder
  form.maxFileSize = 100 * 1024 * 1024 // 100 MB
  const folderCreationTempResult = await checkCreateUploadsFolder(uploadsTempFolder)
  const folderCreationResult = await checkCreateUploadsFolder(uploadsFolder)
  if (!folderCreationTempResult || !folderCreationResult)
    return res.json({ ok: false, error: "The uploads folder wasn't found" })
  fs.readdirAsync(uploadsTempFolder, (err : any, tempfiles : any) => {
    if (err) throw err;
    for (const tempfile of tempfiles) {
      fs.unlinkAsync(path.join(uploadsTempFolder, tempfile), (err : any) => {
        if (err) console.error(err);
      });
    }
    form.parse(req, async (err: any, fields: any, files: any) => {
      if (err) {
        serverLog('Error parsing the incoming form')
        return res.json({ ok: false, error: 'Error passing the incoming form' })
      }
      if (!files.files) {
        serverLog('No file selected')
        return res.json({ ok: false, error: 'No file selected' })
      }
      if (!fields.email) {
        serverLog('NoSignin required to upload pic')
        return res.json({ ok: false, error: 'Signin required to upload pic' })
      }
      const file = files.files
      if (!checkAcceptedExtensions(file)) return res.json({ ok: false, error: 'Invalid file type' })
      const type = file.type.split('/').pop()
      const fileName = "file." + type;
      let profPicType = null;
      let wallPicType = null;
      if (picType == 1) profPicType = type;
      else wallPicType = type;
      const fileManaged = await ManageFile(file, uploadsFolder, fileName)
      if (!fileManaged) res.json({ ok: false, error: 'Error managing uploaded file' })
        nodeServer.database.setUserPicType(fields.email, profPicType, wallPicType, () => {
          serverLog(`Uploaded image successfully of type ${picType == 1 ? "Profile" : "Wallpaper"} , name: file.${type}`)
          return res.json({ ok: true, msg: true })
        })
    })
  })
})
interface createUser{
  picToken : string,
  error : number
}
app.post('/CreateUser', (req : any, res : any) => {

  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let email = req.body.email;
  let username = req.body.username;
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
  else if (username.trim().length == 0) {
    errorLog = "Insert username";
  }
  else if (!nameRegex.test(username.trim())) {
    errorLog = "Invalid username";
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
  nodeServer.database.createUser(req.body,(dataD : createUser) => {
      if (dataD.error == null) {
        createPicTokenFile(dataD.picToken);
      }
      return res.json({ 
        error : dataD.error
      })
  })
})

interface userSignIn{
  error : number
}
app.post('/LoginUser', (req : any, res : any) => {
  if(!platformState.isPlatform(req.body.platform)) return;
    let email = req.body.email;
    let password = req.body.password;
    if (email.trim().length == 0 || password.trim().length == 0)
    return res.json({
      error: true
    })
  serverLog(`Signin with ${email} on ${req.body.platform}`)
  nodeServer.database.userSignIn(req.body.email,req.body.password,(dataD : userSignIn) => {
    return res.json({
      email: email,
      platform: req.body.platform,
      error: dataD.error
    })
  })
})
function createPicTokenFile(picToken : string) {
  serverLog("Creating user files with token " + picToken);
  let profDir = './MediaFiles/ProfilePic/' + picToken;
  let wallDir = './MediaFiles/WallpaperPic/' + picToken;
  let postMediaDir = './MediaFiles/PostFiles/' + picToken;

  let tempProfDir = './MediaTempFiles/ProfilePic/' + picToken;
  let tempWallDir = './MediaTempFiles/WallpaperPic/' + picToken;
  let tempPostMediaDir = './MediaTempFiles/PostFiles/' + picToken;

  fs.access(profDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(profDir);
    } else {
      console.log("Directory already exists.")
    }
  })
  fs.access(wallDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(wallDir);
    } else {
      console.log("Directory already exists.")
    }
  })
  fs.access(postMediaDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(postMediaDir);
    } else {
      console.log("Directory already exists.")
    }
  })
  fs.access(tempProfDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(tempProfDir);
    } else {
      console.log("Directory already exists.")
    }
  })
  fs.access(tempWallDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(tempWallDir);
    } else {
      console.log("Directory already exists.")
    }
  })
  fs.access(tempPostMediaDir, function (error : any) {
    if (error) {
      fs.mkdirAsync(tempPostMediaDir);
    } else {
      console.log("Directory already exists.")
    }
  })
}
interface socketLogin{
    platform : string;
    email : string;
}
io.on('connection', function (socket : Socket) {
  serverLog("Connection Started ( Socket id: " + socket.id + " )")
  socket.on('socketLogin', function (data : socketLogin) {
    if (data.platform != null && data.email != null)
      nodeServer.onConnected(socket, data.platform, data.email);
  });
})