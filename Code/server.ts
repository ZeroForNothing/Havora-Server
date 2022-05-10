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
  io : any;

  constructor(io : any) {
      this.connections = [];
      this.database = new Database(),
      this.platformState = new PlatformState(),

      this.lobbys = [],
      this.lobbyBase = new LobbyBase()
      this.lobbyBase.id = "Lobby";
      this.lobbys["Lobby"] = this.lobbyBase;

      this.io = io;
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
        if (server.connections[data.id.toString()]) {
          //Dont forget to tell the old user new socket got opened if it was opened before close it
          server.connections[data.id.toString()].startOtherPlatform(socket, platform, server);
        }
        else {
          server.connections[data.id.toString()] = new Connection(socket, server, platform, data)
        }
    })
  }

  onDisconnected(connection = Connection, platform : string, thisSocketID : string) {
    let server = this;
    let id = connection.id;
    let user = connection.user;
    //Tell friends im disconnected
    if (user.friendList != null) {
      connection.user.friendList.forEach((friend : friendList) => {
        let name = friend.name;
        let code = friend.code;
        server.connections.forEach((friendConn : typeof Connection) => {
          if (friendConn.user.name == name && friendConn.user.code == code) {
            friendConn.everySocket('TellFriendDisconnected', {
              name: user.name,
              code: user.code,
              clientDevice: connection.highestPlatform
            })
            return;
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

    //hangupcall on disconnect
    let callWithUserID = server.connections[id].callWithUser?.id;
    if(callWithUserID && server.connections[callWithUserID]){
      server.connections[callWithUserID].everySocket('hangupCall');
    }
    server.connections[id].callWithUser = undefined;

    server.platformState.changeHighestPlatform(connection)

    connection.log('Disconnected with platform: '+ platform);
  }

  closeDownLobby(index : string) {
    let server = this;
    server.log('Closing down lobby ( ' + index + ' )');
    delete server.lobbys[index];
  }
  createLobby(connection : typeof Connection, socket : Socket, name : string) {
    let server = this;
    if (name == null || name.trim().length == 0) {
      socket.emit('ShowError', {
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
      socket.emit('ShowError', {
        error: "Lobby with name: " + name + " already exists"
      });
      return;
    }
    let lobby : typeof Lobby = new Lobby(name, new LobbySettings(10, 1));
    let lobbyID : string = lobby.id;
    lobby.endLobby = function() {
      server.closeDownLobby(lobbyID)
    }
    server.lobbys[lobbyID] = lobby;
    connection.lobby.push(lobbyID);

    connection.everySocketJoinLobby(lobby.id);
    connection.everySocket("onEnterLobby" , {name})

    return lobby;
  }
  joinLobby(connection = Connection, lobbyID : string) {
    let lobby : typeof Lobby = this.lobbys[lobbyID];
    if (lobby && lobby.canEnterLobby(connection)){
        lobby.onEnterLobby(connection)
    } 
  }
}
interface friendList{
  name : string;
  code : number;
}
