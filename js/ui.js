let current_max_chip = 20;
let big_blind_username;
let big_blind_required;

socket.on("UpdateRoundInfo", (data) => {
    current_max_chip = data.current_max_chip;

    if (data.big_blind_username) {
        big_blind_username = data.big_blind_username;
        big_blind_required = data.big_blind_required;
    }
});

document.addEventListener('InitializeGame', () => {
    const handcards = document.createElement('div');
    handcards.id = 'handcards';
    handcards.className = 'handcards';

    for (let i = 0; i < 2; i++) {
        const card_slot = document.createElement('div');
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
        ready_button.textContent = "Ready!";
        ready_button.disabled = true; // 禁用按钮，防止重复点击
        ready_button.style.backgroundColor = "#32CD32"; // 改为绿色表示已准备

        // 更新玩家状态
        socket.emit("ready", {username: window.username});
    });

    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('op-button-container');
    buttonContainer.id = 'op-button-container';
    buttonContainer.style.display = 'none';

    // Create 'Call' button
    const button1 = document.createElement('button');
    button1.classList.add('op-button');
    button1.id = 'call-button';
    button1.innerText = 'Call';
    button1.onclick = function () {
        socket.emit('call', {username: window.username});
    };

    const betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.min = 10;
    betInput.max = 100000;
    betInput.step = 10;
    betInput.value = 10;
    betInput.classList.add('bet-input');
    betInput.id = 'bet-input';

    const button2 = document.createElement('button');
    button2.id = 'bet-button';
    button2.innerText = 'Bet';
    button2.classList.add('op-button');
    button2.onclick = function () {
        const betValue = betInput.value;
        if (betValue) {
            console.log('下注按钮点击，下注金额：', betValue);
            socket.emit('bet', {username: window.username, chips: betValue});
        } else {
            console.log('跟注按钮点击，无输入金额');
        }
    };

    
    // Create 'Fold' button
    const button3 = document.createElement('button');
    button3.id = 'fold-button';
    button3.innerText = 'Fold';
    button3.classList.add('op-button');
    button3.onclick = function () {
        console.log('弃牌按钮点击');
        socket.emit('fold', {username: window.username});
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
        handcard_slot.className = window.int_to_card(handcards[i]);
    }
}

socket.on('UpdatePlayerInfo', (data) => {
    document.addEventListener('After_UpdatePlayerInfo', () => {
        const buttonContainer = document.getElementById('op-button-container');
        const me = data[window.username];
        if (me && buttonContainer && (data.is_playing === undefined || data.is_playing)) {
            if (me.my_turn) {
                buttonContainer.classList.remove('disabled');
            } else {
                buttonContainer.classList.add('disabled');
            }

            const call_button = document.getElementById('call-button');
            if (me.chips <= current_max_chip) {
                call_button.innerText = 'All in';
            } else if (me.username === big_blind_username && current_max_chip === big_blind_required && document.getElementById('card-slot-0').className == 'pcard-none') {
                call_button.innerText = 'Check';
            } else if (current_max_chip === 0) {
                call_button.innerText = 'Check';
            } else {
                call_button.innerText = 'Call';
            }

            const bet_input = document.getElementById('bet-input');
            const next_available_bet = current_max_chip === 0 ? 20 : current_max_chip * 2;
            bet_input.min = next_available_bet;
            bet_input.value = next_available_bet;
            bet_input.max = me.chips;
        }
    });
});

socket.on('RoundEnd', (data) => {
    const ready_button = document.getElementById('ready-button');
    ready_button.style.display = 'flex';
    ready_button.textContent = 'Ready?';
    ready_button.classList.add("ready-button");
    ready_button.disabled = false;
    document.querySelector('.op-button-container').style.display = 'none';
});