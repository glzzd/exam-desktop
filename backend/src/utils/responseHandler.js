const successResponse = (res, data, message = 'Əməliyyat uğurla tamamlandı', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const errorResponse = (res, message = 'Xəta baş verdi', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        details
    });
};

module.exports = {
    successResponse,
    errorResponse
};