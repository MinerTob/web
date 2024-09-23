const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http'); // 添加 http 模块
const axios = require('axios');

const app = express();
const port = process.env.PORT || 443;

// HCaptcha 的私密密钥
const HCAPTCHA_SECRET_KEY = 'e68091ba-9876-48f4-bd9a-56fe480810a8'; // 替换为您的新密钥

// 使用内置中间件解析 JSON 请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建 HTTP 服务器并重定向到 HTTPS
const httpServer = http.createServer(app);
httpServer.listen(80, () => {
    console.log("HTTP 服务器正在监听端口 80，并重定向到 HTTPS");
    
    httpServer.on('request', (req, res) => {
        res.writeHead(301, { "Location": `https://${req.headers.host}${req.url}` });
        res.end();
    });
});

// 提供根目录下的 HTML 和其他静态文件
app.use(express.static(__dirname));

// 默认首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 检查邮箱是否存在的路由
app.post('/check-email-existence', (req, res) => {
    const email = req.body.email;
    const passwordFile = path.join(__dirname, 'password', 'password.txt');

    if (fs.existsSync(passwordFile)) {
        const data = fs.readFileSync(passwordFile, 'utf-8');
        const lines = data.split('\n');

        for (let line of lines) {
            if (line.includes(`Email: ${email}`)) {
                return res.status(409).send('账户已存在'); // 邮箱已被注册
            }
        }
    }
    
    return res.send('邮箱可用'); // 邮箱未被注册
});

// 处理注册请求
app.post('/register', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const hcaptchaResponse = req.body['h-captcha-response'];

    // 验证 HCaptcha（可选）
    if (hcaptchaResponse) {
        try {
            const hcaptchaVerificationResponse = await axios.post(`https://hcaptcha.com/siteverify`, null, {
                params: {
                    secret: HCAPTCHA_SECRET_KEY,
                    response: hcaptchaResponse,
                },
            });

            // 检查验证结果
            if (!hcaptchaVerificationResponse.data.success) {
                return res.status(403).send('hCaptcha 验证失败，请重新尝试。');
            }
        } catch (error) {
            console.error('hCaptcha 验证错误:', error);
            return res.status(500).send('内部服务器错误');
        }
    }

    const passwordDir = path.join(__dirname, 'password');
    const passwordFile = path.join(passwordDir, 'password.txt');

    // 确保目录存在
    if (!fs.existsSync(passwordDir)) {
        fs.mkdirSync(passwordDir);
    }

    const userData = `Email: ${email}, Password: ${password}\n`;
    fs.appendFile(passwordFile, userData, (err) => {
        if (err) {
            console.error("写入文件时出现错误:", err);
            return res.status(500).send('服务器内部错误');
        }
        res.send('注册成功！');
    });
});

// 处理登录请求
app.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const hcaptchaResponse = req.body['h-captcha-response'];

    // 验证 HCaptcha（可选）
    if (hcaptchaResponse) {
        try {
            const hcaptchaVerificationResponse = await axios.post(`https://hcaptcha.com/siteverify`, null, {
                params: {
                    secret: HCAPTCHA_SECRET_KEY,
                    response: hcaptchaResponse,
                },
            });

            // 检查验证结果
            if (!hcaptchaVerificationResponse.data.success) {
                return res.status(403).send('hCaptcha 验证失败，请重新尝试。');
            }
        } catch (error) {
            console.error('hCaptcha 验证错误:', error);
            return res.status(500).send('内部服务器错误');
        }
    }

    const passwordFile = path.join(__dirname, 'password', 'password.txt');

    if (!fs.existsSync(passwordFile)) {
        return res.status(404).send('账户不存在');
    }

    // 读取文件并验证账户
    const data = fs.readFileSync(passwordFile, 'utf-8');
    const lines = data.split('\n');
    let found = false;

    for (let line of lines) {
        if (line.includes(`Email: ${email}`)) {
            found = true;
            const savedPassword = line.split(', Password: ')[1]?.trim();
            if (savedPassword === password) {
                return res.send('登录成功！');
            } else {
                return res.status(401).send('密码错误');
            }
        }
    }

    if (!found) {
        return res.status(404).send('账户不存在');
    }
});

// 处理重置密码请求
app.post('/reset-password', async (req, res) => {
    const email = req.body.email;
    const newPassword = req.body.newPassword;
    
    // 检查新密码是否为空
    if (!newPassword) {
        return res.status(400).send('新密码不能为空');
    }

    const passwordFile = path.join(__dirname, 'password', 'password.txt');

    if (!fs.existsSync(passwordFile)) {
        return res.status(404).send('账户不存在');
    }

    // 读取文件并验证账户
    const data = fs.readFileSync(passwordFile, 'utf-8');
    const lines = data.split('\n');
    let updated = false;

    // 检查邮箱是否存在，并更新密码
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`Email: ${email}`)) {
            lines[i] = `Email: ${email}, Password: ${newPassword}`; // 更新密码
            updated = true;
            break;
        }
    }

    // 如果未找到该邮箱，则返回“账户不存在”消息
    if (!updated) {
        return res.status(404).send('账户不存在');
    }

    // 将更新后的数据写回文件
    fs.writeFileSync(passwordFile, lines.join('\n'));
    res.send('密码重置成功！');
});

// 加载 SSL 证书
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key', 'Nginx', 'privkey.key')), // 私钥路径
    cert: fs.readFileSync(path.join(__dirname, 'key', 'Nginx', 'fullchain.pem')) // 证书路径
};

// 启动 HTTPS 服务器，绑定到特定 IP 地址
const hostname = '192.168.200.102'; // 绑定到特定 IP 地址
https.createServer(sslOptions, app).listen(port, hostname, () => {
    console.log(`HTTPS 服务器正在运行，访问 https://${hostname}:${port}`);
});
