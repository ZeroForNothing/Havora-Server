let LobbyBase = require('./LobbyBase')
let LobbySettings = require('./LobbySettings')
let Connection = require('../Connection')
export {}
module.exports = class Lobby extends LobbyBase {
  name : string;
  createDate : string;
  settings : typeof LobbySettings;
  users : string[];
  token : string;
  constructor(id : string, name : string, settings = LobbySettings , createDate : string , token : string) {
    super(id);
    this.createDate = createDate;
    this.name = name;
    this.token = token;
    this.settings = settings;
    this.endLobby = function() {};
    this.callInfo = { members : new Array(), callStarterID : undefined };
    this.users = [];
  }

  canEnterLobby() {
    let lobby = this;
    let maxPlayerCount = lobby.settings.maxPlayers;
    let currentPlayerCount = lobby.users.length;

    if (currentPlayerCount + 1 > maxPlayerCount) {
      return false;
    }
    return true;
  }

  onEnterLobby(connection = Connection) {
    let lobby : Lobby = this;
    let alreadyInLobby = false;
    let allUsers : string[] = [...lobby.users];
    lobby.users.forEach((userID : string) => {
      if (userID == connection.id) {
        alreadyInLobby = true;
        connection.log("Already in the lobby")
      }
    });

    if (!alreadyInLobby) {
      // do enter lobby behavior
      allUsers.push(connection.id);
      return new Promise((resolve,reject)=>{ 
        connection.server.database.addToGroup(connection.id, lobby.id , allUsers, [...connection.lobby , lobby.id], () => {
          lobby.users.push(connection.id);  // static after server restart // starts from the data from database
          lobby.connections.push(connection); // changable after server restart // starts from 0
          connection.lobby.push(lobby.id); // changable after server restart // starts from 0
          connection.everySocket('updateGroupList' , { lobbies: null , lobby : lobby.name })
          connection.everySocketJoinLobby(lobby.id)
          connection.log("Joined Lobby ("+ lobby.id+ ")")
          resolve(true);
        })
      })
    }
    else{
      let connectionAlreadyMade = false;
      lobby.connections.forEach((conn : typeof Connection) => {
        if (conn.id == connection.id) {
          connectionAlreadyMade = true;
          connection.log("Connection already made")
        }
      });
      if(!connectionAlreadyMade){
        lobby.connections.push(connection);
        connection.lobby.push(lobby.id);
        connection.everySocketJoinLobby(lobby.id);
      }
      connection.log("Returned to Lobby ("+ lobby.id+ ")")
      return;
    }
  }

  onLeaveLobby(connection = Connection) {
    let lobby = this;
    // do leave lobby behavior and remove connection from lobby
    connection.log("Left Lobby ("+ lobby.id+ ")")
  }
}