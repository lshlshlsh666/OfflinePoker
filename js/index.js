
fetch('./ip.json') // 替换为你的 JSON 文件路径
    .then(response => response.json())
    .then(data => {
        // 将 JSON 数据赋值给变量
        window.ip = data.ip;
        window.port = data.port;
    })
    .catch(error => {
        console.error('加载 JSON 文件时出错:', error);
    });