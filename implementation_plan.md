# Migration du flux de connexion Employé vers la page Sélection

L'objectif est de supprimer la page `/manager/employe-pin` et de centraliser toute la logique de connexion des employés (vérification du PIN, journalisation des connexions et ouverture de caisse) directement dans la page `/manager/selection` qui sert de Portail Opérationnel.

## User Review Required

> [!IMPORTANT]
> Les codes PIN des employés (créés dans la gestion d'équipe) peuvent comporter entre 4 et 6 chiffres. 
> Actuellement, le composant `PinInput` utilisé sur la page sélection valide automatiquement à 6 chiffres. Il devra être mis à jour pour accepter une validation manuelle.

## Proposed Changes

### 1. Intégration de la logique métier dans la page Sélection
#### [MODIFY] [selection/page.tsx](file:///c:/Users/Administrateur/Scanrestau/smartresto/src/app/manager/selection/page.tsx)
- **Choix du rôle** : Lorsqu'un utilisateur clique sur n'importe quelle carte (`Réception & Caisse`, `Cuisine & Préparation`, etc.), le système ne redirigera plus immédiatement. Il ouvrira la modale de code PIN et mémorisera la destination (le rôle).
- **Vérification Employé** : Le code PIN sera vérifié via `loginEmployeByPin`. 
- **Contrôle de conformité** : Si l'employé qui s'est connecté n'a pas le droit d'accéder à ce pôle (ex: Un cuisinier veut ouvrir la caisse), nous afficherons une erreur claire.
- **Journalisation** : Si le PIN est valide, l'action sera tracée (`logEmployeConnection`).
- **Gestion de Caisse (Shift)** : Si l'utilisateur clique sur *Réception & Caisse* ou *Gestion & Stratégie*, la modale "Ouverture de Caisse" (Fonds Initial) apparaîtra après le PIN, exactement comme c'était prévu sur l'ancienne page.

### 2. Adaptation du clavier numérique
#### [MODIFY] [PinInput.tsx](file:///c:/Users/Administrateur/Scanrestau/smartresto/src/components/manager/PinInput.tsx)
- Ajout d'un bouton de validation explicite (Bouton "Valider" ou icône "Entrée") pour prendre en charge les PIN à 4 ou 5 chiffres, car le système bloquait (à juste titre pour le global admin, mais plus maintenant pour les employés) la validation tant qu'on n'entrait pas 6 chiffres.

### 3. Suppression de la page redondante
#### [DELETE] [employe-pin/page.tsx](file:///c:/Users/Administrateur/Scanrestau/smartresto/src/app/manager/employe-pin/page.tsx)
- Cette page sera effacée du projet.

## Open Questions

> [!WARNING]
> La carte **"Gestion Boutique"** ne correspond pas directement à un rôle classique (CAISSIER, CUISINIER) dans la base de données. Autorisez-vous uniquement les `MANAGER` à y accéder, ou aussi les `CAISSIER` ?

> [!WARNING]
> La carte **"Gestion & Stratégie"** (Dashboard d'administration) vérifie actuellement un autre type de PIN global propre au propriétaire global . Dois-je conserver la vérification globale du propriétaire pour cette carte, ou tout vérifier via les PIN des vrais `Employés` (avec rôle `MANAGER`) de la base de données ?
