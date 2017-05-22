var express = require('express');
var app = express();
var path = require('path');
var Web3 = require('web3');
var colors = require('colors');
var schedules = [];
var numSchedules = 0;
var lastBlockNumber = 0;

var gmailUser = ''; //gmail username
var gmailPass = ''; //gmail pass
var toEmail = ''; //where emails should be sent

'use strict';
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

if (typeof web3 !== 'undefined'){
  web3 = new Web3(web3.currentProvider);
} else{
  web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

app.use(express.static(path.join(__dirname, '/public')));
app.listen(3000, function() { console.log('listening')});

app.post('/Schedule', function(req, res){
  console.log("Schedule submitted".green.bgWhite);
  var blockNumber = req.query['blockNumber'] || 'default';
  var txdata = req.query['txdata'] || 'default';
  schedules[numSchedules] = {"blockNumber": blockNumber, "txdata": txdata, "executed": false}
  console.log(schedules[numSchedules]);
  numSchedules++;
});

app.get("/schedules", function(req, res){
  res.send(schedules);
});

function check(){
  if(lastBlockNumber != web3.eth.blockNumber){
    console.log("❒ block".yellow, web3.eth.blockNumber);
  }
  lastBlockNumber = web3.eth.blockNumber;
    for(var i = 0; i < numSchedules; i++){
      if(schedules[i].blockNumber == web3.eth.blockNumber && !schedules[i].executed){
        console.log("🔧 execute".cyan.bgWhite, schedules[i]);
        web3.eth.sendRawTransaction(schedules[i].txdata, function(err, hash){
          if(!err){
            console.log(colors.green.bgWhite(hash));
            let mailOptions = {
              from: '"TX Scheduler" <' + gmailUser + '>',
              to: toEmail,
              subject: 'TX submitted @ ' + new Date() + ' @BLK# ' + web3.eth.blockNumber,
              text: hash
            }
            transporter.sendMail(mailOptions, (error, info) => {
              if(error){
                return console.log(error);
              }
              console.log('Message %s sent: %s', info.messageId, info.response);
            });
          }else{
            console.log(colors.red(err));
            let errorMailOptions = {
              from: '"TX Scheduler" <' + gmailUser + '>',
              to: toEmail,
              subject: 'TX ERROR @ ' + new Date() + ' @BLK# ' + web3.eth.blockNumber,
              text: err
            }
            transporter.sendMail(errorMailOptions, (error, info) => {
              if(error){
                return console.log(error);
              }
              console.log('Message %s sent: %s', info.messageId, info.response);
            });
          }
        });
        schedules[i].executed = true;
      }
    }
}

setInterval(check, 500);
