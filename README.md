# LLM-code-review-bot-assistant
Pour exécuter l'extension avec le LLM par défaut, il faut lancer le conteneur Docker qui l'exécute. Voici les différentes étapes à suivre pour faire fonctionner l'extension.

## Partie extension

Pour l'extension, nous pouvons le télécharger directement sur le Chrome Web Store ou bien l'importer manuellement dans les extensions de votre fureteur en activant le mode développeur.

Par défaut, l'extension est activée et est utilisable sur les pages de Pull Request de GitHub. Les paramètres peuvent être modifiés dans l'onglet `Settings`.

L'extension requiert un Personnal Access Token pour communiquer avec GitHub et transmettre l'information nécessaire au LLM. 

Pour faire fonctionner l'extension, il suffit de fournir votre Personnal Access Token et ensuite écrire un commentaire dans le champ désigné pour la Pull Request en question.

Ensuite appuyé sur l'icone du Bot, une section s'affichera pendant que le Bot cherche une réponse et l'affichera par la suite.

Si plus de détails sur la requête sont fournis, ils seront inscrits dans l'extension sous l'onglet `View`.

## Partie LLM

Pour faire fonctionner le LLM de l'extension, nous avons besoin d'être capable d'exécuter des conteneurs Docker. Vous pouvez utilisé Docker desktop : https://www.docker.com/products/docker-desktop/ .

Vous devez build l'image avec la commande : 

```
docker build -t xxx --file Dockerfile .
```
```xxx ``` est le nom que vous devez choisir pour votre image.

Ensuite, vous devez exécuter votre image dans un conteneur. Vous pouvez le faire avec la commande suivante:

```
docker run --gpus all -v ./models:/models -p 80:80 xxx
```

Vous pouvez changer le port d'exécution, mais il faut aussi faire les changements dans le Dockerfile à la dernière ligne.

Lorsque le conteneur est en exécution, il faut lancer le chargement du LLM avec la requête HTTP ```127.0.0.1/premierdem```.
À partir de maintenant, le LLM est opérationnel et peut recevoir les requêtes de l'extension. 
