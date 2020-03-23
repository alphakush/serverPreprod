# serverPreprod
serverPreprod

1. Télécharger mongodb .tar.gz et suivre les instructions.
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu-tarball/

2. Installer mongodbcompass. 

3. Télécharger Robo 3T
https://robomongo.org/download (Robo 3T (formerly Robomongo)

Version en ligne:
Il faut configurer les variables globales sur Heroku: (heroku set)
GOOGLE_API_KEY:   Utiliser une clé API google
JWT_SECRET:       JSON Web Tokens ici : BARAKA_SECRET
MONGODB_URL:      Utiliser une connection au mongodb atlas. Exemple : mongodb+srv:/...
SENDGRID_API_KEY: Utiliser l'API SendGrid

Version local:
Il faut demander le fichier conf.tar.gz
Attention ce fichier ne devra pas jamais être publier en ligne.
use baraka-test -> créer une base de donnée
