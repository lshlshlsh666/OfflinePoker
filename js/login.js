document.addEventListener("NewUserLogin", () => {
    document.body.style.flexDirection = "column";
    // 正上方的标题
    const title_div = document.createElement("div");
    title_div.id = "login-title";
    const title = document.createElement("h1");
    title.textContent = "Texas Hold'em";
    title_div.appendChild(title);
    document.body.appendChild(title_div);

    // 创建用户设置容器
    const userSetup = document.createElement("div");
    userSetup.id = "login-user-setup";
    userSetup.classList.add("user-setup");
    
    // 创建用户名输入框
    const usernameInput = document.createElement("input");
    usernameInput.type = "text";
    usernameInput.classList.add("username");
    usernameInput.placeholder = "Username";
    
    // 创建筹码输入框
    const chipsInput = document.createElement("input");
    chipsInput.type = "number";
    chipsInput.classList.add("chips");
    chipsInput.placeholder = "Chips (Default: 1000)";
    
    // 创建开始按钮
    const joinGameButton = document.createElement("button");
    joinGameButton.classList.add("join-game-button");
    joinGameButton.textContent = "Join Game";
    
    // 将输入框和按钮添加到容器中
    userSetup.appendChild(usernameInput);
    userSetup.appendChild(chipsInput);
    userSetup.appendChild(joinGameButton);
    
    // 将容器添加到页面主体
    document.body.appendChild(userSetup);

    // 给按钮添加点击事件监听器
    joinGameButton.addEventListener("click", () => {
        window.username = usernameInput.value;
        let chips = parseInt(chipsInput.value);

        if (!chips) {
            chips = 1000;
        }

        if (window.username) {
            console.log(`用户名: ${window.username}, 筹码: ${chips}`);
            socket.emit("join", { username: window.username, chips: chips, alone: false });
        } else {
            alert("Please enter a username.");
        }
    });
});
