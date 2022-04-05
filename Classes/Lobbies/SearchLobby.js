let Connection = require('../Connection')
let LobbyBase = require('./LobbyBase')
let {
  nanoid
} = require('nanoid')
module.exports = class SearchLobby extends LobbyBase {
  constructor() {
    super();
    this.leader = null;
    this.inQueue = false;
    this.membersAccepted = [];
  }
  canEnterSearchLobby(connection = Connection) {
    let lobby = this;
    let maxPlayerCount = lobby.settings.maxPlayers;
    let currentPlayerCount = lobby.connections.length;

    if (currentPlayerCount + 1 > maxPlayerCount) {
      return false;
    }

    return true;
  }
  onEnterSearchLobby(connection = Connection, leader = null) {
    let lobby = this;
    lobby.connections.push(connection);
    if (leader != null)
      lobby.leader = leader;
    connection.searchLobby = lobby;
    connection.clientSocket.join(lobby.id);
    //connection.everySocketJoinLobby(lobby.id);
  }
  onLeaveSearchLobby() {
    let lobby = this;
    connection.searchLobby = undefined;
    let index = lobby.connections.indexOf(connection);
    if (index > -1) {
      lobby.connections.splice(index, 1);
    }
    connection.everySocket('playerLeftLobby', null);
    connection.everySocketInLobby('playerLeftLobby', lobby.id, {
      username: connection.user.name,
      userCode: connection.user.code,
      lobbyCount: searchLobbyLength,
      gameType: searchLobbyMode
    })
    let searchLobbyLength = lobby.connections.length;
    let searchLobbyMode = lobby.settings.gameMode;

    if (connection.id === lobby.leader && searchLobbyLength > 0) {
      console.log('changing lobby Leader')
      lobby.leader = lobby.connections[0].id;
      connection.everySocketInLobby('promoteToLobbyLeader', lobby.id, {
        username: lobby.connections[0].user.name,
        userCode: lobby.connections[0].user.code
      })
    }
    if (connection.server.searchLobbys[lobby.id].connections.length == 0) {
      connection.server.closeDownLobby(lobby.id);
    }
  }
  onSwitchSearchLobby(connection = Connection, lobbyOwnerID = null) {
    let lobby = this;
    let searchLobbys = connection.server.searchLobbys;

    if (connection.searchLobby != null) {
      let oldLobbyID = connection.searchLobby.id;
      searchLobbys[oldLobbyID].onLeaveSearchLobby(connection);
    }
    connection.searchLobby = searchLobbys[lobby.id];
    searchLobbys[lobby.id].onEnterSearchLobby(connection, lobbyOwnerID);
  }
}