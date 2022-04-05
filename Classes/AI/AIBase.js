let ServerItem = require('../Utility/ServerItem')
let Vector3 = require('../Utility/Vector3')

module.exports = class AIBase extends ServerItem {
  constructor() {
    super();
    this.name = "AI_Base";
  }
  onUpdate(onUpdateAI) {
    //calculate statemachine (cast ability or hit somehting or set prioty to get cover shit like that) AI related stuff

  }
  onObtainTarget(connections, onUpdateRotation) {

  }
  radiansToDegrees() {
    return new Number(57.29578); // 360 / (Pie * 2)
  }
  degreesToRadians() {
    return new Number(0.01745329); // (Pie *2) / 360
  }
  worldUpVector() {
    return new Vector3(0, 0, 1);
  }
  getAngleDifference(one, two) {
    let diff = (two - one + 180) % 360 - 180;
    return diff < -180 ? diff + 360 : diff;
  }


}