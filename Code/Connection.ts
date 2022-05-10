import { nanoid } from "nanoid";
import { Socket } from "../node_modules/socket.io/dist/socket";
let axios = require('axios')
let User = require('./User')
const WindowState = require('./Utility/WindowState')
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
  id :  string | null,
  token : string | null,
  prof : string | null,
  name : string | null,        
  code : number  | null,
  folderName : string
}
interface ChatingWithUser{
  id : string,
  name :  string,
  code : number
}
interface CallWithUser{
  id : string,
  name ?: string,
  code ?: number,
  token ?: string,
  prof ?: string,
  wall ?: string,
 connectionID : string,
  room : "public" | "private"
}

module.exports = class Connection {

  user : typeof User;
  id : string;
  highestPlatform : typeof PlatformState;
  clientSocket ?: Socket;
  webSocket : Socket[];
  mobileSocket ?: Socket;
  lobby : typeof Lobby[];
  server : typeof Server;
  callWithUser ?: CallWithUser;
  signal : any;

  constructor(socket : Socket, server : typeof Server, currentPlatform : string, userData : typeof User) {
    this.id = userData.id;
    this.highestPlatform = currentPlatform;
    this.webSocket = [];

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
  everySocket(socketEvent : string, data: any = null) {
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
    let WINDOW : string = windowState.defaultState;

    let ViewingPostID : string | null;
    let ViewingCommentID : string | null;
    let ViewingProfile : userSmallData;

    let ChatingWithUser : ChatingWithUser | null
    let CreatingPostFor : CreatingPostFor | null;

    let connection : Connection = this;
    let userID = connection.id;
    let server = connection.server;
    let user = connection.user;
    let socket : Socket | undefined = undefined;
    
    let platformState = new PlatformState();
    if (currentPlatform == platformState.CLIENT) {
      socket = connection.clientSocket as Socket;
    } else if (currentPlatform == platformState.WEBSITE) {
      socket = connection.webSocket[connection.webSocket.length - 1] as Socket;
    } else if (currentPlatform == platformState.MOBILE) {
      socket = connection.mobileSocket as Socket;
    }
    connection.log('Connected with platform: ' + currentPlatform);

    connection.lobby.forEach(lobby => {
      Object.keys(server.lobbys).forEach(lobbyIndex => {
        if (server.lobbys[lobbyIndex].name === lobby) {
          server.lobbys[lobbyIndex].onEnterLobby(connection);
          return;
        }
      });
    });

    if(!socket)return;
    
    socket.emit('registerUser', user.ToJson());
    // socket.on('registerUser',()=>{
    // })
    interface friendListJson{
      friendListJson : string;
    }
    interface friendList{
      name : string;
      code : number;
      prof : string,
      wall : string,
      token : string
    }
    socket.on('tellFriendsImOnline', function () {
      connection.log("Fetching friends list")
      server.database.getFriendsList(userID, (dataD : friendListJson) => {
        user.friendList = dataD.friendListJson ? JSON.parse(dataD.friendListJson) : null
        if(socket) socket.emit('updateFriendList', dataD);
        if (user.friendList.length == 0) return;
        user.friendList.forEach((friend : friendList) => {
          let name = friend.name;
          let code = friend.code;
          for (let key in server.connections) {
            if (server.connections.hasOwnProperty(key)) {
              if (server.connections[key].user.name == name && server.connections[key].user.code == code) {
                let friendData = {
                  name: user.name,
                  code: user.code,
                  clientDevice: connection.highestPlatform
                }
                server.connections[key].everySocket('friendIsOnline', friendData)
                server.database.msgsRecieved(server.connections[key].id, connection.id, () => {
                  let myData = {
                    name,
                    code
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
        if(socket) socket.emit('getFriendRequest', {
          friendRequests: dataD.friendRequests
        });
      })
    });
    socket.on('disconnect', function () {
      server.onDisconnected(connection, currentPlatform, socket ?  socket.id : null);
    });
  
    interface saveMsg{
      textID : string,
      unSeenMsgsCount : number
    }
    socket.on('sendMessage', async function (data) {
      if (!ChatingWithUser || !ChatingWithUser.id) return;
      if(!data && !data.message && !data.folderName) return;
      let folderName = data.folderName;
      let tempFiles : string[] = [];
      if(folderName){
        tempFiles = await axios.post('/CheckTempDirectory',{
          token : user.token,
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
      connection.log(`Sending message to userID ${ChatingWithUser.id}`)
      server.database.saveMsg(userID, ChatingWithUser.id, data.message , folderName , tempFiles, async (dataD : saveMsg) => {
        let isMedia = folderName && tempFiles && tempFiles.length != 0
        if(isMedia){
          const filesMoved : boolean = await axios.post('/CreateDirectory',{
            token : user.token,
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
        if(!ChatingWithUser) return;
        let friendConn = server.connections[ChatingWithUser.id]
        if (friendConn == null) return;

        let friendName = friendConn.user.name
        let friendCode = friendConn.user.code
        let friendData = {
          message: data.message,
          textID: dataD.textID,
          name: user.name,
          code: user.code,
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
              name: friendName,
              code: friendCode
            }
            connection.everySocket('msgsRecieved', myData)
            friendConn.everySocket('msgsRecievedWhileNotTaklingWithUser', friendData)
          })
        }
      })
    })
    socket.on('msgsRecievedWhileNotTaklingWithUser',(data)=>{
      if(!data.showUnreadMsgs && ChatingWithUser && ChatingWithUser.name == data.name && ChatingWithUser.code == data.code){
        if(socket) socket.emit('msgsRecievedWhileNotTaklingWithUser')
      }else{
        data.showUnreadMsgs = true;
        if(socket) socket.emit('msgsRecievedWhileNotTaklingWithUser' , data)
      }
    })
    interface showChatHistory{
      chatLog : string,
      unSeenMsgsCount : number
    }
    socket.on('showChatHistory', (data : any) => {
      if(!ChatingWithUser || !ChatingWithUser.id) return;

      connection.log("Fetching chat history for user "+ ChatingWithUser.id)
      server.database.showChatHistory(userID, ChatingWithUser.id, data.page, (dataD : showChatHistory) => {

        if(socket) socket.emit('showChatHistory', {
          refresh : data.refresh,
          chatLog: dataD.chatLog,
          name: user.name,
          code: user.code,
          page: data.page + 25,
          unSeenMsgsCount : dataD.unSeenMsgsCount
        });
        if(socket && ChatingWithUser) socket.emit("removeMsgsRecievedAlert" , {
          name: ChatingWithUser.name,
          code: ChatingWithUser.code
        })
        if (!ChatingWithUser) return;
        let friendConn = server.connections[ChatingWithUser.id]
        if (friendConn){
          let myData = {
            name: user.name,
            code: user.code
          }
          friendConn.everySocket('msgsSeen', myData)
        }
      })
    });
    socket.on('msgsSeen', function (data) {
      if (!ChatingWithUser || !ChatingWithUser.id) return;
      let friendID = ChatingWithUser.id;
      server.database.msgsSeen(userID, friendID, () => {
        let friendConn = server.connections[friendID]
        if (friendConn == null) return;
        let myData = {
          name: user.name,
          code: user.code
        }
        friendConn.everySocket('msgsSeen', myData)
      })
    })
    socket.on('deleteMsg', function (data) {
      let textID = data.textID;
      if (isNaN(textID)) return;
      if (!ChatingWithUser || !ChatingWithUser.id) return;
      server.database.deleteMsg(userID, textID, () => {
        let myData = {
          textID: textID
        }
        connection.everySocket('deleteMsg', myData)
        if(!ChatingWithUser) return;
        let friendConn = server.connections[ChatingWithUser.id]
        if (friendConn == null) return;
        friendConn.everySocket('deleteMsg', myData)
      })
    })
    socket.on('editMsg', function (data) {
      let textID = data.textID
      if (data.message == null) return;
      let message = data.message.trim()
      if (isNaN(textID) || message.length == 0) return;
      if (!ChatingWithUser || !ChatingWithUser.id) return;
      server.database.editMsg(userID, textID, message, () => {
        let myData = {
          textID: textID,
          message : message
        }
        connection.everySocket('editMsg', myData)
        if(!ChatingWithUser) return;
        let friendConn = server.connections[ChatingWithUser.id]
        if (friendConn == null) return;
        friendConn.everySocket('editMsg', myData)
      })
    })
    interface unlinkAccountLinks{
      friendID : string
    }
    socket.on('unlinkAccountLinks', function (data) {
      server.database.unlinkAccountLinks(userID, data.name, data.code, (dataD : unlinkAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        }
      })
    })
    socket.on('getAccountLinks', function () {
      user.GetAccountLink(connection, server, socket);
    })
    interface setAccountLinks {
      name : string,
      code : number,
      friendID : string
    }
    socket.on('setAccountLinks', function (data) {
      server.database.setAccountLinks(userID, data.email, data.password, (dataD : setAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        } else {
          if(socket) socket.emit('setAccountLinks');
        }
      })
    })
    interface accessAccountLinks {
      AuthToken : string
    }
    socket.on('accessAccountLinks', function (data) {
      server.database.accessAccountLinks(userID, data.name, data.code, currentPlatform, (dataD : accessAccountLinks) => {
        if(socket) socket.emit('accessAccountLinks', dataD.AuthToken);
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
        if(socket) socket.emit('getCategoryName',{
          categoryName : dataD.categoryName
        })
        if(socket) socket.emit('getTopPosts', {
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
        if(socket) socket.emit('getCategoryList', {
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
      let postID : string | null = null;
      let commentID : string | null = null;
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
        if(socket) socket.emit('getTopComments', {
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
        if(socket) socket.emit('setUserOpinion', {
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
        if(socket) socket.emit('saveContent', {
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
      if(!CreatingPostFor){
        WINDOW = windowState.HOME
      } else if (CreatingPostFor.type === 1) {
        WINDOW = windowState.PROFILE
      } else if (CreatingPostFor.type === 2) {
        WINDOW = windowState.COMMUNITY
      }else if(CreatingPostFor.type === 3) {
        WINDOW = windowState.PROFILE
      }else{
        WINDOW = windowState.HOME
      }
      CreatingPostFor = null;

      if(socket) socket.emit('OpenWindow', {
        window: WINDOW
      });
    })
    socket.on('fetchPostType',()=>{
      if(socket && CreatingPostFor) socket.emit('fetchPostType',{
        type : CreatingPostFor.type,
        name : CreatingPostFor.name,        
        code : CreatingPostFor.code        
      })
    })
    interface setUserPicture{
      prof : string,
      fileName : string
    }
    socket.on('updateUserPicture', (data : setUserPicture)=>{
        if(!data || !data.fileName || !data.prof) return;
        const profPic = data.prof === "Profile" ? data.fileName : null;
        const wallPic = data.prof === "Wallpaper"? data.fileName : null;
        server.database.setUserPicture(userID, profPic, wallPic, async () => {
          const result = await axios.post('/MovePicDirectory',{
            token : user.token,
            prof : data.prof,
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
          connection.log(`Updated ${data.prof} with ${data.fileName}`)
          if(socket) socket.emit('updateUserPicture',{ prof : data.prof , fileName : data.fileName })
        })
    })
    socket.on('startCreatingPost', async function (data : CreatingPostFor) {
      if (data.type == 1 || data.type == 2 || data.type == 3) {
        const folderName = await axios.post('/CreateTempDirectory',{
          token : user.token,
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
        WINDOW = windowState.POST;
        if (data.type == 1) {
          CreatingPostFor = { type : 1, id : userID, token : null, prof : null, name : null, code: null , folderName };
          if(socket) socket.emit('OpenWindow', {
            window: WINDOW,
            load : folderName
          });
        } else if (data.type == 2) {
          CreatingPostFor = { type : 2, id : null, token : null, prof : null, name : null, code : null , folderName };
          if(socket) socket.emit('OpenWindow', {
            window: WINDOW,
            load : folderName
          });
        } else if (data.type == 3 && data.code != null && !isNaN(data.code) && data.name != null && data.name.trim().length != 0) {
          server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
            if (dataD.friendID != null) {
              CreatingPostFor = { type : 3, id :  dataD.friendID, token : dataD.token, prof : dataD.prof, name : data.name, code : data.code  , folderName};
              if(socket) socket.emit('OpenWindow', {
                window: WINDOW,
                load : folderName
              });
            } else {
              if(socket) socket.emit('ShowError', {
                error: "User " + data.name + "#" + data.code + " either not in your friendlist or doesn't exist"
              });
            }
          })
        }
        else {
          if(socket) socket.emit('ShowError', {
            error: "Error selecting post type"
          });
        }
      } else {
        if(socket) socket.emit('ShowError', {
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
        if(socket) socket.emit('ShowError', {
          error: `Create Post: ${errorText}`
        });
        return;
      }
      if(!CreatingPostFor) return;
      const tempFiles = await axios.post('/CheckTempDirectory',{
        token : user.token,
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
          if(CreatingPostFor && CreatingPostFor.folderName && tempFiles && tempFiles.length != 0){
            const filesMoved = await axios.post('/CreateDirectory',{
              token : user.token,
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
          if (CreatingPostFor && CreatingPostFor.id == connection.id) WINDOW = windowState.PROFILE
          else if (CreatingPostFor && CreatingPostFor.id == null) WINDOW = windowState.COMMUNITY
          else WINDOW = windowState.PROFILE

          if(socket) socket.emit('OpenWindow', {
            window: WINDOW
          });
          connection.log("Finished creating Post in success")
        }
        else{
          if(socket) socket.emit('ShowError', {
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
        if (dataD.error){
          if(socket) socket.emit('ShowError', {
            error: "Error creating comment with code " + dataD.error
          })
        } else {
          if(socket) socket.emit('createComment', {
            id: dataD.returnCommentID,
            text: data.text,
            date : dataD.commentDate,
            itsComment : ViewingCommentID ? false : true
          });
        } 
      })
    })
    interface manageFriendRequest{
      requestHandler : number
    }
    socket.on('manageFriendRequest', function (data) {
      if (!ViewingProfile || !ViewingProfile.id || !ViewingProfile.name  || !ViewingProfile.code) return
      if(ViewingProfile.id === connection.id) return;
      let friendID = ViewingProfile.id;
      let name = ViewingProfile.name;
      let code = ViewingProfile.code;
      let response = data ? data.response : null
      server.database.manageFriendRequest(userID, friendID,response, (dataD : manageFriendRequest) => {

        connection.log(`Managing relation with ${name}#${code} result ${dataD.requestHandler}`)
        let returnData = {
          name,
          code,
          relation : dataD.requestHandler
        }
        if (dataD.requestHandler == 0) {
          //remove friend or unfriend
          if (ChatingWithUser && friendID == ChatingWithUser.id) {
            ChatingWithUser = null;
            WINDOW = windowState.HOME;
            if(socket) socket.emit('OpenWindow', { window: WINDOW });
          }
          
          user.friendList.forEach((friend : friendList, i : number) => {
            if (name == friend.name && code == friend.code) {
              user.friendList.splice(i, 1)
              return;
            }
          });
          connection.everySocket('manageFriendRequest', returnData)
          let friendConn = server.connections[friendID]
          if (friendConn != null) {
            let myData = {
              name: user.name,
              code: user.code,
              relation : dataD.requestHandler
            }
            friendConn.user.friendList.forEach((friend : friendList, i : number) => {
              if (user.name == friend.name && user.code == friend.code) {
                friendConn.user.friendList.splice(i, 1)
                friendConn.everySocket('manageFriendRequest', myData)
                return;
              }
            });
          }
        } else if (dataD.requestHandler == 1) {
          //pending request response
          connection.everySocket('manageFriendRequest', returnData)
          let friendConn = server.connections[friendID]
          if (friendConn != null) {
            let myData = {
              name: user.name,
              code: user.code
            }
            friendConn.everySocket('appendRequestToNotification', myData)
          }
        }else if (dataD.requestHandler == 2) {
          //accepted friend request
          if(socket) socket.emit('manageFriendRequest', returnData);
          // if (dataD.error != null) return;
          // if (respond && dataD.friendJson[0] != null && dataD.myJson[0] != null) {
          //   let friendData = {
          //     name: name,
          //     code: code,
          //     friendJson: dataD.friendJson
          //   }
          //   connection.user.friendList.push(dataD.friendJson[0])
          //   connection.everySocket('friendRequestAnswer', friendData)
          //   let friendConn = server.connections[dataD.friendID]
          //   if (friendConn != null) {
          //     let myData = {
          //       name: user.name,
          //       code: user.code,
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
      name : string,
      email : string,
      gender : number,
      birthDate : string,
      error : number
    }
    socket.on('getUserInformation', function () {
      server.database.getUserInformation(userID, (dataD : getUserInformation) => {
        if(socket) socket.emit('getUserInformation', {
          firstname: dataD.firstname,
          lastname: dataD.lastname,
          name: dataD.name,
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
        if(socket) socket.emit('editProfileInfo', {
          error: dataD.error
        });
      })
    })
    socket.on('searchForUser', function (data) {
      if (data.name == null || data.code == null || isNaN(data.code)) return;
      server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
        if(socket) socket.emit('searchForUser', {
          token: dataD.token,
          prof: dataD.prof,
          name: data.name,
          code: data.code
        });
      })
    })
    interface getUserProfile{
      friendID : string
      token : string,
      prof : string,
      wall : string,
      friendRequest : number,
    }
    socket.on('showUserProfile', (data) => {
      let name = user.name;
      let code = user.code;
      if(data && data.name && data.code && !isNaN(data.code) && data.name.length != 0 && data.name.length < 50){
        name = data.name;
        code = data.code;
      }
      // if(WINDOW != windowState.PROFILE){
      //   WINDOW = windowState.PROFILE;
      //   socket.emit('OpenWindow', { window: WINDOW });
      // }
      server.database.getUserProfile(connection.id, name, code, (dataD : getUserProfile) => {
          ViewingProfile = {
            id : dataD.friendID,
            name : name,
            code : code,
          };
          if(socket) socket.emit('setProfileData', {
            friendRequest: dataD.friendRequest,
            token: dataD.token,
            prof: dataD.prof,
            wall: dataD.wall,
            name: name,
            code: code
          });
          connection.log(`Viewing profile ${name}#${code}`)
      })
      
    })
    interface editPassword{
      error: number
    }
    socket.on('editPassword', function (data) {
      server.database.editPassword(userID, data.oldPassword, data.confPassword, data.newPassword, (dataD : editPassword) => {
        if(socket) socket.emit('editPassword', dataD.error);
      })
    })

    interface searchForUser{
      friendID : string,
      token : string,
      prof : string,
      wall : string
    }
    socket.on('SetThemeColor', (data)=>{
      server.database.SetThemeColor(userID, data.color, ()=>{
        console.log(data.color)
        user.settings.Theme_Color = data.color;
        socket?.emit('registerUser', user.ToJson());
      });
      
    })
    
    socket.on('OpenWindow', (data) => {
      // if (WINDOW == data.window)
      //   return;
      if(!windowState.isWindow(data.window)) return;
      if (WINDOW === windowState.POST && data.window !== windowState.POST) {
        if(socket) socket.emit('promptToDiscardPost');
        return;
      }
      if(data.window === windowState.CHAT){
        server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
          const oldUserID = ChatingWithUser?.id;
          if(oldUserID == dataD.friendID) return;
          ChatingWithUser = {
            id : dataD.friendID,
            name : data.name,
            code: data.code
          }
          WINDOW = windowState.CHAT;
          const load = {
            name: data.name, 
            code: data.code,
            token: dataD.token,
            pic: dataD.prof,
            inCall : connection.callWithUser?.id == dataD.friendID
          }   
          if(socket) socket.emit("refreshChat")
          WINDOW = data.window;
          if(socket) socket.emit("SetCallFromRightPanel" , { callerChatOpened  : ChatingWithUser && connection.callWithUser?.id == ChatingWithUser.id })
          if(socket) socket.emit('OpenWindow', { window : WINDOW , load });
        })
        return;
      }else{
        ChatingWithUser = null;
        if(socket) socket.emit("SetCallFromRightPanel" , { callerChatOpened  : false})
      }
      //if (data.window === windowState.STORE) {
        // server.database.getSkins(null, 0, 0, (dataD) => {
        //   socket.emit('getSkins', {
        //     skinData: dataD.skinData
        //   });
        // })
      //}
      // if (data.window == "AccountLink") {
      //   user.GetAccountLink(connection, server, socket);
      // } 
      WINDOW = data.window;
      if(socket) socket.emit('OpenWindow', data);
      connection.log("Showing " + WINDOW + " Tab")
    })

    socket.on('callUser', function (data) {
      user.friendList.forEach((friend : friendList) => {
        let name = friend.name;
        let code = friend.code;
        if(data.name != name && data.code != code) return;
        for (let key in server.connections) {
          if (server.connections.hasOwnProperty(key)) {
            if (server.connections[key].user.name == name && server.connections[key].user.code == code) {
              if(server.connections[key].callWithUser && server.connections[key].callWithUser.room == "private" && server.connections[key].callWithUser.id != connection.id){
                // User already in-call before this
                socket?.emit('alreadyInCall')
                return;
              }
              // Start the call
              if(!connection.callWithUser || connection.callWithUser.room == "private"){
                connection.callWithUser = { id : key , room : "private" , name, code , token : friend.token, prof : friend.prof , wall : friend.wall , connectionID : data.connectionID};
                server.connections[key].callWithUser  = { id : connection.id , room : "private" , name : user.name , code : user.code, token : user.token, prof : user.prof , wall : user.wall, connectionID : data.connectionID};
              }
              connection.signal = data.signal;
              connection.log("signal has been changed")
              let returnData = {
                name : user.name,
                code : user.code,
                token : user.token,
                prof : user.prof,
                wall : user.wall,
                signalList : [data.signal],
                connectionID : data.connectionID,
                socketID : socket ? socket.id : null
              }
              server.connections[key].everySocket('callUser', returnData)
              return;
            }
          }
        }
      })
    });
    socket.on('answerCall',(data)=>{
      if(data && data.socketID && connection.callWithUser) {
        connection.signal = data.signal;
        connection.log("signal has been changed")
        let returnData = {
          name : user.name,
          code : user.code,
          token : user.token,
          prof : user.prof,
          wall : user.wall,
          signalList : [data.signal],
          connectionID : data.connectionID,
        }
        server.io.to(data.socketID).emit('callAccepted', returnData)
      } 
    })
    socket.on('hangupCall',()=>{
      if (connection.callWithUser != undefined) {
        // server.connections[connection.callWithUser.id].callWithUser = undefined;
        // server.connections[connection.callWithUser.id].everySocket('hangupCall')
        // if(socket) socket.emit("SetCallFromRightPanel" , { callerChatOpened  : ChatingWithUser && connection.callWithUser?.id === ChatingWithUser.id })
        // connection.callWithUser = undefined;
      } 
    })
    socket.on('callRinging',()=>{
      if(connection.callWithUser){
        // server.connections[connection.callWithUser.id].everySocket('callRinging') //remove everysocket
      }
    })
    socket.on('updateVoiceActivity',(data)=>{
      if(data && data.volume && data.id && connection.callWithUser){
        // server.connections[connection.callWithUser.id].everySocket('updateVoiceActivity', data)  //remove everysocket
      }
    })
    socket.on('inviteToLobby', async (data)=>{
      if(data && connection.callWithUser){
        if(connection.callWithUser.room === "private"){
          //taking private then inviting people in, we create a new lobby and invite every in it;
          
          await server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
            if(!dataD.friendID || !connection.callWithUser || !server.connections[dataD.friendID]) return;
            
            const talkingPrivateWithUser = connection.callWithUser;
            const lobbyName = nanoid();

            const lobby = server.createLobby(connection, socket, lobbyName);
            connection.callWithUser = { id : lobby.id, room : "public" , connectionID : talkingPrivateWithUser.connectionID};           

            server.joinLobby(server.connections[talkingPrivateWithUser.id], lobby.id)
            server.connections[talkingPrivateWithUser.id].callWithUser = connection.callWithUser;

            let memberAdded = {
              name : data.name,
              code : data.code,
              token : dataD.token,
              prof : dataD.prof,
              wall :  dataD.wall
            };
            // const signalList = [server.connections[talkingPrivateWithUser.id].signal , connection.signal]
            
            server.joinLobby(server.connections[dataD.friendID], lobby.id);
            server.connections[dataD.friendID].callWithUser = connection.callWithUser;
            
            server.io.to(lobby.id).emit("startGroupCall" , { memberAdded , connectionID : talkingPrivateWithUser.connectionID })
            // lobby.startGroupCall(connection);

            // let returnData = {
            //   name : lobbyName,
            //   code : 0,
            //   token : '',
            //   prof : null,
            //   wall : null,
            //   signalList,
            //   connectionID : data.connectionID,
            //   socketID : socket ? socket.id : null
            // }
            // server.connections[dataD.friendID].everySocket('callUser', returnData)
          })
        }else{

          // server.joinLobby("lobbyName6"); 
        }
        // socket?.emit('addPersonToCall', data)
      }
    })
  }
}