const table = document.createElement('div');
table.id = 'table';
table.className = 'table';

const public_cards = document.createElement('div');
public_cards.className = 'public-cards';
for (let i = 0; i < 5; i++) {
    const card_slot = document.createElement('div');
    card_slot.className = 'card-slot';
    card_slot.id = `card-slot-${i}`;
    public_cards.appendChild(card_slot);
}

table.appendChild(public_cards);

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
    document.body.appendChild(table);

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

        const angle = (i / numPlayers) * 2 * Math.PI;
        const x = centerX + centerX * Math.cos(angle);
        const y = centerY + centerY * Math.sin(angle);
        
        player_container.style.left = `${x}px`;
        player_container.style.top = `${y}px`;

        const chip_container = document.getElementById('chip_container_' + player_username);

        const x2 = centerX + centerX * 5/6 * Math.cos(angle);
        const y2 = centerY + centerY * 5/6 * Math.sin(angle);

        chip_container.style.left = `${x2}px`;
        chip_container.style.top = `${y2}px`;
        
        table.appendChild(player_container);
        table.appendChild(chip_container);
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
        chip_container.innerText = data[username];
    }
});