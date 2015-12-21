var Bot = require('telegram-api');
var Message = require('telegram-api/types/Message');
var Question = require('telegram-api/types/Question');
var json = require('./restaurants.json');

function sendInvalidMessage(id) {
    const msg = new Message().to(id).text('Invalid answer');
    bot.send(msg);
}

function feedbackPrompt(id) {
    bot.send(new Message().to(id).text('If you want to help my development or make a bot like me, check out my source!\n https://github.com/michaeljdeeb/indecisive-bot'));
}

function recursiveRestaurantQuestion(availableRestaurants, id, answer) {
    if(availableRestaurants.length == 0) {
        bot.send(new Message().to(id).text('No restaurants matched those filters. Type \'IDK\' to start over.'));
        feedbackPrompt(id);
    } else if(availableRestaurants.length == 1) {
        bot.send(new Message().to(id).text('The only matching restaurant is: ' + availableRestaurants[0].name + '\nEnjoy your meal!'));
        feedbackPrompt(id);
    } else {
        const randomRestaurant = new Question({
            text: 'How about ' + availableRestaurants[Math.floor(Math.random()*availableRestaurants.length)].name + '?',
            answers: [['Yes'], ['No']]
        });

        randomRestaurant.to(id);
        bot.send(randomRestaurant).then(answer => {
            if(answer.text == 'Yes') {
                bot.send(new Message().to(id).text('Enjoy your meal!'));
                feedbackPrompt(id);
            } else {
                recursiveRestaurantQuestion(availableRestaurants, id, answer);
            }
        }, () => {
            sendInvalidMessage(id);
        });
    }
}

function getKeyboardOptions(jsonKey) {
    var uniqueChoices = new Set();
    for(var i=0; i<json.length; i++) {
        if(Array.isArray(json[i][jsonKey])) {
            for(var j=0; j<json[i][jsonKey].length; j++) {
                uniqueChoices.add(json[i][jsonKey][j]);
            }
        } else {
            uniqueChoices.add(json[i][jsonKey]);
        }
    }

    uniqueChoices = Array.from(uniqueChoices).sort();
    var listKeyboardFormat = [];
    for(var i=0; i<uniqueChoices.length; i++) {
        listKeyboardFormat.push([uniqueChoices[i]]);
    }
    listKeyboardFormat.push(['No Preference']);
    return listKeyboardFormat;
}

function removeFarRestaurants(availableRestaurants) {
    for(var i=0; i<availableRestaurants.length; i++) {
        if(availableRestaurants[i].isClose == 'false') {
            availableRestaurants.splice(i, 1);
        }
    }

    return availableRestaurants;
}

function filterRestaurantsBy(filterKey, filterValue, availableRestaurants) {
    var filteredRestaurants = [];

    if(filterValue == 'No Preference') {
        return availableRestaurants;
    } else {
        for(var i=0; i<availableRestaurants.length; i++) {
            if(Array.isArray(availableRestaurants[i][filterKey])) {
                for(var j=0; j<availableRestaurants[i][filterKey].length; j++) {
                    if(availableRestaurants[i][filterKey][j] == filterValue) {
                        filteredRestaurants.push(availableRestaurants[i]);
                    }
                }
            } else {
                if(availableRestaurants[i][filterKey] == filterValue) {
                    filteredRestaurants.push(availableRestaurants[i]);
                }
            }
        }
        return filteredRestaurants;
    }
}

var bot = new Bot({
    token: process.env.TELEGRAM_BOT_TOKEN
});

bot.start().catch(err => {
    console.log(err, '\n', err.stack);
});

bot.on('update', update => {
    console.log('Polled\n', update);
});

const randomQuestion = new Question({
    text: 'Should I just pick something at will?',
    answers: [['Yes'], ['No']]
});

const serviceQuestion = new Question({
    text: 'What kind of restaurant service would you like?',
    answers: getKeyboardOptions('service')
});

const cuisineQuestion = new Question({
    text: 'What kind of food are you in the mood for?',
    answers: getKeyboardOptions('cuisine')
});

const distanceQuestion = new Question({
    text: 'Are you willing to leave the neighborhood?',
    answers: [['Yes'], ['No']]
});

bot.get('IDK', message => {
    var filteredRestaurants = json;
    const id = message.chat.id;

    randomQuestion.to(id);
    bot.send(randomQuestion).then(answer => {
        if(answer.text == 'Yes') {
            recursiveRestaurantQuestion(filteredRestaurants, id, null);
        } else {
            serviceQuestion.to(id);
            bot.send(serviceQuestion).then(service => {
                filteredRestaurants = filterRestaurantsBy('service', service.text, filteredRestaurants);
                if(service.text != 'Delivery') {
                    distanceQuestion.to(id);
                    bot.send(distanceQuestion).then(isFar => {
                        if(isFar.text == 'No') {
                            filteredRestaurants = removeFarRestaurants(filteredRestaurants);
                        }

                        cuisineQuestion.to(id);
                        bot.send(cuisineQuestion).then(cuisine => {
                            filteredRestaurants = filterRestaurantsBy('cuisine', cuisine.text, filteredRestaurants);
                            recursiveRestaurantQuestion(filteredRestaurants, id, null);

                        }, () =>{
                            sendInvalidMessage(id);
                        });
                    }, () => {
                        sendInvalidMessage(id);
                    });
                } else {
                    cuisineQuestion.to(id);
                    bot.send(cuisineQuestion).then(cuisine => {
                        filteredRestaurants = filterRestaurantsBy('cuisine', cuisine.text, filteredRestaurants);
                        recursiveRestaurantQuestion(filteredRestaurants, id, null);
                    }, () =>{
                        sendInvalidMessage(id);
                    });
                }
            }, () => {
                sendInvalidMessage(id);
            });
        }
    }, () => {
        sendInvalidMessage(id);
    });
});
