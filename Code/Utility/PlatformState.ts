const Connection = require('../Connection')
module.exports = class PlatformState  {
    CLIENT = 'Client';
    WEBSITE = 'Website';
    MOBILE = 'Mobile';
    currentState : string;
    constructor(){ 
      //current state of the lobby
      this.currentState = null;
    }
    checkHigherPlatform(currentHighState : string , platform : string){
        if(platform === this.CLIENT){
            return true;
        }else if(currentHighState === this.MOBILE && platform === this.WEBSITE){
            return true;
        }else if(currentHighState !== this.CLIENT && currentHighState !== this.WEBSITE && platform === this.MOBILE){
            return true;
        }else 
            return false
    }
    changeHighestPlatform(connection : typeof Connection) {
        if (connection.clientSocket != null) {
            connection.highestPlatform = 2;
        } else if (connection.webSocket.length != 0) {
            connection.highestPlatform = 3;
        } else if (connection.mobileSocket != null) {
            connection.highestPlatform = 4;
        }
    }
    isPlatform(platform : string){
        if(platform === this.CLIENT || platform === this.WEBSITE || platform === this.MOBILE)
            return true;
        else 
            return false;
    }
  }
  