socket.on('UsernameExistsError', () => {
    alert('Username already exists. Please enter a different username.');
});

socket.on("AlreadyRegisteredError", (data) => {
    window.username = data.username;
    alert(`You are already registered as ${window.username}. Redirecting to game...`);
});