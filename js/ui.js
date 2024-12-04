const rank_map = {
    0: '2',
    1: '3',
    2: '4',
    3: '5',
    4: '6',
    5: '7',
    6: '8',
    7: '9',
    8: '10',
    9: 'j',
    10: 'q',
    11: 'k',
    12: 'a'
}

const suit_map = {
    0: 's',
    1: 'h',
    2: 'd',
    3: 'c'
}

function int_to_card(card_index) {
    const rank = rank_map[card_index % 13];
    const suit = suit_map[Math.floor(card_index / 13)];
    return `pcard-${rank}${suit}`
}

// import { int_to_card } from './utils.js'

document.addEventListener('InitializeGame', () => {
    const handcards = document.createElement('div');
    handcards.id = 'handcards';
    handcards.className = 'handcards';

    for (let i = 0; i < 2; i++) {
        const card_slot = document.createElement('div');
        card_slot.className = 'card-slot';
        card_slot.id = `handcard-slot-${i}`;
        handcards.appendChild(card_slot);
    }

    document.body.appendChild(handcards);

    const ready_button = document.createElement('button');
    ready_button.id = 'ready-button';
    ready_button.textContent = 'Ready?';
    ready_button.classList.add("ready-button");
    document.body.appendChild(ready_button);

    ready_button.addEventListener("click", function () {
        console.log("玩家已准备！");
        ready_button.textContent = "Ready!";
        ready_button.disabled = true; // 禁用按钮，防止重复点击
        ready_button.style.backgroundColor = "#32CD32"; // 改为绿色表示已准备

        // 更新玩家状态
        socket.emit("ready", {username: window.username});
    });

    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('op-button-container');
    buttonContainer.style.display = 'none';

    // Create 'Call' button
    const button1 = document.createElement('button');
    button1.classList.add('op-button');
    button1.innerText = 'Call';
    button1.onclick = function () {
        window.socket.emit('call', {username: window.username});
    };

    const betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.min = 5;
    betInput.max = 100000;
    betInput.step = 5;
    betInput.placeholder = 'Enter bet';
    betInput.classList.add('bet-input');

    const button2 = document.createElement('button');
    button2.innerText = 'Bet';
    button2.classList.add('op-button');
    button2.onclick = function () {
        const betValue = betInput.value;
        if (betValue) {
            console.log('下注按钮点击，下注金额：', betValue);
            window.socket.emit('bet', {username: window.username, chips: betValue});
        } else {
            console.log('跟注按钮点击，无输入金额');
        }
    };

    
    // Create 'Fold' button
    const button3 = document.createElement('button');
    button3.innerText = 'Fold';
    button3.classList.add('op-button');
    button3.onclick = function () {
        console.log('弃牌按钮点击');
        window.socket.emit('fold', {username: window.username});
    };
    
    // Append buttons to the container
    buttonContainer.appendChild(button1);
    buttonContainer.appendChild(betInput);
    buttonContainer.appendChild(button2);
    buttonContainer.appendChild(button3);

    document.body.appendChild(buttonContainer);

});


socket.on("GameStarted", () => {
    console.log("游戏开始！");
    document.getElementById('ready-button').style.display = 'none';
    document.querySelector('.op-button-container').style.display = 'flex';
});


socket.on('UpdateUI', (data) => {
    console.log('UpdateUI', data);

    const is_ready = data['is_ready'];
    const is_playing = data['is_playing'];
    if (is_playing) {
        document.getElementById('ready-button').style.display = 'none';
        document.querySelector('.op-button-container').style.display = 'flex';
    } else if (is_ready) {
        document.getElementById('ready-button').textContent = 'Ready!';
        document.getElementById('ready-button').disabled = true;
        document.getElementById('ready-button').style.backgroundColor = '#32CD32';
    }

    const handcards = data['handcards'];
    if (handcards) {
        load_handcards(handcards);
    }
});

socket.on('DealtCards', (data) => {
    console.log("Dealt cards");

    const handcards = data['cards'];
    load_handcards(handcards);
});

function load_handcards(handcards) {
    for (let i = 0; i < 2; i++) {
        const handcard_slot = document.getElementById(`handcard-slot-${i}`);
        const card = int_to_card(handcards[i]);
        handcard_slot.classList.remove('pcard-back')
        handcard_slot.classList.add(card)
    }
}