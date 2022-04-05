const Connection = require('./Connection')
const Database = require('./Database')
const Queue = require('./Queue')
//Lobbies
const LobbyBase = require('./Lobbies/LobbyBase')
const GameLobby = require('./Lobbies/GameLobby')
const SearchLobby = require('./Lobbies/SearchLobby')
const GameLobbySettings = require('./Lobbies/GameLobbySettings')

module.exports = class Server {
  constructor() {
    let GameServer = this;
    GameServer.connections  = [];
    GameServer.database = new Database();

    GameServer.clanLobbys = [];
    GameServer.groupLobbys = [];
    GameServer.searchLobbys = [];
    GameServer.gameLobbys = [];

    GameServer.competitiveMatchQueue = new Queue(GameServer);
    GameServer.normalMatchQueue = new Queue(GameServer);

    GameServer.SearchLobby = new SearchLobby();
    GameServer.SearchLobby.id = "SearchLobby";
    GameServer.searchLobbys["SearchLobby"] = GameServer.SearchLobby;

    GameServer.clanBase = new LobbyBase();
    GameServer.clanBase.id = "ClanLobby";
    GameServer.clanLobbys["ClanLobby"] = GameServer.clanBase;

    GameServer.groupBase = new LobbyBase();
    GameServer.groupBase.id = "GroupLobby";
    GameServer.groupLobbys["GroupLobby"] = GameServer.groupBase;

  }
  log(text){
    console.log("Game Server =>" , text)
  }
  //Interval update every 30frames
  onUpdate() {
    let GameServer = this;
    //Update each lobby
    for (let id in GameServer.gameLobbys) {
      GameServer.gameLobbys[id].onUpdate();
    }
  }

  //Handle a new connection to the server
  onConnected(socket, platform , email) {
    let GameServer = this;
    GameServer.log("Fetching user data on " + email+" with platform " + platform);
    GameServer.database.getDataForSocket(platform , email, (data) => {
``
      if (data.userID != null && data.platform != null && !isNaN(data.platform)) {
        let userID = data.userID;
        let platform = data.platform;
        if (GameServer.connections["User_" + userID] != null) {
          //dont forget to tell the old user new socket got opened if it was opened before close it
          GameServer.connections["User_" + userID].startOtherPlatform(socket, platform, GameServer);
        } else if (platform == 1 && (GameServer.connections["User_" + userID] == null || GameServer.connections["User_" + data.userID].clientSocket == null)) {
          socket.emit("ClientMustBeOpened")
        } else if (GameServer.connections["User_" + userID] == null && platform != 1) {
          GameServer.connections["User_" + data.userID] = new Connection(socket, GameServer, platform, data)
        } else {
          GameServer.log("Something wrong")
        }
      } else {
        GameServer.log("User or Platform is invalid");
      }
    })
  }

  onDisconnected(connection = Connection, platform, thisSocketID) {
    let GameServer = this;
    let id = connection.id;
    let name = connection.user.name;
    let user = connection.user;
    //Tell Other players currently in the lobby that we have disconnected from the game
    if (platform == 1 && connection.gameLobby != null) {
      connection.gameLobby.onLeaveGameLobby(connection)
    }
    //Tell friends im disconnected
    if (user.friendList != null) {
      connection.user.friendList.forEach((friend) => {
        let username = friend.username;
        let userCode = friend.userCode;
        GameServer.connections.forEach(friendConn => {
          if (friendConn.user.name == username && friendConn.user.code == userCode) {
            friendConn.everySocket('TellFriendDisconnected', {
              username: user.name,
              userCode: user.code,
              clientDevice: connection.highestPlatform
            })
          }
        })
      })
    }
    if (platform == 1) {
      GameServer.connections["User_" + id].gameSocket = null;
    } else if (platform == 2) {
      GameServer.connections["User_" + id].clientSocket = null;
    } else if (platform == 3) {
      GameServer.connections["User_" + id].webSocket.forEach((tempSocket, index) => {
        if (tempSocket.id == thisSocketID) {
          GameServer.connections["User_" + id].webSocket.splice(index, 1);
          return;
        }
      })
    } else if (platform == 4) {
      GameServer.connections["User_" + id].mobileSocket = null;
    }
    GameServer.setHighestPlatform(connection, platform)
    GameServer.database.userDisconnected(id, platform);
    connection.log('Disconnected with platform: '+ platform);
  }
  setHighestPlatform(connection, platform) {
    if (connection.highestPlatform == platform) {
      if (connection.clientSocket != null) {
        connection.highestPlatform = 2;
      } else if (connection.webSocket.length != 0) {
        connection.highestPlatform = 3;
      } else if (connection.mobileSocket != null) {
        connection.highestPlatform = 4;
      }
    }
  }
  closeDownLobby(index) {
    let GameServer = this;
    GameServer.log('Closing down lobby ( ' + index + ' )');
    delete GameServer.gameLobbys[index];
  }
  createGameLobby(connection, socket, data) {
    let GameServer = this;
    let name = data.name;
    let gameMode = data.settings.gameMode;
    let maxPlayers = data.settings.maxPlayers;
    if (connection.player.class == null) {
      connection.gameSocket.emit('ShowError', {
        error: "Must have a class selected"
      });
      return;
    }
    if (name == null || name.trim().length == 0) {
      connection.gameSocket.emit('ShowError', {
        error: "Must insert lobby name"
      });
      return;
    }
    if (gameMode == null || (gameMode != 0 && gameMode != 1)) {
      connection.gameSocket.emit('ShowError', {
        error: "Must select lobby mode"
      });
      return;
    }
    if (maxPlayers == null || isNaN(maxPlayers) || maxPlayers < 50 || maxPlayers > 200) {
      connection.gameSocket.emit('ShowError', {
        error: "Must select max amount of players in the lobby"
      });
      return;
    }
    let checkLobbyAlreadyExist = false;
    Object.keys(this.gameLobbys).forEach(lobbyIndex => {
      if (this.gameLobbys[lobbyIndex].name == name) {
        checkLobbyAlreadyExist = true;
        return;
      }
    });
    if (checkLobbyAlreadyExist) {
      connection.gameSocket.emit('ShowError', {
        error: "Lobby with name: " + name + " already exists"
      });
      return;
    }
    let gameLobby = new GameLobby(name, new GameLobbySettings(parseInt(gameMode), parseInt(maxPlayers), 1));
    let lobbyID = gameLobby.id;
    gameLobby.endGameLobby = function() {
      GameServer.closeDownLobby(lobbyID)
    }
    GameServer.gameLobbys[lobbyID] = gameLobby;
    GameServer.gameLobbys[lobbyID].onSwitchGameLobby(connection, GameServer);
  }
  getLobbyList(socket) {
    let lobbyList = [];
    let GameServer = this;
    let gameLobbies = GameServer.gameLobbys;
    Object.keys(GameServer.gameLobbys).forEach(lobbyIndex => {
      let amount = 0;
      GameServer.gameLobbys[lobbyIndex].connections.forEach(c => {
        if (c.gameSocket != null) amount++;
      });
      let temp = {
        id: GameServer.gameLobbys[lobbyIndex].id,
        name: GameServer.gameLobbys[lobbyIndex].name,
        amount: amount,
        settings: GameServer.gameLobbys[lobbyIndex].settings
      };
      lobbyList.push(temp);
    });
    let returnData = {
      lobbyData: lobbyList
    }

    GameServer.log('Found (' +gameLobbies.length +') lobbies');
    socket.emit('getLobbyList', returnData);
  }
  joinOpenLobby(connection = Connection, lobbyID) {
    let GameServer = this;
    //let lobbyFound = false;
    //let gameLobbies = GameServer.gameLobbys;
    let lobby = GameServer.gameLobbys[lobbyID];
    if (lobby != null)
      if (lobby.canEnterGameLobby(connection))
        lobby.onSwitchGameLobby(connection);
  }
}