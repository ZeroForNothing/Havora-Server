let Vector3 = require('../Utility/Vector3')
let AIBase = require('../AI/AIBase')

module.exports = class QuestGiver extends AIBase {
  constructor(quests) {
    super();
    this.name = "AI_QuestBot";
    this.quests = quests;
  }
  requestQuest() {
    return this.quests;
  }
}