let Vector3 = require('../Utility/Vector3')
let AIBase = require('../AI/AIBase')

module.exports = class BotAI extends AIBase {
  constructor() {
    super();
    this.name = "AI_Bot";
    this.target;
    this.hasTarget = false;
    this.rotation = 0;
    this.weaponDamage = 50;
    this.rightWeaponAnimationTime = 1100; //animation time right weapon
    this.leftWeaponAnimationTime = 1333; //animation time left weapon
    this.blockAnimationTime = 1983; //animation time block
    this.takeDamageAnimationTime = 1267 //animation time takeDamage
    this.attackType = 0;
    this.maxHealth = new Number(200);
    this.maxMana = new Number(200);
    this.maxStamina = new Number(200);
    this.maxFury = new Number(0);
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    this.stamina = this.maxStamina;
    this.fury = this.maxFury;
    this.rightWeaponDamage = new Number(20);
    this.leftWeaponDamage = new Number(30);
    this.damageResistance = new Number(10);
    this.blockDamageResistance = new Number(30);
    this.isAttacking = 0;
    this.isBlocking = 0;
    this.isDead = 0;
    this.isTakingDamage = 0;
    this.respawnTime = (new Date()).getTime();
    this.forwardDirection = 0;
    this.speed = 0.07;
    this.normalSpeed = 0.07;
    this.rotationSpeed = 0.1;
    this.timeBetweenAttacks = 1000;
    this.reloadTime = (new Date()).getTime(); // respawn timer
    this.percentageRateBlock = 0.2; // 20% chance to block
    this.takeDamageBoolTime = (new Date()).getTime();
    this.blockBoolTime = (new Date()).getTime();
    this.attackBoolTime = (new Date()).getTime();
    this.comboHits = 0;
    this.comboHitsTime = (new Date()).getTime();
    this.comboHitsTime = (new Date()).getTime();
    this.comboHits = 0;
    this.AwayFromSpawn = false;
  }
  onUpdate() {
    let ai = this;

    if (!ai.hasTarget || ai.target == null) {
      return;
    }
    let targetConnection = ai.target;
    let targetPosition = targetConnection.player.position;
    //get normalized direction between ai and target
    let direction = new Vector3();
    direction.x = targetPosition.x - ai.position.x;
    direction.y = targetPosition.y - ai.position.y;
    direction.z = targetPosition.z - ai.position.z;
    direction = direction.Normalized();
    let distance = ai.position.Distance(targetPosition);
    let rotation = Math.atan2(direction.x, direction.z) * ai.radiansToDegrees();

    if (isNaN(rotation)) {
      return;
    }
    //Movement
    let angleAmount = ai.getAngleDifference(ai.rotation, rotation); //Direction we need the angle to rotate
    let angleStep = angleAmount * ai.rotationSpeed; //Dont just snap but rotate towards
    ai.rotation = ai.rotation + angleStep; //Apply the angle step
    let forwardDirection = ai.getForwardDirection();

    if (distance > 1.5) {
      ai.forwardDirection = 1;
      ai.position.x = ai.position.x + forwardDirection.x * ai.speed;
      ai.position.y = ai.position.y + forwardDirection.y * ai.speed;
      ai.position.z = ai.position.z + forwardDirection.z * ai.speed;
    } else if (distance <= 1.2) {
      ai.forwardDirection = 0;
      ai.position.x = ai.position.x - forwardDirection.x * ai.speed;
      ai.position.y = ai.position.y - forwardDirection.y * ai.speed;
      ai.position.z = ai.position.z - forwardDirection.z * ai.speed;
    } else if (targetConnection.gameSocket != null)
      ai.checkAbleToAttack(targetConnection);
  }
  onObtainTarget(connections) {
    let ai = this;
    let foundTarget = false;
    let availableTargets = [];
    ai.target = undefined;

    let spawnPosition = new Vector3(397, 0, 437);
    let direction = new Vector3();
    direction.x = spawnPosition.x - ai.position.x;
    direction.y = spawnPosition.y - ai.position.y;
    direction.z = spawnPosition.z - ai.position.z;
    direction = direction.Normalized();
    let distanceFromSpawn = ai.position.Distance(spawnPosition);
    if (distanceFromSpawn >= 30) ai.AwayFromSpawn = true;
    if (!ai.AwayFromSpawn) {
      /// find the closest target to go after
      availableTargets = connections.filter(connection => {
        let player = connection.player;
        return (ai.position.Distance(player.position) < 30 && !player.isDead);
      })
      //sort through to find the closest target. perhaps in the futre you can expand for lowest health
      availableTargets.sort((a, b) => {
        let aDistance = ai.position.Distance(a.player.position);
        let bDistance = ai.position.Distance(b.player.position);
        return (aDistance < bDistance) ? -1 : 1;
      })
    }

    if (availableTargets.length > 0) {
      foundTarget = true;
      ai.target = availableTargets[0];
    }

    if (!foundTarget && (distanceFromSpawn > 1)) {
      let rotation = Math.atan2(direction.x, direction.z) * ai.radiansToDegrees();

      if (isNaN(rotation)) {
        return;
      }
      //Movement
      let angleAmount = ai.getAngleDifference(ai.rotation, rotation); //Direction we need the angle to rotate
      let angleStep = angleAmount * ai.rotationSpeed; //Dont just snap but rotate towards
      ai.rotation = ai.rotation + angleStep; //Apply the angle step
      let forwardDirection = ai.getForwardDirection();
      ai.position.x = ai.position.x + forwardDirection.x * ai.speed;
      ai.position.y = ai.position.y + forwardDirection.y * ai.speed;
      ai.position.z = ai.position.z + forwardDirection.z * ai.speed;
      //regen
      ai.health = ai.maxHealth;
      ai.mana = ai.maxMana;
      ai.stamina = ai.maxStamina;
      ai.fury = ai.maxFury;

    } else if (!foundTarget) {
      ai.position = spawnPosition;
      ai.rotation = 0;
      ai.AwayFromSpawn = false;
    }
    ai.hasTarget = foundTarget;
  }
  getForwardDirection() {
    let ai = this;

    let radiansRotation = ai.rotation * ai.degreesToRadians();
    let sin = Math.sin(radiansRotation);
    let cos = Math.cos(radiansRotation);

    let worldUpVector = ai.worldUpVector();
    let tx = worldUpVector.x;
    let ty = worldUpVector.y;
    let tz = worldUpVector.z;
    return new Vector3((cos * tx) + (sin * tz), ty, -(sin * tx) + (cos * tz));
    // so its vector3( sin , 0 , cos)
  }
  checkAbleToAttack(targetConnection) {
    let ai = this;
    let player = targetConnection.player;
    let currentTime = (new Date()).getTime();
    if (player.isDead || ai.isTakingDamage || ai.isAttacking || ai.isBlocking || ai.isDead) return;
    if (ai.reloadTime < currentTime) {
      let animationTime;
      if (Math.random() >= 0.5) {
        animationTime = ai.leftWeaponAnimationTime;
        ai.attackType = 0; //left attack
      } else {
        animationTime = ai.rightWeaponAnimationTime;
        ai.attackType = 1; //right attack
      }
      ai.reloadTime = currentTime + 3000;
      ai.isAttacking = 1;
      ai.attackBoolTime = currentTime + animationTime;
      targetConnection.gameSocket.emit("AIDealDamage", {
        id: ai.id
      });
      targetConnection.gameSocket.broadcast.to(targetConnection.gameLobby.id).emit("AIDealDamage", {
        id: ai.id
      });
      player.dealDamage(targetConnection, 50);
    }
  }
  respawnCounter() {
    if (this.respawnTime < (new Date()).getTime()) {
      this.health = new Number(200);
      this.mana = new Number(200);
      this.stamina = new Number(200);
      this.fury = new Number(0);
      this.rightWeaponDamage = new Number(20);
      this.leftWeaponDamage = new Number(30);
      this.damageResistance = new Number(10);
      this.isDead = 0;
      this.position = new Vector3(397, 0, 437);
      console.log("Respawning AI id : " + this.id);
    }
  }
  dealDamage(connection, amount = Number) {
    let ai = this;
    let currentTime = (new Date()).getTime();

    ai.isTakingDamage = 1;
    ai.takeDamageBoolTime = currentTime + 750;

    if (Math.random() < ai.percentageRateBlock) {
      ai.isBlocking = 1;
      ai.blockBoolTime = currentTime + 750;
      amount = amount - ai.blockDamageResistance;
    } else {
      amount = amount - ai.damageResistance;
    }
    if (amount > 0)
      ai.health -= amount;
    ai.reloadTime = currentTime + 2500;
    //check if  we are dead
    if (ai.health <= 0) {
      ai.health = 0;
      ai.isDead = 1;
      ai.respawnTime = currentTime + 5000;
      if (connection.quests.length != 0) {
        connection.quests.forEach(quest => {
          if (quest.id == 0 && !quest.isReached) {
            quest.increaseQuestAmount();
            connection.gameSocket.emit("increaseQuestAmount", {
              id: quest.id
            });
            return;
          }
        });
      }
      connection.GainCoinAndExperience(100, 50);
    }

    ai.ComboHits(currentTime);

    let returnData = {
      id: ai.id,
      isBlocking: ai.isBlocking,
      DamageAmount: amount,
      comboHits: ai.comboHits
    }
    connection.gameSocket.emit("TakingDamage", returnData);
    connection.gameSocket.broadcast.to(connection.gameLobby.id).emit("TakingDamage", returnData);
  }
  ComboHits(currentTime) {
    let ai = this;
    if (ai.comboHitsTime + 3000 > currentTime) {
      ai.comboHits++;
    } else {
      ai.comboHits = 1;
    }
    ai.comboHitsTime = currentTime;
  }
  BotManager(connection = Connection, lobbyID) {
    let socket = connection.gameSocket;
    let ai = this;
    let currentTime = (new Date()).getTime();
    if (ai.takeDamageBoolTime <= currentTime) {
      ai.isTakingDamage = 0;
    }
    if (ai.blockBoolTime <= currentTime) {
      ai.isBlocking = 0;
    }
    if (ai.attackBoolTime <= currentTime) {
      ai.isAttacking = 0;
    }

    if (ai.isTakingDamage == 1 || ai.isBlocking == 1 || ai.isAttacking == 1 || ai.isDead == 1) {
      ai.speed = 0;
    } else {
      ai.speed = ai.normalSpeed;
    }
    let data = {
      i: ai.id,
      r: ai.rotation,
      p: ai.position.JSONData(),
      f: ai.forwardDirection,
      a: ai.isAttacking,
      d: ai.isDead,
      at: ai.attackType,
      b: ai.isBlocking,
      t: ai.isTakingDamage
    };
    socket.emit('updateAI', data);
    socket.broadcast.to(lobbyID).emit('updateAI', data);
  }
}