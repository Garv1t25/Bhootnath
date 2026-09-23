// *Dear {{1}}*,

// Thank you for choosing Bhootnath Restaurant & Cafe! ❤️

// Your meal plan has been successfully {{2}}.

// *📋Plan Details*
// • Plan: {{3}}
// • Amount: ₹{{4}}
// • Start Date: {{5}}
// • End Date: {{6}}

// Your plan will remain valid from *{{7}}* to *{{8}}*.

// We look forward to serving you delicious meals throughout your plan! 😋🍴

// Thank you for being a valued customer of *Bhootnath Restaurant & Cafe*.

// For any queries or assistance, please feel free to contact us.

// 🙏 Thank You!

const plan_adder = async (phone,name,status,plan,amount,startDate,endDate) => {
    const response = await fetch(
  `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "plan_adder",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: status },
              { type: "text", text: plan },
              { type: "text", text: amount },
              { type: "text", text: startDate },
              { type: "text", text: endDate },
              { type: "text", text: startDate },
              { type: "text", text: endDate }
            ]
          }
        ]
      }
    })
  }
);
if (!response.ok) {
    console.log("whatsapp error");
}
}

export default plan_adder;