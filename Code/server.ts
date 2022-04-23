import { Socket } from "socket.io"

const Connection = require('./Connection')
const Database = require('./Database')
const User = require('./User')
const PlatformState = require('./Utility/PlatformState')
//Lobbies
const LobbyBase = require('./Lobbies/LobbyBase')
const Lobby = require('./Lobbies/Lobby')
const LobbySettings = require('./Lobbies/LobbySettings')


module.exports = class Server {
  connections: any;
  database: typeof Database;
  platformState : typeof PlatformState;
  lobbys : any;
  lobbyBase : typeof LobbyBase;

  constructor() {
      this.connections = [];
      this.database = new Database(),
      this.platformState = new PlatformState(),

      this.lobbys = [],
      this.lobbyBase = new LobbyBase()
      this.lobbyBase.id = "Lobby";
      this.lobbys["Lobby"] = this.lobbyBase;
  }
  

  log(text : string){
    console.log("Web main =>" , text)
  }

  //Handle a new connection to the server
  onConnected(socket : Socket, platform : string , email : string) {
    let server = this;

    if(!server.platformState.isPlatform(platform)) {
      server.log("Platform is invalid");
      return;
    }
    server.log("Fetching user data on " + email+" with platform " + platform);
    server.database.getDataForSocket(email, (data : typeof User) => {
        if (data.id == null) {
          server.log(`User with ${email} is invalid`);
          return;
        }
        //Add also ClientMustBeOpened when opening games
        if (server.connections["User_" + data.id]) {
          //Dont forget to tell the old user new socket got opened if it was opened before close it
          server.connections["User_" + data.id].startOtherPlatform(socket, platform, server);
        }
        else {
          server.connections["User_" + data.id] = new Connection(socket, server, platform, data)
        }
    })
  }

  onDisconnected(connection = Connection, platform : string, thisSocketID : string) {
    let server = this;
    let id = "User_" + connection.id;
    let name = connection.user.name;
    let user = connection.user;
    //Tell friends im disconnected
    if (user.friendList != null) {
      connection.user.friendList.forEach((friend : friendList) => {
        let username = friend.username;
        let userCode = friend.userCode;
        server.connections.forEach((friendConn : typeof Connection) => {
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
    if (platform == server.platformState.CLIENT) {
      server.connections[id].clientSocket = null;
    } else if (platform == server.platformState.WEBSITE) {
      server.connections[id].webSocket.forEach((tempSocket : Socket, index : number) => {
        if (tempSocket.id == thisSocketID) {
          server.connections[id].webSocket.splice(index, 1);
          return;
        }
      })
    } else if (platform == server.platformState.MOBILE) {
      server.connections[id].mobileSocket = null;
    }
    server.platformState.changeHighestPlatform(connection)
    // remove the userDisconnected from database but let friend list check for active socket when opening
    //server.database.userDisconnected(id, platform);
    connection.log('Disconnected with platform: '+ platform);
  }

  closeDownLobby(index : string) {
    let server = this;
    server.log('Closing down lobby ( ' + index + ' )');
    delete server.lobbys[index];
  }
  createLobby(connection : typeof Connection, socket : Socket, data : createLobby) {
    let server = this;
    let name = data.name;
    if (name == null || name.trim().length == 0) {
      connection.everySocket.emit('ShowError', {
        error: "Must insert lobby name"
      });
      return;
    }
    let checkLobbyAlreadyExist = false;
    Object.keys(this.lobbys).forEach(lobbyIndex => {
      if (this.lobbys[lobbyIndex].name == name) {
        checkLobbyAlreadyExist = true;
        return;
      }
    });
    if (checkLobbyAlreadyExist) {
      connection.everySocket.emit('ShowError', {
        error: "Lobby with name: " + name + " already exists"
      });
      return;
    }
    let lobby : typeof Lobby = new Lobby(name, new LobbySettings(150, 1));
    let lobbyID : string = lobby.id;
    lobby.endLobby = function() {
      server.closeDownLobby(lobbyID)
    }
    server.lobbys[lobbyID] = lobby;
  }
  joinLobby(connection = Connection, lobbyID : string) {
    let server = this;
    //let lobbyFound = false;
    //let gameLobbies = server.gameLobbys;
    let lobby : typeof Lobby = server.lobbys[lobbyID];
    if (lobby != null)
      if (lobby.canEnterLobby(connection))
        lobby.onSwitchLobby(connection); //do not make him swtich lobby but add lobby to his collection of lobbies on his connection
  }
}

interface friendList{
  username : string;
  userCode : number;
}
interface createLobby{
  name : string;
}
