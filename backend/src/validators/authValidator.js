const validateLogin = (data) => {
    const { username, password } = data;
    const errors = [];

    if (!username || username.trim().length === 0) {
        errors.push('İstifadəçi adı daxil edilməlidir.');
    }

    if (!password || password.length === 0) {
        errors.push('Şifrə daxil edilməlidir.');
    }

    return errors;
};

module.exports = {
    validateLogin
};
