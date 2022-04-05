var {
  nanoid
} = require('nanoid');
var Vector3 = require('./Vector3.js');

module.exports = class ServerObjects {
  constructor() {
    this.id = nanoid();
    this.name = "ServerObject";
    this.position = new Vector3();
  }
}