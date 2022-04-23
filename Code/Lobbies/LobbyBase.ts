let {
  nanoid
} = require('nanoid')
module.exports = class LobbyBase {
  id : string;
  connections : [];
  constructor() {
    this.id = nanoid();
    this.connections = [];
  }
  onUpdate() {}
  onEnterLobby() {}
  onLeaveLobby() {}
}