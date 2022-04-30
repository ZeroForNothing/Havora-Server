import { Socket } from "../node_modules/socket.io/dist/socket";
let axios = require('axios')
let User = require('./User')
const WindowState = require('./Utility/WindowState')
const bluebird = require('bluebird');
let path = require('path');
const fs = bluebird.promisifyAll(require('fs'));
const PlatformState = require('./Utility/PlatformState')
const Server = require('./server')
const Lobby = require('./Lobbies/Lobby')
export {}

interface userSmallData{
  id : string,
  name : string,
  code : number
}
interface CreatingPostFor{
  type : number,
  id :  string,
  picToken : string,
  picType : string,
  name : string,        
  code : number ,
  folderName : string
}

module.exports = class Connection {

  user : typeof User;
  id : string;
  highestPlatform : typeof PlatformState;
  clientSocket : Socket;
  webSocket : Socket[];
  mobileSocket : Socket;
  lobby : typeof Lobby[];
  server : typeof Server;

  constructor(socket : Socket, server : typeof Server, currentPlatform : string, userData : typeof User) {
    this.id = userData.id;
    this.highestPlatform = currentPlatform;
    this.clientSocket = null;
    this.webSocket = [];
    this.mobileSocket = null;
    
    let platformState = new PlatformState();
    if (currentPlatform == platformState.CLIENT) {
      this.clientSocket = socket
    } else if (currentPlatform == platformState.WEBSITE) {
      this.webSocket.push(socket);
    } else if (currentPlatform == platformState.MOBILE) {
      this.mobileSocket = socket
    }

    
    this.lobby = [];
    this.server = server;
    this.user = new User(userData);

    // let groupLobbyID = "GroupLobby";
    // if (groupLobbyID != null && groupLobbys[groupLobbyID] != null) {
    //   let groupLobbys = server.groupLobbys;
    //   socket.join(groupLobbyID);
    //   connection.groupLobby = groupLobbys[groupLobbyID];
    //   connection.groupLobby.onEnterGroupLobby(connection);
    // }
    this.createSocialEvents(currentPlatform);
    return this;
  }
  log(text : string) {
    console.log('Web Connection ( id:', this.id, ', name:', this.user.name, ', code: #', this.user.code, ') =>', text);
  }
  startOtherPlatform(socket : Socket, currentPlatform : string) {
    let connection = this;
    let platformState = new PlatformState();
    if (currentPlatform == platformState.CLIENT) {
      connection.clientSocket = socket
    } else if (currentPlatform == platformState.WEBSITE) {
      connection.webSocket.push(socket)
    } else if (currentPlatform == platformState.MOBILE) {
      connection.mobileSocket = socket
    }
    if (platformState.checkHigherPlatform(connection.highestPlatform , currentPlatform)) 
      connection.highestPlatform = currentPlatform;

    connection.createSocialEvents(currentPlatform);
  }
  everySocket(socketEvent : string, data: any) {
    let connection = this;
    if (connection.clientSocket != null)
      connection.clientSocket.emit(socketEvent, data);
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach((mySocket : Socket) => {
        if (mySocket != null) {
          mySocket.emit(socketEvent, data);
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.emit(socketEvent, data);
  }
  everySocketInLobby(socketEvent : string, lobbyID : string, data : any) {
    let connection = this;
    if (connection.clientSocket != null)
      connection.clientSocket.broadcast.to(lobbyID).emit(socketEvent, data);
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach((mySocket : Socket) => {
        if (mySocket != null) {
          mySocket.broadcast.to(lobbyID).emit(socketEvent, data);
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.broadcast.to(lobbyID).emit(socketEvent, data);
  }
  everySocketJoinLobby(lobbyID : string) {
    let connection = this;
    if (connection.clientSocket != null){
      connection.clientSocket.join(lobbyID);
      connection.log('Entered the lobby ('+ lobbyID+') with client');
    }
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach((mySocket : Socket) => {
        if (mySocket != null) {
          mySocket.join(lobbyID);
          connection.log('Entered the lobby ('+ lobbyID+') with web');
        }
      })
    }
    if (connection.mobileSocket != null){
      connection.mobileSocket.join(lobbyID);
      connection.log('Entered the lobby ('+ lobbyID+ ') with mobile');
    }
  }
  everySocketLeaveLobby(lobbyID : string) {
    let connection = this;
    if (connection.clientSocket != null){
      connection.clientSocket.leave(lobbyID);
      connection.log('Left the lobby ('+ lobbyID+ ') with client');
    }
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach((mySocket : Socket) => {
        if (mySocket != null) {
          mySocket.leave(lobbyID);
          connection.log('Left the lobby ('+ lobbyID+') with web');
        }
      })
    }
    if (connection.mobileSocket != null){
      connection.mobileSocket.leave(lobbyID);
      connection.log('Left the lobby ('+ lobbyID+ ') with mobile');
    }
  }

  createSocialEvents(currentPlatform : string) {
    let windowState = new WindowState();
    let WINDOW = windowState.defaultState;

    let ViewingPostID : string = null;
    let ViewingCommentID : string = null;
    let ViewingProfile : userSmallData = null;

    let ChatingWithUserID : string = null
    let ChatingWithUserName : string = null
    let ChatingWithUserCode : number = null
    let CreatingPostFor : CreatingPostFor = null;

    let connection = this;
    let userID = connection.id;
    let socket : Socket;
    let server = connection.server;
    let user = connection.user;

    let platformState = new PlatformState();
    if (currentPlatform == platformState.CLIENT) {
      socket = connection.clientSocket;
    } else if (currentPlatform == platformState.WEBSITE) {
      socket = connection.webSocket[connection.webSocket.length - 1];
    } else if (currentPlatform == platformState.MOBILE) {
      socket = connection.mobileSocket;
    }
    connection.log('Connected with platform: ' + currentPlatform);

    socket.emit('registerUser', user.ToJson());
    // socket.on('registerUser',()=>{
    // })
    interface friendListJson{
      friendListJson : string;
    }
    interface friendList{
      username : string;
      userCode : number;
    }
    socket.on('tellFriendsImOnline', function () {
      connection.log("Fetching friends list")
      server.database.getFriendsList(userID, (dataD : friendListJson) => {
        user.friendList = dataD.friendListJson ? JSON.parse(dataD.friendListJson) : null
        socket.emit('updateFriendList', dataD);
        if (user.friendList.length == 0) return;
        user.friendList.forEach((friend : friendList) => {
          let username = friend.username;
          let userCode = friend.userCode;
          for (let key in server.connections) {
            if (server.connections.hasOwnProperty(key)) {
              if (server.connections[key].user.name == username && server.connections[key].user.code == userCode) {
                let friendData = {
                  username: user.name,
                  userCode: user.code,
                  clientDevice: connection.highestPlatform
                }
                server.connections[key].everySocket('friendIsOnline', friendData)
                server.database.msgsRecieved(server.connections[key].id, connection.id, () => {
                  let myData = {
                    username,
                    userCode
                  }
                  server.connections[key].everySocket('msgsRecieved', myData)
                })
                return;
              }
            }
          }
        })
      })
    })
    interface friendRequests {
      friendRequests: string
    }
    socket.on('getNotification', function () {
      server.database.getFriendRequest(userID, (dataD : friendRequests) => {
        socket.emit('getFriendRequest', {
          friendRequests: dataD.friendRequests
        });
      })
    });
    socket.on('disconnect', function () {
      server.onDisconnected(connection, currentPlatform, socket.id);
    });
    // remove this and from database and anything related
    // socket.on('SignOut', function () {
    //   server.database.userSignOut(userID, currentPlatform, () => {
    //     socket.emit('SignOut');
    //   })
    // })
  
    interface saveMsg{
      textID : string,
      unSeenMsgsCount : number
    }
    socket.on('sendMessage', async function (data) {
      if (!ChatingWithUserID) return;
      if(!data && !data.message && !data.folderName) return;
      let folderName = data.folderName;
      let tempFiles : string[];
      if(folderName){
        tempFiles = await axios.post('/CheckTempDirectory',{
          picToken : user.picToken,
          folderName : folderName,
          directoryType : "ChatFiles"
        })
        .then(function (res : any) {
            if(res && res.data && res.data.ok && res.data.tempFiles)
              return res.data.tempFiles;
            else
              return [];
        }).catch(function (error : any) : [] {
          if(error) connection.log("CheckTempDirectory: Encountered error no file collected")
          return [];
        });
      }
      if(folderName && tempFiles.length == 0) return;
      connection.log(`Sending message to userID ${ChatingWithUserID}`)
      server.database.saveMsg(userID, ChatingWithUserID, data.message , folderName , tempFiles, async (dataD : saveMsg) => {
        let isMedia = folderName && tempFiles && tempFiles.length != 0
        if(isMedia){
          const filesMoved : boolean = await axios.post('/CreateDirectory',{
            picToken : user.picToken,
            folderName : folderName,
            directoryType : "ChatFiles",
            tempFiles
          })
          .then(function (res : any) {
            if(res && res.data && res.data.ok)
              return true;
            else 
              return false;
          }).catch(function (error : any) {
            if(error) connection.log("CreateDirectory: Encountered error no file Moved")
            return false;
          });
          if(!filesMoved) return;
        }


        let msgData = {
          textID: dataD.textID,
          oldID : data.id,
          myself: true,
          folderName,
          tempFiles,
          isMedia
        }
        connection.everySocket('sendMessage', msgData)
        let friendConn = server.connections["User_" + ChatingWithUserID]
        if (friendConn == null) return;

        let friendName = friendConn.user.name
        let friendCode = friendConn.user.code
        let friendData = {
          message: data.message,
          textID: dataD.textID,
          username: user.name,
          userCode: user.code,
          unSeenMsgsCount: dataD.unSeenMsgsCount,
          myself: false,
          folderName,
          tempFiles,
          isMedia
        }
        friendConn.everySocket('sendMessage', friendData)
        if (friendConn.mobileSocket != null || friendConn.webSocket.length != 0 || friendConn.clientSocket != null || friendConn.gameSocket != null) {
          server.database.msgsRecieved(connection.id, friendConn.id, () => {
            let myData = {
              username: friendName,
              userCode: friendCode
            }
            connection.everySocket('msgsRecieved', myData)
            friendConn.everySocket('msgsRecievedWhileNotTaklingWithUser', friendData)
          })
        }
      })
    })
    socket.on('msgsRecievedWhileNotTaklingWithUser',(data)=>{
      if(!data.showUnreadMsgs && ChatingWithUserName == data.username && ChatingWithUserCode == data.userCode){
        socket.emit('msgsRecievedWhileNotTaklingWithUser')
      }else{
        data.showUnreadMsgs = true;
        socket.emit('msgsRecievedWhileNotTaklingWithUser' , data)
      }
    })
    interface searchForUser{
      friendID : string,
      picToken : string,
      picType : string
    }
    socket.on('showChatWindow', function (data) {
      if (!data || !data.username || !data.userCode) return;
      server.database.searchForUser(userID, data.username, data.userCode, (dataD : searchForUser) => {
        ChatingWithUserID = dataD.friendID
        ChatingWithUserName = data.username
        ChatingWithUserCode = data.userCode
        socket.emit('OpenWindow', {
          window: windowState.CHAT,
          load : {
            username: data.username, 
            userCode: data.userCode,
            picToken:dataD.picToken,
            picType:dataD.picType
          }
        });
      })
    })
    interface showChatHistory{
      chatLog : string,
      unSeenMsgsCount : number
    }
    socket.on('showChatHistory', function (data) {
      if(!ChatingWithUserID) return;

      connection.log("Fetching chat history")
      server.database.showChatHistory(userID, ChatingWithUserID, data.page, (dataD : showChatHistory) => {
        socket.emit('showChatHistory', {
          chatLog: dataD.chatLog,
          username: user.name,
          userCode: user.code,
          page: data.page + 25,
          unSeenMsgsCount : dataD.unSeenMsgsCount
        });
        socket.emit("removeMsgsRecievedAlert" , {
          username: ChatingWithUserName,
          userCode: ChatingWithUserCode
        })
        if (ChatingWithUserID == null) return;
        let friendConn = server.connections["User_" + ChatingWithUserID]
        if (friendConn){
          let myData = {
            username: user.name,
            userCode: user.code
          }
          friendConn.everySocket('msgsSeen', myData)
        }
      })
    });
    socket.on('msgsSeen', function (data) {
      if (!ChatingWithUserID) return;
      let friendID = ChatingWithUserID;
      server.database.msgsSeen(userID, friendID, () => {
        let friendConn = server.connections["User_" + friendID]
        if (friendConn == null) return;
        let myData = {
          username: user.name,
          userCode: user.code
        }
        friendConn.everySocket('msgsSeen', myData)
      })
    })
    socket.on('deleteMsg', function (data) {
      let textID = data.textID;
      if (isNaN(textID)) return;
      if (!ChatingWithUserID) return;
      server.database.deleteMsg(userID, textID, () => {
        let myData = {
          textID: textID
        }
        connection.everySocket('deleteMsg', myData)
        let friendConn = server.connections["User_" + ChatingWithUserID]
        if (friendConn == null) return;
        friendConn.everySocket('deleteMsg', myData)
      })
    })
    socket.on('editMsg', function (data) {
      let textID = data.textID
      if (data.message == null) return;
      let message = data.message.trim()
      if (isNaN(textID) || message.length == 0) return;
      if (!ChatingWithUserID) return;
      server.database.editMsg(userID, textID, message, () => {
        let myData = {
          textID: textID,
          message : message
        }
        connection.everySocket('editMsg', myData)
        let friendConn = server.connections["User_" + ChatingWithUserID]
        if (friendConn == null) return;
        friendConn.everySocket('editMsg', myData)
      })
    })
    interface unlinkAccountLinks{
      friendID : string
    }
    socket.on('unlinkAccountLinks', function (data) {
      server.database.unlinkAccountLinks(userID, data.username, data.userCode, (dataD : unlinkAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        }
      })
    })
    socket.on('getAccountLinks', function () {
      user.GetAccountLink(connection, server, socket);
    })
    interface setAccountLinks {
      username : string,
      userCode : number,
      friendID : string
    }
    socket.on('setAccountLinks', function (data) {
      server.database.setAccountLinks(userID, data.email, data.password, (dataD : setAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        } else {
          socket.emit('setAccountLinks');
        }
      })
    })
    interface accessAccountLinks {
      AuthToken : string
    }
    socket.on('accessAccountLinks', function (data) {
      server.database.accessAccountLinks(userID, data.username, data.userCode, currentPlatform, (dataD : accessAccountLinks) => {
        socket.emit('accessAccountLinks', dataD.AuthToken);
      })
    })

    // socket.on('getSpecificContent', function(data) {
    //   user.getSpecificContent(data, connection, server, socket, CommentPage)
    // })
    interface getTopPosts{
      categoryName : string,
      postsList : string
    }
    socket.on('getTopPosts', function (data) {
      connection.log(`Fetching posts for ${data.categoryID != 1 ? "Community" : "Profile "+data.name+"#"+data.code}`)
      server.database.getTopPosts(connection.id,data.categoryID, data.name, data.code, data.page, (dataD : getTopPosts) => {
        socket.emit('getCategoryName',{
          categoryName : dataD.categoryName
        })
        socket.emit('getTopPosts', {
          currentCategoryID : data.categoryID,
          postsList: dataD.postsList,
          page: data.page + 5
        });
      })
    })
    interface getCategoryList{
      categoryList : string,
      categorySuggestionList : string
    }
    socket.on('getCategoryList', function (data) {
      let categoryName = data.categoryName;
      if(categoryName.trim().length === 0) return;
      server.database.getCategoryList(categoryName,(dataD : getCategoryList) => {
        socket.emit('getCategoryList', {
          categoryList: dataD.categoryList,
          categorySuggestionList : dataD.categorySuggestionList
        });
      })
    })
    interface getTopComments{
      commentsList: string
    }
    socket.on('getTopComments', function (data) {
      if (data.contentID == null || isNaN(data.contentID)) return;
      if (data.page == null || isNaN(data.page)) return;
      if (data.itsComment == null) return;
      let postID : string = null
      let commentID : string = null
      if (data.itsComment) {
        postID = data.contentID
        ViewingPostID = postID
      }
      else {
        commentID = data.contentID
        ViewingCommentID = commentID
      }
      connection.log(`Fetching comments for ${postID ? "Post" : "Comment"} with id: ${postID ? postID : commentID}`)
      server.database.getTopComments(connection.id,postID, commentID, data.page, (dataD : getTopComments) => {
        socket.emit('getTopComments', {
          commentsList: dataD.commentsList,
          postID: postID,
          commentID: commentID,
          page: data.page + 5
        });
      })
    })
    interface setUserOpinion{
      agree : string,
      disagree : string,
      error : number
    }
    socket.on('setUserOpinion', function (data) {
      server.database.setUserOpinion(userID, data.postID, data.commentID, data.opinion, (dataD : setUserOpinion) => {
        socket.emit('setUserOpinion', {
          error: dataD.error,
          agree: dataD.agree,
          disagree: dataD.disagree,
          opinion: data.opinion,
          postID: data.postID,
          commentID: data.commentID
        });
      })
    })
    socket.on('deleteContent', function (data) {
      server.database.deleteContent(userID, data.postID, data.commentID, () => {
        connection.log(`Deactivating Content with id ${data.postID ? data.postID : data.commentID}`)
        let deleteCont = {
          postID: data.postID,
          commentID: data.commentID
        }
        connection.everySocket('deleteContent', deleteCont)
      })
    })
    interface saveContent{
      answer : number
    }
    socket.on('saveContent', function (data) {
      connection.log(`Editing Content with id ${data.postID ? data.postID : data.commentID}`)
      server.database.saveContent(userID, data.postID, data.commentID, data.text, (dataD : saveContent) => {
        //make it show also on all users when edit happens
        socket.emit('saveContent', {
          answer: dataD.answer,
          postID: data.postID,
          commentID: data.commentID,
          text : data.text
        });
      })
    })

    // socket.on('cancelMediaFile', function() {

    // })
    socket.on('discardPost', function () {
      WINDOW = windowState.HOME
      if (CreatingPostFor.type == 1) {
        WINDOW = windowState.PROFILE
      } else if (CreatingPostFor.type == 2) {
        WINDOW = windowState.COMMUNITY
      }else if(CreatingPostFor.type == 3) {
        WINDOW = windowState.PROFILE
      }
      CreatingPostFor = null;
      socket.emit('OpenWindow', {
        window: WINDOW
      });
    })
    socket.on('fetchPostType',()=>{
      socket.emit('fetchPostType',{
        type : CreatingPostFor.type,
        name : CreatingPostFor.name,        
        code : CreatingPostFor.code        
      })
    })
    interface setUserPicType{
      picType : string,
      fileName : string
    }
    socket.on('updateUserPicture', (data : setUserPicType)=>{
        if(!data || !data.fileName || !data.picType) return;
        const profPic = data.picType === "Profile" ? data.fileName : null;
        const wallPic = data.picType === "Wallpaper"? data.fileName : null;
        server.database.setUserPicType(userID, profPic, wallPic, async () => {
          const result = await axios.post('/MovePicDirectory',{
            picToken : user.picToken,
            picType : data.picType,
            fileName : data.fileName
          })
          .then(function (res : any) {
              if(res && res.data && res.data.ok)
                return true;
              else
                return false;
          }).catch(function (error : any) {
              if(error) connection.log("MovePicDirectory: Encountered error no picture moved from temp to directory")
              return false;
          });
          if(!result) return;
          connection.log(`Updated ${data.picType} with ${data.fileName}`)
          socket.emit('updateUserPicture',{ picType : data.picType , fileName : data.fileName })
        })
    })
    socket.on('startCreatingPost', async function (data : CreatingPostFor) {
      if (data.type == 1 || data.type == 2 || data.type == 3) {
        const folderName = await axios.post('/CreateTempDirectory',{
          picToken : user.picToken,
          directoryType : 'PostFiles'
        })
        .then(function (res : any) {
            if(res && res.data && res.data.ok && res.data.folderName)
              return res.data.folderName;
            else
              return false;
        }).catch(function (error : any) {
           if(error) connection.log("CreateTempDirectory: Encountered error no temp directory created")
            return false;
        });
        if(!folderName) return;
        if (data.type == 1) {
          CreatingPostFor = { type : 1, id : userID, picToken : null, picType : null, name : null, code: null , folderName };
          socket.emit('OpenWindow', {
            window: windowState.POST,
            load : folderName
          });
        } else if (data.type == 2) {
          CreatingPostFor = { type : 2, id : null, picToken : null, picType : null, name : null, code : null , folderName };
          socket.emit('OpenWindow', {
            window: windowState.POST,
            load : folderName
          });
        } else if (data.type == 3 && data.code != null && !isNaN(data.code) && data.name != null && data.name.trim().length != 0) {
          server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
            if (dataD.friendID != null) {
              CreatingPostFor = { type : 3, id :  dataD.friendID, picToken : dataD.picToken, picType : dataD.picType, name : data.name, code : data.code  , folderName};
              socket.emit('OpenWindow', {
                window: windowState.POST,
                load : folderName
              });
            } else {
              socket.emit('ShowError', {
                error: "User " + data.name.trim() + "#" + data.code + " either not in your friendlist or doesn't exist"
              });
            }
          })
        }
        else {
          socket.emit('ShowError', {
            error: "Error selecting post type"
          });
        }
      } else {
        socket.emit('ShowError', {
          error: "Must select post type"
        });
      }
    })
    interface createPost{
      postID : string,
      error : number
    }
    socket.on('createPost', async function (data) {
      let postText = data.text && data.text.trim().length != 0 ? data.text.trim() : null;
      let postUrl =  data.url && data.url.trim().length != 0 ? user.checkYoutubeUrl(data.url.trim()) : null;
      let postTitle = data.title ? data.title.trim() : null;
      let categoryType = data.categoryType;
      let errorText = '';

      if(!categoryType && isNaN(categoryType)) errorText = "Must select a category";

      if (categoryType != 1 && !postTitle && (postTitle && postTitle.trim().length == 0)) errorText = "Must insert a title";

      if (!postText) errorText = "Must insert an explanation text";

      if (data.url != null) errorText = "Youtube url entered is not valid"; else postUrl = null

      if(errorText.trim().length != 0){
        socket.emit('ShowError', {
          error: `Create Post: ${errorText}`
        });
        return;
      }
      const tempFiles = await axios.post('/CheckTempDirectory',{
        picToken : user.picToken,
        folderName : CreatingPostFor.folderName,
        directoryType : 'PostFiles'
      })
      .then(function (res : any) {
          if(res && res.data && res.data.ok && res.data.tempFiles)
            return res.data.tempFiles;
          else
            return [];
      }).catch(function (error : any) : [] {
        if(error) connection.log("CheckTempDirectory: Encountered error no file collected")
        return [];
      });

      connection.log("Creating post type "+categoryType)
      server.database.createPost(userID, CreatingPostFor.id, categoryType, postTitle, postText, postUrl, tempFiles, CreatingPostFor.folderName,async (dataD : createPost) => {
        if (dataD.error == null) {
          if(CreatingPostFor.folderName && tempFiles && tempFiles.length != 0){
            const filesMoved = await axios.post('/CreateDirectory',{
              picToken : user.picToken,
              folderName : CreatingPostFor.folderName,
              directoryType : 'PostFiles',
              tempFiles
            })
            .then(function (res : any) {
              if(res && res.data && res.data.ok)
                return true;
              else 
                return false;
            }).catch(function (error : any) {
              if(error) connection.log("CreateDirectory: Encountered error no file Moved")
              return false;
            });
            if(!filesMoved) return;
          }
          if (CreatingPostFor.id == connection.id) WINDOW = windowState.PROFILE
          else if (CreatingPostFor.id == null) WINDOW = windowState.COMMUNITY
          else WINDOW = windowState.PROFILE

          socket.emit('OpenWindow', {
            window: WINDOW
          });
          connection.log("Finished creating Post in success")
        }
        else{
          socket.emit('ShowError', {
            error: dataD.error
          });
        }
      })
    })
    interface createComment{
      returnCommentID : string,
      commentDate : string,
      error : string
    }
    socket.on('createComment', function (data) {
      if (data.text == null || data.text.trim().length == 0) return;
      let postID = ViewingPostID;
      let commentID = ViewingCommentID;
      server.database.createComment(userID, postID, commentID, data.text, (dataD : createComment) => {
        if (dataD.error)
          socket.emit('ShowError', {
            error: "Error creating comment with code " + dataD.error
          })
        else
          socket.emit('createComment', {
            id: dataD.returnCommentID,
            text: data.text,
            date : dataD.commentDate,
            itsComment : ViewingCommentID ? false : true
          });
      })
    })
    interface manageFriendRequest{
      requestHandler : number
    }
    socket.on('manageFriendRequest', function (data) {
      if (!ViewingProfile || !ViewingProfile.id || !ViewingProfile.name  || !ViewingProfile.code) return
      if(ViewingProfile.id === connection.id) return;
      let friendID = ViewingProfile.id;
      let username = ViewingProfile.name;
      let userCode = ViewingProfile.code;
      let response = data ? data.response : null
      server.database.manageFriendRequest(userID, friendID,response, (dataD : manageFriendRequest) => {

        connection.log(`Managing relation with ${username}#${userCode} result ${dataD.requestHandler}`)
        let returnData = {
          username,
          userCode,
          relation : dataD.requestHandler
        }
        if (dataD.requestHandler == 0) {
          //remove friend or unfriend
          if (friendID == ChatingWithUserID) {
            ChatingWithUserID = null
            ChatingWithUserName = null
            ChatingWithUserCode = null
            socket.emit('OpenWindow', { window: windowState.HOME });
          }
          
          user.friendList.forEach((friend : friendList, i : number) => {
            if (username == friend.username && userCode == friend.userCode) {
              user.friendList.splice(i, 1)
              return;
            }
          });
          connection.everySocket('manageFriendRequest', returnData)
          let friendConn = server.connections["User_" + friendID]
          if (friendConn != null) {
            let myData = {
              username: user.name,
              userCode: user.code,
              relation : dataD.requestHandler
            }
            friendConn.user.friendList.forEach((friend : friendList, i : number) => {
              if (user.name == friend.username && user.code == friend.userCode) {
                friendConn.user.friendList.splice(i, 1)
                friendConn.everySocket('manageFriendRequest', myData)
                return;
              }
            });
          }
        } else if (dataD.requestHandler == 1) {
          //pending request response
          connection.everySocket('manageFriendRequest', returnData)
          let friendConn = server.connections["User_" + friendID]
          if (friendConn != null) {
            let myData = {
              username: user.name,
              userCode: user.code
            }
            friendConn.everySocket('appendRequestToNotification', myData)
          }
        }else if (dataD.requestHandler == 2) {
          //accepted friend request
          socket.emit('manageFriendRequest', returnData);
          // if (dataD.error != null) return;
          // if (respond && dataD.friendJson[0] != null && dataD.myJson[0] != null) {
          //   let friendData = {
          //     username: username,
          //     userCode: userCode,
          //     friendJson: dataD.friendJson
          //   }
          //   connection.user.friendList.push(dataD.friendJson[0])
          //   connection.everySocket('friendRequestAnswer', friendData)
          //   let friendConn = server.connections["User_" + dataD.friendID]
          //   if (friendConn != null) {
          //     let myData = {
          //       username: user.name,
          //       userCode: user.code,
          //       friendJson: dataD.myJson
          //     }
          //     friendConn.user.friendList.push(dataD.myJson[0])
          //     friendConn.everySocket('friendRequestAnswer', myData)
          //   }
          // }
        } 
      })
    })
    interface getUserInformation{
      firstname : string,
      lastname : string,
      username : string,
      email : string,
      gender : number,
      birthDate : string,
      error : number
    }
    socket.on('getUserInformation', function () {
      server.database.getUserInformation(userID, (dataD : getUserInformation) => {
        socket.emit('getUserInformation', {
          firstname: dataD.firstname,
          lastname: dataD.lastname,
          username: dataD.username,
          email: dataD.email,
          gender: dataD.gender,
          birthDate: dataD.birthDate,
          error: dataD.error
        });
      })
    })
    interface editProfileInfo{
      error : number
    }
    socket.on('editProfileInfo', function (data) {
      server.database.editProfileInfo(userID, data.firstName, data.lastName, data.gender, data.date, (dataD : editProfileInfo) => {
        socket.emit('editProfileInfo', {
          error: dataD.error
        });
      })
    })
    socket.on('searchForUser', function (data) {
      if (data.username == null || data.userCode == null || isNaN(data.userCode)) return;
      server.database.searchForUser(userID, data.username, data.userCode, (dataD : searchForUser) => {
        socket.emit('searchForUser', {
          picToken: dataD.picToken,
          picType: dataD.picType,
          username: data.username,
          userCode: data.userCode
        });
      })
    })
    interface getUserProfile{
      friendID : string
      picToken : string,
      profilePicType : string,
      wallpaperPicType : string,
      friendRequest : number,
    }
    socket.on('showUserProfile', (data) => {
      let username = user.name;
      let userCode = user.code;
      if(data && data.username && data.userCode && !isNaN(data.userCode) && data.username.length != 0 && data.username.length < 50){
        username = data.username;
        userCode = data.userCode;
      }
      // if(WINDOW != windowState.PROFILE){
      //   WINDOW = windowState.PROFILE;
      //   socket.emit('OpenWindow', { window: WINDOW });
      // }
      server.database.getUserProfile(connection.id, username, userCode, (dataD : getUserProfile) => {
          ViewingProfile = {
            id : dataD.friendID,
            name : username,
            code : userCode,
          };
          socket.emit('setProfileData', {
            friendRequest: dataD.friendRequest,
            picToken: dataD.picToken,
            profilePicType: dataD.profilePicType,
            wallpaperPicType: dataD.wallpaperPicType,
            username: username,
            userCode: userCode
          });
          connection.log(`Viewing profile ${username}#${userCode}`)
      })
      
    })
    interface editPassword{
      error: number
    }
    socket.on('editPassword', function (data) {
      server.database.editPassword(userID, data.oldPassword, data.confPassword, data.newPassword, (dataD : editPassword) => {
        socket.emit('editPassword', dataD.error);
      })
    })
    socket.on('OpenWindow', (data) => {
      // if (WINDOW == data.window)
      //   return;
      if(!windowState.isWindow(data.window)) return;
      if (WINDOW === windowState.POST && data.window !== windowState.POST) {
        socket.emit('promptToDiscardPost');
        return;
      }
      if(data.widnow != windowState.CHAT){
        ChatingWithUserID = null
        ChatingWithUserName = null
        ChatingWithUserCode = null
      }
      if (data.window == "Store") {
        // server.database.getSkins(null, 0, 0, (dataD) => {
        //   socket.emit('getSkins', {
        //     skinData: dataD.skinData
        //   });
        // })
      }
      if (data.window == "AccountLink") {
        user.GetAccountLink(connection, server, socket);
      } 
      WINDOW = data.window;
      socket.emit('OpenWindow', data);
      connection.log("Showing " + WINDOW + " Tab")
    })

    // socket.on('askFriendForCall', function (data) {
    //   server.connections.forEach(c => {
    //     if (c.user.name == data.toUserName) {
    //       io.to(clients[data.toUserName].socketID).emit('tellingFriendThereIsACall', data.fromUserName)
    //     }
    //   })
    // });
    // socket.on('replyToFriendAnswer', function (data) {
    //   server.connections.forEach(c => {
    //     if (c.user.name == data.toUserName) {
    //       io.to(clients[data.toUserName].socketID).emit('tellingFriendTheAnswer', {
    //         reply: data.reply,
    //         fromUserName: data.fromUserName
    //       })
    //     }
    //   })
    // });
    // socket.on('callUser', function (data) {
    //   server.connections.forEach(c => {
    //     if (c.user.name == data.toUserName) {
    //       io.to(clients[data.toUserName].socketID).emit('callMade', {
    //         offer: data.offer,
    //         fromUserName: data.fromUserName,
    //         toUserName: data.toUserName
    //       })
    //     }
    //   })
    // });
    // socket.on('makeAnswer', function (data) {
    //   server.connections.forEach(c => {
    //     if (c.user.name == data.toUserName) {
    //       io.to(clients[data.toUserName].socketID).emit('answerMade', {
    //         answer: data.answer,
    //         toUserName: data.toUserName,
    //         fromUserName: data.fromUserName
    //       })
    //     }
    //   })
    // });
    // socket.on('userStoppedOnGoingCall', function (data) {
    //   server.connections.forEach(c => {
    //     if (c.user.name == data.toUserName) {
    //       io.to(clients[data.toUserName].socketID).emit('stopFriendOnGoingCall')
    //     }
    //   })
    // });
  }
}