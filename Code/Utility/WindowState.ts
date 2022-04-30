module.exports = class WindowState  {
    //predefined states
    HOME = 'Home';
    PROFILE = 'Profile';
    COMMUNITY = 'Community';
    POST = 'Post';
    CHAT = 'Chat';
    STORE = 'Store';
    LIBRARY = 'Library';
    ACCOUNTLINK = 'AccountLink';
    SETTINGS = 'Settings';

    //current state of the window
    defaultState : string ;
    currentState : string ;
  constructor(){
    //current state of the window
    this.defaultState = this.HOME;
    this.currentState = this.defaultState;
  }
  isWindow(window : string){
    if(window === this.HOME || window === this.PROFILE || window === this.COMMUNITY || window === this.POST || window === this.CHAT || window === this.STORE 
      || window === this.LIBRARY || window === this.ACCOUNTLINK || window === this.SETTINGS)
      return true;
    else return false;
  }
}
