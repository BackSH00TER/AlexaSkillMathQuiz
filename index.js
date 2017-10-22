'use strict';
var Alexa = require('alexa-sdk');

var APP_ID = "amzn1.ask.skill.aab4abf2-3388-4cb3-9a03-273d239f7686";
var SKILL_NAME = "Mental Math";
var WELCOME_MESSAGE = "Welcome to " + SKILL_NAME + ". You can start by saying quiz me, and then answering the math problems.";
var HELP_MESSAGE = "You can say quiz me to start a quiz. Answer questions by saying the number that the problem equals.";
var HELP_REPROMPT = "Begin by asking me to start addition problems then answer the problems. When you're done, say stop and I will tell you how many problems you got correct.";
var DIDNT_UNDERSTAND_MESSAGE = "I'm sorry, I didn't understand that. Try again.";
var STOP_MESSAGE = "See you next time!";

var currentNums = -1; //used to keep track of numbers for each problem
var lastProblem = "";
var inProgress = false;
var isCorrect = false;
var isWrong = false;
var correctScore = 0;
var wrongScore = 0;

var correctAnswerResponses = [
    "Nice job,", "Nice,", "Good job,", "Correct,",
    "<say-as interpret-as=\"interjection\">bingo,</say-as>",
    "<say-as interpret-as=\"interjection\">righto,</say-as>",
    "<say-as interpret-as=\"interjection\">way to go,</say-as>",
    "<say-as interpret-as=\"interjection\">well done,</say-as>"
];

//TODO add ways to select difficult
//TODO: Add an option for speed round, which skips the successful messages, if answered wrong
//TODO:     plays an "WRONG" sound and asks question again
//TODO: Add random to get any problems (+, -, *, /) [depending on difficulty]
//=========================================================================================================================================
// Handlers
//=========================================================================================================================================
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', WELCOME_MESSAGE, HELP_MESSAGE);
    },
    'Unhandled': function () {
        console.log("unhandled intent called");
        this.emit(':ask', DIDNT_UNDERSTAND_MESSAGE, HELP_REPROMPT);
    },
    'AdditionIntent': function () {
        var outputMsg = "";
        if(inProgress && isCorrect) {
            outputMsg = correctAnswerResponses[currentNums[2] % 8];
            isCorrect = false;
            correctScore = correctScore + 1;
        }
        if(inProgress && isWrong) {
            outputMsg = "It equals " + currentNums[2] + ".";
            isWrong = false;
            wrongScore = wrongScore + 1;
        }

        doMath("PLUS", "EASY", (nums) => {
            currentNums = nums;
        });

        //TODO: Add randomized ways to ask what is...
        if(!inProgress) {
            this.emit(':ask', outputMsg + ' What is ' + currentNums[0] + ' plus ' + currentNums[1] + "?", currentNums[0] + ' plus ' + currentNums[1]);
        }
        else {
            this.emit(':ask', outputMsg + " " +  currentNums[0] + ' plus ' + currentNums[1] + " is", currentNums[0] + ' plus ' + currentNums[1] + " is");
        }
        lastProblem = currentNums[0] + ' plus ' + currentNums[1];
        inProgress = true;
    },
    'AnswerIntent': function () {
        //TODO: Add an intent that would take {num1} point {num2}
        //TODO: Alexa doesn't understand point so will have to form own decimal out of two numbers

        if(currentNums === -1) { //Check if user trying to answer before question was asked
            this.emit(':ask', "Silly goose, I didn't ask you a question yet! Say, quiz me, if you want to start a quiz.");
        }
        else {
            const slotNumber = this.event.request.intent.slots.Number;

            if(isValidSlotNumber(slotNumber)) {
                if(slotNumber.value == currentNums[2]) {
                    isCorrect = true;
                    this.emit('AdditionIntent');
                }
                else {
                    isWrong = true;
                    this.emit('AdditionIntent');
                }
            }
            else {
                console.log("Incorrect slotNumber.value:" + slotNumber.value);
                this.emit(":ask", "I didn't recognize that number, try again.", lastProblem);
            }
        }
    },
    'ScoreIntent': function() {
        if((correctScore + wrongScore) == 0) {
            this.emit(":ask", "You don't have a score yet. Try starting a quiz first.", "Just say quiz me to start.");
        }
        else {
            this.emit(":ask", "You've answered " + correctScore + " out of " + (correctScore + wrongScore) + " problems correctly. The last problem was " + currentNums[0] + " plus " + currentNums[1], "The last problem was " + currentNums[0] + " plus " + currentNums[1]);
        }
    },
    'AMAZON.RepeatIntent': function() { //Only handles saying last question
        if(lastProblem == "" ) {
            this.emit(':ask', "I'm sorry there was an error getting what was last said. Try again.");
        }
        else {
            this.emit(':ask', lastProblem, "The problem was " + lastProblem);
        }
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = HELP_MESSAGE;
        var reprompt = HELP_REPROMPT;
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', "You got " + correctScore + " out of " + (correctScore + wrongScore) + " questions correct. "+ STOP_MESSAGE);
    },
    'CatchAll': function () {
        console.log("catchall intent called");
        this.emit(':ask', DIDNT_UNDERSTAND_MESSAGE, HELP_REPROMPT);
    }
};



//=========================================================================================================================================
// Helper functions
//=========================================================================================================================================

var DIFFICULTY = "EASY";
/*
* EASY = Numbers 0 - 12 add/sub
* MEDIUM = Numbers 0 - 12 add,sub,mult
* HARD = Numbers 0 - 100, with decimals
* DIFFICULT = Numbers 0 - 1000 ??
*
* User chooses difficulty
* User then chooses operator to practice
*   Add, Sub, Multiply, Divide or Random
 */

function doMath(operator, difficulty, callback) {
    var num1 =  getRandNum(difficulty);
    var num2 =  getRandNum(difficulty);
    var result = -1;
    switch(operator) {
        case "PLUS":
            result = num1 + num2;
            break;
        case "MINUS":
            result = num1 - num2;
            break;
        case "MULTIPLY":
            result = num1 * num2;
            break;
        case "DIVIDE":
            result = num1 / num2;
            break;
        case "RANDOM":
            break;
        default:
            result = num1 + num2;
            break;
    }
    var returnNums = [num1, num2, result];
    callback(returnNums);
}

function getRandNum(difficulty) {
    var nums = 12;
    switch(difficulty) {
        case "EASY":
            nums = 13;
            break;
        case "MEDIUM":
            nums = 13;
            break;
        case "HARD":
            nums = 101;
            break;
        case "DIFFICULT":
            nums = 101.0;
            break;
        default:
            nums = 13;
            break;
    }
    if(difficulty == "DIFFICULT") {
        return Math.round(Math.random() * nums * 10) / 10;
    }
    else {
        return Math.floor(Math.random() * nums);
    }
}

function isValidSlotNumber(slotNumber) {
    if (slotNumber && slotNumber.value) { //contain some value
        if (slotNumber.value != null) {
            if(!isNaN(slotNumber.value)) {
                //console.log("slotNumber.value:" + slotNumber.value);
                return true;
            }
        }
    }
    console.log("ERROR: slotNumber.value:" + slotNumber.value);
    return false;
}