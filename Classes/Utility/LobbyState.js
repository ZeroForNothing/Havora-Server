module.exports = class LobbyState  {

  constructor(){
    //predefined states
    this.GAME = 'Game';
    this.LOBBY = 'Lobby';
    this.ENDGAME = 'EndGame';

    //current state of the lobby
    this.currentState = this.LOBBY;
  }

}
