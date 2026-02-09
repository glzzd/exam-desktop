const validateUserCreation = (data) => {
    if (!data) {
        return ['Məlumatlar daxil edilməlidir.'];
    }
    
    const { username, firstName, lastName, gender, password } = data;
    const errors = [];

    if (!username || username.trim().length < 3) {
        errors.push('İstifadəçi adı ən azı 3 simvol olmalıdır.');
    }

    if (!firstName || firstName.trim().length === 0) {
        errors.push('Ad daxil edilməlidir.');
    }

    if (!lastName || lastName.trim().length === 0) {
        errors.push('Soyad daxil edilməlidir.');
    }

    if (!gender || !['male', 'female', 'other'].includes(gender)) {
        errors.push('Cins düzgün seçilməyib (male, female, other).');
    }

    if (!password || password.length < 8) {
        errors.push('Şifrə ən azı 8 simvol olmalıdır.');
    }

    return errors;
};

const validateUserUpdate = (data) => {
    if (!data) {
        return ['Məlumatlar daxil edilməlidir.'];
    }

    const { username, password, gender } = data;
    const errors = [];

    if (username && username.trim().length < 3) {
        errors.push('İstifadəçi adı ən azı 3 simvol olmalıdır.');
    }

    if (password && password.length < 8) {
        errors.push('Şifrə ən azı 8 simvol olmalıdır.');
    }

    if (gender && !['male', 'female', 'other'].includes(gender)) {
        errors.push('Cins düzgün seçilməyib (male, female, other).');
    }

    return errors;
};

module.exports = {
    validateUserCreation,
    validateUserUpdate
};