const axios = require('axios');
require('dotenv').config();
const querystring = require('querystring');
const {saveToken} = require('../tokenService')

const salesforceOAuth = {
  redirectToSalesforce: (req, res) => {
    const queryParams = querystring.stringify({
      response_type: 'code',
      client_id: process.env.SF_CLIENT_ID,
      redirect_uri: process.env.SF_REDIRECT_URI
    });
    res.redirect(`https://login.salesforce.com/services/oauth2/authorize?${queryParams}`);
  },

  handleCallback: async (req, res) => {
    const { code } = req.query;
    try {
      const tokenResponse = await axios.post(
        'https://login.salesforce.com/services/oauth2/token',
        querystring.stringify({
          code,
          grant_type: 'authorization_code',
          client_id: process.env.SF_CLIENT_ID,
          client_secret: process.env.SF_CLIENT_SECRET,
          redirect_uri: process.env.SF_REDIRECT_URI,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      // Store the access token and refresh token securely
      const { access_token, refresh_token, instance_url, id: salesforce_id } = tokenResponse.data;

      // Save the token data
      await saveToken(salesforce_id, access_token, refresh_token, instance_url);

      console.log('Access Token, Refresh Token, and Instance URL saved successfully');
      //console.log('Refresh Token:', tokenResponse.data.refresh_token);

      //res.send('Authentication successful');
      res.redirect(`http://localhost:3000/reports?salesforceId=${encodeURIComponent(salesforce_id)}`);
    } catch (error) {
      console.error('Error during authentication:', error.response ? error.response.data : error);
      res.status(500).send('Authentication failed');
    }
  },
};

module.exports = salesforceOAuth;
