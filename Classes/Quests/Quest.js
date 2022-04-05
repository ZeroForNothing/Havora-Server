module.exports = class Quest {
  constructor() {
    this.id = undefined;
    this.requiredAmount = undefined;
    this.title = undefined;
    this.description = undefined;
    this.experience = undefined;
    this.normalCoin = undefined;
    this.currentAmount = 0;
    this.isReached = false;
  }
  increaseQuestAmount() {
    this.currentAmount++;
    this.isReached = (this.currentAmount >= this.requiredAmount);
  }
  resetQuestAmount() {
    this.currentAmount = 0;
    this.isReached = false;
  }
}