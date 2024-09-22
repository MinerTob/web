document.addEventListener("DOMContentLoaded", function() {
    const registerForm = document.querySelector('#register-form');
    const loginForm = document.querySelector('#login-form');
    const rememberMeCheckbox = document.querySelector('#remember_me');

    // 注册表单逻辑
    if (registerForm) {
        const emailInput = registerForm.querySelector('input[type="email"]');
        const passwordInputs = registerForm.querySelectorAll('input[type="password"]');
        const confirmPasswordInput = registerForm.querySelector('input[name="confirmPassword"]'); // 添加确认密码输入框的选择

        // 实时检查输入 - 电子邮箱
        emailInput.addEventListener("input", function() {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value)) {
                emailInput.setCustomValidity("请输入有效的电子邮箱格式！");
            } else {
                emailInput.setCustomValidity(""); // 清除错误信息
            }
        });

        // 实时检查输入 - 密码
        passwordInputs.forEach(input => {
            input.addEventListener("input", function() {
                const password = passwordInputs[0].value; // 获取密码输入框的值
                const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/; // 密码复杂性正则表达式
                if (!passwordPattern.test(password)) {
                    input.setCustomValidity("密码必须至少包含8个字符，包括一个大写字母、一个小写字母、一个数字和一个特殊字符。");
                } else {
                    input.setCustomValidity(""); // 清除错误信息
                }

                // 检查确认密码是否一致
                if (confirmPasswordInput.value && confirmPasswordInput.value !== password) {
                    confirmPasswordInput.setCustomValidity("两次输入的密码不一致，请检查！");
                } else {
                    confirmPasswordInput.setCustomValidity(""); // 清除错误信息
                }
            });
        });

        // 确认密码输入框的事件监听
        confirmPasswordInput.addEventListener("input", function() {
            const password = passwordInputs[0].value;
            if (confirmPasswordInput.value !== password) {
                confirmPasswordInput.setCustomValidity("两次输入的密码不一致，请检查！");
            } else {
                confirmPasswordInput.setCustomValidity(""); // 清除错误信息
            }
        });

        // 注册表单提交事件
        registerForm.addEventListener("submit", function(event) {
            event.preventDefault(); // 阻止默认提交行为

            const email = emailInput.value;
            const password = passwordInputs[0].value;
            const confirmPassword = confirmPasswordInput.value;

            // 检查两次密码是否一致
            if (password !== confirmPassword) {
                alert("两次输入的密码不一致，请检查！");
                return;
            }

            // 检查邮箱是否已被注册
            fetch('/check-email-existence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }), // 将数据转换为JSON格式
            })
            .then(response => {
                if (response.ok) {
                    // 邮箱未被注册，继续进行注册
                    fetch('/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password }), // 将数据转换为JSON格式
                    })
                    .then(response => {
                        if (response.ok) {
                            // 将邮箱存储到 localStorage
                            localStorage.setItem('rememberedEmail', email);
                            alert("注册成功！");
                            window.location.href = "secondindex.html"; // 跳转到指定地址
                        } else {
                            alert("注册失败，请重试！");
                        }
                    })
                    .catch(error => {
                        console.error("发生错误：", error);
                        alert("注册过程中发生错误，请稍后重试！");
                    });
                } else {
                    alert("账户已存在，请使用其他邮箱！");
                }
            })
            .catch(error => {
                console.error("检查邮箱存在性时发生错误：", error);
                alert("检查电子邮箱时发生错误，请稍后重试！");
            });
        });
    }

    // 登录功能逻辑
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault(); // 阻止默认提交行为

            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            // 确保邮箱和密码不为空
            if (email && password) {
                // 发送登录信息到服务器
                fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }), // 将数据转换为JSON格式
                })
                .then(response => {
                    if (response.ok) {
                        // 如果“记住我”被勾选，则保存邮箱和密码
                        if (rememberMeCheckbox.checked) {
                            localStorage.setItem('rememberedEmail', email);
                            localStorage.setItem('rememberedPassword', password); // 注意: 存储密码并不安全，谨慎使用
                        } else {
                            // 如果没有勾选，则清除已保存的内容
                            localStorage.removeItem('rememberedEmail');
                            localStorage.removeItem('rememberedPassword');
                        }
                        alert("登录成功！");
                        window.location.href = "secondindex.html"; // 跳转到指定地址
                    } else {
                        return response.text().then(text => { throw new Error(text); });
                    }
                })
                .catch(error => {
                    alert(error.message); // 显示账户不存在或密码错误信息
                });
            } else {
                alert("请输入有效的电子邮件和密码！");
            }
        });

        // 尝试获取上次登录保存的邮箱和密码
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const rememberedPassword = localStorage.getItem('rememberedPassword');
        if (rememberedEmail) {
            loginForm.querySelector('input[type="email"]').value = rememberedEmail;
            rememberMeCheckbox.checked = true; // 勾选“记住我”框
        }
        if (rememberedPassword) {
            loginForm.querySelector('input[type="password"]').value = rememberedPassword; // 注意：此处实现仅供参考，通常密码不应被存储和直接显示
        }
    }

    // 重置密码功能
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        const resetEmailInput = resetPasswordForm.querySelector('input[type="email"]');
        const newPasswordInputs = resetPasswordForm.querySelectorAll('input[type="password"]');
        const resetConfirmPasswordInput = newPasswordInputs[1]; // 确认新密码输入框

        // 实时检查输入 - 新密码
        newPasswordInputs[0].addEventListener("input", function() {
            const newPassword = newPasswordInputs[0].value; // 获取新密码输入框的值
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/; // 更新密码复杂性正则表达式
            if (!passwordPattern.test(newPassword)) {
                newPasswordInputs[0].setCustomValidity("密码必须至少包含8个字符，包括一个大写字母、一个小写字母、一个数字和一个特殊字符。");
            } else {
                newPasswordInputs[0].setCustomValidity(""); // 清除错误信息
            }

            // 检查确认密码是否一致
            if (resetConfirmPasswordInput.value && resetConfirmPasswordInput.value !== newPassword) {
                resetConfirmPasswordInput.setCustomValidity("两次输入的密码不一致，请检查！");
            } else {
                resetConfirmPasswordInput.setCustomValidity(""); // 清除错误信息
            }
        });

        // 确认新密码输入框的事件监听
        resetConfirmPasswordInput.addEventListener("input", function() {
            const newPassword = newPasswordInputs[0].value;
            if (resetConfirmPasswordInput.value !== newPassword) {
                resetConfirmPasswordInput.setCustomValidity("两次输入的密码不一致，请检查！");
            } else {
                resetConfirmPasswordInput.setCustomValidity(""); // 清除错误信息
            }
        });

        // 重置密码表单提交事件
        resetPasswordForm.addEventListener("submit", function(event) {
            event.preventDefault(); // 阻止默认提交行为

            const email = resetEmailInput.value;
            const newPassword = newPasswordInputs[0].value;
            const confirmPassword = resetConfirmPasswordInput.value;

            // 简单验证邮箱和密码是否输入
            if (email && newPassword && confirmPassword) {
                if (newPassword !== confirmPassword) {
                    alert("两次输入的密码不一致，请检查！");
                    return;
                }

                // 发送重置密码信息到服务器
                fetch('/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, newPassword }), // 将数据转换为JSON格式
                })
                .then(response => {
                    if (response.ok) {
                        alert("密码重置成功！请使用新密码登录。");
                        window.location.href = "login.html"; // 定向到登录页面
                    } else {
                        return response.text().then(text => { throw new Error(text); });
                    }
                })
                .catch(error => {
                    alert(error.message); // 显示账户不存在信息
                });
            } else {
                alert("请输入有效的电子邮箱和密码！");
            }
        });
    }

    // 动态链接切换
    const registerLink = document.querySelector('a[href="#register"]');
    const loginLink = document.querySelector('a[href="#login"]');
    const resetLink = document.querySelector('a[href="#reset"]');

    // 切换到注册页面
    if (registerLink) {
        registerLink.addEventListener("click", function(event) {
            event.preventDefault();
            window.location.href = "register.html"; 
        });
    }

    // 切换到登录页面
    if (loginLink) {
        loginLink.addEventListener("click", function(event) {
            event.preventDefault();
            window.location.href = "login.html"; 
        });
    }

    // 切换到重置密码页面
    if (resetLink) {
        resetLink.addEventListener("click", function(event) {
            event.preventDefault();
            window.location.href = "resetPassword.html"; 
        });
    }
});
