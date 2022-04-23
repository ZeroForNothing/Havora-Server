module.exports = class GameLobbySettings {
  minPlayers : number;
  maxPlayers : number
  constructor(maxPlayers : number, minPlayers : number) {
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
  }
}