let LobbyBase = require('./LobbyBase')
let GameLobbySettings = require('./GameLobbySettings')
let Connection = require('../Connection')

let LobbyState = require('../Utility/LobbyState')
let ServerItem = require('../Utility/ServerItem')
let Vector3 = require('../Utility/Vector3')
let BotAI = require('../AI/BotAI')
let QuestGiver = require('../AI/QuestGiver')
let Quest_Traveler = require('../Quests/Quest_Traveler')
module.exports = class GameLobby extends LobbyBase {
  constructor(name, settings = GameLobbySettings) {
    super();
    this.name = name;
    this.matchHasStarted = false;
    this.settings = settings;
    this.lobbyState = new LobbyState();
    this.serverObjects = [];
    this.serverItems = [];
    this.endGameLobby = function() {};
  }

  onUpdate() {
    super.onUpdate();
    let lobby = this;
    let serverItems = lobby.serverItems;
    let aiList = serverItems.filter(item => {
      return item instanceof BotAI;
    })
    aiList.forEach(ai => {
      //updates each ai unity , passing tin a function for those that need to update other connections
      if (!ai.isDead) {
        ai.onObtainTarget(lobby.connections);
        ai.onUpdate();
      };
      lobby.connections.forEach(connection => {
        if (connection.gameSocket != null) {
          ai.BotManager(connection, lobby.id);
          return;
        }
      })
    })
    lobby.connections.forEach(connection => {
      if (connection.gameSocket != null)
        connection.player.onUpdatePlayer(connection);
    })
    lobby.updateServerObjects();
    lobby.updateDeadPlayers();
    //close lobby because no one in it
    if (lobby.connections.length == 0) {
      lobby.endGameLobby();
    }
  }

  canEnterGameLobby(connection = Connection) {
    let lobby = this;
    let maxPlayerCount = lobby.settings.maxPlayers;
    let currentPlayerCount = lobby.connections.length;

    if (currentPlayerCount + 1 > maxPlayerCount) {
      return false;
    }

    return true;
  }

  onEnterGameLobby(connection = Connection) {
    let lobby = this;
    let user = connection.user;
    let socket = connection.gameSocket;
    let alreadyInLobby = false;
    connection.gameLobby = this;
    lobby.connections.forEach(tempConn => {
      if (tempConn.id == connection.id) {
        alreadyInLobby = true;
        connection.log("Already in the lobby before")
        return;
      }
    });

    if (!alreadyInLobby) {
      lobby.connections.push(connection);
    }
    connection.gameLobby = lobby;
    connection.gameSocket.join(lobby.id);

    if (lobby.matchHasStarted) {
      console.log("Joining a match already started");
      lobby.onSpawnAllPlayersIntoGame(connection);
      //Spawn ai in to game
      lobby.onSpawnAIIntoGame(connection);
    } else if (lobby.connections.length == lobby.settings.minPlayers) {
      console.log("We have enough players to start the game");
      lobby.lobbyState.currentState = lobby.lobbyState.GAME;
      lobby.matchHasStarted = true;
      //Spawn all players in to game
      lobby.onSpawnAllPlayersIntoGame(null);
      //Spawn ai in to game
      lobby.onSpawnAIIntoGame(null);
    }
    connection.log("Joined Lobby ("+ lobby.id+ ")")
    socket.emit('loadGame');
    let returnData = {
      state: lobby.lobbyState.currentState
    }
    socket.emit('lobbyUpdate', returnData);
    socket.broadcast.to(lobby.id).emit('lobbyUpdate', returnData);
    //Handle spawning any server spawned objects here
    //Example: loot, perhaps flying bullets etc
  }
  onSwitchGameLobby(connection = Connection) {
    let lobby = this;
    let gameLobbys = connection.server.gameLobbys;

    if (connection.gameLobby == null) {
      gameLobbys[lobby.id].onEnterGameLobby(connection);
    } else {
      let oldLobbyID = connection.gameLobby.id;
      gameLobbys[oldLobbyID].onLeaveGameLobby(connection);
      gameLobbys[lobby.id].onEnterGameLobby(connection);
    }
  }
  onLeaveGameLobby(connection = Connection) {
    let lobby = this;
    //connection.gameLobby = undefined;

    //let index = lobby.connections.indexOf(connection);

    // if (index > -1) {
    //   lobby.connections.splice(index, 1);
    // }
    // if (connection.server.gameLobbys[lobby.id].connections.length == 0) {
    //   connection.server.closeDownLobby(lobby.id);
    // }
    connection.gameSocket.emit('unloadGame');
    connection.gameSocket.broadcast.to(lobby.id).emit('GameDisconnected', {
      id: connection.id
    });
    connection.log("Left Lobby ("+ lobby.id+ ")")
    //Handle unspawning any server spawned objects here
    //Example: loot, perhaps flying bullets etc
    //lobby.onUnspawnAIInGame(connection);
    //determine if we have enough players in the lobby to continue the game or not or even keep the lobby
    // if (lobby.connections.length == lobby.settings.minPlayers) {
    //   lobby.connections.forEach(connection => {
    //     if (connection != null) {
    //       //here u can tell the user to stop the game and exit from it or return to social media something like that
    //       //connection.socket.emit('unloadGame')
    //       //connection.server.onSwitchLobby(connection, connection.server.generalServerID)
    //     }
    //   })
    // }
  }

  onSpawnAllPlayersIntoGame(connection) {
    let lobby = this;
    let connections = lobby.connections;
    if (connection != null) {
      lobby.addOldPlayer(connection)
    } else {
      connections.forEach(connection => {
        lobby.addNewPlayer(connection);
      })
    }
  }
  addOldPlayer(connection) {
    let lobby = this;
    let connections = lobby.connections;
    let socket = connection.gameSocket;

    connection.log("Waking up in the game");

    connections.forEach(c => {
      c.gameSocket.emit('spawn', {
        id: c.id,
        position: c.player.position.JSONData(),
        rotation: c.player.rotation
      });
    });
  }
  addNewPlayer(connection = Connection) {
    let lobby = this;
    let connections = lobby.connections;
    let socket = connection.gameSocket;

    connection.log("Spawning in the game");
    //when first time connecting
    connections.forEach(c => {
      socket.emit('spawn', {
        id: c.id,
        position: c.player.position.JSONData(),
        rotation: c.player.rotation
      });
    });
  }

  //here u spawn whatever ai item u want like enemy or health or gold coin stuff like that
  onSpawnAIIntoGame(connection = Connection) {
    let lobby = this;
    if (connection == null) {
      lobby.onServerSpawn(new BotAI(), new Vector3(397, 0, 437), connection);
      lobby.onServerSpawn(new QuestGiver(new Quest_Traveler()), new Vector3(393, 2, 516), connection);
    } else {
      let serverItems = lobby.serverItems;
      serverItems.forEach(item => {
        connection.gameSocket.emit('serverSpawn', {
          id: item.id,
          name: item.name,
          position: item.position.JSONData(),
          quests: item.quests
        })
      })
    }
  }
  onUnspawnAIInGame(connection = Connection) {
    let lobby = this;
    let serverItems = lobby.serverItems;

    //remove all server items from the client but still leave them in the server for others
    serverItems.forEach(serverItem => {
      connection.gameSocket.emit('serverUnspawn', {
        id: serverItem.id
      })
    })
  }
  updateServerObjects() {
    let lobby = this;
    let serverObjects = lobby.serverObjects;
    let connections = lobby.connections;

    serverObjects.forEach(object => {
      let isDestroyed = object.onUpdate();
      if (isDestroyed) {
        lobby.despawnObject(object);
      }
    });
  }

  updateDeadPlayers() {
    let lobby = this;
    let connections = lobby.connections;

    connections.forEach(connection => {
      let player = connection.player;

      if (player.isDead) {
        let isRespawn = player.respawnCounter();
        if (isRespawn) {
          let socket = connection.gameSocket;
          let returnData = {
            id: connection.id,
            position: {
              x: player.position.x,
              y: player.position.y,
              z: player.position.z
            }
          }
          socket.emit('playerRespawn', returnData);
          socket.broadcast.to(lobby.id).emit('playerRespawn', returnData);
        }
      }
    });

    let aiList = lobby.serverItems.filter(item => {
      return item instanceof BotAI;
    })
    aiList.forEach(ai => {
      if (ai.isDead) {
        ai.respawnCounter();
      }
    });
  }

  despawnObject(object) {
    let lobby = this;
    let serverObjects = lobby.serverObjects;
    let connections = lobby.connections;

    console.log('Destroying Object (' + object.id + ')');
    var index = serverObjects.indexOf(object);
    if (index > -1) {
      serverObjects.splice(index, 1);
      var returnData = {
        id: object.id
      }
      //Send remove bullet command to players
      connections.forEach(connection => {
        connection.gameSocket.emit('serverUnspawn', returnData);
      });
    }
  }

  onServerSpawn(item = ServerItem, location = Vector3) {
    let lobby = this;
    let serverItems = lobby.serverItems;
    let connections = lobby.connections;

    item.position = location;
    //set item into the array
    serverItems.push(item);
    //tell everyone in the room
    connections.forEach(connection => {
      connection.gameSocket.emit('serverSpawn', {
        id: item.id,
        name: item.name,
        position: item.position.JSONData(),
        quests: item.quests
      })
    })
  }
  onServerUnspawn(item = ServerItem) {
    let lobby = this;

    let connections = lobby.connections;

    // remove item from array/game
    lobby.deleteServerItem(item);
    //tell everyone in the room
    connections.forEach(connection => {
      connection.gameSocket.emit('serverUnspawn', {
        id: item.id
      })
    })
  }
  deleteServerItem(item = ServerItem) {
    let lobby = this;
    let serverItems = lobby.serverItems;
    let index = serverItems.indexOf(item);

    //remove our item from out the array
    if (index > 1) {
      serverItems.splice(index, 1);
    }
  }
}