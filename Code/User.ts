import { Socket } from "../node_modules/socket.io/dist/index";

const Connection = require('./Connection')
const Server = require('./Server')
type Settings = {
  Sound_UI : number,
  Theme_Color : number
}
module.exports = class User {
  name : string;
  code : number;
  email : string;
  token : string;
  prof : string;
  wall : string;
  newAcc : number;
  zeroCoin : number;
  normalCoin : number;
  experience : number;
  friendList : [];
  settings : Settings;
  constructor(data : User) {
    this.name = data.name;
    this.code = data.code;
    this.email = data.email;
    this.token = data.token;
    this.prof = data.prof;
    this.wall = data.wall;
    this.newAcc = data.newAcc;
    this.zeroCoin = data.zeroCoin;
    this.normalCoin = data.normalCoin;
    this.experience = data.experience;
    this.friendList = [];
    this.settings = JSON.parse(data.settings as any)[0];
  }
  ToJson() {
    return {
      email: this.email,
      name: this.name,
      code : this.code,
      token: this.token,
      prof: this.prof,
      wall: this.wall,
      newAcc: this.newAcc,
      settings: this.settings
    }
  }

  GetAccountLink(connection : typeof Connection, server : typeof Server, socket : Socket) {
    server.database.getAccountLinks(connection.id, (dataD : getAccountLinks) => {
      socket.emit('getAccountLinks', {
        FirstLinkAccount: dataD.FirstLinkAccount,
        SecondLinkAccount: dataD.SecondLinkAccount,
        ThirdLinkAccount: dataD.ThirdLinkAccount,
        name: this.name
      });
    })
  }
  // getSpecificContent(data : getSpecificContent, connection : typeof Connection, server : typeof Server, socket, startPage) {;
  //   server.database.getSpecificContent(connection.id, data.postID, data.commentID, (dataD) => {
  //     startPage++;
  //     socket.emit('getSpecificContent', {
  //       postForm: dataD.content,
  //       postID: data.postID
  //     });
  //   })
  // }

  checkYoutubeUrl(url : string) {
    if (url != undefined || url != '') {
      var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
      var match = url.match(regExp);
      if (match && match[2].length == 11) {
        return match[2];
      }
    }
    return '';
  }
}
interface getAccountLinks{
  FirstLinkAccount: string,
  SecondLinkAccount: string,
  ThirdLinkAccount: string
}