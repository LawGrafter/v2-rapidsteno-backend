const axios = require("axios");
const https = require("https");

const addToBrevoList = async ({ email, firstName, lastName, phone }) => {

  try {
    const response = await axios.post("https://api.brevo.com/v3/contacts", {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        WHATSAPP: `+91${phone}` // Or format based on actual input
      },
      listIds: [9], // Your list ID
      updateEnabled: true,
    }, {
      headers: {
        "api-key": process.env.BREVO_API_KEY || "",
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    console.log("✅ Brevo: Contact added", response.data);
    return { success: true };
  } catch (error) {
    console.error("❌ Brevo Error:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { addToBrevoList };