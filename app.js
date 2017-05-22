var express = require('express');
var app = express();
var path = require('path');
var Web3 = require('web3');
var colors = require('colors');
var request = require('request');
var schedules = [];
var numSchedules = 0;
var lastBlockNumber = 0;
var latestBlock = 0;
var txHash = '';

var enableEmail = false; //email notifications
var gmailUser = ''; //gmail username
var gmailPass = ''; //gmail pass
var toEmail = ''; //where emails should be sent
var apiToken = '';

'use strict';
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

app.use(express.static(path.join(__dirname, '/public')));
app.listen(3000, function() { console.log('listening')});

app.post('/Schedule', function(req, res){
  var blockNumber = req.query['blockNumber'] || 'default';
  var txdata = req.query['txdata'] || 'default';
  schedules[numSchedules] = {"blockNumber": blockNumber, "txdata": txdata, "executed": false, "txhash": "none"}
  numSchedules++;
  console.log("Schedule submitted for block: ".green.bgWhite + colors.yellow.bgWhite(blockNumber));
});

app.get("/schedules", function(req, res){
  res.send(schedules);
});

app.get("/latestblock", function(req, res){
  res.send('' + latestBlock);
});

function check(){
  if(lastBlockNumber != latestBlock){
    console.log("❒ new block".yellow, latestBlock);
  }
  var j = 0;
  lastBlockNumber = latestBlock;
    for(var i = 0; i < numSchedules; i++){
      j = i;
      if(parseInt(schedules[i].blockNumber) <= parseInt(latestBlock) && !schedules[i].executed){
        console.log("🔧 execute".cyan.bgWhite, schedules[i]);
        web_sendRawTx(schedules[i].txdata, i);
        schedules[i].executed = true;
      }
    }
}

setInterval(check, 500);
setInterval(getLatestBlockNumber, 500);

function getLatestBlockNumber(){
  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded'},
    url: 'https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=TETAMIZU1BG59X88RATJY33ZBXFC18RCXG',
    body: ''
  }, function(error, response, body){
    latestBlock = parseInt(JSON.parse(body).result, 16);
  });
}

function web_sendRawTx(uploadHash, index){
  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded'},
    url: 'https://api.etherscan.io/api?module=proxy&action=eth_sendRawTransaction&hex=' + uploadHash + '&apikey=' + apiToken,
    body: ''
  }, function(error, response, body){
    var JSONObject = JSON.parse(body);
    if(JSONObject.hasOwnProperty('error')){
      console.log(colors.red.bgWhite("error code: " + JSONObject.error.code + ", " + JSONObject.error.message));
      schedules[index].txhash = "ERROR";
    }else{
      console.log(colors.green.bgWhite(JSONObject.result));
      schedules[index].txhash = JSONObject.result;
      let mailOptions = {
        from: '"TX Scheduler" <' + gmailUser + '>',
        to: toEmail,
        subject: 'TX submitted @ ' + new Date() + ' @BLK# ' + latestBlock,
        text: JSONObject.result
      }
      if(enableEmail){
        transporter.sendMail(mailOptions, (error, info) => {
          if(error){
            return console.log(error);
          }
          console.log('Message %s sent: %s', info.messageId, info.response);
        });
      }
    }
  });
}
