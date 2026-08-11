# Ajouter le Lot 0 au dépôt GitHub

Le ZIP contient les fichiers directement à la racine.

Dans Codespaces, après avoir ajouté `Sirafiq_Lot_0_GitHub.zip` au dépôt :

```bash
git pull origin main
unzip -o Sirafiq_Lot_0_GitHub.zip
rm Sirafiq_Lot_0_GitHub.zip
git add .
git commit -m "Ajout du Lot 0 fonctionnel de Sirafiq"
git push origin main
```

Puis activer GitHub Pages depuis `main` et `/(root)`.
