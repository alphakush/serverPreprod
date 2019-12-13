const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const welcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: 'Bienvenue',
        text: `Bienvenue sur l'application Baraka, ${name}. ne tardez pas commencer par ajouter votre 1èr bar dans vos favoris!`
    })
}


const contactEmail = (email,objet, message) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: `${objet}`,
        text: `${message}`
    })
}

module.exports = {
    welcomeEmail,
    contactEmail
}
