let {
  nanoid
} = require('nanoid');
let Vector3 = require('../Utility/Vector3');

module.exports = class ServerItem {
  constructor() {
    this.username = "ServerItem";
    this.id = nanoid();
    this.position = new Vector3();
  }
}