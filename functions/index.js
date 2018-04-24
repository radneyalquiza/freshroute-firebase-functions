const functions = require('firebase-functions');
const admin = require("firebase-admin");
const nodemailer = require('nodemailer');
const pdfkit = require('pdfkit');

const gmailEmail = 'atlaswingpasaway@gmail.com'
const gmailPassword = 'qwer123123'
const mailTransport = nodemailer.createTransport(`smtps://${gmailEmail}:${gmailPassword}@smtp.gmail.com`);

var serviceAccount = require("./freshroute-ac861-firebase-adminsdk-befer-2a90eae9a5.json");

const APP_NAME = 'FreshRoute Express';
const PROJECT_ID = "freshroute-ac861";

var config = {
    projectId: `${PROJECT_ID}`,
    keyFilename: './freshroute-ac861-firebase-adminsdk-befer-2a90eae9a5.json'
};

admin.initializeApp(functions.config().firebase);
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://freshroute-ac861.firebaseio.com"
// });

const storage = require('@google-cloud/storage')(config);

exports.createClientInvoice = functions.database.ref('AppInvoice/{InvoiceId}')
    .onCreate(event => {

        console.log('data bro!!!123', event.val())

        const invoice = event.val(); // The Invoice.

        console.log("QWQW", invoice);
        console.log("ASAS", invoice.AppClient);


        // [START eventAttributes]
        const doc = new pdfkit();
        const email = invoice.AppClient.Email; // The email of the client.
        const displayName = invoice.AppClient.FirstName + " " + invoice.AppClient.LastName; // The fullname of the client.
        // [END eventAttributes]

        const bucket = storage.bucket(`${PROJECT_ID}.appspot.com`);
        const filename = `${APP_NAME}-Invoice-${invoice.AppInvoiceId}.pdf`;
        const file = bucket.file(filename);
        const stream = file.createWriteStream({ resumable: false });
        var buffers = [];
        let p = new Promise((resolve, reject) => {
            doc.on("end", () => {
                resolve(buffers);
            });
            doc.on("error", (e) => {
                reject(e);
            });
        });

        doc.pipe(stream);
        doc.on('data', buffers.push.bind(buffers));

        // let p = new Promise((resolve, reject) => {
        //     doc.on("end", function() {
        //         resolve(buffers);
        //     });
        //     doc.on("error", function () {
        //         reject();
        //     });
        // });


        // Pipe its output to the bucket
        // doc.pipe(stream).on('finish', () => {
        //     console.log('written', doc);
        //     return sendPDFMail(email, displayName, doc);
        // }).on('error', err => {
        //     console.log("ERROR!!!", err);
        // });
        doc.fontSize(18).text(JSON.stringify(invoice), 100, 100);
        doc.end();

        return p.then((buffers) => {
            return sendMail(email, invoice.AppInvoiceId, displayName, buffers);
        });
        // stream
        // stream.on('error', function(err) {
        //     console.log(err);
        // });
    });
// [END sendPDFMail]


function sendMail(email, invoiceid, displayName, buffers) {
    const pdfData = Buffer.concat(buffers);
    const mailOptions = {
        from: '"' + PROJECT_ID + '" <noreply@firebase.com>',
        to: email,
        subject: `Invoice #${invoiceid} - ${APP_NAME}`,
        html: `Hey ${displayName}!, Welcome to ${APP_NAME}. Your service has been completed. Attached is an invoice of the service.`,
        attachments: [{
            filename: `${APP_NAME}-Invoice.pdf`,
            content: pdfData
        }]
    };

    return mailTransport.sendMail(mailOptions).then(() => {
        console.log("New email sent to:", email);
        return;
    }).catch(error => {
        console.error("ERROR!", error);
        return;
    });
}


// Sends a welcome email to the given user.
function sendPDFMail(email, displayName, doc) {
    const mailOptions = {
        from: '"' + PROJECT_ID + '" <noreply@firebase.com>',
        to: email
    };

    mailOptions.subject = `Welcome to ${APP_NAME}!`;
    mailOptions.text = `Hey ${displayName}!, Welcome to ${APP_NAME}. I hope you will enjoy our service.`;
    mailOptions.attachments = [{ filename: 'dataPdf.pdf', content: doc, contentType: 'application/pdf' }];

    return mailTransport.sendMail(mailOptions).then(() => {
        console.log('New welcome email sent to:', email);
        return;
    });
}