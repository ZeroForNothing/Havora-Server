import { nanoid } from "nanoid"
import { Socket } from "socket.io"

const Connection = require('./Connection')
const Database = require('./Database')
const User = require('./User')
const PlatformState = require('./Utility/PlatformState')
//Lobbies
const Lobby = require('./Lobbies/Lobby')
const LobbySettings = require('./Lobbies/LobbySettings')

interface Group {
  Group_ID : string,
  Group_Name : string,
  Create_Date : string,
  Group_Users ?: string
}

module.exports = class Server {
  connections: any;
  database: typeof Database;
  platformState : typeof PlatformState;
  lobbys : any;
  io : any;

  constructor(io : any) {
      this.connections = [];
      this.database = new Database();
      this.platformState = new PlatformState();
      this.lobbys = [];
      this.io = io;
      this.fetchAllGroups();
  }
  fetchAllGroups(){
    this.database.getAllGroups(async (dataD : any) => {
      if(dataD.allGroups){
        const allGroups = JSON.parse(dataD.allGroups);
        allGroups.forEach((elem : Group )=> {
          this.lobbys[elem.Group_ID] = new Lobby(elem.Group_ID , elem.Group_Name, new LobbySettings(10, 1), elem.Create_Date)
          this.lobbys[elem.Group_ID].users = elem.Group_Users ? elem.Group_Users.split(',') : [];
        });
      }
    })
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
    // server.log("Fetching user data on " + email+" with platform " + platform);
    server.database.getDataForSocket(email, (data : typeof User) => {
        const userID : string = data.id;
        if (userID == null) {
          server.log(`User with ${email} is invalid`);
          return;
        }
        //Add also ClientMustBeOpened when opening games
        if (server.connections[userID]) {
          //Dont forget to tell the old user new socket got opened if it was opened before close it
          server.connections[userID].startOtherPlatform(socket, platform, server);
        }
        else {
          server.connections[userID] = new Connection(socket, server, platform, data)
        }
    })
  }

  onDisconnected(connection = Connection, platform : string, thisSocketID : string) {
    let server = this;
    let id = connection.id;
    let user = connection.user;

    //hangupcall on disconnect
    connection.hangupCall();

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

    server.platformState.changeHighestPlatform(connection)

    connection.log('Disconnected with platform: '+ platform);
  }

  closeDownLobby(index : string) {
    let server = this;
    server.log('Closing down lobby ( ' + index + ' )');
    delete server.lobbys[index];
  }
  async createLobby(name : string = nanoid()) {
    let server = this;
    if (name == null || name.trim().length == 0) {
      server.log("Must insert lobby name");
      return;
    }
    // let checkLobbyAlreadyExist = false;
    // Object.keys(this.lobbys).forEach(lobbyIndex => {
    //   if (this.lobbys[lobbyIndex].name == name) {
    //     checkLobbyAlreadyExist = true;
    //     return;
    //   }
    // });
    // if (checkLobbyAlreadyExist) {
    //   server.log("Lobby with name: " + name + " already exists")
    //   return;
    // }
    return new Promise((resolve,reject)=>{
      server.database.createGroup(name, async (data : any) => {
        const lobbyID = data.groupID;
        if(!lobbyID) reject(null);
        let lobby : typeof Lobby = new Lobby(lobbyID , name, new LobbySettings(10, 1), data.createDate);
        lobby.endLobby = function() {
          server.closeDownLobby(lobbyID)
        }
        server.lobbys[lobbyID] = lobby;
        resolve(lobby);
      })
    })
  }
  async joinLobby(connection = Connection, lobbyID : string) {
    let lobby : typeof Lobby = this.lobbys[lobbyID];
    if (lobby && lobby.canEnterLobby(connection)){
        await lobby.onEnterLobby(connection)
    } 
  }
}
interface friendList{
  name : string;
  code : number;
}
