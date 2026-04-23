function extraerIP(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket?.remoteAddress
        || null;
}

function extraerDispositivo(req) {
    return (req.headers['user-agent'] || '').substring(0, 200) || null;
}

module.exports = { extraerIP, extraerDispositivo };
