module.exports = class Queue {
  constructor(server) {
    this.items = [];
    this.findingMatchArray = [];
    this.blueTeamStillNeed = 5;
    this.redTeamStillNeed = 5;
    this.checking = false;
    this.server = server;
  }
  enterQueue(item) {
    // adding element to the queue
    this.items.push(item);
    item.socket.emit('startQueue')
    item.socket.broadcast.to(item.lobbyID).emit('startQueue')
    this.checkCompatibleQueue()
  }
  dequeue() {
    // removing element from the queue
    // returns underflow when called
    // on empty queue
    if (this.isEmpty())
      return "Underflow";
    return this.items.shift();
  }
  front() {
    // returns the Front element of
    // the queue without removing it.
    if (this.isEmpty())
      return "No elements in Queue";
    return this.items[0];
  }
  isEmpty() {
    // return true if the queue is empty.
    return this.items.length == 0;
  }
  printQueue() {
    for (let i = 0; i < this.items.length; i++) {
      console.log(this.items[i]);
    }
  }
  checkCompatibleQueue() {
    if (this.checking)
      return;
    this.checking = true;
    this.items.forEach((item, i) => {
      let tempObj = new Object();
      if (!item.acceptShown) {
        if (this.blueTeamStillNeed - item.lobbyCount >= 0) {
          this.blueTeamStillNeed -= item.lobbyCount;
          item.teamSide = 'blue';
        } else if (this.blueTeamStillNeed - item.lobbyCount >= 0) {
          this.redTeamStillNeed -= item.lobbyCount;
          item.teamSide = 'red';
        }
        this.findingMatchArray.push(item);
        if (this.blueTeamStillNeed == 0 && this.redTeamStillNeed == 0 && this.findingMatchArray.length != 0) {
          let serverDate = (new Date()).getTime() + 10000;
          let cooldown = serverDate - (new Date()).getTime()
          let tempArray = this.findingMatchArray;
          tempArray.forEach((tempItem, i) => {
            tempItem.acceptShown = true;
            tempItem.socket.emit('showAcceptScreen', serverDate)
            tempItem.socket.broadcast.to(tempItem.lobbyID).emit('showAcceptScreen', serverDate)
          });
          setTimeout(function() {
            let everyLobbyAnswer = [];
            tempArray.forEach((tempItem, i) => {
              let lobby = server.lobbys[tempItem.lobbyID]
              if (lobby != null) {
                everyLobbyAnswer.push(lobby.membersAccepted.every((value) => {
                  return value == true
                }))
              } else {
                everyLobbyAnswer.push(false)
              }
            });
            let allAccepted = everyLobbyAnswer.every((value) => {
              return value == true;
            });
            if (allAccepted) {
              //move players to ability select
              tempArray.forEach(arrayItem => {
                arrayItem.socket.emit('OpenWindow', {
                  window: 'AbilitySelect'
                });
                arrayItem.socket.broadcast.to(arrayItem.lobbyID).emit('OpenWindow', {
                  window: 'AbilitySelect'
                });
                arrayItem.socket.emit('setupSelectAbilityTab', {
                  imLeader: true
                });
                arrayItem.socket.broadcast.to(arrayItem.lobbyID).emit('setupSelectAbilityTab', {
                  imLeader: false
                });
              })
            } else {
              //stop the queue for who didnt accept lobby and continue queue for the others
              tempArray.forEach((arrayItem, index) => {
                if (everyLobbyAnswer[index] == true) {
                  this.acceptScreenRemoved(arrayItem.lobbyID)
                } else {
                  this.leaveQueue(arrayItem.lobbyID)
                }
              })

            }
          }, cooldown);
          this.checking = false;
          return;
        }
      }
    });

    this.blueTeamStillNeed = 5;
    this.redTeamStillNeed = 5;
    this.findingMatchArray = [];
    if (!this.checking) {
      this.checkCompatibleQueue()
    }
  }
  acceptScreenShown(lobbyID) {
    for (let i = 0; i < this.items.length; i++)
      if (this.items[i].lobbyID == lobbyID) {
        this.items[i].acceptShown = true
        return;
      }
  }
  acceptScreenRemoved(lobbyID) {
    this.items.forEach(item => {
      if (item.lobbyID == lobbyID) {
        item.acceptShown = false;
        item.socket.emit('removeAcceptScreen')
        item.socket.broadcast.to(connection.lobby.id).emit('removeAcceptScreen')
        return;
      }
    })
  }
  leaveQueue(lobbyID) {
    this.items.forEach((item, spliceIndex) => {
      if (item.lobbyID == lobbyID) {
        if (this.findingMatchArray.length != 0) {
          let index = this.findingMatchArray.findIndex((array) => {
            return array.lobbyID == item.lobbyID;
          })
          if (!isNaN(index))
            this.findingMatchArray.splice(index, 1)
        }
        this.items.splice(spliceIndex, 1);
        this.server.lobbys[item.lobbyID].inQueue = false;
        item.socket.emit('stopQueue', {
          imLeader: true
        })
        item.socket.broadcast.to(item.lobbyID).emit('stopQueue', {
          imLeader: false
        })
        this.checkCompatibleQueue()
        return;
      }
    })
  }
}