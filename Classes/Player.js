var Vector3 = require('./Utility/Vector3.js');
let BotAI = require('./AI/BotAI')
module.exports = class Player {

  constructor() {
    this.position = new Vector3(388, 5, 573);
    this.rotation = new Number(175);
    this.respawnTime = (new Date()).getTime();
    this.isBlocking = 0;
    this.isCrouching = 0;
    this.isRunning = 0;
    this.isGrounded = 0;
    this.isDead = 0;
    this.isTakingDamage = 0;
    this.isAttacking = 0;
    this.takeDamageBoolTime = (new Date()).getTime();
    this.animation = "Falling Idle";
    this.comboHitsTime = (new Date()).getTime();
    this.comboHits = 0;
    this.class = null;
  }
  respawnCounter() {
    if (this.respawnTime <= (new Date()).getTime()) {
      let player = this;
      let playerClass = this.class;
      console.log("Respawning player");
      player.isDead = 0;
      playerClass.health = playerClass.maxHealth;
      playerClass.mana = playerClass.maxMana;
      playerClass.stamina = playerClass.maxStamina;
      player.position = new Vector3(388, 5, 573);
      return true;
    }
    return false;
  }
  dealDamage(connection, amount = Number) {
    let player = this;
    let playerClass = this.class;
    let currentTime = (new Date()).getTime();

    if (player.isBlocking == 1) {
      amount -= playerClass.blockDamageResistance;
    } else {
      amount -= playerClass.damageResistance;
      player.takeDamageBoolTime = currentTime + playerClass.takeDamageAnimationTime;
      player.isTakingDamage = 1;
    }
    if (amount > 0)
      playerClass.health -= amount;
    //check if  we are dead
    if (playerClass.health <= 0) {
      playerClass.health = 0;
      player.isDead = 1;
      player.respawnTime = currentTime + 5000; ///5 sec wait time
    }
    player.ComboHits(currentTime);

    playerClass.speed = 0;
    let returnData = {
      id: connection.id,
      isBlocking: player.isBlocking,
      DamageAmount: amount,
      comboHits: player.comboHits
    }
    connection.gameSocket.emit("TakingDamage", returnData);
    connection.gameSocket.broadcast.to(connection.gameLobby.id).emit("TakingDamage", returnData);
  }
  ComboHits(currentTime) {
    let player = this;
    if (player.comboHitsTime + 3000 > currentTime) {
      player.comboHits++;
      player.comboHitsTime = currentTime;
    } else {
      player.comboHits = 1;
    }
  }
  onUpdatePlayer(connection = Connection) {
    let player = this;
    let playerClass = this.class;
    let socket = connection.gameSocket;

    let currentTime = (new Date()).getTime();
    if (player.takeDamageBoolTime <= currentTime) {
      player.isTakingDamage = 0;
    }
    if (playerClass.isAttackingTime <= currentTime) {
      player.isAttacking = 0;
    }
    if (player.isDead == 0) {
      if (playerClass.health + playerClass.healthRegen > playerClass.maxHealth)
        playerClass.health = playerClass.maxHealth;
      else
        playerClass.health += playerClass.healthRegen;

      if (playerClass.mana + playerClass.manaRegen > playerClass.maxMana)
        playerClass.mana = playerClass.maxMana;
      else
        playerClass.mana += playerClass.manaRegen;

      if (player.isRunning != 1) {
        if (playerClass.stamina + playerClass.staminaRegen > playerClass.maxStamina)
          playerClass.stamina = playerClass.maxStamina;
        else
          playerClass.stamina += playerClass.staminaRegen;
      }
    }
    let respawnTime = 0;
    if (player.respawnTime > currentTime) {
      respawnTime = player.respawnTime - currentTime;
    }
    let dataToMe = {
      d: player.isDead,
      td: player.isTakingDamage,
      a: player.isAttacking,
      b: player.isBlocking,
      h: playerClass.health,
      s: playerClass.stamina,
      m: playerClass.mana,
      f: playerClass.fury,
      dr: playerClass.damageResistance,
      lw: playerClass.leftWeaponDamage,
      rw: playerClass.rightWeaponDamage,
      rt: respawnTime
    }
    socket.emit('updateMyPlayer', dataToMe);
    let dataTothem = {
      id: connection.id,
      position: player.position.JSONData(),
      rotation: player.rotation,
      animation: player.animation
    }
    socket.broadcast.to(connection.gameLobby.id).emit('updatePlayer', dataTothem);
  }
  InfrontPlayerStats(connection = Connection, hitID) {
    let lobby = connection.gameLobby;
    let whoWantDataID = connection.id;
    let playerHit = false;
    let socket = connection.gameSocket;
    lobby.connections.forEach(c => {
      if (c.id == hitID) {
        let player = c.player;
        let playerClass = c.player.class;
        let username = c.user.name;
        let returnData = {
          id: c.id,
          name: username,
          health: playerClass.health,
          stamina: playerClass.stamina,
          mana: playerClass.mana,
          fury: playerClass.fury,
          maxHealth: playerClass.maxHealth,
          maxStamina: playerClass.maxStamina,
          maxMana: playerClass.maxMana,
          maxFury: playerClass.maxFury,
          damageResistance: playerClass.damageResistance,
          leftWeaponDamage: playerClass.leftWeaponDamage,
          rightWeaponDamage: playerClass.rightWeaponDamage,
          speed: playerClass.speed
        }
        socket.emit('InfrontPlayerStats', returnData);
        playerHit = true;
      }
    });
    if (!playerHit) {
      let aiList = lobby.serverItems.filter(item => {
        return item instanceof BotAI;
      });
      aiList.forEach(ai => {
        if (ai.id == hitID) {
          let returnData = {
            id: ai.id,
            name: ai.name,
            health: ai.health,
            stamina: ai.stamina,
            mana: ai.mana,
            fury: ai.fury,
            maxHealth: ai.maxHealth,
            maxStamina: ai.maxStamina,
            maxMana: ai.maxMana,
            maxFury: ai.maxFury,
            damageResistance: ai.damageResistance,
            leftWeaponDamage: ai.leftWeaponDamage,
            rightWeaponDamage: ai.rightWeaponDamage,
            speed: ai.speed
          }
          socket.emit('InfrontPlayerStats', returnData);
        }
      });
    }
  }
}