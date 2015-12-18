var Bot = require('telegram-api');
var Message = require('telegram-api/types/Message');
var Question = require('telegram-api/types/Question');
var json = require('./restaurants.json');

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
    const id = message.chat.id;

    randomQuestion.to(id).reply(message.message_id);

    function recursiveRestaurantQuestion() {
        const randomRestaurant = new Question({
            text: 'How about ' + json[Math.floor(Math.random()*json.length)].name + '?',
            answers: [['Yes'], ['No']]
        });

        randomRestaurant.to(id).reply(message.message_id);
        bot.send(randomRestaurant).then(answer => {
            if(answer.text == 'Yes') {
                const msg = new Message().to(id).text('Enjoy your meal!');
                bot.send(msg);
            } else {
                recursiveRestaurantQuestion();
            }
        }, () => {
            const msg = new Message().to(id).text('Invalid answer');
            bot.send(msg);
        });
    }

    bot.send(randomQuestion).then(answer => {
        if(answer.text == 'Yes') {
            recursiveRestaurantQuestion();
        } else {
            const msg = new Message().to(id).text('Ability to filter by other parameters coming soon. For now enjoy getting random restaurant suggestions.\n\n' +
            'If you want to make a bot like me, check out my source!\n' +
            'https://github.com/michaeljdeeb/indecisive-bot');
            bot.send(msg);
        }
    }, () => {
        const msg = new Message().to(id).text('Invalid answer');
        bot.send(msg);
    });
});
