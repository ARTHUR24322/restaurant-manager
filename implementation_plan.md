# Amélioration du Service en Salle : Encaissements et Fidélité

Dans votre demande, vous avez évoqué deux points très importants concernant le rôle du serveur :

1. **Le numéro de client pour les points de fidélité.**
   - *Statut* : **Déjà intégré !** 🎉 Lors de la conception de la page tout à l'heure, j'ai anticipé ce besoin : si vous regardez le formulaire de commande, sous l'endroit où l'on entre le nom du client, il y a un champ "Téléphone (facultatif)". Si le serveur le remplit, les points de fidélité seront automatiquement attribués dès que la table paiera sa facture finale.

2. **La Caisse envoie une demande au serveur pour aller encaisser l'argent sur une table déjà servie.**
   - *Statut* : À implémenter. Actuellement l'interface du serveur lui permet uniquement d'envoyer de *nouvelles* commandes, pas de gérer celles déjà servies.

## Choix d'Implémentation Confirmé

Vous avez confirmé que **C'est la caissière qui valide le paiement** sur sa machine, après que le serveur a récupéré l'argent à la table.

## Proposed Changes pour le point 2 (La caissière valide)

1. **Modification des Types (`src/types/index.ts`)** : 
   - Ajout d'un nouveau statut de paiement `PAYMENT_REQUESTED` (ou similaire) pour indiquer que la caisse demande l'encaissement.

2. **Modification de la Caisse (`caisse/page.tsx`)** : 
   - Ajout d'un bouton "Déléguer encaissement au serveur" sur les commandes `UNPAID` et (optionnellement) servies.
   - Ce bouton changera le statut de paiement en `PAYMENT_REQUESTED`.
   - La caissière gardera le bouton final "Valider le paiement" pour clôturer définitivement la commande une fois que le serveur lui remet l'argent, passant la commande en `PAID_CASH` ou `PAID_MOBILE`.

3. **Modification de la page Serveur (`service/page.tsx`)** : 
   - Ajout d'un onglet ou d'une section "Encaissements Demandés".
   - Le serveur y verra les commandes marquées `PAYMENT_REQUESTED`.
   - Il pourra voir le montant à encaisser et la table concernée.
   - (Optionnel) Il peut y avoir un bouton "Argent récupéré" pour que la commande disparaisse de sa liste, ou simplement la commande disparaît quand la caissière valide. Nous ferons en sorte que le serveur voie la demande jusqu'à ce que la caissière la valide, ou lui permettre de l'acquitter.

## Verification Plan

### Automated Tests
- Test de bout en bout du flux : Création de la commande -> Cuisine -> Servie -> Caissière demande encaissement -> Serveur voit la demande -> Caissière valide le paiement.
- Vérification que la base de données met à jour correctement les statuts.

### Manual Verification
- S'assurer que les interfaces de la caisse et du serveur se mettent à jour en temps réel (ou au rafraîchissement) pour ce nouveau flux.
