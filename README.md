# Configuration de l'environnement

Voici une vidéo montrant toutes les étapes à exécuter pour utiliser l'outil. Il y a également des instructions écrites détaillant les principales étapes de l'utilisation de l'outil en dessous de celle-ci.

[Lien vers la vidéo YouTube](https://youtu.be/C_E6RMnsvy0)


## Démarrage du serveur

Pour faire fonctionner le LLM de l'extension, nous avons besoin d'être capable d'exécuter des conteneurs Docker. Vous pouvez utiliser Docker desktop : https://www.docker.com/products/docker-desktop/ .

Vous devez build l'image avec la commande : 

```
docker build -t llm-bot --file Dockerfile .
```

Ensuite, vous devez exécuter votre image dans un conteneur. Vous pouvez le faire avec la commande :

```
docker run -v ./models:/models --gpus all -p 80:80 llm-bot
```

Lorsque le conteneur est en exécution, il faut tout d'abord charger un LLM, ce qui est fait par le biais des options de l'extension.

## Utilisation de l'extension Chrome

Pour l'instant, il faut charger l'extension du projet lui-même, en suivant les étapes suivantes :
- Sur google chrome, aller dans Extensions> Manage extensions
- activer devmode
- Cliquer sur load unpacked
- Naviguer jusque dans le dossier src du projet et sélectionner ce dossier
- Rafraichir l'extension pour faire bonne mesure
- Épingler l'extension à la barre de tâches

L'extension est utilisable sur les pages de Pull Request de GitHub. Les paramètres peuvent être modifiés dans les options de l'extension.

L'extension nécessite un Personnal Access Token de GitHub pour lire les répertoires GitHub et transmettre l'information nécessaire au LLM. 

Il est également nécessaire de fournir à l'extension un access token de Hugging Face avec des write permissions et d'accepter les conditions d'utilisation pour les gated LLMs (par exemple, google/gemma-2b-it).

Avant de pouvoir utiliser l'extension, il faut builder une image du conteneur roulant le serveur du LLM à partir du Dockerfile du projet, puis faire rouler ledit serveur (voir "Démarrage du serveur", plus haut).

Ensuite, il faut charger un LLM dans le serveur avec la dropdown list "Hugging Face LLM" dans les options de l'extension.

Il faut ensuite appuyer sur l'icone du Bot dans la boîte de commentaire pour activer la requête au LLM, Le LLM enverra alors une réponse dans une boîte connexe à la boîte de commentaire.

## Utilisation du GPU

Si vous avez un GPU Nvidia, assurez-vous que le container toolkit est installé sur votre ordinateur afin que l'application utilise les ressources de votre GPU de façon optimale.

[Lien vers le guide d'installation du container toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)

Nous avons testé l'utilisation du LLM sur le CPU et sur le GPU d'un des ordinateurs de développement.

Les composants utilisés sont les suivants:
- CPU: AMD Ryzen 5 3600X 6-Core, 12-Thread
- GPU: Nvidia 3060 TI 8 Gb

| Type de Traitement | Temps (minutes) | % de Performance Supplémentaire |
|---------------------|-----------------|---------------------------------|
| CPU                 |       10        |               -                 |
| GPU (sans container toolkit)     |        4        |            60.0%               |
| GPU + container toolkit          |        2        |            80.0%               |

On remarque que l'utilisation du GPU et de CUDA Tools est critique à l'obtention d'un temps de réponse raisonnable.