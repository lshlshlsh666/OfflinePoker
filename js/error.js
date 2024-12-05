socket.on('UsernameExistsError', () => {
    alert('Username already exists. Please enter a different username.');
});

socket.on("AlreadyRegisteredError", (data) => {
    window.username = data.username;
    alert(`You are already registered as ${window.username}. Redirecting to game...`);
});

socket.on('WrongbetChipsError', (data) => {
    const min_bet = data.min_bet;
    const max_bet = data.max_bet;
    alert(`Please enter a number between ${min_bet} and ${max_bet}!`);
});