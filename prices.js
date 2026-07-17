/**
 * prices.js — Source unique de vérité des tarifs BeneIT
 * Chargé par index.html ET service-form.html.
 * Pour modifier un prix, modifiez-le ici seulement.
 */
'use strict';

window.BENEIT_SERVICES = {
  'optimisation-pc': {
    name: 'Optimisation PC',
    baseName: 'Nettoyage + optimisation système',
    basePrice: 35,
    baseTime: 30,
    duration: '30–60 min',
    tags: ['PC lent', 'Disque saturé', 'Démarrage long'],
    description: 'Votre ordinateur rame ou démarre lentement. On nettoie, libère l\'espace et supprime ce qui ralentit. Résultat visible immédiatement.',
    longDescription: 'Analyse du disque, suppression des fichiers temporaires, désinstallation des logiciels inutiles et optimisation du registre Windows. Diagnostic complet avant toute action.',
    options: [
      { id: 'disque-plein',   name: 'Disque saturé (plus de 80%)',        price: 10, time: 15 },
      { id: 'demarrage-lent', name: 'Démarrage très lent (plus de 3 min)', price: 5,  time: 10 },
      { id: 'apps-plantent',  name: 'Applications qui plantent',           price: 10, time: 20 },
    ],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label">Symptômes observés</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" name="symptomes" value="lent-demarrage"><span>PC lent au démarrage (plus de 3 min)</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="apps-plantent"><span>Applications qui se ferment inopinément</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="disque-plein"><span>Disque presque plein (moins de 10 Go libres)</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="surchauffe"><span>PC qui chauffe / ventilateur très bruyant</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label" for="q-espace-libre">Espace libre sur votre disque C: (si connu)</label>
        <input class="f-input" type="text" id="q-espace-libre" name="espace-libre" placeholder="Ex : 5 Go libres sur 128 Go">
      </div>
      <div class="q-block">
        <label class="q-label">Avez-vous déjà effectué un nettoyage de disque ?</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="nettoyage-prec" value="oui"><span class="radio-pill-lbl">Oui</span></label>
          <label class="radio-pill"><input type="radio" name="nettoyage-prec" value="non"><span class="radio-pill-lbl">Non</span></label>
        </div>
      </div>`
  },

  'suppression-virus': {
    name: 'Suppression de virus',
    baseName: 'Scan complet + nettoyage des menaces',
    basePrice: 50,
    baseTime: 45,
    duration: '45–90 min',
    tags: ['Pop-ups', 'Ransomware', 'Navigateur détourné'],
    description: 'Pop-ups, lenteurs inexpliquées, antivirus désactivé — votre machine est peut-être infectée. On détecte et on élimine sans toucher à vos fichiers personnels.',
    longDescription: 'Déploiement de plusieurs moteurs d\'analyse pour détecter et supprimer tous les malwares, puis renforcement de la protection système. Vos données personnelles ne sont jamais consultées.',
    options: [
      { id: 'pop-ups',    name: 'Pop-ups / adware envahissants',        price: 5,  time: 10 },
      { id: 'ransomware', name: 'Ransomware (fichiers chiffrés)',        price: 30, time: 45 },
      { id: 'navigateur', name: 'Navigateur détourné / page piratée',   price: 10, time: 15 },
    ],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label">Symptômes observés</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" name="symptomes" value="pop-ups"><span>Pop-ups intempestifs / publicités envahissantes</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="ralentissement"><span>Ralentissements soudains inexpliqués</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="fichiers-chiffres"><span>Fichiers inaccessibles ou renommés (.locked, .enc...)</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="navigateur-pirate"><span>Page d'accueil du navigateur modifiée</span></label>
          <label class="check-item"><input type="checkbox" name="symptomes" value="antivirus-bloque"><span>Antivirus désactivé ou qui ne se lance plus</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label" for="q-antivirus">Quel antivirus est installé sur votre PC ?</label>
        <input class="f-input" type="text" id="q-antivirus" name="antivirus" placeholder="Ex : Windows Defender, Avast, Norton...">
      </div>`
  },

  'sauvegarde': {
    name: 'Sauvegarde des données',
    baseName: 'Configuration sauvegarde automatique',
    basePrice: 30,
    baseTime: 20,
    duration: '20–40 min',
    tags: ['Photos & vidéos', 'OneDrive', 'Chiffrement'],
    description: 'On configure une sauvegarde automatique de vos photos, documents et fichiers importants — cloud ou disque externe. Fini le risque de tout perdre.',
    longDescription: 'Configuration d\'une solution de sauvegarde adaptée à vos besoins : cloud (OneDrive, Google Drive) ou support local. Vérification que la sauvegarde fonctionne réellement par un test de restauration.',
    options: [
      { id: 'cloud',       name: 'Configuration cloud (OneDrive/Drive)',  price: 5,  time: 10 },
      { id: 'chiffrement', name: 'Chiffrement des sauvegardes',           price: 10, time: 15 },
      { id: 'grande-data', name: 'Volume de données supérieur à 50 Go',  price: 5,  time: 10 },
    ],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label">Type de données à sauvegarder</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" name="data-type" value="photos"><span>Photos et vidéos</span></label>
          <label class="check-item"><input type="checkbox" name="data-type" value="docs"><span>Documents (Word, Excel, PDF)</span></label>
          <label class="check-item"><input type="checkbox" name="data-type" value="emails"><span>Emails et contacts</span></label>
          <label class="check-item"><input type="checkbox" name="data-type" value="db"><span>Bases de données / fichiers métier</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label">Volume total estimé à sauvegarder</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="volume" value="moins-10go"><span class="radio-pill-lbl">Moins de 10 Go</span></label>
          <label class="radio-pill"><input type="radio" name="volume" value="10-50go"><span class="radio-pill-lbl">10 à 50 Go</span></label>
          <label class="radio-pill"><input type="radio" name="volume" value="50-100go"><span class="radio-pill-lbl">50 à 100 Go</span></label>
          <label class="radio-pill"><input type="radio" name="volume" value="plus-100go"><span class="radio-pill-lbl">Plus de 100 Go</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label">Type de sauvegarde souhaité</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="type-sauvegarde" value="cloud"><span class="radio-pill-lbl">Cloud uniquement</span></label>
          <label class="radio-pill"><input type="radio" name="type-sauvegarde" value="local"><span class="radio-pill-lbl">Disque dur local</span></label>
          <label class="radio-pill"><input type="radio" name="type-sauvegarde" value="les-deux"><span class="radio-pill-lbl">Les deux (recommandé)</span></label>
        </div>
      </div>`
  },

  'microsoft365': {
    name: 'Support Microsoft 365',
    baseName: 'Diagnostic et dépannage Microsoft 365',
    basePrice: 30,
    baseTime: 20,
    duration: '20–60 min',
    tags: ['Outlook', 'Teams', 'OneDrive'],
    description: 'Outlook bloqué, Teams qui plante, OneDrive qui ne synchronise plus — on règle tout à distance sans que vous ayez à intervenir.',
    longDescription: 'Diagnostic et résolution des problèmes liés à la suite Microsoft 365 : installation, synchronisation, licences, configuration avancée. Aucune donnée lue dans vos fichiers.',
    options: [
      { id: 'migration',   name: 'Migration emails / données',           price: 20, time: 30 },
      { id: 'teams-config', name: 'Configuration Teams avancée',         price: 10, time: 15 },
      { id: 'licence',     name: 'Problème de licence / activation',     price: 5,  time: 10 },
    ],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label">Quel(s) logiciel(s) posent problème ?</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" name="m365-app" value="word"><span>Word</span></label>
          <label class="check-item"><input type="checkbox" name="m365-app" value="excel"><span>Excel</span></label>
          <label class="check-item"><input type="checkbox" name="m365-app" value="outlook"><span>Outlook</span></label>
          <label class="check-item"><input type="checkbox" name="m365-app" value="teams"><span>Teams</span></label>
          <label class="check-item"><input type="checkbox" name="m365-app" value="onedrive"><span>OneDrive</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label">Type de problème</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="m365-problem" value="installation"><span class="radio-pill-lbl">Installation</span></label>
          <label class="radio-pill"><input type="radio" name="m365-problem" value="sync"><span class="radio-pill-lbl">Synchronisation</span></label>
          <label class="radio-pill"><input type="radio" name="m365-problem" value="erreur"><span class="radio-pill-lbl">Erreur au lancement</span></label>
          <label class="radio-pill"><input type="radio" name="m365-problem" value="licence"><span class="radio-pill-lbl">Problème de licence</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label">Type de compte Microsoft</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="m365-type" value="perso"><span class="radio-pill-lbl">Compte personnel</span></label>
          <label class="radio-pill"><input type="radio" name="m365-type" value="pro"><span class="radio-pill-lbl">Compte professionnel</span></label>
        </div>
      </div>`
  },

  'wifi-reseau': {
    name: 'Configuration réseau',
    baseName: 'Diagnostic réseau complet',
    basePrice: 40,
    baseTime: 30,
    duration: '30–60 min',
    tags: ['Wi-Fi lent', 'Coupures', 'Sécurisation'],
    description: 'Internet lent, coupures fréquentes, réseau mal configuré — on diagnostique et on optimise votre connexion, box et partage entre appareils inclus.',
    longDescription: 'Analyse de la configuration réseau, identification des goulots d\'étranglement et optimisation des paramètres de votre box et routeur. Configuration sécurisée sans accès à vos données.',
    options: [
      { id: 'securisation', name: 'Sécurisation réseau (VPN/pare-feu)', price: 15, time: 20 },
      { id: 'coupures',     name: 'Coupures fréquentes (plus de 5/jour)', price: 10, time: 15 },
      { id: 'repeteur',    name: 'Configuration répéteur / mesh',        price: 5,  time: 10 },
    ],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label" for="q-isp">Votre fournisseur d'accès internet (FAI)</label>
        <input class="f-input" type="text" id="q-isp" name="fai" placeholder="Ex : Orange, Free, SFR, Bouygues...">
      </div>
      <div class="q-block">
        <label class="q-label">Appareils concernés par le problème</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" name="appareils" value="pc"><span>PC / ordinateur portable</span></label>
          <label class="check-item"><input type="checkbox" name="appareils" value="smartphone"><span>Smartphone</span></label>
          <label class="check-item"><input type="checkbox" name="appareils" value="tablette"><span>Tablette</span></label>
          <label class="check-item"><input type="checkbox" name="appareils" value="tv"><span>TV connectée / console de jeux</span></label>
          <label class="check-item"><input type="checkbox" name="appareils" value="imprimante"><span>Imprimante réseau</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label">Avez-vous redémarré votre box / routeur récemment ?</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="reboot-box" value="oui"><span class="radio-pill-lbl">Oui</span></label>
          <label class="radio-pill"><input type="radio" name="reboot-box" value="non"><span class="radio-pill-lbl">Non</span></label>
        </div>
      </div>`
  },

  'diagnostic': {
    name: 'Diagnostic système',
    baseName: 'Analyse approfondie du système',
    basePrice: 20,
    baseTime: 20,
    duration: '20–30 min',
    tags: ['Problème inconnu', 'Audit système', 'Rapport PDF'],
    description: 'Quelque chose cloche mais vous ne savez pas quoi ? On analyse votre machine et vous fournit un rapport complet. Déduit si vous choisissez une intervention.',
    longDescription: 'Diagnostic complet du système avec rapport détaillé et recommandations personnalisées. Si vous choisissez une intervention suite au diagnostic, son coût est entièrement déduit.',
    options: [],
    specificQuestions: `
      <div class="q-block">
        <label class="q-label">Type de diagnostic souhaité</label>
        <div class="radio-group">
          <label class="radio-pill"><input type="radio" name="diag-type" value="cible"><span class="radio-pill-lbl">Ciblé (problème précis)</span></label>
          <label class="radio-pill"><input type="radio" name="diag-type" value="complet"><span class="radio-pill-lbl">Complet (tout le système)</span></label>
        </div>
      </div>
      <div class="q-block">
        <label class="q-label" for="q-anomalies">Comportements anormaux récemment observés</label>
        <textarea class="f-textarea" id="q-anomalies" name="anomalies" placeholder="Décrivez tout comportement inhabituel..."></textarea>
      </div>`
  }
};
