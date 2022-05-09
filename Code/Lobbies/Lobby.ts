let LobbyBase = require('./LobbyBase')
let LobbySettings = require('./LobbySettings')
let Connection = require('../Connection')
export {}
module.exports = class Lobby extends LobbyBase {
  name : string;
  settings : typeof LobbySettings;
  constructor(name : string, settings = LobbySettings) {
    super();
    this.name = name;
    this.settings = settings;
    this.endLobby = function() {};
  }

  canEnterLobby() {
    let lobby = this;
    let maxPlayerCount = lobby.settings.maxPlayers;
    let currentPlayerCount = lobby.connections.length;

    if (currentPlayerCount + 1 > maxPlayerCount) {
      return false;
    }
    return true;
  }

  onEnterLobby(connection = Connection) {
    let lobby = this;
    let alreadyInLobby = false;

    lobby.connections.forEach((tempConn : typeof Connection) => {
      if (tempConn.id == connection.id) {
        alreadyInLobby = true;
        connection.log("Already in the lobby before")
        return;
      }
    });

    if (!alreadyInLobby) {
      lobby.connections.push(connection);
      connection.lobby.push(lobby.name);
    }
    connection.everySocket.join(lobby.id);
    connection.everySocket("onEnterLobby" , {name : this.name})
    // do enter lobby behavior
    connection.log("Joined Lobby ("+ lobby.id+ ")")
  }

  onLeaveLobby(connection = Connection) {
    let lobby = this;
    connection.everySocket.leave(lobby.id);
    // do leave lobby behavior and remove connection from lobby
    connection.log("Left Lobby ("+ lobby.id+ ")")
  }
}