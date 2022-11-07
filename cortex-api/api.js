const WebSocket = require("ws");
const Cortex = require("./cortex");
const profileName = "alindumitru";

class ClientConnection {
  constructor(cortex) {
    const wss = new WebSocket.Server({ port: 8080 });

    wss.on("connection", (ws) => {
      this.readyState = ws.readyState;
      this.ws = ws;

      this.ws.on("message", (message) => {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.action) {
          case "PLAY":
            cortex.live(this);
            break;
          case "TRAIN":
            // feedback on training progress?
            cortex.train([parsedMessage.trainType], 1, this);
            break;
          case "STOP_PLAY":
            cortex.unlive();
            break;
          case "RESPONSE_YES":
            cortex.acceptTrain(profileName, parsedMessage.trainType);
            break;
          case "RESPONSE_NO":
            cortex.rejectTrain(parsedMessage.trainType);
            break;
        }
      });
    });
  }
}

// ---------------------------------------------------------
let socketUrl = "wss://localhost:6868";
let user = {
  clientId: "",
  clientSecret: "",
  debit: 1,
};

let c = new Cortex(user, socketUrl, profileName);
let client = new ClientConnection(c);

// ---------- sub data stream
// have six kind of stream data ['fac', 'pow', 'eeg', 'mot', 'met', 'com']
// user could sub one or many stream at once
let streams = ["eeg"];
//c.sub(streams);

// ---------- training mental command for profile
// // train is do with a specific profile
// // if profile not yet exist, it will be created
// let profileName = 'test'

// // number of repeat train for each action
// // user have 8 seconds for each time of training
// let numberOfTrain = 1

// // always train 'neutral' complete first then train other action
// let trainingActions = ['neutral', 'push']

// c.train(profileName, trainingActions, numberOfTrain)

// ----------- go to live mode after train
// // load profile which already trained then test your mental command
// ---------------------------------------------------------

// open connection with the client to send data.
