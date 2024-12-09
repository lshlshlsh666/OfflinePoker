let current_max_chip = 20;
let big_blind_username;
let big_blind_required;
let my_max_chip;

socket.on("UpdateRoundInfo", (data) => {
    current_max_chip = data.current_max_chip;

    if (data.big_blind_username) {
        big_blind_username = data.big_blind_username;
        big_blind_required = data.big_blind_required;
    }
});

document.addEventListener('InitializeGame', () => {
    const exit_button = document.createElement('button');
    exit_button.id = 'exit-button';
    exit_button.textContent = 'X';
    exit_button.classList.add('exit-button');
    console.log('exit_button', exit_button);
    exit_button.addEventListener('click', () => {
        if (confirm('Are you sure you want to leave the game?')) {
            socket.emit('exit', {username: window.username});
        }
    });
    document.body.appendChild(exit_button);

    const handcards = document.createElement('div');
    handcards.id = 'handcards';
    handcards.className = 'handcards';

    for (let i = 0; i < 2; i++) {
        const card_slot = document.createElement('div');
        card_slot.id = `handcard-slot-${i}`;
        card_slot.className = 'pcard-none';
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
    betInput.type = 'range'; // 设置 input 类型为 range
    betInput.min = 20;
    betInput.max = 100000;
    betInput.step = 20;
    betInput.value = 20;
    betInput.className = 'bet-input';
    betInput.id = 'bet-input';

    const betInputText = document.createElement('div');
    betInputText.textContent = '20';
    betInputText.className = 'bet-input-text';
    betInputText.id = 'bet-input-text';

    betInput.addEventListener('input', function () {
        updateBetValue(this.value); // 调用 updateBetValue 函数
    });


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
    buttonContainer.appendChild(betInputText);
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

function updateBetValue(value) {
    document.getElementById("bet-input-text").textContent = value;
    if (value == my_max_chip) {
        document.getElementById('bet-button').innerText = 'All in';
    } else {
        document.getElementById('bet-button').innerText = 'Bet';
    }
}

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
            my_max_chip = me.chips + me.current_bet;
            if (me.my_turn) {
                buttonContainer.classList.remove('disabled');
            } else {
                buttonContainer.classList.add('disabled');
            }

            const call_button = document.getElementById('call-button');
            if (my_max_chip <= current_max_chip) {
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
            bet_input.max = my_max_chip;

            if (next_available_bet >= my_max_chip) {
                bet_input.disabled = true;
                bet_input.min = my_max_chip;
                document.getElementById('bet-button').innerText = 'All in';
            } else {
                bet_input.disabled = false;
                document.getElementById('bet-button').innerText = 'Bet';
            }
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