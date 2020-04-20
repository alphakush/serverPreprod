const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const welcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: `Bienvenue ${name}`,
        text: `Bienvenue sur l'application Baraka, ${name}. 
Ne tardez pas commencer par ajouter votre 1èr bar dans vos favoris!

Cordialement,
Votre Equipe Baraka
`
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

const restPassword = (name, email, tmpLink, currentYear) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: `Réinitialisation de votre mot de passe`,
        html: 
        `<html> Bonjour ${name}, <br><br>

Pour lancer le processus de réinitialisation du mot de passe de votre compte Baraka avec l'email : ${email},<br><br> cliquez sur le lien ci-dessous valable une heure : <br><br>
https://baraka-api.herokuapp.com/api/v1/restpassword/${tmpLink} <br><br>

Si ce lien ne fonctionne pas, copiez l'URL, puis collez-la dans une nouvelle fenêtre de navigateur.<br><br>
        
Si vous avez reçu ce message par erreur, il est possible qu'un autre utilisateur ait saisi votre adresse e-mail par inadvertance alors qu'il tentait de réinitialiser un mot de passe. Si vous n'avez pas formulé de demande en ce sens, aucune action supplémentaire de votre part n'est requise. Par conséquent, vous pouvez ignorer ce message.
Vos identifiants sont confidentiels. Ils vous permettent d'accéder aux sites et services de Baraka. <br><br>

Bien cordialement,<br>
Baraka<br><br>

Ce message et les pièces jointes sont confidentiels et établis à l'attention exclusive de leur destinataire (aux adresses spécifiques auxquelles il a été adressé). Si vous n'êtes pas le destinataire de ce message, vous devez immédiatement en avertir l'expéditeur et supprimer ce message et les pièces jointes de votre système.
<footer>
        <p>© ${currentYear} Baraka</p>
    </footer>
</html>`

})
}

const confirmRestPassword = (name, email) => {
    sgMail.send({
        to: email,
        from: 'contact-baraka@gmail.com',
        subject: `Confirmation du changement de votre mot de passe.`,
        text: 
        `
Bonjour ${name}, Votre mot de passe a été modifié avec succès. Vous voilà de retour :)

A bientôt sur l'application Baraka.
`
})}

module.exports = {
    welcomeEmail,
    contactEmail,
    restPassword,
    confirmRestPassword
}
