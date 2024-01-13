// salesforce/salesforceReports.js

const axios = require('axios');
const {getToken} = require('../tokenService')

const fetchReports = async (salesforceId) => {
    try {
        const credentials = await getToken(salesforceId);
        if (!credentials) {
            throw new Error('No credentials found for the provided Salesforce ID');
        }
        const response = await axios.get(`${credentials.instanceUrl}/services/data/v35.0/analytics/reports`, {
            headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Salesforce reports:', error);
        throw error;
    }
};

module.exports = {
    fetchReports,
};
