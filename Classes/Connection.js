let Player = require('./Player')
let User = require('./User')
let InfernoBlaze = require('./PlayerClasses/InfernoBlaze')
let Quest_Traveler = require('./Quests/Quest_Traveler')
let GameLobby = require('./Lobbies/GameLobby')
let GameLobbySettings = require('./Lobbies/GameLobbySettings')
const bluebird = require('bluebird');
let path = require('path');
const fs = bluebird.promisifyAll(require('fs'));
module.exports = class Connection {
  constructor(socket, server, platform, data) {
    let connection = this;
    connection.id = data.userID;
    connection.highestPlatform = platform;
    connection.quests = [];
    connection.gameSocket = null;
    connection.clientSocket = null;
    connection.webSocket = [];
    connection.mobileSocket = null;
    if (platform == 1) {
      connection.gameSocket = socket
    } else if (platform == 2) {
      connection.clientSocket = socket
    } else if (platform == 3) {
      connection.webSocket.push(socket);
    } else if (platform == 4) {
      connection.mobileSocket = socket
    }

    connection.gameLobby = null;
    connection.searchLobby = null;
    connection.clanLobby = null;
    connection.groupLobby = null; //[];

    connection.server = server;
    connection.player = new Player();
    connection.user = new User(data.correctUsername, data.userCode, data.email, data.picToken, data.profilePicType, data.wallpaperPicType, data.newAcc, data.zeroCoin, data.normalCoin, data.experience, data.settings);

    // let clanLobbyID = "ClanLobby";
    // if (clanLobbyID != null && clanLobbys[clanLobbyID] != null) {
    //   let clanLobbys = server.clanLobbys;
    //   socket.join(clanLobbyID);
    //   connection.clanLobby = clanLobbys[clanLobbyID];
    //   connection.clanLobby.onEnterClanLobby(connection);
    // }
    // let groupLobbyID = "GroupLobby";
    // if (groupLobbyID != null && groupLobbys[groupLobbyID] != null) {
    //   let groupLobbys = server.groupLobbys;
    //   socket.join(groupLobbyID);
    //   connection.groupLobby = groupLobbys[groupLobbyID];
    //   connection.groupLobby.onEnterGroupLobby(connection);
    // }
    connection.createSocialEvents(platform);
    return connection;
  }
  log(text) {
    console.log('Connection ( id:', this.id, ', name:', this.user.name, ', code: #', this.user.code, ') =>', text);
  }
  startOtherPlatform(socket, platform, server) {
    let connection = this;
    if (platform == 1) {
      connection.gameSocket = socket
    } else if (platform == 2) {
      connection.clientSocket = socket
    } else if (platform == 3) {
      connection.webSocket.push(socket)
    } else if (platform == 4) {
      connection.mobileSocket = socket
    }
    if (connection.highestPlatform > platform)
      connection.highestPlatform = platform;

    connection.createSocialEvents(platform);

    if (platform == 1) {
      //tell game what class the player have before start
      if(connection.player.class)
        connection.log("Player class currently "+ connection.player.class.id)
      if (connection.player.class != null) {
        connection.gameSocket.emit('playerClass', connection.player.class);
      }
      socket.emit('registerPlayer', {
        id: connection.id,
        myQuests: connection.quests
      });
      if (connection.gameLobby == null) {
        let returnData = {
          state: "Social"
        }
        socket.emit('lobbyUpdate', returnData);
      } else {
        connection.JoinGame(null);
      }
      connection.createGameEvents()
    }
  }
  everySocket(socketEvent, data = null) {
    let connection = this;
    if (connection.gameSocket != null)
      connection.gameSocket.emit(socketEvent, data);
    if (connection.clientSocket != null)
      connection.clientSocket.emit(socketEvent, data);
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach(mySocket => {
        if (mySocket != null) {
          mySocket.emit(socketEvent, data);
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.emit(socketEvent, data);
  }
  everySocketInLobby(socketEvent, lobbyID, data = null) {
    let connection = this;
    if (connection.gameSocket != null)
      connection.gameSocket.broadcast.to(lobbyID).emit(socketEvent, data);
    if (connection.clientSocket != null)
      connection.clientSocket.broadcast.to(lobbyID).emit(socketEvent, data);
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach(mySocket => {
        if (mySocket != null) {
          mySocket.broadcast.to(lobbyID).emit(socketEvent, data);
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.broadcast.to(lobbyID).emit(socketEvent, data);
  }
  everySocketJoinLobby(lobbyID) {
    let connection = this;
    if (connection.gameSocket != null)
      connection.gameSocket.join(lobbyID, function () {
        connection.log('Entered the lobby (', lobbyID, ') with game');
      });
    if (connection.clientSocket != null)
      connection.clientSocket.join(lobbyID, function () {
        connection.log('Entered the lobby (', lobbyID, ') with client');
      });
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach(mySocket => {
        if (mySocket != null) {
          mySocket.join(lobbyID, function () {
            connection.log('Entered the lobby (', lobbyID, ') with web');
          });
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.join(lobbyID, function () {
        connection.log('Entered the lobby (', lobbyID, ') with mobile');
      });
  }
  everySocketLeaveLobby(lobbyID) {
    let connection = this;
    if (connection.gameSocket != null)
      connection.gameSocket.leave(lobbyID, function () {
        connection.log('Left the lobby (', lobbyID, ') with game');
      });
    if (connection.clientSocket != null)
      connection.clientSocket.leave(lobbyID, function () {
        connection.log('Left the lobby (', lobbyID, ') with client');
      });
    if (connection.webSocket.length != 0) {
      connection.webSocket.forEach(mySocket => {
        if (mySocket != null) {
          mySocket.leave(lobbyID, function () {
            connection.log('Left the lobby (', lobbyID, ') with web');
          });
        }
      })
    }
    if (connection.mobileSocket != null)
      connection.mobileSocket.leave(lobbyID, function () {
        connection.log('Left the lobby (', lobbyID, ') with mobile');
      });
  }
  PickClass(classID) {
    let connection = this;
    let userLvl = 1;
    let pickedClass = null;
    if (classID == 1) {
      pickedClass = new InfernoBlaze(userLvl);
    } else {
      connection.gameSocket.emit('ShowError', {
        error: "No class is selected"
      });
      return;
    }
    if (pickedClass != null) {
      connection.player.class = pickedClass;
      connection.player.class.onStart(connection);
      connection.gameSocket.emit('playerClass', connection.player.class);
    }
  }
  JoinGame(data) {
    //fix it
    let connection = this;
    if (connection.player.class == null) {
      connection.gameSocket.emit('ShowError', {
        error: "Must pick a class before joining a Lobby"
      });
      return;
    }
    if (connection.gameLobby != null && (data == null || data.id == null)) {
      connection.gameLobby.onEnterGameLobby(connection);
    } else if (data != null && data.id != null && data.id.trim().length != 0) {
      connection.server.joinOpenLobby(connection, data.id);
    } else {
      connection.gameSocket.emit('ShowError', {
        error: "Must select a lobby to join first"
      });
    }
  }
  createGameEvents() {
    let connection = this;
    let userID = connection.id;
    let socket = connection.gameSocket;
    let server = connection.server;
    let player = connection.player;
    let user = connection.user;
    let quests = connection.quests;
    let playerClass = connection.player.class;

    socket.on('getLobbyList', function () {
      server.getLobbyList(socket);
    });
    socket.on('createGameLobby', function (data) {
      server.createGameLobby(connection, socket, data);
    });
    socket.on('PickClass', function (data) {
      let classID = data.id;
      connection.PickClass(classID);
      playerClass = connection.player.class;
    });

    socket.on('AcceptedQuest', function (data) {
      let questAlreadyTaken = false;
      let questID = data.id
      quests.forEach(quest => {
        if (quest.id == questID) {
          questAlreadyTaken = true;
          return;
        }
      });
      if (!questAlreadyTaken) {
        connection.gameLobby.serverItems.forEach(item => {
          if (data.botID == item.id && item.quests != null) {
            item.quests.forEach(questItem => {
              if (questID == questItem.id) {
                quests.push(questItem);
                connection.log("Accepted quest " + questID)
                let returnData = {
                  id: questID,
                  questItem: questItem
                }
                socket.emit('AcceptedQuest', returnData);
                return;
              }
            });
            return;
          }
        });
      }
    });
    socket.on('DeclinedQuest', function (data) {
      quests.forEach((quest, index) => {
        if (quest.id == data.id) {
          quest.resetQuestAmount();
          quests.splice(index, 1);
          connection.log("Declined quest " + data.id)
          socket.emit('DeclinedQuest', data);
          return;
        }
      });
    });
    socket.on('LootQuest', function (data) {
      quests.forEach((quest, index) => {
        if (quest.id == data.id && quest.isReached) {
          quest.resetQuestAmount();
          quests.splice(index, 1);
          connection.GainCoinAndExperience(quest.normalCoin, quest.experience);
          socket.emit("LootQuest", data)
          connection.log("Recieved quest loot")
          return;
        }
      });
    });

    socket.on('joinGame', function (data) {
      connection.JoinGame(data);
    });

    socket.on('InfrontPlayerStats', function (data) {
      player.InfrontPlayerStats(connection, data.id);
    });
    socket.on('updatePlayer', function (data) {
      if (playerClass == null) return;
      player.position.x = data.position.x;
      player.position.y = data.position.y;
      player.position.z = data.position.z;
      player.isGrounded = data.isGrounded;
      player.isBlocking = data.isBlocking;
      player.isCrouching = data.isCrouching;
      player.isRunning = data.isRunning;
      player.animation = data.animation;
      player.rotation = data.rotation;

      if (player.isTakingDamage == 1 || player.isBlocking == 1 || player.isAttacking == 1 || player.isDead == 1) {
        playerClass.speed = 0;
      } else if (player.isRunning == 1 && player.isCrouching != 1 && player.isGrounded == 1) {
        playerClass.speed = playerClass.normalSpeed * 2;
      } else {
        playerClass.speed = playerClass.normalSpeed;
      }
      socket.emit('playerSpeed', {
        s: playerClass.speed
      })
    });
    socket.on('LeftWeapon', function (data) {
      if (playerClass == null || player.isTakingDamage || player.isBlocking || !player.isGrounded || player.isAttacking) return;
      playerClass.LeftWeapon(connection, data);
    })
    socket.on('RightWeapon', function (data) {
      if (playerClass == null || player.isTakingDamage || player.isBlocking || !player.isGrounded || player.isAttacking) return;
      playerClass.RightWeapon(connection, data);
    })
    socket.on('QAbility', function (data) {
      if (playerClass == null || player.isTakingDamage || player.isBlocking || !player.isGrounded || player.isAttacking) return;
      playerClass.QAbility(connection, data);
    })
    socket.on('EAbility', function (data) {
      if (playerClass == null || player.isTakingDamage || player.isBlocking || !player.isGrounded || player.isAttacking) return;
      playerClass.EAbility(connection, data);
    })
    socket.on('RAbility', function (data) {
      if (playerClass == null || player.isTakingDamage || player.isBlocking || !player.isGrounded || player.isAttacking) return;
      playerClass.RAbility(connection, data);
    })
    socket.on('ping', function () {
      socket.emit('pong');
    });
  }
  GainCoinAndExperience(normalCoin, experience) {
    let connection = this;
    connection.server.database.GainCoinAndExperience(connection.id, normalCoin, experience, (dataD) => {
      connection.user.normalCoin = dataD.normalCoin;
      connection.user.experience = dataD.experience;
      if (connection.gameSocket != null)
        connection.gameSocket.emit('GainCoinAndExperience', {
          normalCoin: normalCoin,
          experience: experience
        });
    })
  }
  createSocialEvents(platform) {
    let WINDOW = "Home";

    let ViewingPostID = null;
    let ViewingCommentID = null;
    let ViewingProfile = null;

    let ChatPage = 1;
    let ChatingWithUserID = null;
    let ChatingWithUserName = null;
    let ChatingWithUserCode = null;
    let CreatingPostForUser = null;

    let connection = this;
    let userID = connection.id;
    let socket;
    let server = connection.server;
    let player = connection.player;
    let user = connection.user;

    if (platform == 1) {
      socket = connection.gameSocket;
    } else if (platform == 2) {
      socket = connection.clientSocket;
    } else if (platform == 3) {
      socket = connection.webSocket[connection.webSocket.length - 1];
    } else if (platform == 4) {
      socket = connection.mobileSocket;
    }
    connection.log('Connected with platform: ' + platform);
    socket.emit('registerUser', {
      zeroCoin: user.zeroCoin,
      normalCoin: user.normalCoin,
      profilePicType: user.profilePicType,
      picToken: user.picToken,
      username: user.name,
      userCode: user.code,
      userEmail: user.email,
      settings: user.settings
    });
    socket.on('registerUser',()=>{
      socket.emit('registerUser', {
        zeroCoin: user.zeroCoin,
        normalCoin: user.normalCoin,
        profilePicType: user.profilePicType,
        picToken: user.picToken,
        username: user.name,
        userCode: user.code,
        userEmail: user.email,
        settings: user.settings
      });
    })
    socket.on('tellFriendsImOnline', function () {
      server.database.getFriendsList(userID, (dataD) => {
        if (dataD.friendListJson != null)
          user.friendList = dataD.friendListJson;
        socket.emit('updateFriendList', dataD);
        if (user.friendList.length == 0) return;
        user.friendList.forEach((friend) => {
          let username = friend.username;
          let userCode = friend.userCode;
          server.connections.forEach(friendConn => {
            if (friendConn.user.name == username && friendConn.user.code == userCode) {
              let friendData = {
                username: user.name,
                userCode: user.code,
                clientDevice: connection.highestPlatform
              }
              friendConn.everySocket('friendIsOnline', friendData)
              return;
            }
          })
        })
      })
    })
    socket.on('getNotification', function () {
      server.database.getFriendRequest(userID, (dataD) => {
        socket.emit('getFriendRequest', {
          friendRequests: dataD.friendRequests
        });
      })
    });
    socket.on('disconnect', function () {
      server.onDisconnected(connection, platform, socket.id);
    });
    // remove this and from database and anything related
    // socket.on('SignOut', function () {
    //   server.database.userSignOut(userID, platform, () => {
    //     socket.emit('SignOut');
    //   })
    // })
    socket.on('closeChat', function () {
      ChatingWithUserID = null;
      ChatingWithUserName = null;
      ChatingWithUserCode = null;
      socket.emit('closeChat')
    });
    socket.on('sendMessage', function (data) {
      if (data.message == null || ChatingWithUserID == null) return;
      let friendID = ChatingWithUserID
      server.database.saveMsg(userID, ChatingWithUserID, data.message.trim(), (dataD) => {
        let msgData = {
          randomString: data.randomString,
          textID: dataD.textID,
          myself: true
        }
        connection.everySocket('sendMessage', msgData)
        let friendConn = server.connections["User_" + friendID]
        if (friendConn == null) return;

        let counter = 0;
        let friendName = friendConn.user.name
        let friendCode = friendConn.user.code
        let friendData = {
          message: data.message,
          textID: dataD.textID,
          username: user.name,
          userCode: user.code,
          unSeenMsgsCount: dataD.unSeenMsgsCount,
          myself: false
        }
        friendConn.everySocket('sendMessage', friendData)
        if (friendConn.mobileSocket != null || friendConn.webSocket.length != 0 || friendConn.clientSocket != null || friendConn.gameSocket != null) {
          server.database.msgsRecieved(connection.id, friendConn.id, () => {
            let myData = {
              username: friendName,
              userCode: friendCode
            }
            connection.everySocket('msgsRecieved', myData)
          })
        }
      })
    })
    socket.on('showChatHistory', function (data) {
      if (data != null) {
        if (data.username == null) return;
        if (data.username.trim().length == 0) return;
        let username = null;
        let userCode = null;
        data.username = data.username.trim()
        username = data.username.substr(11, data.username.indexOf('-') - 11);
        userCode = data.username.substr(data.username.indexOf('-') + 1, 4);
        if (isNaN(userCode) || username.length > 50) return;
        if (ChatingWithUserID == null || (ChatingWithUserName != username && ChatingWithUserCode != userCode)) {
          ChatingWithUserName = username;
          ChatingWithUserCode = userCode;
          ChatingWithUserID = null;
          ChatPage = 1;
        } else {
          return;
        }
      } else if (ChatingWithUserID != null) {
        ChatPage = ChatPage + 20;
      } else {
        return;
      }
      let startPage = ChatPage;
      server.database.showChatHistory(userID, ChatingWithUserName, ChatingWithUserCode, ChatingWithUserID, ChatPage, (dataD) => {
        socket.emit('showChatHistory', {
          chatLog: dataD.chatLog,
          username: user.name,
          userCode: user.code,
          startPage: startPage
        });
        if (dataD.friendID == null) return;
        ChatingWithUserID = dataD.friendID
        let friendConn = server.connections["User_" + ChatingWithUserID]
        if (friendConn == null) return;
        let myData = {
          username: user.name,
          userCode: user.code
        }
        friendConn.everySocket('msgsSeen', myData)
      })
    });
    socket.on('msgsSeen', function (data) {
      if (ChatingWithUserID == null) return;
      let friendID = ChatingWithUserID
      server.database.msgsSeen(userID, ChatingWithUserID, (dataD) => {
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
      let textID = data.textID.replace('textID_', '')
      if (isNaN(textID)) return;
      if (ChatingWithUserID == null) return;
      let friendID = ChatingWithUserID;
      server.database.deleteMsg(userID, textID, () => {
        let deletemsgs = {
          textID: textID,
          myself: true
        }
        connection.everySocket('deleteMsg', deletemsgs)
        let friendConn = server.connections["User_" + friendID]
        if (friendConn == null) return;
        let myData = {
          textID: textID,
          username: user.name,
          userCode: user.code,
          myself: false
        }
        friendConn.everySocket('deleteMsg', myData)
      })
    })
    socket.on('editMsg', function (data) {
      let textID = data.textID.replace('textID_', '')
      if (data.message == null) return;
      let message = data.message.trim()
      if (isNaN(textID) || message.length == 0) return;
      if (ChatingWithUserID == null) return;
      let friendID = ChatingWithUserID;
      server.database.editMsg(userID, textID, message, () => {
        let editMsgs = {
          textID: textID,
          myself: true
        }
        connection.everySocket('editMsg', editMsgs)
        let friendConn = server.connections["User_" + friendID]
        if (friendConn == null) return;
        let myData = {
          textID: textID,
          message: message,
          username: user.name,
          userCode: user.code,
          myself: false
        }
        friendConn.everySocket('editMsg', myData)
      })
    })


    socket.on('unlinkAccountLinks', function (data) {
      server.database.unlinkAccountLinks(userID, data.username, data.userCode, (dataD) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        }
      })
    })
    socket.on('getAccountLinks', function () {
      user.GetAccountLink(connection, server, socket);
    })
    socket.on('setAccountLinks', function (data) {
      server.database.setAccountLinks(userID, data.email, data.password, (dataD) => {
        if (dataD.friendID != null) {
          user.GetAccountLink(connection, server, socket);
        } else {
          socket.emit('setAccountLinks');
        }
      })
    })
    socket.on('accessAccountLinks', function (data) {
      server.database.accessAccountLinks(userID, data.username, data.userCode, platform, (dataD) => {
        socket.emit('accessAccountLinks', dataD.AuthToken);
      })
    })
    socket.on('accessAccountLinks', function (data) {
      server.database.accessAccountLinks(userID, data.username, data.userCode, platform, (dataD) => {
        socket.emit('accessAccountLinks', dataD.AuthToken);
      })
    })
    socket.on('getSkins', function (data) {
      server.database.getSkins(data.search, data.category, data.option, (dataD) => {
        socket.emit('getSkins', {
          skinData: dataD.skinData
        });
      })
    })
    socket.on('getClassList', function (data) {
      let classData = [];
      classData.push(new InfernoBlaze(1));
      socket.emit('getClassList', classData);
    })

    // socket.on('getSpecificContent', function(data) {
    //   user.getSpecificContent(data, connection, server, socket, CommentPage)
    // })
    socket.on('getTopPosts', function (data) {
      connection.log(`Fetching posts for ${data.categoryID != 1 ? "Community" : "Profile "+data.name+"#"+data.code}`)
      server.database.getTopPosts(connection.id,data.categoryID, data.name, data.code, data.page, (dataD) => {
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
    socket.on('getCategoryList', function (data) {
      let categoryName = data.categoryName;
      if(categoryName.trim().length === 0) return;
      server.database.getCategoryList(categoryName,(dataD) => {
        socket.emit('getCategoryList', {
          categoryList: dataD.categoryList,
          categorySuggestionList : dataD.categorySuggestionList
        });
      })
    })
    socket.on('getTopComments', function (data) {
      if (data.contentID == null || isNaN(data.contentID)) return;
      if (data.page == null || isNaN(data.page)) return;
      if (data.itsComment == null) return;
      let postID = null
      let commentID = null
      if (data.itsComment) {
        postID = data.contentID
        ViewingPostID = postID
      }
      else {
        commentID = data.contentID
        ViewingCommentID = commentID
      }
      connection.log(`Fetching comments for ${postID ? "Post" : "Comment"} with id: ${postID ? postID : commentID}`)
      server.database.getTopComments(connection.id,postID, commentID, data.page, (dataD) => {
        socket.emit('getTopComments', {
          commentsList: dataD.commentsList,
          postID: postID,
          commentID: commentID,
          page: data.page + 5,
          onlyView : data.onlyView
        });
      })
    })

    socket.on('setUserOpinion', function (data) {
      server.database.setUserOpinion(userID, data.postID, data.commentID, data.opinion, (dataD) => {
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
      server.database.deleteContent(userID, data.postID, data.commentID, (dataD) => {
        connection.log(`Deactivating Content with id ${data.postID ? data.postID : data.commentID}`)
        let deleteCont = {
          postID: data.postID,
          commentID: data.commentID
        }
        connection.everySocket('deleteContent', deleteCont)
      })
    })
    socket.on('saveContent', function (data) {
      connection.log(`Editing Content with id ${data.postID ? data.postID : data.commentID}`)
      server.database.saveContent(userID, data.postID, data.commentID, data.text, (dataD) => {
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
      WINDOW = "Home"
      if (CreatingPostForUser.type == 1) {
        WINDOW = "Profile"
      } else if (CreatingPostForUser.type == 2) {
        WINDOW = "Community"
      }else if(CreatingPostForUser.type == 3) {
        WINDOW = "Profile"
      }
      CreatingPostForUser = null;
      socket.emit('OpenWindow', {
        window: WINDOW
      });
    })
    socket.on('fetchPostType',()=>{
      socket.emit('fetchPostType',{
        type : CreatingPostForUser.type,
        name : CreatingPostForUser.name,        
        code : CreatingPostForUser.code        
      })
    })
    socket.on('startCreatingPost', function (data) {
      console.log(data)
      if (data.type == 1 || data.type == 2 || data.type == 3) {
        let directory = './MediaTempFiles/PostFiles/' + user.picToken;
        fs.readdirAsync(directory, (err, files) => {
          if (err) throw err;
          for (const file of files) {
            fs.unlinkAsync(path.join(directory, file), err => {
              if (err) console.error(err);
            });
          }
          if (data.type == 1) {
            CreatingPostForUser = {
              type : 1,
              id : userID
            };
            socket.emit('OpenWindow', {
              window: "Post"
            });
          } else if (data.type == 2) {
            CreatingPostForUser = {
              type : 2,
              id : null
            };
            socket.emit('OpenWindow', {
              window: "Post"
            });
          } else if (data.type == 3 && data.userCode != null && !isNaN(data.userCode) && data.username != null && data.username.trim().length != 0) {
            server.database.searchForUser(userID, data.username, data.userCode, (dataD) => {
              if (dataD.friendID != null) {
                CreatingPostForUser = {
                  type : 3,
                  id :  dataD.friendID,
                  picToken : dataD.picToken,
                  picType : dataD.picType,
                  name : data.username,        
                  code : data.userCode 
                };
                socket.emit('OpenWindow', {
                  window: "Post"
                });
              } else {
                socket.emit('ShowError', {
                  error: "User " + data.username.trim() + "#" + data.userCode.trim() + " either not in your friendlist or doesn't exist"
                });
              }
            })
          }
          else {
            socket.emit('ShowError', {
              error: "Error selecting post type"
            });
          }
        })
      } else {
        socket.emit('ShowError', {
          error: "Must select post type"
        });
      }
    })
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

      let tempDirectory = './MediaTempFiles/PostFiles/' + user.picToken;
      const tempPostFiles = await fs.promises.readdir(tempDirectory);
      let folderName = "MediaFolder_" + (new Date()).toUTCString();
      folderName = folderName.replace(/\s/g, '').replace(/\:/g, "").replace(',', '')
      
      connection.log("Creating post type "+categoryType)
      server.database.createPost(userID, CreatingPostForUser.id, categoryType, postTitle, postText, postUrl, tempPostFiles, folderName, (dataD) => {
        if (dataD.error == null) {
          
          let directory = './MediaFiles/PostFiles/' + user.picToken + '/' + folderName;
          fs.mkdirAsync(directory);
          if (tempPostFiles != null && tempPostFiles.length > 0){
            connection.log("Moving post files")
            tempPostFiles.forEach(function (value) {
              fs.renameAsync(tempDirectory + '/' + value, directory + '/' + value, function (err) {
                if (err) connection.log('ERROR: ' + err);
                connection.log(`File: ${value}`)
              });
            })
          }

          if (CreatingPostForUser.id == connection.id) WINDOW = "Profile"
          else if (CreatingPostForUser.id == null) WINDOW = "Community"
          else WINDOW = "Profile"

          socket.emit('OpenWindow', {
            window: WINDOW
          });
          connection.log("Post created successfully")
        }
        else{
          let text = '';
          if (dataD.error == 1) {
            text = "Must select a category";
          } else if (dataD.error == 2) {
            text = "Must insert a title";
          } else if (data.error == 3) {
            text = "Must insert an explanation text"
          } else if (data.error == 4) {
            text = "Youtube url entered is not valid";
          } else if (data.error == 5) {
            text = "Must wait for video to finish uploading";
          } else if (data.error == 6) {
            text = "Must wait for image to finish uploading";
          } else {
            text = "Encountered while posting. Try refreshing the page";
          }
          socket.emit('ShowError', {
            error: `Error (Create Post / ${dataD.error}): ${text}`
          });
        }
      })
    })
    socket.on('createComment', function (data) {
      if (data.text == null || data.text.trim().length == 0) return;
      let postID = ViewingPostID;
      let commentID = ViewingCommentID;
      server.database.createComment(userID, postID, commentID, data.text, (dataD) => {
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
    socket.on('friendRequestAnswer', function (data) {
      if (data == null) return;
      if (data.username == null) return;
      if (data.username.trim().length == 0) return;
      let username = null;
      let userCode = null;
      data.username = data.username.trim()
      username = data.username.substr(0, data.username.indexOf('-'));
      userCode = data.username.substr(data.username.indexOf('-') + 1, 4);
      if (isNaN(userCode) || username.length > 50 || data.respond == null) return;
      let respond = null;
      if (data.respond != null) {
        respond = 1;
      }
      server.database.respondToFriendRequest(userID, respond, username, userCode, (dataD) => {
        if (dataD.error != null) return;
        if (respond && dataD.friendJson[0] != null && dataD.myJson[0] != null) {
          let friendData = {
            username: username,
            userCode: userCode,
            friendJson: dataD.friendJson
          }
          connection.user.friendList.push(dataD.friendJson[0])
          connection.everySocket('friendRequestAnswer', friendData)
          let friendConn = server.connections["User_" + dataD.friendID]
          if (friendConn != null) {
            let myData = {
              username: user.name,
              userCode: user.code,
              friendJson: dataD.myJson
            }
            friendConn.user.friendList.push(dataD.myJson[0])
            friendConn.everySocket('friendRequestAnswer', myData)
          }
        }
      })
    })
    socket.on('manageFriendRequest', function (data) {
      if (!ViewingProfile || !ViewingProfile.id || !ViewingProfile.name  || !ViewingProfile.code) return
      if(ViewingProfile.id === connection.id) return;
      let friendID = ViewingProfile.id;
      let username = ViewingProfile.name;
      let userCode = ViewingProfile.code;
      let response = data ? data.response : null
      server.database.manageFriendRequest(userID, friendID,response, (dataD) => {

        connection.log(`Managing relation with ${username}#${userCode} result ${dataD.requestHandler}`)
        let returnData = {
          username,
          userCode,
          relation : dataD.requestHandler
        }
        if (dataD.requestHandler == 0) {
          //remove friend or unfriend
          if (friendID == ChatingWithUserID) socket.emit('closeChat')
          
          user.friendList.forEach((friend, i) => {
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
            friendConn.user.friendList.forEach((friend, i) => {
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
        } 
      })
    })
    socket.on('getUserInformation', function () {
      server.database.getUserInformation(userID, (dataD) => {
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
    socket.on('editProfileInfo', function (data) {
      server.database.editProfileInfo(userID, data.firstName, data.lastName, data.gender, data.date, (dataD) => {
        socket.emit('editProfileInfo', {
          error: dataD.error
        });
      })
    })
    socket.on('searchForUser', function (data) {
      if (data.username == null || data.userCode == null || isNaN(data.userCode)) return;
      server.database.searchForUser(userID, data.username, data.userCode, (dataD) => {
        socket.emit('searchForUser', {
          userCorrectName: dataD.userCorrectName,
          friendCode: dataD.friendCode,
          picToken: dataD.picToken,
          picType: dataD.picType,
          username: data.username,
          userCode: data.userCode
        });
      })
    })
    socket.on('showUserProfile', (data) => {
      
      let username = user.name;
      let userCode = user.code;
      if(data && data.username && data.userCode && !isNaN(data.userCode) && data.username.length != 0 && data.username.length < 50){
        username = data.username;
        userCode = data.userCode;
      }
      if(WINDOW != "Profile"){
        WINDOW = "Profile";
        socket.emit('OpenWindow', { window: WINDOW });
      }
      server.database.getUserProfile(connection.id, username, userCode, (dataD) => {
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
    socket.on('editPassword', function (data) {
      server.database.editPassword(userID, data.oldPassword, data.confPassword, data.newPassword, (dataD) => {
        socket.emit('editPassword', dataD.error);
      })
    })
    socket.on('OpenWindow', (data) => {
      // if (WINDOW == data.window)
      //   return;
      if (WINDOW === "Post" && data.window !== "Post") {
        socket.emit('promptToDiscardPost');
        return;
      }
      WINDOW = data.window;
      socket.emit('OpenWindow', data);

      if (data.window == "Store") {
        server.database.getSkins(null, 0, 0, (dataD) => {
          socket.emit('getSkins', {
            skinData: dataD.skinData
          });
        })
      } else if (data.window == "AccountLink") {
        user.GetAccountLink(connection, server, socket);
      } 
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

    socket.on('SetGameSound', function (data) {
      if (data != null)
        if (!isNaN(data.sound))
          server.database.SetGameSound(userID, data.sound)
    });
    socket.on('SetGameThemeColor', function (data) {
      if (data != null)
        if (!isNaN(data.color))
          server.database.SetGameThemeColor(userID, data.color)
    });

    socket.on('createLobby', function (data) {
      if (data == null) return;
      if (data.lobbyType != 0 && data.lobbyType != 1) return;
      if (connection.searchLobby.id != server.generalServerID) {
        socket.emit('updateLobby', {
          lobbyType: data.lobbyType
        })
        socket.broadcast.to(connection.searchLobby.id).emit('updateLobby', {
          lobbyType: data.lobbyType
        })
        return;
      }
      let gamelobby = new GameLobby(new GameLobbySettings(data.lobbyType, 5, 1));
      gamelobby.endGameLobby = function () {
        server.closeDownLobby(gamelobby.id)
      }
      server.searchLobbys[gamelobby.id] = gamelobby;
      server.searchLobby[gamelobby.id].onEnterSearchLobby(connection, userID);
      connection.log('Creating a new ', data.lobbyType, 'lobby');
      //need to get hold on of //count //type //owner //players  //name or id
      socket.emit('createLobby', {
        lobbyType: data.lobbyType,
        username: user.name,
        userCode: user.code,
        lobbyCount: server.searchLobbys[gamelobby.id].connections.length
      })
    });
    socket.on('backToGameType', function () {
      if (userID == connection.searchLobby.leader)
        socket.emit('backToGameType')
    });
    socket.on('leaveLobby', function (data) {
      if (connection.searchLobby.inQueue) {
        if (connection.searchLobby.settings.gameMode == 0) {
          server.competitiveMatchQueue.leaveQueue(connection.searchLobby.id);
        } else {
          server.normalMatchQueue.leaveQueue(connection.searchLobby.id);
        }
      }
      server.searchLobbys[connection.searchLobby.id].onLeaveSearchLobby(connection);
    });
    socket.on('getFriendlistForLobby', function () {
      socket.emit('getFriendlistForLobby', {
        friendList: user.friendList
      })
    });
    socket.on('searchForUserToInvite', function (data) {
      if (data.username == null || data.userCode == null || isNaN(data.userCode)) return;
      server.database.searchForUser(userID, data.username, data.userCode, (dataD) => {
        socket.emit('searchForUserToInvite', {
          userCorrectName: dataD.userCorrectName,
          friendCode: dataD.friendCode,
          picToken: dataD.picToken,
          picType: dataD.picType,
          username: data.username,
          userCode: data.userCode
        });
      })
    })
    socket.on('kickPlayerFromLobby', function (data) {
      if (userID != connection.searchLobby.leader) return;
      if (data.username == null || data.userCode == null || isNaN(data.userCode)) return;
      connection.searchLobby.connections.forEach(friendConn => {
        if (friendConn.user.name == data.username && friendConn.user.code == data.userCode) {
          friendConn.clientSocket.emit('OpenWindow', {
            window: data.window
          });
          friendConn.clientSocket.emit('gotKickedDialog');
          friendConn.clientSocket.to(connection.searchLobby.id).emit('kickPlayerFromLobby', data)
          server.searchLobbys[connection.searchLobby.id].onLeaveSearchLobby(friendConn);
          return;
        }
      });
    });
    socket.on('sendLobbyMsg', function (data) {
      let date = new Date();
      socket.emit('sendLobbyMsg', {
        message: data.message,
        username: user.name,
        userCode: user.code,
        myself: true,
        date: date
      });
      socket.broadcast.to(connection.searchLobby.id).emit('sendLobbyMsg', {
        message: data.message,
        username: user.name,
        userCode: user.code,
        myself: false,
        date: date
      });
    });
    socket.on('inviteToLobby', function (data) {
      server.connections.forEach(friendConn => {
        if (friendConn.user.name == data.username && friendConn.user.code == data.userCode) {
          friendConn.clientSocket.emit('inviteToLobby', {
            lobbyID: connection.searchLobby.id,
            username: user.name,
            userCode: user.code
          });
        }
      })
    });
    socket.on('joinLobby', function (data) {
      if (server.searchLobbys[data.lobbyID] == null) return;
      if (!server.searchLobbys[data.lobbyID].canEnterLobby(connection)) return;

      let oldLobbyID = connection.searchLobby.id;
      if (connection.searchLobby.inQueue) {
        if (sconnection.searchLobby.settings.gameMode == 0) {
          server.competitiveMatchQueue.leaveQueue(oldLobbyID)
        } else {
          server.normalMatchQueue.leaveQueue(oldLobbyID)
        }
      }
      WINDOW = "Home";
      socket.emit('OpenWindow', {
        window: "Home"
      })
      socket.emit('playerLeftLobby', null);
      socket.broadcast.to(oldLobbyID).emit("playerLeftLobby", {
        username: user.name,
        userCode: user.code,
        lobbyCount: server.searchLobbys[oldLobbyID].connections.length
      });
      server.searchLobbys[data.lobbyID].onSwitchSearchLobby(connection);
      let lobbyPlayerNames = [];
      let lobbyPlayerCodes = [];
      connection.searchLobby.connections.forEach(friendConn => {
        lobbyPlayerNames.push(friendConn.user.name)
        lobbyPlayerCodes.push(friendConn.user.code)
      })
      WINDOW = "Lobby";
      socket.emit('OpenWindow', {
        window: "Lobby"
      })
      socket.emit('joinLobby', {
        gameMode: server.searchLobbys[data.lobbyID].settings.gameMode,
        username: user.name,
        userCode: user.code,
        friendList: user.friendList,
        lobbyPlayerNames: lobbyPlayerNames,
        lobbyPlayerCodes: lobbyPlayerCodes,
        myself: true
      })
      socket.broadcast.to(connection.searchLobby.id).emit('joinLobby', {
        gameMode: server.searchLobbys[data.lobbyID].settings.gameMode,
        username: user.name,
        userCode: user.code,
        friendList: user.friendList,
        lobbyPlayerNames: lobbyPlayerNames,
        lobbyPlayerCodes: lobbyPlayerCodes,
        myself: false
      })
    });
    socket.on('promoteToLobbyLeader', function (data) {
      if (connection.searchLobby.leader != userID) return;
      if (data.username == null || data.userCode == null || isNaN(data.userCode)) return;
      let promotedPlayerIndex = connection.searchLobby.connections.findIndex((friendConn) => {
        return (data.username == friendConn.user.name && data.userCode == friendConn.user.code);
      })
      server.searchLobbys[lobbyID].leader = server.searchLobbys[lobbyID].connections[promotedPlayerIndex];
      server.searchLobbys[lobbyID].connections[promotedPlayerIndex].clientSocket.emit('promoteToLobbyLeader');
      let imLeader = false;
      if (user.name == data.username && user.code == data.userCode)
        imLeader = true;
      socket.emit('promoteToLobbyLeader', {
        username: data.username,
        userCode: user.code,
        imLeader: imLeader,
        myself: true
      })
      socket.broadcast.to(connection.searchLobby.id).emit('promoteToLobbyLeader', {
        username: data.username,
        userCode: user.code,
        myself: false
      })
    });

    socket.on('startQueue', function (data) {
      if (connection.searchLobby.leader != userID) return;
      var queueObj = new Object();
      queueObj.acceptShown = false;
      queueObj.socket = socket;
      queueObj.lobbyCount = connection.searchLobby.connections.length;
      queueObj.lobbyID = connection.searchLobby.id;
      connection.searchLobby.inQueue = true;
      if (connection.searchLobby.settings.gameMode == 0) {
        server.competitiveMatchQueue.enterQueue(queueObj);
      } else {
        server.normalMatchQueue.enterQueue(queueObj);
      }
    });
    socket.on('stopQueue', function (data) {
      if (connection.searchLobby.leader != userID) return;
      if (connection.searchLobby.settings.gameMode == 0) {
        server.competitiveMatchQueue.leaveQueue(connection.searchLobby.id);
      } else {
        server.normalMatchQueue.leaveQueue(connection.searchLobby.id);
      }
    });
    socket.on('acceptMatch', function (data) {
      if (!connection.searchLobby.inQueue) return;
      connection.searchLobby.membersAccepted.push(true)
      socket.emit('acceptMatch')
    });
    socket.on('declineMatch', function (data) {
      if (!connection.searchLobby.inQueue) return;
      connection.searchLobby.membersAccepted.push(false)
      socket.emit('declineMatch')
    });
    // socket.on('leavingMainLobby', function(data) {
    //   if (data.queueLobbyName != null) {
    //     socket.leave('findingMatchID_' + data.queueLobbyName, function() {
    //       clients[data.username].queueLobbyName = null;
    //     })
    //   }
    // });
    // socket.on('showingAllyTeamTimeEnded', function(data) {
    //   if (data.queueLobbyName != null) {
    //     socket.emit('tellLobbyEveryoneShown')
    //   }
    // });
    // socket.on('firstPickingTimeEnded', function(data) {
    //   if (data.queueLobbyName != null) {
    //     socket.emit('tellPlayersFirstPick')
    //   }
    // });
    // socket.on('bondedBeforeTimeEnded', function(data) {
    //   if (data.queueLobbyName != null) {
    //     io.to('findingMatchID_' + data.queueLobbyName).emit('tellPlayersBonded')
    //   }
    // });
  }
}