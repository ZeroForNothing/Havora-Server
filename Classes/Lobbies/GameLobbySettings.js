module.exports = class GameLobbySettings {
  constructor(gameMode, maxPlayers, minPlayers) {
    this.gameMode = gameMode; // 0 for competitive and 1 for normal // in open world 0 for PVP and 1 for PVE
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
  }
}