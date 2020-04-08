# serverPreprod
serverPreprod

1. Télécharger mongodb .tar.gz et suivre les instructions.
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu-tarball/

#Optionnel Installer un GUI pour la gestion la base de donnée.
2. Installer mongodbcompass ou Télécharger Robo 3T

- mongodbcompass l'installer se trouve dans le 
- https://robomongo.org/download (Robo 3T (formerly Robomongo)

3. Configurer les variables d'environnements
Il faut configurer les variables globales sur Heroku: (heroku set)
GOOGLE_API_KEY:   Utiliser une clé API google
JWT_SECRET:       JSON Web Tokens ici : BARAKA_SECRET
MONGODB_URL:      Utiliser une connection au mongodb atlas. Exemple : mongodb+srv:/...
SENDGRID_API_KEY: Utiliser l'API SendGrid

4. Environnement de développement
Il faut demander le fichier conf.tar.gz
Attention ce fichier ne devra pas jamais être publier en ligne.

