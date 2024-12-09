const table = document.createElement('div');
table.id = 'table';
table.className = 'table';

const center_container = document.createElement('div');
center_container.className = 'center-container';
center_container.id = 'center-container';

const public_cards = document.createElement('div');
public_cards.className = 'public-cards';
public_cards.id = 'public-cards';
for (let i = 0; i < 5; i++) {
    const card_slot = document.createElement('div');
    card_slot.className = 'pcard-none';
    card_slot.id = `card-slot-${i}`;
    public_cards.appendChild(card_slot);
}

const total_chips_label = document.createElement('div');
total_chips_label.className = 'total-chips';
total_chips_label.id = 'total-chips';

center_container.appendChild(public_cards);
center_container.appendChild(total_chips_label);

table.appendChild(center_container);

let centerX = 0;
let centerY = 0;

let player_username_list = [];

document.addEventListener('InitializeGame', () => {
    const login_title = document.getElementById("login-title");
    if (login_title) {
        login_title.remove();
    }
    const login_user_setup = document.getElementById("login-user-setup");
    if (login_user_setup) {
        login_user_setup.remove();
    }
    if (!document.body.contains(document.getElementById('table'))) {
        document.body.appendChild(table);
    }

    window.update_total_chips_label(0, 0);

    const tableRect = table.getBoundingClientRect();
    centerX = tableRect.width / 2;
    centerY = tableRect.height / 2;

    PositionPlayers();
});

async function PositionPlayers() {
    socket.emit('GetPlayerUsernames');

    player_username_list = await waitForPlayerUsernames(socket);
    const numPlayers = player_username_list.length;

    let index_now = player_username_list.indexOf(window.username) - 1;

    for (let i = 0; i < numPlayers; i++) {
        index_now = (index_now + 1) % numPlayers;
        const player_username = player_username_list[index_now];
        const player_container = document.getElementById('player_container_' + player_username);
        player_container.style.display = 'flex';

        const angle = (i / numPlayers + 1/4) * 2 * Math.PI;
        const x = centerX + centerX * 1.1 * Math.cos(angle);
        const y = centerY + centerY * 1.1 * Math.sin(angle);
        
        player_container.style.left = `${x}px`;
        player_container.style.top = `${y}px`;

        const chip_container = document.getElementById('chip_container_' + player_username);
        
        const x2 = centerX + centerX * 4/5 * Math.cos(angle);
        const y2 = centerY + centerY * 4/5 * Math.sin(angle);
        
        chip_container.style.left = `${x2}px`;
        chip_container.style.top = `${y2}px`;

        const reveal_card_container = document.getElementById('reveal_card_container_' + player_username);

        const angle3 = (i / numPlayers + 18/64) * 2 * Math.PI;
        const x3 = centerX + centerX * 1.2 * Math.cos(angle3);
        const y3 = centerY + centerY * 1.2 * Math.sin(angle3);

        reveal_card_container.style.left = `${x3}px`;
        reveal_card_container.style.top = `${y3}px`;

        const pnl = document.getElementById('pnl_' + player_username);
        
        const angle4 = (i / numPlayers + 15/64) * 2 * Math.PI;
        const x4 = centerX + centerX * 7/6 * Math.cos(angle4);
        const y4 = centerY + centerY * 7/6 * Math.sin(angle4);

        pnl.style.left = `${x4}px`;
        pnl.style.top = `${y4}px`;
        
        table.appendChild(player_container);
        table.appendChild(chip_container);
        table.appendChild(reveal_card_container);
        table.appendChild(pnl);
    }
}

function waitForPlayerUsernames(socket) {
    return new Promise((resolve) => {
        socket.on('PlayerUsernames', (data) => {
            resolve(data['player_usernames']);
        });
    });
}

socket.on('UpdateBetChips', (data) => {
    for (const username in data) {
        const chip_container = document.getElementById('chip_container_' + username);
        chip_container.style.display = 'flex';
        const bet_chip = data[username];
        if (bet_chip === 0) {
            chip_container.style.display = 'none';
        } else {
            chip_container.innerText = bet_chip;
        }
    }

    // 所有chip_container的innerText相加
    let this_round_chips = 0;
    const chip_containers = document.getElementsByClassName('chip-container');
    for (const chip_container of chip_containers) {
        if (chip_container.style.display !== 'none') {
            this_round_chips += parseInt(chip_container.innerText);
        }
    }
    window.update_total_chips_label(this_round_chips);
    
});

socket.on('UpdateCenterZone', (data) => {
    const community_cards = data.community_cards;
    let i = 0;
    for (; i < community_cards.length; i++) {
        const card_slot = document.getElementById(`card-slot-${i}`);
        card_slot.className = window.int_to_card(community_cards[i]);
    }
    for (; i < 5; i++) {
        const card_slot = document.getElementById(`card-slot-${i}`);
        card_slot.className = 'pcard-none';
    }

    const this_round_total_chips = data.this_round_total_chips;
    const prev_total_chips = data.prev_total_chips;
    window.update_total_chips_label(this_round_total_chips, prev_total_chips);
});

socket.on('RoundEnd', (data) => {
    const reveal_waived = data.reveal_waived;
    if (!reveal_waived) {
        const handcards = data.handcards;
        const winners  = data.winners;
        for (let username in handcards) {
            const this_handcards = handcards[username];
            document.getElementById(`reveal_card1_${username}`).className = window.int_to_card(this_handcards[0]);
            document.getElementById(`reveal_card2_${username}`).className = window.int_to_card(this_handcards[1]);
            const reveal_card_container = document.getElementById(`reveal_card_container_${username}`);
            reveal_card_container.style.display = 'flex';
            if (!winners.includes(username)) {
                reveal_card_container.style.opacity = '0.3';
            }
        }
    }

    for (let username in data.pnl) {
        const pnl_text = document.getElementById(`pnl_${username}`);
        const pnl = data.pnl[username];
        pnl_text.style.display = 'flex';
        if (pnl > 0) {
            pnl_text.innerText = `+${pnl}`;
            pnl_text.style.color = 'green';
        } else if (pnl < 0) {
            pnl_text.innerText = pnl
            pnl_text.style.color = 'red';
        } else {
            pnl_text.style.display = 'none';
        }
    }
    socket.emit('initializeRound');
});