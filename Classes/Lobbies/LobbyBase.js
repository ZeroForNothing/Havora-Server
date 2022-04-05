let {
  nanoid
} = require('nanoid')
module.exports = class LobbyBase {
  constructor() {
    this.id = nanoid();
    this.connections = [];
  }
  onUpdate() {}
  onEnterLobby() {}
  onLeaveLobby() {}
}