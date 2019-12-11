const sgMail = require('@sendgrid/mail');
//const sendgridAPIKey = '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';
//sgMail.setApiKey(sendgridAPIKey);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const welcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: 'Bienvenue',
        text: `Bienvenue sur l'application Baraka, ${name}. ne tardez pas commencer par ajouter votre 1èr bar dans vos favoris!`
    })
}


const contactEmail = (email, message) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: 'Bienvenue',
        text: `${message}`
    })
}

module.exports = {
    welcomeEmail,
    contactEmail
}