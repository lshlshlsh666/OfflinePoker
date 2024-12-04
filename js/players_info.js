let is_initial = true;

socket.on('UpdatePlayerInfo', (data) => {
    if (!window.username) {
        return;
    }
    console.log('UpdatePlayerInfo', data);
    for (const username in data) {
        UpdatePlayerInfo(data[username]);
    }
    if (is_initial) {
        document.dispatchEvent(new CustomEvent("InitializeGame"));
        is_initial = false
    } else {
        PositionPlayers();
    }
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

        const rectangle = document.createElement('div');
        rectangle.id = 'player_chips_' + player.username;
        rectangle.classList.add('rectangle');
        rectangle.textContent = player.chips;

        player_container.appendChild(circle);
        player_container.appendChild(rectangle);

        // Create a chip container for the player
        const chip_container = document.createElement('div');
        chip_container.id = 'chip_container_' + player.username;
        chip_container.classList.add('chip-container');
        chip_container.style.display = 'none';

        document.body.appendChild(player_container);
        document.body.appendChild(chip_container);
    }
    SetPlayerStatus(player_container, player.status);
    if (player.my_turn) {
        console.log('player.my_turn', player.my_turn);
        player_container.classList.add('selected');
    } else {
        player_container.classList.remove('selected');
    }
}

function SetPlayerStatus(player_container, status) {
    if (status in {'unready': 0, 'ready': 0, 'fold': 0, 'allin': 0}) {
        player_container.classList.remove('unready', 'ready', 'fold', 'allin', 'selected');
        player_container.classList.add(status);
    } else if (status === 'selected') {
        player_container.classList.add('selected');
    };
}