const express = require('express');
const cors = require('cors');
const oauthRoutes = require('./oauth/oauthRoutes');
const salesforceRoutes = require('./salesforce/salesforceRoutes');
//const linkedinRoutes = require('./linkedin/linkedinRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', oauthRoutes);
app.use('/salesforce', salesforceRoutes);
//app.use('/linkedin', linkedinRoutes);

// ... rest of your app setup ...

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
