const sql = require('mssql');
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
interface Output {
  output: any
}
interface createUser{
  email : string,
  password :string,
  confirmPassword : string,
  gender :number,
  name : string,
  firstName: string,
  lastName : string,
  date : string,
}
// type Callback = (message: any) => void
type Callback = ReturnType<(asd : any) => any>
export {}
module.exports = class Database {
  constructor() {}
  getDataForSocket(email : string, callback : Callback) { 
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('emailEntered', sql.NVarChar(100), email)
        .output('id', sql.BigInt)
        .output('name', sql.VarChar(50))
        .output('code', sql.Int)
        .output('email', sql.VarChar(50))
        .output('newAcc', sql.TinyInt)
        .output('token', sql.VarChar(250))
        .output('prof', sql.NVarChar(50))
        .output('wall', sql.NVarChar(50))
        .output('zeroCoin', sql.Int)
        .output('normalCoin', sql.Int)
        .output('experience', sql.BigInt)
        .output('settings', sql.NVarChar(sql.MAX))
        .execute('getDataForSocket')
    }).then((result: Output)=> {
      callback(result.output);
    })
    .catch((err: any) => {
      // ... error checks
      console.log("Database 1 cought error at 1: " + err);
    })
  }
  getUserProfile(userID : string, friendname : string, code : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendName', sql.NVarChar(50), friendname)
        .input('code', sql.Int, code)
        .output('token', sql.NVarChar(250))
        .output('prof', sql.NVarChar(50))
        .output('wall', sql.NVarChar(50))
        .output('friendRequest', sql.Int)
        .output('friendID', sql.BigInt)
        .execute('getUserProfile')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database 1 cought error at 2: " + err);
    })
  }
  setUserPicture(userID : string, prof : string, wallPic : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
      .input('userID', sql.BigInt, userID)
        .input('prof', sql.NVarChar(50), prof)
        .input('wall', sql.NVarChar(50), wallPic)
        .execute('setUserPicture')
    }).then((result: Output)=> {
      callback(null);
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database 1 cought error at 3: " + err);
    })
  }
  setEveryUserToOffline(callback : Callback) { //keeps getting called for every refresh
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .execute('setEveryUserToOffline')
    }).then((result: Output)=> {
      callback(null);
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database error at 4: " + err);
    })
  }
  emailValidation(email : string, callback : Callback) { //keeps getting called for every refresh
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('email', sql.VarChar(50), email)
        .output('EmailExistBool', sql.TinyInt)
        .execute('emailValidation')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database 1 cought error at 5: " + err);
    })
  }

  getFriendsList(userID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('friendListJson', sql.NVarChar(sql.MAX))
        .execute('getFriendsList')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 7: " + err);
    })
  }
  getQuests(userID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .output('QuestData', sql.NVarChar(sql.MAX))
        .execute('getQuests')
    }).then((result: Output)=> {
      callback(result.output);
    }).catch((err: any)=> {
      console.log("Database cought error at 8: " + err);
    })
  }
  msgsSeen(userID : string, friendID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('msgsSeen')
    }).then((result : Output) => {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 9: " + err);
    })
  }
  editMsg(userID : string, textID :number, message : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('textID', sql.BigInt, textID)
        .input('message', sql.VarChar(300), message)
        .execute('editMsg')
    }).then(() => {
      callback(null)
    }).catch((err: any)=> {
      console.log("Database cought error at 10: " + err);
    })
  }
  getFriendRequest(userID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('friendRequests', sql.NVarChar(sql.MAX))
        .execute('getFriendRequest')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 11: " + err);
    })
  }

  userSignIn(email : string, password : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('email', sql.VarChar(50), email)
        .input('password', sql.NVarChar(50), password)
        .output('token', sql.NVarChar(250))
        .output('error', sql.TinyInt)
        .execute('SignIn')
    }).then((result: Output) => {
      callback(result.output)
    }).catch((err: any) => {
      console.log("Database cought error at 12: " + err);
    })
  }
  respondToFriendRequest(userID : string, response : number, friendName : string, code  :number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('name', sql.VarChar(50), friendName)
        .input('code', sql.Int, code)
        .input('Response', sql.TinyInt, response)
        .output('error', sql.TinyInt)
        .output('friendJson', sql.NVarChar(sql.MAX))
        .output('myJson', sql.NVarChar(sql.MAX))
        .output('friendID', sql.BigInt)
        .execute('respondToFriendRequest')
    }).then((result: Output)=> {
      // if (result.output.friendJson != null && result.output.myJson != null) {
      //   result.output.friendJson = JSON.parse(result.output.friendJson)
      //   result.output.myJson = JSON.parse(result.output.myJson)
      // }
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 13: " + err);
    })
  }
  saveMsg(userID : string, friendID : string, message : string, mediaFolder : string, mediaFiles : string , callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input("friendID", sql.BigInt, friendID)
        .input('message', sql.NVarChar(300), message)
        .input('mediaFiles', sql.NVarChar(sql.MAX), mediaFiles)
        .input('mediaFolder', sql.NVarChar(50), mediaFolder)
        .output("textID", sql.BigInt)
        .output("unSeenMsgsCount", sql.Int)
        .execute('saveMsg')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 14: " + err);
    })
  }
  showChatHistory(userID : string, friendID : string, startPage : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .input('startPage', sql.Int, startPage)
        .output('chatLog', sql.NVarChar(sql.MAX))
        .output("unSeenMsgsCount", sql.Int)
        .execute('showChatHistory')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 15: " + err);
    })
  }
  deleteMsg(userID : string, textID : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('textID', sql.BigInt, textID)
        .execute('deleteMsg')
    }).then(() => {
      callback(null)
    }).catch((err: any)=> {
      console.log("Database cought error at 16: " + err);
    })
  }
  msgsRecieved(userID : string, friendID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('msgsRecieved')
    }).then(() => {
      callback(null)
    }).catch((err: any)=> {
      console.log("Database cought error at 17: " + err);
    })
  }
  manageFriendRequest(userID : string, friendID : string,response : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .input('response', sql.TinyInt, response)
        .output('requestHandler', sql.TinyInt)
        .execute('manageFriendRequest')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 18: " + err);
    })
  }
  unlinkAccountLinks(userID : string, name : string, code : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('name', sql.VarChar(50), name)
        .input('code', sql.Int, code)
        .output('friendID', sql.BigInt)
        .execute('unlinkAccountLinks')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 19: " + err);
    })
  }
  GainCoinAndExperience(userID : string, normalCoinAmount : number, experienceAmount : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('normalCoinAmount', sql.Int, normalCoinAmount)
        .input('experienceAmount', sql.Int, experienceAmount)
        .output('normalCoin', sql.Int)
        .output('experience', sql.Int)
        .execute('addExperienceAndNormalCoin')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 20: " + err);
    })
  }
  getAccountLinks(userID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .output('FirstLinkAccount', sql.NVarChar(sql.MAX))
        .output('SecondLinkAccount', sql.NVarChar(sql.MAX))
        .output('ThirdLinkAccount', sql.NVarChar(sql.MAX))
        .execute('getAccountLinks')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 21: " + err);
    })
  }
  setAccountLinks(userID : string, email : string, password : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('email', sql.VarChar(50), email)
        .input('Password', sql.VarChar(50), password)
        .output('name', sql.VarChar(50))
        .output('code', sql.Int)
        .output('friendID', sql.BigInt)
        .execute('setAccountLinks')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      console.log("Database cought error at 22: " + err);
    })
  }
  accessAccountLinks(userID : string, name : string, code : number, platform : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('name', sql.NVarChar(50), name)
        .input('code', sql.Int, code)
        .input('platform', sql.TinyInt, platform)
        .output('AuthToken', sql.NVarChar(50))
        .execute('accessAccountLinks')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 23: " + err);
    })
  }
  unFriendRelation(userID : string, friendID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('UserID', sql.BigInt, userID)
        .input('friendID', sql.BigInt, friendID)
        .execute('unFriendRelation')
    }).catch((err: any)=> {
      console.log("Database cought error at 24: " + err);
    })
  }
  getSkins(search : string, category  : number, option : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('search', sql.VarChar(50), search)
        .input('category', sql.TinyInt, category)
        .input('option', sql.TinyInt, option)
        .output('skinData', sql.NVarChar(sql.MAX))
        .execute('getSkins')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 25: " + err);
    })
  }
  getClassList(classID : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('classID', sql.Int, classID)
        .output('classData', sql.NVarChar(sql.MAX))
        .execute('getClassList')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 26: " + err);
    })
  }
  createComment(userID : string, postID : string, commentID : string, text : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('fromUserID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('text', sql.NVarChar(sql.MAX), text)
        .output('returnCommentID', sql.BigInt)
        .output('commentDate', sql.DateTime)
        .output('error', sql.TinyInt)
        .execute('createComment')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 27: " + err);
    })
  }
  saveContent(userID : string, postID : string, commentID : number, text : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('text', sql.NVarChar(sql.MAX), text)
        .output('answer', sql.Int)
        .execute('saveContent')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 28: " + err);
    })
  }
  getSpecificContent(userID : string, postID : string, commentID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .output('content', sql.NVarChar(sql.MAX))
        .execute('getSpecificContent')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 29: " + err);
    })
  }
  setUserOpinion(userID : string, postID : string, commentID : string, opinion : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('opinion', sql.TinyInt, opinion)
        .output('agree', sql.BigInt)
        .output('disagree', sql.BigInt)
        .output('error', sql.tinyInt)
        .execute('setUserOpinion')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 30: " + err);
    })
  }

  searchForUser(userID : string, name : string, code : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('currentUserID', sql.BigInt, userID)
        .input('name', sql.VarChar(50), name)
        .input('code', sql.Int, code)
        .output('friendID', sql.BigInt)
        .output('token', sql.VarChar(250))
        .output('prof', sql.NVarChar(50))
        .output('wall', sql.NVarChar(50))
        .execute('searchForUser')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 32: " + err);
    })
  }
  editProfileInfo(userID : string, firstname : string, lastname : string, gender : number, birthDate : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('firstname', sql.VarChar(50), firstname)
        .input('lastname', sql.VarChar(50), lastname)
        .input('gender', sql.TinyInt, gender)
        .input('birthDate', sql.Date, birthDate)
        .output('error', sql.TinyInt)
        .execute('editProfileInfo')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 33: " + err);
    })
  }

  getUserInformation(userID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .output('firstname', sql.VarChar(50))
        .output('lastname', sql.VarChar(50))
        .output('name', sql.VarChar(50))
        .output('email', sql.VarChar(250))
        .output('gender', sql.TinyInt)
        .output('birthDate', sql.Date)
        .output('error', sql.TinyInt)
        .execute('getMyInfo')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 34: " + err);
    })
  }
  editPassword(userID : string, oldpassword : string, confpassword : string, newpassword : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('oldpassword', sql.VarChar(50), oldpassword)
        .input('confpassword', sql.VarChar(50), confpassword)
        .input('newpassword', sql.VarChar(50), newpassword)
        .output('error', sql.TinyInt)
        .execute('editPassword')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 35: " + err);
    })
  }
  SetGameSound(userID : string, sound:number) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('sound', sql.Float, sound)
        .execute('SetGameSound')
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 36: " + err);
    })
  }
  SetThemeColor(userID : string, color:number, callback:Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('color', sql.TinyInt, color)
        .execute('SetGameThemeColor')
    }).then((result: Output)=> {
      callback(null)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 37: " + err);
    })
  }
  deleteContent(userID : string, postID : string, commentID : string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('userID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .execute('deleteContent')
    }).then((result: Output)=> {
      callback(null)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 38: " + err);
    })
  }
  getTopComments(userID : string, postID : string, commentID : string, startPage : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('viewerUserID', sql.BigInt, userID)
        .input('postID', sql.BigInt, postID)
        .input('commentID', sql.BigInt, commentID)
        .input('startPage', sql.Int, startPage)
        .output('commentsList', sql.NVarChar(sql.MAX))
        .execute('getTopComments')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 39: " + err);
    })
  }
  getTopPosts(userID : string, categoryID:number, name : string, code : number, startPage : number, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('viewerUserID', sql.BigInt, userID)
        .input('categoryID', sql.Int, categoryID)
        .input('name', sql.VarChar(50), name)
        .input('code', sql.Int, code)
        .input('startPage', sql.Int, startPage)
        .output('categoryName', sql.NVarChar(50))
        .output('postsList', sql.NVarChar(sql.MAX))
        .execute('getTopPosts')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 40: " + err);
    })
  }
  createUser(userData : createUser, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      // Stored procedure
      return pool.request()
        .input('firstname', sql.VarChar(50), userData.firstName)
        .input('lastname', sql.VarChar(50), userData.lastName)
        .input('email', sql.VarChar(250), userData.email)
        .input('password', sql.VarChar(50), userData.password)
        .input('gender', sql.TinyInt, userData.gender)
        .input('name', sql.VarChar(50), userData.name)
        .input('birthDate', sql.Date, userData.date)
        .output('token', sql.VarChar(250))
        .output('error', sql.TinyInt)
        .execute('createUser')
    }).then((result: Output) => {
      callback(result.output)
    }).catch((err: any) => {
      // ... error checks
      console.log("Database cought error at 41: " + err);
    })
  }
  createPost(userID : string, toUserID : string, categoryType : number, title: string, text: string, url: string, mediaFiles: string, mediaFolder: string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
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
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 42: " + err);
    })
  }
  getCategoryList(categoryName: string, callback : Callback) {
    sql.connect(config).then((pool : any) => {
      return pool.request()
        .input('categoryName', sql.NVarChar(50) , categoryName)
        .output('categoryList', sql.NVarChar(sql.MAX))
        .output('categorySuggestionList', sql.NVarChar(sql.MAX))
        .execute('getCategoryList')
    }).then((result: Output)=> {
      callback(result.output)
    }).catch((err: any)=> {
      // ... error checks
      console.log("Database cought error at 43: " + err);
    })
  }
}