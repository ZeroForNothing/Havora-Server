const sql = require('mssql');
var path = require('path'),
  fs = require('fs');
const config = {
  user: 'sa',
  password: 'sa',
  server: 'localhost',
  database: 'Zero for Nothing',
  port: 1433,
  options: {
    enableArithAbort: true,
    encrypt: true
  }
}
//let PasswordHash = require('password-hash')
module.exports = class Database {
  constructor() {}

  getDataForSocket(platform, email, callback) { //keeps getting called for every refresh
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('platformEntered', sql.TinyInt, platform)
        .input('emailEntered', sql.NVarChar(100), email)
        .output('userID', sql.BigInt)
        .output('correctUsername', sql.VarChar(50))
        .output('userCode', sql.Int)
        .output('email', sql.VarChar(50))
        .output('newAcc', sql.TinyInt)
        .output('picToken', sql.VarChar(250))
        .output('profilePicType', sql.NVarChar(5))
        .output('wallpaperPicType', sql.NVarChar(5))
        .output('zeroCoin', sql.Int)
        .output('normalCoin', sql.Int)
        .output('experience', sql.BigInt)
        .output('AuthToken', sql.NVarChar(50))
        .output('platform', sql.TinyInt)
        .output('settings', sql.NVarChar(sql.MAX))
        .execute('getDataForSocket')
    }).then(result => {
      callback(result.output);
    })
    .catch(err => {
      // ... error checks
      console.log("server 1 cought error at 1: " + err);
    })
  }
  getUserProfile(userID, friendname, userCode, callback) {
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendName', sql.NVarChar(50), friendname)
        .input('userCode', sql.Int, userCode)
        .output('picToken', sql.NVarChar(250))
        .output('profilePicType', sql.NVarChar(5))
        .output('wallpaperPicType', sql.NVarChar(5))
        .output('friendRequest', sql.TinyInt)
        .output('friendID', sql.BigInt)
        .execute('getUserProfile')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("server 1 cought error at 2: " + err);
    })
  }
  setUserPicType(email, picType, wallPic, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('email', sql.VarChar(50), email)
        .input('profilePicType', sql.NVarChar(5), picType)
        .input('wallpaperPicType', sql.NVarChar(5), wallPic)
        .execute('setUserPicType')
    }).then(result => {
      callback();
    }).catch(err => {
      // ... error checks
      console.log("server 1 cought error at 3: " + err);
    })
  }
  setEveryUserToOffline(callback) { //keeps getting called for every refresh
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .execute('setEveryUserToOffline')
    }).then(result => {
      callback();
    }).catch(err => {
      // ... error checks
      console.log("Database error at 4: " + err);
    })
  }
  emailValidation(email, callback) { //keeps getting called for every refresh
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('email', sql.VarChar(50), email)
        .output('EmailExistBool', sql.TinyInt)
        .execute('emailValidation')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("server 1 cought error at 5: " + err);
    })
  }

  userSignOut(userID, platform, callback) { //keeps getting called for every refresh
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('platform', sql.TinyInt, platform)
        .execute('userSignOut')
    }).then(result => {
      callback()
    }).catch(err => {
      // ... error checks
      console.log("Database error at 6: " + err);
    })
  }
  getFriendsList(userID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('friendListJson', sql.NVarChar(sql.MAX))
        .execute('getFriendsList')
    }).then(result => {
      if (result.output.friendListJson != null)
        result.output.friendListJson = JSON.parse(result.output.friendListJson)
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 7: " + err);
    })
  }
  getQuests(userID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .output('QuestData', sql.NVarChar(sql.MAX))
        .execute('getQuests')
    }).then(result => {
      callback(result.output);
    }).catch(err => {
      console.log("Database cought error at 8: " + err);
    })
  }
  msgsSeen(userID, friendID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('msgsSeen')
    }).then((result) => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 9: " + err);
    })
  }
  editMsg(userID, textID, message, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('textID', sql.BigInt, textID)
        .input('message', sql.VarChar(300), message)
        .execute('editMsg')
    }).then(() => {
      callback()
    }).catch(err => {
      console.log("Database cought error at 10: " + err);
    })
  }
  getFriendRequest(userID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('friendRequests', sql.NVarChar(sql.MAX))
        .execute('getFriendRequest')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 11: " + err);
    })
  }
  userSignIn(email, password, platform, socket) {
    if (email == null || password == null)
      socket.emit('SignIn', {
        AuthToken: null
      });
    if (password.trim().length == 0 || email.trim().length == 0)
      socket.emit('SignIn', {
        AuthToken: null
      });
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('email', sql.VarChar(50), email)
        .input('password', sql.NVarChar(50), password)
        .input('platform', sql.TinyInt, platform)
        .output('error', sql.TinyInt)
        .output('AuthToken', sql.NVarChar(50))
        .execute('SignIn')
    }).then(result => {
      socket.emit('SignIn', {
        AuthToken: result.output.AuthToken
      });
    }).catch(err => {
      // ... error checks
      console.log("server 1 cought error at 12: " + err);
    })

  }
  respondToFriendRequest(userID, response, friendName, userCode, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('username', sql.VarChar(50), friendName)
        .input('userCode', sql.Int, userCode)
        .input('Response', sql.TinyInt, response)
        .output('error', sql.TinyInt)
        .output('friendJson', sql.NVarChar(sql.MAX))
        .output('myJson', sql.NVarChar(sql.MAX))
        .output('friendID', sql.BigInt)
        .execute('respondToFriendRequest')
    }).then(result => {
      if (result.output.friendJson != null && result.output.myJson != null) {
        result.output.friendJson = JSON.parse(result.output.friendJson)
        result.output.myJson = JSON.parse(result.output.myJson)
      }
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 13: " + err);
    })
  }
  saveMsg(userID, friendID, message, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input("friendID", sql.BigInt, friendID)
        .input('message', sql.NVarChar(300), message)
        .output("textID", sql.BigInt)
        .output("unSeenMsgsCount", sql.Int)
        .execute('saveMsg')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 14: " + err);
    })
  }
  showChatHistory(userID, friendName, userCode, currentfriendID, startPage, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendName', sql.VarChar(50), friendName)
        .input('userCode', sql.Int, userCode)
        .input('currentfriendID', sql.BigInt, currentfriendID)
        .input('startPage', sql.Int, startPage)
        .output('chatLog', sql.NVarChar(sql.MAX))
        .output('friendID', sql.BigInt)
        .execute('showChatHistory')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 15: " + err);
    })
  }
  deleteMsg(userID, textID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('textID', sql.BigInt, textID)
        .execute('deleteMsg')
    }).then(() => {
      callback()
    }).catch(err => {
      console.log("Database cought error at 16: " + err);
    })
  }
  msgsRecieved(userID, friendID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('msgsRecieved')
    }).then(() => {
      callback()
    }).catch(err => {
      console.log("Database cought error at 17: " + err);
    })
  }
  manageFriendRequest(userID, friendID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .output('requestHandler', sql.TinyInt)
        .execute('manageFriendRequest')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 18: " + err);
    })
  }
  unlinkAccountLinks(userID, username, userCode, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('username', sql.VarChar(50), username)
        .input('userCode', sql.Int, userCode)
        .output('friendID', sql.BigInt)
        .execute('unlinkAccountLinks')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 19: " + err);
    })
  }
  GainCoinAndExperience(userID, normalCoinAmount, experienceAmount, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('normalCoinAmount', sql.Int, normalCoinAmount)
        .input('experienceAmount', sql.Int, experienceAmount)
        .output('normalCoin', sql.Int)
        .output('experience', sql.Int)
        .execute('addExperienceAndNormalCoin')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 20: " + err);
    })
  }
  getAccountLinks(userID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('FirstLinkAccount', sql.NVarChar(sql.MAX))
        .output('SecondLinkAccount', sql.NVarChar(sql.MAX))
        .output('ThirdLinkAccount', sql.NVarChar(sql.MAX))
        .execute('getAccountLinks')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 21: " + err);
    })
  }
  setAccountLinks(userID, email, password, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('email', sql.VarChar(50), email)
        .input('Password', sql.VarChar(50), password)
        .output('username', sql.VarChar(50))
        .output('userCode', sql.Int)
        .output('friendID', sql.BigInt)
        .execute('setAccountLinks')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      console.log("Database cought error at 22: " + err);
    })
  }
  accessAccountLinks(userID, username, userCode, platform, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('username', sql.NVarChar(50), username)
        .input('userCode', sql.Int, userCode)
        .input('platform', sql.TinyInt, platform)
        .output('AuthToken', sql.NVarChar(50))
        .execute('accessAccountLinks')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 23: " + err);
    })
  }
  unFriendRelation(userID, friendID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('unFriendRelation')
    }).catch(err => {
      console.log("Database cought error at 24: " + err);
    })
  }
  getSkins(search, category, option, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('search', sql.VarChar(50), search)
        .input('category', sql.TinyInt, category)
        .input('option', sql.TinyInt, option)
        .output('skinData', sql.NVarChar(sql.MAX))
        .execute('getSkins')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 25: " + err);
    })
  }
  getClassList(classID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('classID', sql.Int, classID)
        .output('classData', sql.NVarChar(sql.MAX))
        .execute('getClassList')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 26: " + err);
    })
  }
  createComment(userID, postID, commentID, text, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('fromUserID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('text', sql.NVarChar(sql.MAX), text)
        .output('returnCommentID', sql.BigInt)
        .output('commentDate', sql.DateTime)
        .output('error', sql.TinyInt)
        .execute('createComment')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 27: " + err);
    })
  }
  saveContent(userID, postID, commentID, text, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('text', sql.NVarChar(sql.MAX), text)
        .output('answer', sql.Int)
        .execute('saveContent')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 28: " + err);
    })
  }
  getSpecificContent(userID, postID, commentID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .output('content', sql.NVarChar(sql.MAX))
        .execute('getSpecificContent')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 29: " + err);
    })
  }
  setUserOpinion(userID, postID, commentID, opinion, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('opinion', sql.TinyInt, opinion)
        .output('agree', sql.BigInt)
        .output('disagree', sql.BigInt)
        .output('error', sql.tinyInt)
        .execute('setUserOpinion')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 30: " + err);
    })
  }
  userDisconnected(userID, platform) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('platform', sql.TinyInt, platform)
        .execute('userDisconnected')
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 31: " + err);
    })
  }
  searchForUser(userID, username, userCode, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('currentUserID', sql.BigInt, userID)
        .input('username', sql.VarChar(50), username)
        .input('userCode', sql.Int, userCode)
        .output('userCorrectName', sql.VarChar(50))
        .output('friendCode', sql.Int)
        .output('friendID', sql.BigInt)
        .output('picToken', sql.VarChar(250))
        .output('picType', sql.TinyInt)
        .execute('searchForUser')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 32: " + err);
    })
  }
  editProfileInfo(userID, firstname, lastname, gender, birthDate, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('firstname', sql.VarChar(50), firstname)
        .input('lastname', sql.VarChar(50), lastname)
        .input('gender', sql.TinyInt, gender)
        .input('birthDate', sql.Date, birthDate)
        .output('error', sql.TinyInt)
        .execute('editProfileInfo')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 33: " + err);
    })
  }

  getUserInformation(userID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .output('firstname', sql.VarChar(50))
        .output('lastname', sql.VarChar(50))
        .output('username', sql.VarChar(50))
        .output('email', sql.VarChar(250))
        .output('gender', sql.TinyInt)
        .output('birthDate', sql.Date)
        .output('error', sql.TinyInt)
        .execute('getMyInfo')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 34: " + err);
    })
  }
  editPassword(userID, oldpassword, confpassword, newpassword, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('oldpassword', sql.VarChar(50), oldpassword)
        .input('confpassword', sql.VarChar(50), confpassword)
        .input('newpassword', sql.VarChar(50), newpassword)
        .output('error', sql.TinyInt)
        .execute('editPassword')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 35: " + err);
    })
  }
  SetGameSound(userID, sound) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('sound', sql.Float, sound)
        .execute('SetGameSound')
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 36: " + err);
    })
  }
  SetGameThemeColor(userID, color) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('color', sql.TinyInt, color)
        .execute('SetGameThemeColor')
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 37: " + err);
    })
  }
  deleteContent(userID, postID, commentID, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .execute('deleteContent')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 38: " + err);
    })
  }
  getTopComments(userID, postID, commentID, startPage, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('viewerUserID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('startPage', sql.Int, startPage)
        .output('commentsList', sql.NVarChar(sql.MAX))
        .execute('getTopComments')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 39: " + err);
    })
  }
  getTopPosts(userID, categoryID, username, userCode, startPage, callback) {
    sql.connect(config).then(pool => {
      // Stored procedure
      return pool.request()
        .input('viewerUserID', sql.BigInt, userID)
        .input('categoryID', sql.Int, categoryID)
        .input('username', sql.VarChar(50), username)
        .input('userCode', sql.Int, userCode)
        .input('startPage', sql.Int, startPage)
        .output('categoryName', sql.NVarChar(50))
        .output('postsList', sql.NVarChar(sql.MAX))
        .execute('getTopPosts')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 40: " + err);
    })
  }
  createUser(data, callback) {
    sql.connect(config).then(pool => {
      if (data == null) return;
      if (data.password != data.confirmPassword) return;
      if (data.gender != 1 && data.gender != 2) return;
      if (data.username == null ||
        data.firstname == null ||
        data.lastname == null ||
        data.password == null ||
        data.gender == null ||
        data.birthYear == null ||
        data.birthMonth == null ||
        data.birthMonth == null ||
        data.birthDay == null
      ) return;
      // Stored procedure
      return pool.request()
        .input('firstname', sql.VarChar(50), data.firstname)
        .input('lastname', sql.VarChar(50), data.lastname)
        .input('email', sql.VarChar(250), data.email)
        .input('password', sql.VarChar(50), data.password)
        .input('gender', sql.TinyInt, data.gender)
        .input('username', sql.VarChar(50), data.username)
        .input('birthYear', sql.SmallInt, data.birthYear)
        .input('birthMonth', sql.TinyInt, data.birthMonth)
        .input('birthDay', sql.TinyInt, data.birthDay)
        .output('picToken', sql.VarChar(250))
        .output('AuthToken', sql.NVarChar(50))
        .output('error', sql.TinyInt)
        .execute('createUser')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("server 1 cought error at 41: " + err);
    })
  }
  createPost(userID, toUserID, categoryType, title, text, url, mediaFiles, mediaFolder, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('fromUserID', sql.BigInt, userID)
        .input('toUserID', sql.BigInt, toUserID)
        .input('categoryTypeID', sql.Int, categoryType)
        .input('title', sql.NVarChar(150), title)
        .input('text', sql.NVarChar(sql.MAX), text)
        .input('url', sql.NVarChar(250), url)
        .input('mediaFiles', sql.NVarChar(sql.MAX), mediaFiles)
        .input('mediaFolder', sql.NVarChar(50), mediaFolder)
        .output('postID', sql.BigInt)
        .output('error', sql.tinyInt)
        .execute('createPost')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 42: " + err);
    })
  }
  getCategoryList(categoryName, callback) {
    sql.connect(config).then(pool => {
      return pool.request()
        .input('categoryName', sql.NVarChar(50) , categoryName)
        .output('categoryList', sql.NVarChar(sql.MAX))
        .output('categorySuggestionList', sql.NVarChar(sql.MAX))
        .execute('getCategoryList')
    }).then(result => {
      callback(result.output)
    }).catch(err => {
      // ... error checks
      console.log("Database cought error at 43: " + err);
    })
  }
}