# pfe-LLM-bot-template
Pour exécuté l'extension avec le LLM par défault il faut lancer le conteneur Docker qui l'exécute. Voici les différentes pour faire fonctionner l'extension.

## Partie extension

## Partie LLM

Pour faire fonctionner le LLM de l'extension, nous avons besoin d'être capable d'exécuter des conteneurs Docker. Vous pouvez utilisé Docker desktop : https://www.docker.com/products/docker-desktop/ .

Vous devez build l'image avec la commande : 

docker build -t xxx --file Dockerfile .

xxx est le nom que vous devez choisir pour votre image.

Ensuite, vous devez exécuter votre image dans un conteneur. Vous pouvez le ffaire avec la commande :

docker run -p 80:80 xxx

Vous pouvez changer le port d'exécution, mais il faut aussi faire les changements dans le Dockerfile à la dernière ligne.

Lorsque le conteneur est en exécution, il faut lancer le chargement du LLM avec la requête HTTP 127.0.0.1/premierdem.
À partir de maintenant, le LLM est opérationnel et peut recevoir les requêtes de l'extension. 
