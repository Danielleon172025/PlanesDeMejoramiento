export const isProduction = process.env.NODE_ENV === 'production';

export const sendServerError = (res, publicMessage, error) => {
    if (!isProduction) {
        console.error(publicMessage, error);
    } else {
        console.error(publicMessage);
    }

    const payload = { error: publicMessage };
    if (!isProduction) {
        payload.message = error?.message || 'Unknown error';
    }

    return res.status(500).json(payload);
};
