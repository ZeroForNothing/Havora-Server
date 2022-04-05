let Connection = require('../Connection')
var Vector3 = require('../Utility/Vector3.js');
let Bullet = require('../SpawnableObjects/Bullet')
let EarthShatter = require('../SpawnableObjects/EarthShatter')
let BotAI = require('../AI/BotAI')

module.exports = class InfernoBlaze {
  constructor(userLvl) {
    this.id = 1;
    this.name = "Inferno Blaze";
    this.role = 1;
    this.maxHealth = 200;
    this.maxMana = 800;
    this.maxStamina = 200;
    this.maxFury = 10;
    this.health = 200;
    this.mana = 800;
    this.stamina = 200;
    this.fury = 0;
    this.healthRegen = 0.02;
    this.manaRegen = 0.02;
    this.staminaRegen = 0.1;
    this.furyRegen = 1;
    this.damageResistance = 10;
    this.qName = "Earth Bullet";
    this.eName = "Earth Shatter";
    this.rName = "No chance living";
    this.weaponName = "Outfit of chaos";
    this.damage = 20;
    this.qDamage = this.damage;
    this.eDamage = this.damage * 1.2;
    this.rDamage = 0;
    this.rightWeaponDamage = this.damage * 1.1;
    this.leftWeaponDamage = this.damage * 1.1;
    this.qManaCost = 20;
    this.eManaCost = 30;
    this.rManaCost = 70;
    this.shiftStaminaCost = 0.12;
    this.leftWeaponStaminaCost = 5;
    this.rightWeaponStaminaCost = 6;
    this.qDescription = "Throw a fire bullet in the specified direction";
    this.eDescription = "Shutter the ground making flammable rocks emerge";
    this.rDescription = "Maximize body power for a specific time";
    this.weaponDescription = "Punches the if it hits enemy it'll burn them";
    this.speed = 5;
    this.normalSpeed = 5;
    this.blockDamageResistance = 30;
    this.weaponHealth = 4000;
    this.maxLeftWeaponStances = 5;
    this.maxRightWeaponStances = 3;
    this.leftWeaponStance = 0;
    this.rightWeaponStance = 0;
    this.qAnimationTime = 1000;
    this.eAnimationTime = 1000;
    this.rAnimationTime = 1000;
    this.attackSpeed = 550;
    this.rightWeaponAnimationTime = this.attackSpeed;
    this.leftWeaponAnimationTime = this.attackSpeed;
    this.blockAnimationTime = 792;
    this.takeDamageAnimationTime = 850;
    this.leftWeaponStanceTime = 0;
    this.rightWeaponStanceTime = 0;
    this.isAttackingTime = 0;
    this.qCooldown = 0;
    this.eCooldown = 0;
    this.rCooldown = 0;
    this.leftWeaponCooldown = 0;
    this.rightWeaponCooldown = 0;
    this.maxQCooldown = 2000;
    this.maxECooldown = 4000;
    this.maxRCooldown = 90000;
    this.maxLeftWeaponCooldown = this.leftWeaponAnimationTime;
    this.maxRightWeaponCooldown = this.rightWeaponAnimationTime;
  }
  onStart(connection = Connection) {
    let socket = connection.gameSocket;
    socket.on('collisionDestroy', function(data) {
      connection.player.class.onCollisionDestroy(connection, data);
    });
    socket.on('EarthShatterDamage', function(data) {
      connection.player.class.onEarthShatterDamage(connection, data);
    });
  }
  LeftWeapon(connection = Connection, data) {
    let playerClass = this;
    let player = connection.player;
    let socket = connection.gameSocket;
    let currentTime = (new Date()).getTime();
    if (playerClass.leftWeaponCooldown < currentTime && playerClass.stamina >= playerClass.leftWeaponStaminaCost) {

      if (playerClass.maxLeftWeaponStances > playerClass.leftWeaponStance && playerClass.leftWeaponCooldown > currentTime - 3000) //if its less that 3 sec itll reset to 1 stance
        playerClass.leftWeaponStance++;
      else {
        playerClass.leftWeaponStance = 1;
      }

      playerClass.isAttackingTime = currentTime + playerClass.maxLeftWeaponCooldown;
      player.isAttacking = 1;

      playerClass.leftWeaponCooldown = currentTime + playerClass.maxLeftWeaponCooldown;

      playerClass.stamina -= playerClass.leftWeaponStaminaCost;
      if (data.id != null)
        playerClass.WeaponDamage(connection, data);
      var returnData = {
        id: connection.id,
        stance: playerClass.leftWeaponStance
      }
      socket.emit('LeftWeapon', returnData);
      socket.broadcast.to(connection.gameLobby.id).emit('LeftWeapon', returnData);
    }
  }
  RightWeapon(connection = Connection, data) {
    let playerClass = this;
    let player = connection.player;
    let socket = connection.gameSocket;
    let currentTime = (new Date()).getTime();
    if (playerClass.rightWeaponCooldown < currentTime && playerClass.stamina >= playerClass.rightWeaponStaminaCost) {

      if (playerClass.maxRightWeaponStances > playerClass.rightWeaponStance && playerClass.rightWeaponCooldown > currentTime - 3000)
        playerClass.rightWeaponStance++;
      else {
        playerClass.rightWeaponStance = 1;
      }

      playerClass.isAttackingTime = currentTime + playerClass.maxRightWeaponCooldown;
      player.isAttacking = 1;

      playerClass.rightWeaponCooldown = currentTime + playerClass.maxRightWeaponCooldown;

      playerClass.stamina -= playerClass.rightWeaponStaminaCost;
      if (data.id != null)
        playerClass.WeaponDamage(connection, data);

      var returnData = {
        id: connection.id,
        stance: playerClass.rightWeaponStance
      }
      socket.emit('RightWeapon', returnData);
      socket.broadcast.to(connection.gameLobby.id).emit('RightWeapon', returnData);
    }
  }
  QAbility(connection = Connection, data) {
    let playerClass = this;
    let player = connection.player;
    let socket = connection.gameSocket;
    let currentTime = (new Date()).getTime();
    if (playerClass.qCooldown < currentTime && playerClass.mana >= playerClass.qManaCost) {
      playerClass.isAttackingTime = currentTime + playerClass.qAnimationTime;
      player.isAttacking = 1;

      playerClass.qCooldown = currentTime + playerClass.maxQCooldown;
      playerClass.mana -= playerClass.qManaCost;
      playerClass.onFireBullet(connection, data);

      var returnData = {
        id: connection.id
      }
      socket.emit('QAbility', returnData);
      socket.broadcast.to(connection.gameLobby.id).emit('QAbility', returnData);
    }
  }
  EAbility(connection = Connection, data) {
    let playerClass = this;
    let player = connection.player;
    let socket = connection.gameSocket;
    let currentTime = (new Date()).getTime();
    if (playerClass.eCooldown < currentTime && playerClass.mana >= playerClass.eManaCost) {
      playerClass.isAttackingTime = currentTime + playerClass.eAnimationTime;
      player.isAttacking = 1;

      playerClass.mana -= playerClass.eManaCost;
      playerClass.eCooldown = currentTime + playerClass.maxECooldown;
      let dataD = {
        id: connection.id,
        position: {
          x: data.x,
          y: data.y,
          z: data.z
        },
        rotation: player.rotation
      }
      playerClass.onEarthShatter(connection, dataD);

      var returnData = {
        id: connection.id
      }
      socket.emit('EAbility', returnData);
      socket.broadcast.to(connection.gameLobby.id).emit('EAbility', returnData);
    }
  }
  RAbility(connection = Connection, data) {
    let playerClass = this;
    let player = connection.player;
    let socket = connection.gameSocket;
    let currentTime = (new Date()).getTime();
    if (playerClass.rCooldown < currentTime && playerClass.mana >= playerClass.rManaCost) {
      playerClass.isAttackingTime = currentTime + playerClass.rAnimationTime;
      player.isAttacking = 1;

      playerClass.mana -= playerClass.rManaCost;

      playerClass.rCooldown = currentTime + playerClass.maxRCooldown;

      playerClass.rightWeaponDamage *= 3;
      playerClass.leftWeaponDamage *= 3;
      playerClass.damageResistance *= 3;
      playerClass.speed = playerClass.normalSpeed * 3;

      var returnData = {
        id: connection.id
      }

      socket.emit('RAbility', returnData);
      socket.broadcast.to(connection.gameLobby.id).emit('RAbility', returnData);
    }
  }
  onEarthShatter(connection = Connection, data, isAI = false) {
    let lobby = connection.gameLobby;
    let earthShatter = new EarthShatter();
    earthShatter.name = 'EarthShatter';
    earthShatter.activator = data.id;
    earthShatter.position.x = data.position.x;
    earthShatter.position.y = data.position.y;
    earthShatter.position.z = data.position.z;
    earthShatter.rotation = data.rotation;
    lobby.serverObjects.push(earthShatter);
    var returnData = {
      name: earthShatter.name,
      id: earthShatter.id,
      activator: earthShatter.activator,
      position: {
        x: earthShatter.position.x,
        y: earthShatter.position.y,
        z: earthShatter.position.z
      },
      rotation: earthShatter.rotation
    }

    if (!isAI) {
      connection.gameSocket.emit('serverSpawn', returnData);
      connection.gameSocket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Only broadcast to those in the same lobby as us
    } else if (lobby.connections.length > 0) {
      lobby.connections[0].gameSocket.emit('serverSpawn', returnData);
      lobby.connections[0].gameSocket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Broadcast to everyone that the ai spawned a bullet for
    }
  }
  onFireBullet(connection = Connection, data, isAI = false) {
    let lobby = connection.gameLobby;
    let bullet = new Bullet();
    bullet.name = 'Bullet';
    bullet.activator = data.activator;
    bullet.position.x = data.position.x;
    bullet.position.y = data.position.y;
    bullet.position.z = data.position.z;
    bullet.direction.x = data.direction.x;
    bullet.direction.y = data.direction.y;
    bullet.direction.z = data.direction.z;

    lobby.serverObjects.push(bullet);
    var returnData = {
      name: bullet.name,
      id: bullet.id,
      activator: bullet.activator,
      position: {
        x: bullet.position.x,
        y: bullet.position.y,
        z: bullet.position.z
      },
      direction: {
        x: bullet.direction.x,
        y: bullet.direction.y,
        z: bullet.direction.z
      },
      speed: bullet.speed
    }
    if (!isAI) {
      connection.gameSocket.emit('serverSpawn', returnData);
      connection.gameSocket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Only broadcast to those in the same lobby as us
    } else if (lobby.connections.length > 0) {
      lobby.connections[0].gameSocket.emit('serverSpawn', returnData);
      lobby.connections[0].gameSocket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Broadcast to everyone that the ai spawned a bullet for
    }
  }
  WeaponDamage(connection = Connection, data) {
    let playerClass = this;
    let lobby = connection.gameLobby;
    let playerHit = false;
    let weaponDamage = null;
    let hitID = data.id;
    let hitterID = connection.id;
    if (data.weapon == 0) {
      weaponDamage = playerClass.leftWeaponDamage;
    } else {
      weaponDamage = playerClass.rightWeaponDamage;
    }
    lobby.connections.forEach(c => {
      let player = c.player;
      if (c.id == hitID && !player.isDead && c.id != hitterID) {
        player.dealDamage(c, weaponDamage);
        playerHit = true;
      }
    });
    if (!playerHit) {
      let aiList = lobby.serverItems.filter(item => {
        return item instanceof BotAI;
      });
      aiList.forEach(ai => {
        if (ai.id == hitID && !ai.isDead) {
          ai.dealDamage(connection, weaponDamage);
        }
      });
    }
  }
  onEarthShatterDamage(connection = Connection, data) {
    let lobby = connection.gameLobby;
    let socket = connection.gameSocket;
    let hitID = data.hitID;
    let collisionPosition = new Vector3(data.position.x, data.position.y, data.position.z)
    // this comes from the client since the server takes so much time calculating the bullet position
    let returnObjects = lobby.serverObjects.filter(object => {
      return object.id == data.id;
    });
    returnObjects.forEach(object => {
      let playerHit = false;
      lobby.connections.forEach(c => {
        let player = c.player;
        if (object.activator != c.id && !player.isDead && c.id == hitID) {
          let distance = collisionPosition.Distance(player.position);
          if (distance < 2) {
            player.dealDamage(c, 50); //set Q damage
            playerHit = true;
          }
        }
      });
      if (!playerHit) {
        //also u can push loot after AI die
        let aiList = lobby.serverItems.filter(item => {
          return item instanceof BotAI;
        });
        aiList.forEach(ai => {
          if (object.activator != ai.id && !ai.isDead && hitID == ai.id) {
            let distance = collisionPosition.Distance(ai.position);
            if (distance < 2) {
              ai.dealDamage(connection, 50);
            }
          }
        });
      }
    });
  }
  onCollisionDestroy(connection = Connection, data) {
    let lobby = connection.gameLobby;
    let socket = connection.gameSocket;
    let hitID = data.hitID;
    // this comes from the client since the server takes so much time calculating the bullet position
    let returnBullets = lobby.serverObjects.filter(bullet => {
      return bullet.id == data.id;
    });

    returnBullets.forEach(bullet => {
      let playerHit = false;

      lobby.connections.forEach(c => {
        let player = c.player;
        if (bullet.activator != c.id && !player.isDead && hitID == c.id) {
          let distance = bullet.position.Distance(player.position);
          if (distance < 2) {
            player.dealDamage(c, 50); //set Q damage
            playerHit = true;
            lobby.despawnObject(bullet);
          }
        }
      });
      if (!playerHit) {
        //also u can push loot after AI die
        let aiList = lobby.serverItems.filter(item => {
          return item instanceof BotAI;
        });
        aiList.forEach(ai => {
          if (bullet.activator != ai.id && !ai.isDead && hitID == ai.id) {
            let distance = bullet.position.Distance(ai.position);
            if (distance < 2) {
              ai.dealDamage(connection, 50);
            }
            playerHit = true;
            lobby.despawnObject(bullet);
          }
        });

      }
      if (!playerHit) {
        bullet.isDestroyed = true;
      }
    });
  }
}