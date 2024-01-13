const pool = require('./db');

const saveToken = async (salesforceId, accessToken, refreshToken, instanceUrl) => {
    await pool.query(
        'INSERT INTO oauth_tokens (salesforce_id, access_token, refresh_token, instance_url) VALUES ($1, $2, $3, $4) ON CONFLICT (salesforce_id) DO UPDATE SET access_token = $2, refresh_token = $3, instance_url = $4',
        [salesforceId, accessToken, refreshToken, instanceUrl]
    );
};


const getToken = async (salesforceId) => {
    const result = await pool.query(
        'SELECT access_token, instance_url FROM oauth_tokens WHERE salesforce_id = $1',
        [salesforceId]
    );
    return result.rows[0] ? {
        accessToken: result.rows[0].access_token,
        instanceUrl: result.rows[0].instance_url
    } : null;
};


module.exports = {
    saveToken,
    getToken,
};