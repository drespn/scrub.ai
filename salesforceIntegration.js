require('dotenv').config();
const { exec } = require('child_process');

//access credentials
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD = process.env.SF_PASSWORD;
const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_URL = process.env.SF_URL;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;



const jsforce = require('jsforce');
const axios = require('axios');
const { getToken } = require('./tokenService'); // Adjust the path as needed



let sfConn = null; // Global Salesforce connection object

async function initSalesforceConnection(salesforceId) {
  const credentials = await getToken(salesforceId);
  if (!credentials) {
    throw new Error('No credentials found for the provided Salesforce ID');
  }

  const { accessToken, instanceUrl } = credentials;
  sfConn = new jsforce.Connection({
    instanceUrl: instanceUrl,
    accessToken: accessToken
  });

  return {instanceUrl};
}



//const reportId = '00OHn000008fWQzMAM'; // Replace with the reportId from your data

async function fetchSalesforceReportRows(salesforceId, reportId) {
  // Log into Salesforce
  /*const credentials = await getToken(salesforceId);
  if (!credentials) {
    throw new Error('No credentials found for the provided Salesforce ID');
  }

  const { accessToken, instanceUrl } = credentials;
  const conn = new jsforce.Connection({
    instanceUrl: instanceUrl,
    accessToken: accessToken
  });*/

  if (!sfConn) {
    await initSalesforceConnection(salesforceId);
  }


  const report = await sfConn.request(`/services/data/v35.0/analytics/reports/${reportId}?includeDetails=true`);

  // Extract rows data
  const rowsData = report.factMap["T!T"].rows;
  const columnInfo = report.reportExtendedMetadata.detailColumnInfo;

// Extract column titles
const columnTitles = Object.keys(columnInfo);

console.log("▼Column Titles▼:", columnTitles);
/*rowsData.forEach((row, index) => {
  console.log(`Row ${index}:`, row);
});*/

// Log each row with associated column titles
/*rowsData.forEach((row, index) => {
    const rowDataWithTitles = {};

    row.dataCells.forEach((cell, cellIndex) => {
        const title = columnTitles[cellIndex];
        rowDataWithTitles[title] = cell.label;
    });

    console.log(`▼Row ${index + 1} Data▼:`, JSON.stringify(rowDataWithTitles, null, 2));
});*/
//mapping the 2D report into each lead with this function
  const leads = rowsData.map(row => {
    const lead = {};
    const leadId = row.dataCells[0].value;
    
    row.dataCells.forEach((cell, cellIndex) => {
      const title = columnTitles[cellIndex];
      lead[title] = cell.label;
    });
    //manually adding this field
    lead['salesforceId'] = leadId;
    return lead;
  });

  return leads;


  // Return the rows data for further processing or use
  //return rowsData;

  /*return new Promise((resolve, reject) => {
    conn.request(reportRowsEndpoint, function(error, reportDetailsData) {
      if (error) {
        reject(error);
      } else {
        resolve(reportDetailsData);
      }
    });
  });*/
}

async function findLinkedInProfile(lead, searchResults) {
  // Filter for LinkedIn URLs
  const linkedInResults = searchResults.filter(result =>
    result.link.includes('linkedin.com/in')
  );

  //console.log(`Filtered LinkedIn results for ${lead.FIRST_NAME} ${lead.LAST_NAME}:`,linkedInResults)

  if (linkedInResults.length > 0) {
    // Access the link of the first (and presumably only) result
    const linkedInUrl = linkedInResults[0].link;
    //console.log(`LinkedIn URL for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${linkedInUrl}`);
    return linkedInUrl;
  } else {
    console.log(`No LinkedIn profile found for ${lead.FIRST_NAME} ${lead.LAST_NAME}`);
    return null;
  }

  /*if (linkedInResults.length === 0) {
    console.log(`No LinkedIn profile found for ${lead.FIRST_NAME} ${lead.LAST_NAME}`);
    return null; // Or handle this case as needed
  }*/

  // Heuristic: Find a profile matching the company name
  /*const matchedProfile = linkedInResults.find(result =>
    result.snippet.includes(lead.COMPANY)
  );*/

  /*if (linkedInResults) {
    return linkedInResults.link;
  } else {
    console.log(`Uncertain match for ${lead.FIRST_NAME} ${lead.LAST_NAME}, manual review needed`);
    return null; // Or handle this case as needed
  }*/
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function updateSalesforceLead(leadId, newCompanyName, newPositionTitle) {

  if (!sfConn) {
    throw new Error('Salesforce connection not initialized');
  }

  try {
    const updateData = {
      Company: newCompanyName,
      Title: newPositionTitle
    };

    const updateEndpoint = `/services/data/v35.0/sobjects/Lead/${leadId}`;

    await sfConn.request({
      method: 'PATCH',
      url: updateEndpoint,
      body: JSON.stringify(updateData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Lead with ID ${leadId} updated successfully.`);
  } catch (error) {
    console.error(`Error updating lead with ID ${leadId}:`, error);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//google search implementation
async function googleSearch(query) {
  const endpoint = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}`;

  try {
      const response = await axios.get(endpoint);
      //console.log(response.data.items);
      return response.data.items;  // This will return search results
  } catch (error) {
      console.error("Error with Google Search:", error);
      return null;
  }
}

// Example Usage:
// Assuming you've fetched a Salesforce lead with the fields: firstName, lastName, and company
/*const lead = {
  firstName: "Diego",
  lastName: "Espinosa",
  company: "Duke University"
};

const query = `${lead.firstName} ${lead.lastName} ${lead.company}`;
googleSearch(query).then(results => {
  // Check results and see if they match LinkedIn profiles.
  // ... further processing ...
});*/
function scrapeLinkedInProfile(linkedInUrls) {
  return new Promise((resolve, reject) => {

    //const urlsString = linkedInUrls.join(' ');
    const command = `python3 lin_scraper.py ${linkedInUrls.join(' ')}`;
    //console.log(command);
    

    exec(command, (error, stdout, stderr) => {

      console.log("stdout:", stdout);
      console.log("stderr:", stderr);

      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      //resolve(stdout.trim());
      try {
        const scrapedData = JSON.parse(stdout);
        resolve(scrapedData);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}



async function processLeads(salesforceId, reportId) {
  const leads = await fetchSalesforceReportRows(salesforceId,reportId);

  const linkedInUrls = await Promise.all(leads.map(async (lead) => {
    const query = `${lead.FIRST_NAME} ${lead.LAST_NAME} ${lead.COMPANY} LinkedIn`;
    const searchResults = await googleSearch(query);
    return await findLinkedInProfile(lead, searchResults);
  }));

  // Filter out null or undefined URLs
  const validLinkedInUrls = linkedInUrls.filter(url => url);
  const scrapedDataArray = await scrapeLinkedInProfile(validLinkedInUrls);

  let updatedLeadsCount = 0;


  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const scrapedData = scrapedDataArray[i];

    if (scrapedData && (scrapedData.company !== lead.COMPANY || scrapedData.position_title !== lead.TITLE)) {
      await updateSalesforceLead(lead.salesforceId, scrapedData.company, scrapedData.position_title);
      updatedLeadsCount++;
      console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} updated.`);
    } else {
      console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} is already up to date.`);
    }
  }

  /*for (const lead of leads) {
    // Construct the query using lead's first name, last name, and company
    const query = `${lead.FIRST_NAME} ${lead.LAST_NAME} ${lead.COMPANY}`;
    const searchResults = await googleSearch(query);

    const linkedInProfileUrl = await findLinkedInProfile(lead, searchResults);
    if (linkedInProfileUrl) {
      console.log(`LinkedIn URL for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${linkedInProfileUrl}`);
      const scrapedData = await scrapeLinkedInProfile(linkedInProfileUrl);
      console.log(`Scraped Data for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData}`);
      // Process the scraped data as needed

      try {
        const scrapedData = await scrapeLinkedInProfile(linkedInProfileUrl);

        // Compare scraped data with current lead data
        if (scrapedData.company !== lead.COMPANY || scrapedData.position_title !== lead.TITLE) {
          // Update the lead in Salesforce
          await updateSalesforceLead(lead.salesforceId, scrapedData.company, scrapedData.position_title);
          console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} updated.`);
        } else {
          console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} is already up to date.`);
        }

        console.log(`Company for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData.company}`);
        console.log(`Position Title for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData.position_title}`);
        // Use scrapedData.company and scrapedData.position_title as needed
      } catch (error) {
        console.error(`Error scraping LinkedIn profile for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${error}`);
      }
    }
    // Process the search results
    //console.log(`Results for ${lead.FIRST_NAME} ${lead.LAST_NAME}:`, searchResults);

    // Here you can add logic to update Salesforce or perform other actions
  }*/

  return { updatedLeadsCount };
}

//processLeads();
//updateSalesforceLead("00QHp00001U7vhhMAB","Hi","Bye")
//fetchSalesforceReportRows();
//test report ID: 00OHn000008fWQzMAM

module.exports = {
  processLeads,
  initSalesforceConnection
};