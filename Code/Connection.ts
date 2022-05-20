import { nanoid } from "nanoid";
import { Socket } from "socket.io";
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
  callStarterID ?: string,
  connectionID ?: string,
  members ?: Members[],
  accepted ?: boolean,
  room : 'public' | 'private'
}
interface Members{
  id : string,
  flag : boolean,
  finished : boolean
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
  callInfo ?: CallWithUser;

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

    this.server.database.getMyGroups(this.id,async (dataD : any) => {
      console.log(dataD)
      if(dataD.allGroups){
        const myGroups = dataD.myGroups.split(',');
        myGroups.forEach(async (lobbyID : string )=> {
          if(this.server.lobbys[lobbyID]){
            await this.server.lobbys[lobbyID].onEnterLobby(this)
          }
        });
      }
    })

    // let groupLobbyID = "GroupLobby";
    // if (groupLobbyID != null && groupLobbys[groupLobbyID] != null) {
    //   let groupLobbys = server.groupLobbys;
    //   socket?.join(groupLobbyID);
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
  // everySocketLeaveLobby(lobbyID : string) {
  //   let connection = this;
  //   if (connection.clientSocket != null){
  //     connection.clientSocket.leave(lobbyID);
  //     connection.log('Left the lobby ('+ lobbyID+ ') with client');
  //   }
  //   if (connection.webSocket.length != 0) {
  //     connection.webSocket.forEach((mySocket : Socket) => {
  //       if (mySocket != null) {
  //         mySocket.leave(lobbyID);
  //         connection.log('Left the lobby ('+ lobbyID+') with web');
  //       }
  //     })
  //   }
  //   if (connection.mobileSocket != null){
  //     connection.mobileSocket.leave(lobbyID);
  //     connection.log('Left the lobby ('+ lobbyID+ ') with mobile');
  //   }
  // }
  hangupCall(){
    let connection : Connection = this;
    let server = connection.server;
    if (connection.callInfo != undefined) {
      if(connection.callInfo.room == "private"){
        // remove from connection and client ui
        if(!connection.callInfo.accepted){
          server.connections[connection.callInfo.id].callInfo = undefined;
          server.connections[connection.callInfo.id].everySocket('hangupCall')
        }
        else server.connections[connection.callInfo.id].everySocket('hangupCall', { name : connection.user.name , code : connection.user.code })
        
        connection.callInfo = undefined;
        connection.everySocket('hangupCall')
        connection.everySocket("SetCallFromRightPanel" , { callerChatOpened  : false })
        connection.everySocket("SetCallFromChat" , { inCall  : false })
      }else if(connection.callInfo.room == "public"){
        // remove from lobby members and connection and client ui
        let lobby = server.lobbys[connection.callInfo.id];
        let index : number = -1;
        connection.callInfo = undefined;
        connection.everySocket('hangupCall')
        lobby.callInfo.members.forEach((member : Members , ind : number) => {
          if(member.id == connection.id){
            index = ind;
          }
        });
        lobby.connections.forEach((conn : Connection) => {
          if(conn.id != connection.id){
            lobby.callInfo.members.forEach((member : Members , ind : number) => {
              if(conn.id == member.id){
                conn.everySocket('hangupCall', { name : connection.user.name , code : connection.user.code } )
              }
            });
          } 
        });
        if(index > -1) lobby.callInfo.members.splice(index , 1);
      }
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
    let server : typeof Server = connection.server;
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
    // connection.log('Connected with platform: ' + currentPlatform);

    connection.lobby.forEach(lobbyName => {
      Object.keys(server.lobbys).forEach(lobbyIndex => {
        if (server.lobbys[lobbyIndex].name === lobbyName) {
          let lobby = server.lobbys[lobbyIndex];
          socket?.join(lobby.id);
          return;
        }
      });
    });
    
    socket?.emit('registerUser', user.ToJson());

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
    socket?.on('tellFriendsImOnline', function () {
      // connection.log("Fetching friends list")
      socket?.emit('updateGroupList',{ lobbies : connection.lobby })
      server.database.getFriendsList(userID, (dataD : friendListJson) => {
        user.friendList = dataD.friendListJson ? JSON.parse(dataD.friendListJson) : null;
        socket?.emit('updateFriendList', dataD);
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
    socket?.on('getNotification', function () {
      server.database.getFriendRequest(userID, (dataD : friendRequests) => {
        socket?.emit('getFriendRequest', {
          friendRequests: dataD.friendRequests
        });
      })
    });
    socket?.on('disconnect', function () {
      server.onDisconnected(connection, currentPlatform, socket ?  socket?.id : null);
    });
  
    interface saveMsg{
      textID : string,
      unSeenMsgsCount : number
    }
    socket?.on('sendMessage', async function (data : any) {
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
    socket?.on('msgsRecievedWhileNotTaklingWithUser',(data : any)=>{
      if(!data.showUnreadMsgs && ChatingWithUser && ChatingWithUser.name == data.name && ChatingWithUser.code == data.code){
        socket?.emit('msgsRecievedWhileNotTaklingWithUser')
      }else{
        data.showUnreadMsgs = true;
        socket?.emit('msgsRecievedWhileNotTaklingWithUser' , data)
      }
    })
    interface showChatHistory{
      chatLog : string,
      unSeenMsgsCount : number
    }
    socket?.on('showChatHistory', (data : any) => {
      if(!ChatingWithUser || !ChatingWithUser.id) return;

      connection.log("Fetching chat history for user "+ ChatingWithUser.id)
      server.database.showChatHistory(userID, ChatingWithUser.id, data.page, (dataD : showChatHistory) => {

        socket?.emit('showChatHistory', {
          refresh : data.refresh,
          chatLog: dataD.chatLog,
          name: user.name,
          code: user.code,
          page: data.page + 25,
          unSeenMsgsCount : dataD.unSeenMsgsCount
        });
        if(socket && ChatingWithUser) socket?.emit("removeMsgsRecievedAlert" , {
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
    socket?.on('msgsSeen', function () {
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
    socket?.on('deleteMsg', function (data : any) {
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
    socket?.on('editMsg', function (data : any) {
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
    socket?.on('unlinkAccountLinks', function (data : any) {
      server.database.unlinkAccountLinks(userID, data.name, data.code, (dataD : unlinkAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        }
      })
    })
    socket?.on('getAccountLinks', function () {
      user.GetAccountLink(connection, server, socket);
    })
    interface setAccountLinks {
      name : string,
      code : number,
      friendID : string
    }
    socket?.on('setAccountLinks', function (data : any) {
      server.database.setAccountLinks(userID, data.email, data.password, (dataD : setAccountLinks) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        } else {
          socket?.emit('setAccountLinks');
        }
      })
    })
    interface accessAccountLinks {
      AuthToken : string
    }
    socket?.on('accessAccountLinks', function (data : any) {
      server.database.accessAccountLinks(userID, data.name, data.code, currentPlatform, (dataD : accessAccountLinks) => {
        socket?.emit('accessAccountLinks', dataD.AuthToken);
      })
    })

    // socket?.on('getSpecificContent', function(data) {
    //   user.getSpecificContent(data, connection, server, socket, CommentPage)
    // })
    interface getTopPosts{
      categoryName : string,
      postsList : string
    }
    socket?.on('getTopPosts', function (data : any) {
      connection.log(`Fetching posts for ${data.categoryID != 1 ? "Community" : "Profile "+data.name+"#"+data.code}`)
      server.database.getTopPosts(connection.id,data.categoryID, data.name, data.code, data.page, (dataD : getTopPosts) => {
        socket?.emit('getCategoryName',{
          categoryName : dataD.categoryName
        })
        socket?.emit('getTopPosts', {
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
    socket?.on('getCategoryList', function (data : any) {
      let categoryName = data.categoryName;
      if(categoryName.trim().length === 0) return;
      server.database.getCategoryList(categoryName,(dataD : getCategoryList) => {
        socket?.emit('getCategoryList', {
          categoryList: dataD.categoryList,
          categorySuggestionList : dataD.categorySuggestionList
        });
      })
    })
    interface getTopComments{
      commentsList: string
    }
    socket?.on('getTopComments', function (data : any) {
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
        socket?.emit('getTopComments', {
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
    socket?.on('setUserOpinion', function (data : any) {
      server.database.setUserOpinion(userID, data.postID, data.commentID, data.opinion, (dataD : setUserOpinion) => {
        socket?.emit('setUserOpinion', {
          error: dataD.error,
          agree: dataD.agree,
          disagree: dataD.disagree,
          opinion: data.opinion,
          postID: data.postID,
          commentID: data.commentID
        });
      })
    })
    socket?.on('deleteContent', function (data : any) {
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
    socket?.on('saveContent', function (data : any) {
      connection.log(`Editing Content with id ${data.postID ? data.postID : data.commentID}`)
      server.database.saveContent(userID, data.postID, data.commentID, data.text, (dataD : saveContent) => {
        //make it show also on all users when edit happens
        socket?.emit('saveContent', {
          answer: dataD.answer,
          postID: data.postID,
          commentID: data.commentID,
          text : data.text
        });
      })
    })

    // socket?.on('cancelMediaFile', function() {

    // })
    socket?.on('discardPost', function () {
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

      socket?.emit('OpenWindow', {
        window: WINDOW
      });
    })
    socket?.on('fetchPostType',()=>{
      if(socket && CreatingPostFor) socket?.emit('fetchPostType',{
        type : CreatingPostFor.type,
        name : CreatingPostFor.name,        
        code : CreatingPostFor.code        
      })
    })
    interface setUserPicture{
      prof : string,
      fileName : string
    }
    socket?.on('updateUserPicture', (data : setUserPicture)=>{
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
          socket?.emit('updateUserPicture',{ prof : data.prof , fileName : data.fileName })
        })
    })
    socket?.on('startCreatingPost', async function (data : CreatingPostFor) {
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
          socket?.emit('OpenWindow', {
            window: WINDOW,
            load : folderName
          });
        } else if (data.type == 2) {
          CreatingPostFor = { type : 2, id : null, token : null, prof : null, name : null, code : null , folderName };
          socket?.emit('OpenWindow', {
            window: WINDOW,
            load : folderName
          });
        } else if (data.type == 3 && data.code != null && !isNaN(data.code) && data.name != null && data.name.trim().length != 0) {
          server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
            if (dataD.friendID != null) {
              CreatingPostFor = { type : 3, id :  dataD.friendID, token : dataD.token, prof : dataD.prof, name : data.name, code : data.code  , folderName};
              socket?.emit('OpenWindow', {
                window: WINDOW,
                load : folderName
              });
            } else {
              socket?.emit('ShowError', {
                error: "User " + data.name + "#" + data.code + " either not in your friendlist or doesn't exist"
              });
            }
          })
        }
        else {
          socket?.emit('ShowError', {
            error: "Error selecting post type"
          });
        }
      } else {
        socket?.emit('ShowError', {
          error: "Must select post type"
        });
      }
    })
    interface createPost{
      postID : string,
      error : number
    }
    socket?.on('createPost', async function (data : any) {
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
        socket?.emit('ShowError', {
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

          socket?.emit('OpenWindow', {
            window: WINDOW
          });
          connection.log("Finished creating Post in success")
        }
        else{
          socket?.emit('ShowError', {
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
    socket?.on('createComment', function (data : any) {
      if (data.text == null || data.text.trim().length == 0) return;
      let postID = ViewingPostID;
      let commentID = ViewingCommentID;
      server.database.createComment(userID, postID, commentID, data.text, (dataD : createComment) => {
        if (dataD.error){
          socket?.emit('ShowError', {
            error: "Error creating comment with code " + dataD.error
          })
        } else {
          socket?.emit('createComment', {
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
    socket?.on('manageFriendRequest', function (data : any) {
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
            socket?.emit('OpenWindow', { window: WINDOW });
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
          socket?.emit('manageFriendRequest', returnData);
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
    socket?.on('getUserInformation', function () {
      server.database.getUserInformation(userID, (dataD : getUserInformation) => {
        socket?.emit('getUserInformation', {
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
    socket?.on('editProfileInfo', function (data : any) {
      server.database.editProfileInfo(userID, data.firstName, data.lastName, data.gender, data.date, (dataD : editProfileInfo) => {
        socket?.emit('editProfileInfo', {
          error: dataD.error
        });
      })
    })
    socket?.on('searchForUser', function (data : any) {
      if (data.name == null || data.code == null || isNaN(data.code)) return;
      server.database.searchForUser(userID, data.name, data.code, (dataD : searchForUser) => {
        socket?.emit('searchForUser', {
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
    socket?.on('showUserProfile', (data : any) => {
      let name = user.name;
      let code = user.code;
      if(data && data.name && data.code && !isNaN(data.code) && data.name.length != 0 && data.name.length < 50){
        name = data.name;
        code = data.code;
      }
      // if(WINDOW != windowState.PROFILE){
      //   WINDOW = windowState.PROFILE;
      //   socket?.emit('OpenWindow', { window: WINDOW });
      // }
      server.database.getUserProfile(connection.id, name, code, (dataD : getUserProfile) => {
          ViewingProfile = {
            id : dataD.friendID,
            name : name,
            code : code,
          };
          socket?.emit('setProfileData', {
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
    socket?.on('editPassword', function (data : any) {
      server.database.editPassword(userID, data.oldPassword, data.confPassword, data.newPassword, (dataD : editPassword) => {
        socket?.emit('editPassword', dataD.error);
      })
    })

    interface searchForUser{
      friendID : string,
      token : string,
      prof : string,
      wall : string
    }
    socket?.on('SetThemeColor', (data : any)=>{
      server.database.SetThemeColor(userID, data.color, ()=>{
        user.settings.Theme_Color = data.color;
        socket?.emit('registerUser', user.ToJson());
      });
      
    })
    
    socket?.on('OpenWindow', (data : any) => {
      // if (WINDOW == data.window)
      //   return;
      if(!windowState.isWindow(data.window)) return;
      if (WINDOW === windowState.POST && data.window !== windowState.POST) {
        socket?.emit('promptToDiscardPost');
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
            inCall : connection.callInfo?.id == dataD.friendID
          }   
          socket?.emit("refreshChat")
          WINDOW = data.window;
          let inCall = ChatingWithUser && connection.callInfo?.id == ChatingWithUser.id
          socket?.emit("SetCallFromRightPanel" , { callerChatOpened  : inCall })
          socket?.emit('OpenWindow', { window : WINDOW , load });
        })
        return;
      }else{
        ChatingWithUser = null;
        socket?.emit("SetCallFromRightPanel" , { callerChatOpened  : false})
      }
      //if (data.window === windowState.STORE) {
        // server.database.getSkins(null, 0, 0, (dataD) => {
        //   socket?.emit('getSkins', {
        //     skinData: dataD.skinData
        //   });
        // })
      //}
      // if (data.window == "AccountLink") {
      //   user.GetAccountLink(connection, server, socket);
      // } 
      WINDOW = data.window;
      socket?.emit('OpenWindow', data);
      connection.log("Showing " + WINDOW + " Tab")
    })
    socket?.on('validateCall',(data : any)=>{
      for (let key in server.connections) {
        if (server.connections.hasOwnProperty(key)) {
          if (server.connections[key].user.name == data.name && server.connections[key].user.code == data.code) {
            if(connection.callInfo){
              if(connection.callInfo.id !== key || server.connections[key].callInfo){
                socket?.emit('ShowError', {
                  error: `Must hangup to call ${data.name}#${data.code}`
                });
                return;
              }
            }
            connection.log(`Call valid`)
            socket?.emit("validateCall")
            return;
          }
        }
      }
    })
    socket?.on('callUser', function (data : any) {
        for (let key in server.connections) {
          if (server.connections.hasOwnProperty(key)) {
            if (server.connections[key].user.name == data.name && server.connections[key].user.code == data.code) {
              // Start the call
              let reJoin : boolean = server.connections[key].callInfo && server.connections[key].callInfo.id == connection.id;
              if(data.private){
                connection.callInfo = { id : key , connectionID : data.connectionID , room : 'private' , accepted : false};
                server.connections[key].callInfo  = { id : connection.id , connectionID : data.connectionID, room : 'private', accepted : false};
              }
              let returnData = {
                name : user.name,
                code : user.code,
                token : user.token,
                prof : user.prof,
                wall : user.wall,
                signal : data.signal,
                connectionID : data.connectionID,
                socketID : socket ? socket?.id : null,
                silentCall : data.silentCall,
                newMember : data.newMember,
                reJoin
              }
              
              connection.log(`${connection.callInfo && connection.callInfo.room == "private" ? "User" : "Group"} call: ${key}`)
              server.connections[key].everySocket("SetCallTitle" , { name: user.name, code:user.code , group : connection.callInfo?.room == "public" ? server.lobbys[connection.callInfo.id].name : null})
              server.connections[key].everySocket('callUser', returnData)
              return;
            }
          }
        }
    });
    socket?.on('answerCall',(data : any)=>{
      if(data && data.socketID && connection.callInfo) {
        if(connection.lobby.length != 0 && connection.callInfo.room == "public"){
          let lobby : typeof Lobby = server.lobbys[connection.callInfo.id];
          let lobbyCallInfo = lobby.callInfo;
          let flagAmount : number = 0; // since the caller is a flag and the first person he called is the other flag
          let finished : boolean = false; 
          let callStarterID = lobbyCallInfo.callStarterID;
          lobbyCallInfo.members.forEach((member : Members)=>{
            if(member.id == connection.id){
              member.flag = true;
              finished = member.finished;
            }
            if(member.flag) flagAmount++;
          })
          if(!finished && flagAmount > 2){
            let peopleToCall : any[] = [];
            lobbyCallInfo.members.forEach((member : Members) => {
              if(callStarterID === member.id || connection.id === member.id) return;
              if(member.flag){
                // start connecting to people silently
                const conn = server.connections[member.id];
                peopleToCall.push({ name : conn.user.name , code : conn.user.code , prof : conn.user.prof, wall : conn.user.wall , token : conn.user.token });
                member.finished = true;
              }
            })
            socket?.emit('silentCall', { members : peopleToCall })
          }
        }else if(connection.callInfo.room == "private"){
          connection.callInfo.accepted = true;
          server.connections[connection.callInfo.id].callInfo.accepted = true;          
        }
        let returnData = {
          name : user.name,
          code : user.code,
          token : user.token,
          prof : user.prof,
          wall : user.wall,
          signal : data.signal,
          connectionID : data.connectionID,
          silentCall : data.silentCall,
          newMember : data.newMember
        }
        connection.log(`${connection.callInfo.room == "private" ? "User" : "Group"} answer: ${connection.callInfo.id}`)
        server.io.to(data.socketID).emit('callAccepted', returnData)
      } 
    })
    socket?.on('hangupCall',()=>{
      connection.hangupCall();
    })
    socket?.on('callRinging',()=>{
      if(connection.callInfo){
        // server.connections[connection.callWithUser.id].everySocket('callRinging') //remove everysocket
      }
    })
    socket?.on('updateVoiceActivity',(data : any)=>{
      if(data && data.volume && data.id && connection.callInfo){
        // server.connections[connection.callWithUser.id].everySocket('updateVoiceActivity', data)  //remove everysocket
      }
    })
    socket?.on('inviteToLobby', async (data : any)=>{
      if(!data || !data.name || !data.code) return;
      connection.log(`Inviting ${data.name}#${data.code}`)
        //taking private then inviting people in, we create a new lobby and with all the people invited including the guys in the previous voice call
      await server.database.searchForUser(userID, data.name, data.code, async (dataD : searchForUser) => {
        if(!dataD.friendID || !server.connections[dataD.friendID]) {
          connection.log("user is not on server connection yet")
          return;
        }
        
        const lobby : typeof Lobby = connection.callInfo && connection.callInfo.room == "public" ? server.lobbys[connection.callInfo.id] : await server.createLobby();

        if(lobby == null) return;
        //set callerid to the inviter since the group got created now
        if(connection.callInfo && connection.callInfo.room == "private") lobby.callInfo.callStarterID = connection.id;
        
        
        // return if user invited is already in lobby
        let alreadyInLobby = false;
        let invitedID = server.connections[dataD.friendID].id;
        lobby.connections.forEach((conn : Members) => {
          if(invitedID === conn.id) {
            alreadyInLobby = true;
            return;
          }
        })
        if(alreadyInLobby){
          socket?.emit('ShowError', {
            error: "User " + data.name + "#" + data.code + " already in lobby"
          });
          return; 
        }
        
        let membersToCall : any[] = [];
        let skipInvite : boolean = false;
        // since we are inviting people while incall inside the group
        // make sure we leave any private call
        if(connection.callInfo && connection.callInfo.room == "private"){
          // if invited person is the same one who is in private call with
          skipInvite = connection.callInfo.id == dataD.friendID;

          let conn = server.connections[connection.callInfo.id];
          // lobby creator
          await server.joinLobby(connection, lobby.id)
          connection.callInfo = { id : lobby.id , callStarterID : lobby.callInfo.callStarterID, room : 'public'};
          lobby.callInfo.members.push({ id : connection.id, flag : true , finished : true });
          // who was in private call with the creator
          await server.joinLobby(conn, lobby.id)
          membersToCall.push({
            name : conn.user.name,
            code : conn.user.code,
            token : conn.user.token,
            prof : conn.user.prof,
            wall :  conn.user.wall,
            doNotCall : true
          })
          conn.everySocket("SetCallTitle" , {group : lobby.name})
          lobby.callInfo.members.push({ id : conn.id, flag : true , finished : true });
          conn.callInfo = { id : lobby.id , callStarterID : lobby.callInfo.callStarterID, room : 'public'};
        } 
        if(connection.callInfo && connection.callInfo.room == "public" && !skipInvite){
          let conn = server.connections[dataD.friendID];
          await server.joinLobby(conn, lobby.id);
          membersToCall.push({
            name : conn.user.name,
            code : conn.user.code,
            token : conn.user.token,
            prof : conn.user.prof,
            wall :  conn.user.wall
          });
          lobby.callInfo.members.push({ id : conn.id, flag : false , finished : false });
          conn.callInfo = { id : lobby.id , callStarterID : lobby.callInfo.callStarterID, room : 'public'};
        }
        connection.log(`${data.name}#${data.code} is a member now`)
        connection.log("Start group call")
        socket?.emit("startGroupCall" , { members : membersToCall , group : lobby.name })
      })
    })
  }
}