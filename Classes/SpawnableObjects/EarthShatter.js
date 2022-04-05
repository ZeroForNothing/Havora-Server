var ServerObject = require('../Utility/ServerObjects.js');
var Vector3 = require('../Utility/Vector3.js');

module.exports = class EarthShatter extends ServerObject {
  constructor() {
    super();
    this.position = new Vector3();
    this.isDestroyed = false;
    this.activator = '';
    this.lifeSpan = 4210;
    this.aliveTime = (new Date()).getTime() + this.lifeSpan;
  }
  onUpdate() {
    this.isDestroyed = this.aliveTime <= (new Date()).getTime();
    return this.isDestroyed;
  }
}