/*
 * Question a Day (QAD) whatsapp automation webhooks
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
//const token = process.env.WHATSAPP_TOKEN;

// Access/ Bearer token is used here.
//const token = "EAAH3CSuC92gBAJyYmxs6bLzxzkmk4FtSYc85jugxB2dsRqp8Iao0W4unVj91j5rciHTd3iyaRcHHtkd5Egu6N5vGZBPNfWAx6iU2D1Nd4JrQ2ZAymnmFlevYfxbKPOkOKaAZB3TZBR7P0NEcsuYKj7Kux0bzblFhK8ZBEaIwHxuBGW9N1KcwYIVoEfkBpEelbkCVWucBy84AqX7otAO1t91LjUm341jYZD"


// Imports dependencies and set up http server
const request = require("request"),
      express = require("express"),
      body_parser = require("body-parser"),
      axios = require("axios").default,
      app = express().use(body_parser.json()), // creates express http server
      fs = require('fs'),
      Tesseract = require("tesseract.js"),
      tesseract = require("node-tesseract-ocr");

const token_path = "token.txt";

let token = "";
fs.readFile(token_path, 'utf8', (err, data) => {
  if (err) throw err;
  console.log('Token read from file:', data);
  token = data.trim();
  console.log(token);
});

const qad_options_path = "data.json";

let menu1 = {};
fs.readFile(qad_options_path, 'utf8', (err, data) => {
  if (err) throw err;
  console.log('options read from file:', data);
  menu1 = JSON.parse(data);
  console.log(menu1);
});

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("App Restarted!\nwebhook is listening"));

// This stores the conversation state for a particular number and the choice.
// Used to maintain state.
let conversationData = {};

// Delete user information.
function deleteConversation(from) {
  delete conversationData[from];
}

// Function to update the state of a conversation
function setConversationState(waId, state) {
  if (conversationData[waId]) {
    conversationData[waId].state = state;
  } else {
    conversationData[waId] = {
      "state": state,
      "choice": -1,
    }
  }
}

// Function to update the group choice of a conversation
function setGroupChoice(waId, choice) {
  conversationData[waId].choice = choice;
}

// Function to retrieve the state of a conversation
function getConversationState(waId) {
  return conversationData[waId];
}

// Wrapper to send responses i.e. whatsapp messages to target
function sendResponse(from, resp_message) {
  let phone_number_id = "105715159164186";

  if (!resp_message) {
    return;
  }

  axios({
    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
    //maxBodyLength: Infinity,
    //maxContentLength: Infinity,
    //
    // Send Response Message to user "from" using /messages endpoint and access token.
    url:
      "https://graph.facebook.com/v12.0/" +
      phone_number_id +
      "/messages?access_token=" +
      token,
    data: {
      messaging_product: "whatsapp",
      to: from,
      text: { body: resp_message },
    },
    headers: { "Content-Type": "application/json" },
  }).catch((error) => {
    console.log(error);
  });
}

function messageHasBody(req) {
  if (req.body.object){
    return true;
  }
  return false;
}

function isTextMessage(req) {
  if (req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0])
  {
    return true;
  }
  return false;
}

// Dictionary containing group options or the group menu
// Each choice must have fields - money, whatsapp_group_link, name and description
const menu = {
  "1" : {
    "money": "INR 25",
    "whatsapp_group_link": "https://chat.whatsapp.com/LLV2qy4j8CxJsjsLbxuVKy",
    "name": "6th Math",
    "description": "- Basic Maths 2\n- 25 Days\n- INR 25\n",
    "price": "25",
  },
  "2" : {
    "money": "INR 45",
    "whatsapp_group_link": "https://chat.whatsapp.com/ER6XBYbrpE6HIpFnCIieAG",
    "name": "7th Math",
    "description": "- Topic: Angle Chase/Pythagoras Theorem\n- 45 Days\n- INR 45\n",
    "price": "45",
  },
  "3" : {
    "money": "INR 29",
    "whatsapp_group_link": "https://chat.whatsapp.com/Gr80bQQYwkE8YdA93EfVsv",
    "name": "8th Math",
    "description": "- Topic: Algebra\n- 29 Days\n- INR 29\n",
    "price": "29",
  },
  "4" : {
    "money": "INR 30",
    "whatsapp_group_link": "https://chat.whatsapp.com/I2nRjKx49GKDPIoKGvOMdK",
    "name": "9th Math",
    "description": "- Topic: Circle 1\n- 30 Days\n- INR 30\n",
    "price": "30",
  },
  "5" : {
    "money": "INR 50",
    "whatsapp_group_link": "https://chat.whatsapp.com/ERnI0H9urVyAATBsf1EGDH",
    "name": "Olympiad Geometry",
    "description": "- Olypiad level geometry\n- For Those who completed basic geometry\n- 50 Days\n- INR 50\n",
    "price": "50",
  },
}

// Helps populate the menu to be displayed to the user. Menu contains group choices.
function populate_options(menu) {
  console.log(JSON.stringify(menu));
  let menu_size = Object.keys(menu).length;
  let option_range = " [1-" + menu_size + "] "
  let options_message = "Please select a option from" + option_range + "for the group you want to join:\n\n";

  // Iterate over the menu to add options.
  for (const key in menu) {
    options_message += key + ". " + menu[key].name + "\n";
  }
  return options_message;
}

// menu options + greetings.
function create_welcome_message(menu) {
  let menu_message = "*Welcome to Question A Day*.\nGroups you can join are as follows.\n";
  menu_message += populate_options(menu);
  menu_message += "\nThanks,\nSubodh Pethe";
  //console.log(menu_message);
  return menu_message;
}

const default_options_message = populate_options(menu);
const default_welcome_message = create_welcome_message(menu);
const payment_upi = "smita.pethe70@oksbi";

let total_conversations = 0;

// Validates whether input is a number or not
function isNumber(input) {
  return !isNaN(input);
}

// Validates whether the user input for group in within bounds.
function isValidMenuChoice(input) {
  if (input >= 1 && input <= Object.keys(menu).length) {
    return true;
  } else {
    return false;
  }
}

const responses = {
  "default_welcome": default_welcome_message,
  "default_options": default_options_message,
  "request_qad_input": "*Please send 'QAD' in this chat*, if you wish to join question a day activity\nThanks.",
  "confirm_choice": "\nSend 'Yes' to confirm choice.",
  "invalid_choice": "Invalid choice!\n",
  "back_to_menu": "\nSend 'Back' to return to menu.",
  "screenshot_request": "Please send the confirmation screenshot to proceed.",
  "join_message": "\nPlease use the following link to joining the whatsapp group.\nPlease do not share the link as this is paid activity.\n\n",
  "thanks": "\n\nThanks,\n- Subodh Pethe",
  "invalid_screenshot": "This screenshot does not suggest a correct payment.\n",
}

function init_conversation(req, from) {
  let resp_message = "";
  let init_input = req.body.entry[0].changes[0].value.messages[0].text ? req.body.entry[0].changes[0].value.messages[0].text.body : "";

  if (init_input.toLowerCase() != "qad") {
    resp_message = responses["request_qad_input"];
  } else {
    resp_message = responses["default_welcome"];
    setConversationState(from, state["init"]);
  }
  return resp_message;
}

// This function proccess the input from the user choice and forms a response string to be sent to the user.
function process_group_choice(req, from) {
  let resp_message = "";

  let input_choice = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
  if (isNumber(input_choice) && isValidMenuChoice(input_choice)) {
    setGroupChoice(from, input_choice);
    let group_name = menu[input_choice].name;
    let group_details = menu[input_choice].description;
    let group_desc = `*${group_name}:*\n${group_details}`;
    resp_message = `You choose: ${input_choice}\n\n${group_desc}` + responses["confirm_choice"] + responses["back_to_menu"];

    setConversationState(from, state["group_choice"]);
  } else {
    resp_message = responses["invalid_choice"] + responses["default_options"];
  }

  return resp_message;
}

function do_back_to_menu(from) {
  setGroupChoice(from, -1);
  setConversationState(from, state["init"]);
  return responses["default_options"];
}

// Forms string to confirm group choice
function confirm_group_choice(req, from, conversation_state) {
  let resp_message = "";

  let input = req.body.entry[0].changes[0].value.messages[0].text.body;
  if (input.toLowerCase() == "yes") {
    let money = menu[conversation_state.choice + ""].money;
    resp_message = `Please send ${money} to ${payment_upi} UPI and send the screenshot in this chat.\n` + responses["back_to_menu"];
    setConversationState(from, state["confirm_choice"]);
  } else if (input.toLowerCase() == "back"){
    resp_message = do_back_to_menu(from);
  } else {
    resp_message = responses["confirm_choice"] + responses["back_to_menu"];
  }

  return resp_message;
}

const tesseractConfig = {
    lang: "eng",
    oem: 1,
    psm: 3,
};

function sendConfirmationToAdmin(from, imageId) {


}

function parseScreenshot(imageId) {
  return new Promise((resolve, reject) => {
    let result = "";

    // Get ImageURL using imageID by invoking whatsapp media endpoint using access token/bearer token.
    let configImageId = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://graph.facebook.com/v16.0/" + imageId,
      headers: {
        Authorization: "Bearer " + token,
      },
    };

    axios
      .request(configImageId)
      .then((response) => {
        console.log(response.data.url);
        // Get image binary data using imageURL by invoking whatsapp medial endpoint using access token.
        let configImageUrl = {
          method: "get",
          maxBodyLength: Infinity,
          url: response.data.url,
          headers: {
            Authorization: "Bearer " + token,
          },
          responseType: "arraybuffer",
        };

        axios
          .request(configImageUrl)
          .then((response) => {
            tesseract
              .recognize(response.data, tesseractConfig)
              .then((text) => {
                result = text;
                console.log("Result:", text);
                resolve(result);
              })
              .catch((error) => {
                console.log(error);
                reject(error);
              });
          })
          .catch((error) => {
            console.log(error);
            reject(error);
          });
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
}


function testResultValue(result, conversation_state) {
    if (result == undefined) {
        return false;
    }

    result = result.toLowerCase();
    let price = menu[conversation_state.choice].price;
    if (result.includes("smita") &&
        result.includes("pethe")) {
        return true;
    }
    return false;
}

function validate_payment_screenshot(from, imageId, conversation_state) {


    parseScreenshot(imageId).then((result) => {
      // Compare the result here
        console.log("validate_payment_screenshot: " + result);
        let resp_message = "";
        //let ret = testResultValue(result, conversation_state);
        let ret = true;
        if (!ret) {
          resp_message = responses["invalid_screenshot"] + responses["screenshot_request"] + responses["back_to_menu"];
        } else {
          let wa_link = menu[conversation_state.choice].whatsapp_group_link;
          let group_name = menu[conversation_state.choice].name;
          resp_message = `Thanks for joining ${group_name} QAD program.\n` + responses["join_message"] + `Link: ${wa_link}` + responses["thanks"];

          // If user image is as expected. Delete user information.
          deleteConversation(from);
        }

        // If the image is as expected send further details about the activity.
        sendResponse(from, resp_message);
    }).catch((error) => {
      console.log(error);
    });
}

function process_screenshot_and_send_link(req, from, conversation_state) {
  let resp_message = "";

  let type = req.body.entry[0].changes[0].value.messages[0].type;
  if (type == "image") {
    // Get imageID from the message.
    let imageId = req.body.entry[0].changes[0].value.messages[0].image.id;
    validate_payment_screenshot(from, imageId, conversation_state);
    // Send response of confirming payment while image is proccessed in the background.
    resp_message = "Confirming payment. Please wait...";
  } else {
    let input = req.body.entry[0].changes[0].value.messages[0].text.body;
    if (input.toLowerCase() == "back") {
      resp_message = do_back_to_menu(from);
    } else {
    resp_message = responses["screenshot_request"] + responses["back_to_menu"];
    }
  }
  return resp_message;

}

const state = {
  "init": "1",
  "group_choice": "2",
  "confirm_choice": "3",
  "final": "4",
}

const passkey = "qad2023auto";

app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.post("/token", (req, res) => {
    let params = req.body;
    console.log(params["token"]);
    if (params["password"] != passkey) {
        console.error("Token Update failed, invalid pass");
        res.send("Token Update Failed: Invalid pass");
        return;
    }

    fs.writeFile(token_path, params["token"], { flag: 'w+' }, (err) => {
      if (err) {
        console.error(err);
        res.send("Token Update Failed");
        return;
      }

      console.log(`File '${params}' updated with new content.`);
    });

    res.send("Token updated");

    //const data = fs.readFileSync('data.json', 'utf-8');

    // Parse the JSON data
    //const parsedData = JSON.parse(data);
    //    res.send("Token Updated Successfully");
    //res.json(parsedData);
});

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (messageHasBody(req)) {
    if (isTextMessage(req)) {
      console.log(JSON.stringify(req.body, null, 2));
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the user phone number from the webhook payload and use this for future responses.
      let resp_message = "";
      let conversation_state = getConversationState(from);

      // No conversation_state implies this is a new user
      // If conversation state already exists then actions depend on the state of the conversation.
      if (!conversation_state) {
        total_conversations++;
        resp_message = init_conversation(req, from);
      } else {

        // State model for the conversation
        switch (conversation_state.state) {
          case state["init"]:
            resp_message = process_group_choice(req, from);
            break;
          case state["group_choice"]:
            resp_message = confirm_group_choice(req, from, conversation_state);
            break;
          case state["confirm_choice"]:
            resp_message = process_screenshot_and_send_link(req, from, conversation_state);
            break;
        }
      }
      // Send Response to the user.
      sendResponse(from, resp_message);
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});



// SHEEL Note: Not needed after initializing the webhook.
// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
  const verify_token = "root123";

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

app.get('/clearconversations', (req, res) => {
  // Handle the GET request here
  console.log("Clearing conversation data.\nTotal conversations so far: " + total_conversations);
  conversationData = {};
  res.sendStatus(200);
});

app.get('/getconversations', (req, res) => {
  // Handle the GET request here
  let ret = {
    "total_conversations": total_conversations,
    "conversationData": conversationData,
  };

  console.log(ret);
  res.json(ret);
});

app.get('/', (req, res) => {
  fs.readFile('pages/home.html', (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('File not found');
      res.end();
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    }
  });
});

app.get('/privacypolicy', (req, res) => {
  fs.readFile('pages/privacypolicy.html', (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('File not found');
      res.end();
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    }
  });
});

app.get('/termsandconditions', (req, res) => {
  fs.readFile('pages/termsandconditions.html', (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('File not found');
      res.end();
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    }
  });
});

app.get('/updates', (req, res) => {
  fs.readFile('pages/updates.html', (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('File not found');
      res.end();
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    }
  });
});

const { exec } = require('child_process');

app.post('/restart', (req, res) => {
    let params = req.body;
    console.log(params);
    if (params["password"] != passkey) {
        console.error("Token Update failed, invalid pass");
        res.send("Token Update Failed: Invalid pass");
        return;
    }

    // Execute the shell script
    res.send("Restarting app...");
    exec('./restart.sh', (err, stdout, stderr) => {
        if (err) {
        // Handle error
            console.error(err);
            return;
        }
        // Log the output of the script
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });

});

//const url = 'https://fastly.picsum.photos/id/585/200/300.jpg?hmac=9pIkZ1OAqMKxQt7_5yNLOWAjZBmJ99k53TBNs3xQQe4';
const url = 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1572821663213631&ext=1682444763&hash=ATuDUOOdtYEtAp5kNLXx4ibo0cjrJdJGpCKYnkgsvErULg';
const imagePath = 'image.jpg'; // specify the path and filename for the saved image

app.get('/test', (req, res) => {
    console.log("Test hit!!!");
    const axios = require('axios');

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1572821663213631&ext=1682444763&hash=ATuDUOOdtYEtAp5kNLXx4ibo0cjrJdJGpCKYnkgsvErULg',
      headers: {
        Authorization: 'Bearer ' + token
      }
    };

    axios.request(config)
    .then((response) => {
        axios.get(url, { responseType: 'stream' }).then((response) => {
          const writer = fs.createWriteStream(imagePath);
          response.data.pipe(writer);
          writer.on('finish', () => {
            console.log('Image saved successfully!');
          });
    }).catch((error) => {
      console.log('Error while saving image:', error);
    });
    })
    .catch((error) => {
      console.log(error);
    });

        res.send(200);
});
