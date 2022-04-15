var path = require('path'),
  fs = require('fs');
module.exports = class User {
  constructor(name, code, email, picToken, picTokenType, wallpaperPicType, newAcc, zeroCoin, normalCoin, experience, settings) {
    this.name = name;
    this.code = code;
    this.email = email;
    this.picToken = picToken;
    this.profilePicType = picTokenType;
    this.wallpaperPicType = wallpaperPicType;
    this.newAcc = newAcc;
    this.zeroCoin = zeroCoin;
    this.normalCoin = normalCoin;
    this.experience = experience;
    this.friendList = [];
    this.settings = settings;
    //////////////////////////////////////////////////// profile and community
    this.profileID = null;
    this.profileName = null;
    this.profileCode = null;
  }
  ToJson(id) {
    return {
      id: id,
      name: this.name,
      email: this.email,
      picToken: this.picToken,
      picTokenType: this.picTokenType,
      newAcc: this.newAcc,
      zeroCoin: this.zeroCoin,
      normalCoin: this.normalCoin,
      experience: this.experience
    }
  }

  GetAccountLink(connection, server, socket) {
    let user = this;
    server.database.getAccountLinks(connection.id, (dataD) => {
      socket.emit('getAccountLinks', {
        FirstLinkAccount: dataD.FirstLinkAccount,
        SecondLinkAccount: dataD.SecondLinkAccount,
        ThirdLinkAccount: dataD.ThirdLinkAccount,
        username: user.name
      });
    })
  }

  ShowProfile(username, userCode, connection, socket, server) {
    let user = this;
    user.profileID = null;
    user.profileName = null;
    user.profileCode = null;
    if (username == user.name && userCode == user.code) {
      socket.emit('setProfileData', {
        viewingMyProfile: true,
        picToken: user.picToken,
        profilePicType: user.profilePicType,
        wallpaperPicType: user.wallpaperPicType,
        username: user.name,
        userCode: user.code
      });
    } else {
      server.database.getUserProfile(connection.id, username, userCode, (dataD) => {
        if (dataD.friendID != null) {
          this.profileID = dataD.friendID;
          this.profileName = username;
          this.profileCode = userCode;
          socket.emit('setProfileData', {
            viewingMyProfile: false,
            myRequest: dataD.myRequest,
            friendRequest: dataD.friendRequest,
            picToken: dataD.picToken,
            profilePicType: dataD.profilePicType,
            wallpaperPicType: dataD.wallpaperPicType,
            username: username,
            userCode: userCode
          });
        }
      })
    }
  }

  getProfileSpecificContent(data, connection, server, socket, startPage) {
    let user = this;
    server.database.getSpecificContent(connection.id, data.postID, data.commentID, (dataD) => {
      startPage++;
      socket.emit('getProfileSpecificContent', {
        postForm: dataD.content,
        postID: data.postID
      });
      user.getProfileTopComments(data, connection, socket, server, startPage)
    })
  }

  getCommunitySpecificContent(data, connection, server, socket, startPage) {
    let user = this;
    server.database.getSpecificContent(connection.id, data.postID, data.commentID, (dataD) => {
      startPage++;
      socket.emit('getCommunitySpecificContent', {
        postForm: dataD.content,
        postID: data.postID
      });
      user.getCommunityTopComments(data, connection, socket, server, startPage)
    })
  }
  checkYoutubeUrl(url) {
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