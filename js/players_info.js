let is_initial = true;

socket.on('UpdatePlayerInfo', (data) => {
    if (!window.username) {
        return;
    }
    for (const username in data) {
        UpdatePlayerInfo(data[username]);
    }
    if (is_initial) {
        document.dispatchEvent(new CustomEvent("InitializeGame"));
        is_initial = false
    } else {
        PositionPlayers();
    }
    document.dispatchEvent(new CustomEvent('After_UpdatePlayerInfo'));
});

function UpdatePlayerInfo(player) {
    let player_container = document.getElementById('player_container_' + player.username);
    if (player_container) {
        const player_chips = document.getElementById('player_chips_' + player.username);
        player_chips.textContent = player.chips;
    } else {
        player_container = document.createElement('div');
        player_container.id = 'player_container_' + player.username;
        player_container.classList.add('container');
        player_container.style.display = 'none';

        const circle = document.createElement('div');
        circle.classList.add('circle');
        circle.textContent = player.username;

        if (!(player.username === window.username)) {
            circle.addEventListener('click', () => {
                if (confirm("Are you sure you want to kick this player?")) {
                    socket.emit('exit', {username: player.username});
                }
            });
        }
        
        const rectangle = document.createElement('div');
        rectangle.id = 'player_chips_' + player.username;
        rectangle.classList.add('rectangle');
        rectangle.textContent = player.chips;

        // Create a role letter for the player
        const role_letter = document.createElement('div');
        role_letter.id = 'role_letter_' + player.username;
        role_letter.classList.add('role_letter');
        role_letter.textContent = '1000';
        
        player_container.appendChild(circle);
        player_container.appendChild(rectangle);
        player_container.appendChild(role_letter);

        // Create a chip container for the player
        const chip_container = document.createElement('div');
        chip_container.id = 'chip_container_' + player.username;
        chip_container.classList.add('chip-container');
        chip_container.style.display = 'none';

        // Create a reveal card container for the player
        const reveal_card_container = document.createElement('div');
        reveal_card_container.id = 'reveal_card_container_' + player.username;
        reveal_card_container.classList.add('reveal_card_container');
        const reveal_card1 = document.createElement('div');
        reveal_card1.classList.add('pcard-none');
        reveal_card1.id = 'reveal_card1_' + player.username;
        const reveal_card2 = document.createElement('div');
        reveal_card2.classList.add('pcard-none');
        reveal_card2.id = 'reveal_card2_' + player.username;
        reveal_card_container.appendChild(reveal_card1);
        reveal_card_container.appendChild(reveal_card2);
        reveal_card_container.style.display = 'none';

        // Create a pnl text for the player
        const pnl_text = document.createElement('div');
        pnl_text.id = 'pnl_' + player.username;
        pnl_text.classList.add('pnl_text');
        pnl_text.style.display = 'none';

        document.body.appendChild(player_container);
        document.body.appendChild(chip_container);
        document.body.appendChild(reveal_card_container);
        document.body.appendChild(pnl_text);
    }
    SetPlayerStatus(player_container, player.status);
    if (player.my_turn) {
        player_container.classList.add('selected');
    } else {
        player_container.classList.remove('selected');
    }
    SetPlayerRole(player.username, player.role);
}

function SetPlayerStatus(player_container, status) {
    player_container.classList.remove('unready', 'ready', 'fold', 'allin');
    player_container.classList.add(status);
}

function SetPlayerRole(username, role) {
    const role_letter = document.getElementById('role_letter_' + username);
    if (!role_letter) {
        return;
    }
    console.log('SetPlayerRole', username, role);
    switch (role) {
        case 'small_blind':
            role_letter.textContent = 'SB';
            break;
        case 'big_blind':
            role_letter.textContent = 'BB';
            break;
        case 'dealer':
            role_letter.textContent = 'D';
            break;
        default:
            role_letter.textContent = '';
            break;
    }
}

socket.on('RemovePnl', (data) => {
    for (let username of data.username) {
        const pnl_text = document.getElementById(`pnl_${username}`);
        pnl_text.style.display = 'none';
    }
});

socket.on('RemovePlayer', (data) => {
    for (let username of data.dead_players) {
        const player_container = document.getElementById(`player_container_${username}`);
        player_container.style.display = 'none';
        const chip_container = document.getElementById(`chip_container_${username}`);
        chip_container.style.display = 'none';
        const reveal_card_container = document.getElementById(`reveal_card_container_${username}`);
        reveal_card_container.style.display = 'none';
        const pnl_text = document.getElementById(`pnl_${username}`);
        pnl_text.style.display = 'none';
    }
});
