import cron from "node-cron";
import { Customer } from "../models/Customer.model.js";


cron.schedule("*/5 * * * *", async () => {
    await fetch("https://bhootnath.onrender.com/health");
});

// cron.schedule("21 20 * * *", async () => {
//     async function sendText(expiringCustomers) {
//         for (let i = 0; i < expiringCustomers.length; i++) {
//             const customer = expiringCustomers[i];
//             const payload = {
//                 "messaging_product": "whatsapp",
//                 "to": `91${customer.mobile}`,
//                 "type": "template",
//                 "template": {
//                     "name": "test_exapmle",
//                     "language": {
//                         "code": "en_US"
//                     },
//                     "components": [
//                         {
//                             "type": "body",
//                             "parameters": [
//                                 { "type": "text", "text": customer.name },
//                                 { "type": "text", "text": customer.plan },
//                                 { "type": "text", "text": "7531598520" }
//                             ]
//                         }
//                     ]
//                 }
//             };
//             try {
//                 const res = await fetch("https://graph.facebook.com/v25.0/1184994811373228/messages", {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         "Authorization": "Bearer EAAZChZBUIgqt4BSRFHcadS9i7hbQ3HZArRl7XAalSZCcTNpxHT5ZCw7Sfsc3bDmOIIYIfjkTJ8ajsgkkGFZAJyB2ljWKK59yZCnBv5ZB4ZCZALisSOu62EOn73lDIfZCE5F2SZAmxs3zYFnMZAUBHw4CGIZB8BqLl000ZCXZBH5xetW1AW3UQS24CvuN4VywCagZA9J4QqfRn3AZDZD "
//                     },
//                     body: JSON.stringify(payload)
//                 });
//                 console.log(await res.json());
//             } catch (err) {
//                 console.log("ERROR", err);
//             }
//         }
//     }

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const customers = await Customer.find();
//     const expiringCustomers = customers.filter(customer => {
//         const endDate = new Date(customer.endDate);
//         endDate.setHours(0, 0, 0, 0);

//         const diffTime = endDate.getTime() - today.getTime();
//         const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
//         return daysLeft === 3;
//     });

//     console.log("Expiring customers count:", expiringCustomers.length);
//     await sendText(expiringCustomers);
// });