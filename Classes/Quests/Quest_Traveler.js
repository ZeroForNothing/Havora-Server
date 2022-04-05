let Quest = require('./Quest')
module.exports = class Quest_Traveler {
  constructor() {
    let quests = [];
    quests.push(this.KillMonster());
    quests.push(this.FindObject());
    return quests;
  }
  KillMonster() {
    let quest = new Quest();
    quest.id = 0;
    quest.requiredAmount = 1;
    quest.title = "Slay the monster";
    quest.description = "There's a monster close by... I tried fighting him but he's too strong. Can you help?";
    quest.experience = 10;
    quest.normalCoin = 25;
    return quest;
  }
  FindObject() {
    let quest = new Quest();
    quest.id = 1;
    quest.requiredAmount = 1;
    quest.title = "Find the Crystal";
    quest.description = "I lost my crystal somewhere and can't find it. Can you help?";
    quest.experience = 10;
    quest.normalCoin = 25;
    return quest;
  }
}