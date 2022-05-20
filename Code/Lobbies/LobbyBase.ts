module.exports = class LobbyBase {
  id : string;
  connections : [];
  constructor(id : string) {
    this.id = id;
    this.connections = [];
  }
  onUpdate() {}
  onEnterLobby() {}
  onLeaveLobby() {}
}