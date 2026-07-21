export type Language = 'fr' | 'en' | 'pt' | 'it' | 'es' | 'la';

export const LANGUAGES: { code: Language; label: string; flag: string; nativeName: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'la', label: 'Latin', flag: '🏛️', nativeName: 'Latina' },
];

export const translations = {
  fr: {
    // Navigation & Common
    settings: 'Paramètres',
    dashboard: 'Tableau de bord',
    menu: 'Menu',
    orders: 'Commandes',
    inventory: 'Inventaire',
    loyalty: 'Fidélisation',
    logout: 'Déconnexion',
    save: 'Enregistrer',
    cancel: 'Annuler',
    loading: 'Chargement...',
    success: 'Succès',
    error: 'Erreur',
    
    // Settings page
    settingsTitle: 'Paramètres Restaurant',
    settingsSubtitle: 'Gérez vos accès et la sécurité de votre établissement.',
    
    // Tabs
    security: 'Sécurité & Accès',
    profile: 'Profil Établissement',
    subscription: 'Abonnement & Plan',
    appearance: 'Apparence',
    currency: 'Taux de Change',
    language: 'Langue',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Langue de l\'interface',
    languageSubtitle: 'Choisissez la langue d\'affichage de votre tableau de bord.',
    languageSaved: 'Langue mise à jour avec succès !',
    selectLanguage: 'Sélectionner une langue',
    currentLanguage: 'Langue actuelle',
    languageTip: 'Le changement de langue prend effet immédiatement sur toutes les pages du dashboard.',
    
    // Security tab
    changePassword: 'Modifier le mot de passe',
    currentPassword: 'Mot de passe actuel (donné par l\'administrateur)',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    updatePassword: 'Enregistrer les modifications',
    updatingPassword: 'Mise à jour...',
    pinCode: 'Code PIN Bureau (6 chiffres)',
    pinDescription: 'Ce code protège les sections Gestion, Stratégie et Stock.',
    newPin: 'Nouveau Code PIN',
    updatePin: 'Modifier le Code PIN',
    importantNote: 'Note importante',
    passwordWarning: 'Le changement du mot de passe déconnectera tout autre gérant ayant accès à ce dashboard. Assurez-vous de communiquer le nouveau mot de passe à votre équipe de confiance.',
    
    // Profile tab
    profileTitle: 'Profil Établissement',
    profileSubtitle: 'Identité visuelle du restaurant',
    logoSource: 'Source du Logo',
    logoDescription: 'Vous pouvez soit uploader une image locale en cliquant sur l\'aperçu ci-dessus, soit coller une URL directe ci-dessous.',
    restaurantName: 'Nom de l\'établissement',
    logoUrl: 'URL du Logo (Optionnel)',
    
    // Subscription tab
    currentPlan: 'Plan Actuel',
    activeAccount: 'Compte Actif',
    suspendedAccount: 'Compte Suspendu',
    expiresOn: 'Expire le :',
    undefined: 'Indéfini',
    daysLeft: 'Jours Restants',
    plansTitle: 'Plans & Tarification SmartResto',
    essential: 'Essentiel',
    mostPopular: 'Plus Populaire',
    multiSite: 'Multi-Sites',
    perMonth: '/ Mois',
    activatePlan: 'Activer ce Plan',
    currentPlanBtn: 'Plan Actuel',
    activationProcess: 'Processus de Activation',
    activationDescription: 'Une fois votre demande envoyée, notre équipe vous contactera pour finaliser le paiement via FlexPaie (Orange, M-Pesa, Airtel ou Visa/Mastercard). Votre compte sera activé instantanément après confirmation.',
    
    // Appearance tab
    appearanceTitle: 'Apparence de l\'application',
    appearanceSubtitle: 'Personnalisez votre interface selon vos préférences ou l\'éclairage de votre établissement.',
    lightMode: 'Clair',
    darkMode: 'Sombre',
    systemMode: 'Système',
    appearanceTip: 'Astuce de confort',
    appearanceTipDescription: 'Le mode sombre réduit la fatigue oculaire lors des services de nuit, tandis que le mode clair est recommandé pour une lecture optimale sous un éclairage fort en journée.',
    
    // Currency tab
    currentRate: 'Taux Actuel',
    updateRate: 'Mettre à jour le taux',
    newRate: 'Nouveau taux (1 USD = ? FC)',
    preview: 'Aperçu',
    saveRate: 'Enregistrer le nouveau taux',
    savingRate: 'Enregistrement...',
    dailyReminder: 'Rappel quotidien',
    dailyReminderDescription: 'Le taux USD/FC varie souvent. Pour des factures exactes, mettez-le à jour chaque matin avant d\'ouvrir votre service. Le taux affiché sur les nouvelles commandes est celui sauvegardé au moment de la commande.',
    rateDescription: 'Ce taux est utilisé automatiquement pour convertir les factures en Francs Congolais (FC) lors de l\'impression. Mettez-le à jour chaque matin selon le taux du jour.',
  },
  en: {
    // Navigation & Common
    settings: 'Settings',
    dashboard: 'Dashboard',
    menu: 'Menu',
    orders: 'Orders',
    inventory: 'Inventory',
    loyalty: 'Loyalty',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    
    // Settings page
    settingsTitle: 'Restaurant Settings',
    settingsSubtitle: 'Manage your access and the security of your establishment.',
    
    // Tabs
    security: 'Security & Access',
    profile: 'Establishment Profile',
    subscription: 'Subscription & Plan',
    appearance: 'Appearance',
    currency: 'Exchange Rate',
    language: 'Language',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Interface Language',
    languageSubtitle: 'Choose the display language for your dashboard.',
    languageSaved: 'Language updated successfully!',
    selectLanguage: 'Select a language',
    currentLanguage: 'Current Language',
    languageTip: 'The language change takes effect immediately on all dashboard pages.',
    
    // Security tab
    changePassword: 'Change Password',
    currentPassword: 'Current password (given by the administrator)',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    updatePassword: 'Save changes',
    updatingPassword: 'Updating...',
    pinCode: 'Office PIN Code (6 digits)',
    pinDescription: 'This code protects the Management, Strategy and Stock sections.',
    newPin: 'New PIN Code',
    updatePin: 'Update PIN Code',
    importantNote: 'Important Note',
    passwordWarning: 'Changing the password will disconnect any other manager who has access to this dashboard. Make sure to communicate the new password to your trusted team.',
    
    // Profile tab
    profileTitle: 'Establishment Profile',
    profileSubtitle: 'Visual identity of the restaurant',
    logoSource: 'Logo Source',
    logoDescription: 'You can either upload a local image by clicking on the preview above, or paste a direct URL below.',
    restaurantName: 'Establishment name',
    logoUrl: 'Logo URL (Optional)',
    
    // Subscription tab
    currentPlan: 'Current Plan',
    activeAccount: 'Active Account',
    suspendedAccount: 'Suspended Account',
    expiresOn: 'Expires on:',
    undefined: 'Undefined',
    daysLeft: 'Days Remaining',
    plansTitle: 'SmartResto Plans & Pricing',
    essential: 'Essential',
    mostPopular: 'Most Popular',
    multiSite: 'Multi-Sites',
    perMonth: '/ Month',
    activatePlan: 'Activate this Plan',
    currentPlanBtn: 'Current Plan',
    activationProcess: 'Activation Process',
    activationDescription: 'Once your request is sent, our team will contact you to finalize payment via FlexPaie (Orange, M-Pesa, Airtel or Visa/Mastercard). Your account will be activated instantly after confirmation.',
    
    // Appearance tab
    appearanceTitle: 'Application Appearance',
    appearanceSubtitle: 'Customize your interface according to your preferences or establishment lighting.',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
    appearanceTip: 'Comfort Tip',
    appearanceTipDescription: 'Dark mode reduces eye strain during night service, while light mode is recommended for optimal reading under strong daylight.',
    
    // Currency tab
    currentRate: 'Current Rate',
    updateRate: 'Update the rate',
    newRate: 'New rate (1 USD = ? FC)',
    preview: 'Preview',
    saveRate: 'Save new rate',
    savingRate: 'Saving...',
    dailyReminder: 'Daily Reminder',
    dailyReminderDescription: 'The USD/CDF rate varies frequently. For accurate invoices, update it every morning before opening your service. The rate shown on new orders is the one saved at the time of the order.',
    rateDescription: 'This rate is automatically used to convert invoices to Congolese Francs (FC) when printing. Update it every morning according to the day\'s rate.',
  },
  pt: {
    // Navigation & Common
    settings: 'Configurações',
    dashboard: 'Painel',
    menu: 'Cardápio',
    orders: 'Pedidos',
    inventory: 'Estoque',
    loyalty: 'Fidelidade',
    logout: 'Sair',
    save: 'Salvar',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    success: 'Sucesso',
    error: 'Erro',
    
    // Settings page
    settingsTitle: 'Configurações do Restaurante',
    settingsSubtitle: 'Gerencie seu acesso e a segurança do seu estabelecimento.',
    
    // Tabs
    security: 'Segurança & Acesso',
    profile: 'Perfil do Estabelecimento',
    subscription: 'Assinatura & Plano',
    appearance: 'Aparência',
    currency: 'Taxa de Câmbio',
    language: 'Idioma',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Idioma da Interface',
    languageSubtitle: 'Escolha o idioma de exibição do seu painel.',
    languageSaved: 'Idioma atualizado com sucesso!',
    selectLanguage: 'Selecionar um idioma',
    currentLanguage: 'Idioma Atual',
    languageTip: 'A mudança de idioma tem efeito imediato em todas as páginas do painel.',
    
    // Security tab
    changePassword: 'Alterar Senha',
    currentPassword: 'Senha atual (fornecida pelo administrador)',
    newPassword: 'Nova senha',
    confirmPassword: 'Confirmar senha',
    updatePassword: 'Salvar alterações',
    updatingPassword: 'Atualizando...',
    pinCode: 'Código PIN do Escritório (6 dígitos)',
    pinDescription: 'Este código protege as seções de Gestão, Estratégia e Estoque.',
    newPin: 'Novo Código PIN',
    updatePin: 'Atualizar Código PIN',
    importantNote: 'Nota Importante',
    passwordWarning: 'A alteração da senha desconectará qualquer outro gerente que tenha acesso a este painel. Certifique-se de comunicar a nova senha à sua equipe de confiança.',
    
    // Profile tab
    profileTitle: 'Perfil do Estabelecimento',
    profileSubtitle: 'Identidade visual do restaurante',
    logoSource: 'Fonte do Logo',
    logoDescription: 'Você pode fazer upload de uma imagem local clicando na pré-visualização acima ou colar uma URL direta abaixo.',
    restaurantName: 'Nome do estabelecimento',
    logoUrl: 'URL do Logo (Opcional)',
    
    // Subscription tab
    currentPlan: 'Plano Atual',
    activeAccount: 'Conta Ativa',
    suspendedAccount: 'Conta Suspensa',
    expiresOn: 'Expira em:',
    undefined: 'Indefinido',
    daysLeft: 'Dias Restantes',
    plansTitle: 'Planos & Preços SmartResto',
    essential: 'Essencial',
    mostPopular: 'Mais Popular',
    multiSite: 'Multi-Sites',
    perMonth: '/ Mês',
    activatePlan: 'Ativar este Plano',
    currentPlanBtn: 'Plano Atual',
    activationProcess: 'Processo de Ativação',
    activationDescription: 'Uma vez enviado o pedido, nossa equipe entrará em contato para finalizar o pagamento via FlexPaie (Orange, M-Pesa, Airtel ou Visa/Mastercard). Sua conta será ativada instantaneamente após confirmação.',
    
    // Appearance tab
    appearanceTitle: 'Aparência da Aplicação',
    appearanceSubtitle: 'Personalize sua interface de acordo com suas preferências ou iluminação do estabelecimento.',
    lightMode: 'Claro',
    darkMode: 'Escuro',
    systemMode: 'Sistema',
    appearanceTip: 'Dica de Conforto',
    appearanceTipDescription: 'O modo escuro reduz o cansaço visual durante o serviço noturno, enquanto o modo claro é recomendado para leitura ideal sob forte iluminação diurna.',
    
    // Currency tab
    currentRate: 'Taxa Atual',
    updateRate: 'Atualizar a taxa',
    newRate: 'Nova taxa (1 USD = ? FC)',
    preview: 'Pré-visualização',
    saveRate: 'Salvar nova taxa',
    savingRate: 'Salvando...',
    dailyReminder: 'Lembrete Diário',
    dailyReminderDescription: 'A taxa USD/FC varia frequentemente. Para faturas precisas, atualize-a toda manhã antes de abrir seu serviço. A taxa exibida em novos pedidos é a salva no momento do pedido.',
    rateDescription: 'Esta taxa é usada automaticamente para converter faturas em Francos Congoleses (FC) na impressão. Atualize-a toda manhã conforme a taxa do dia.',
  },
  it: {
    // Navigation & Common
    settings: 'Impostazioni',
    dashboard: 'Pannello',
    menu: 'Menu',
    orders: 'Ordini',
    inventory: 'Inventario',
    loyalty: 'Fidelizzazione',
    logout: 'Esci',
    save: 'Salva',
    cancel: 'Annulla',
    loading: 'Caricamento...',
    success: 'Successo',
    error: 'Errore',
    
    // Settings page
    settingsTitle: 'Impostazioni Ristorante',
    settingsSubtitle: 'Gestisci il tuo accesso e la sicurezza del tuo esercizio.',
    
    // Tabs
    security: 'Sicurezza & Accesso',
    profile: 'Profilo Esercizio',
    subscription: 'Abbonamento & Piano',
    appearance: 'Aspetto',
    currency: 'Tasso di Cambio',
    language: 'Lingua',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Lingua dell\'Interfaccia',
    languageSubtitle: 'Scegli la lingua di visualizzazione del tuo pannello.',
    languageSaved: 'Lingua aggiornata con successo!',
    selectLanguage: 'Seleziona una lingua',
    currentLanguage: 'Lingua Attuale',
    languageTip: 'Il cambio di lingua ha effetto immediato su tutte le pagine del pannello.',
    
    // Security tab
    changePassword: 'Modifica Password',
    currentPassword: 'Password attuale (fornita dall\'amministratore)',
    newPassword: 'Nuova password',
    confirmPassword: 'Conferma password',
    updatePassword: 'Salva modifiche',
    updatingPassword: 'Aggiornamento...',
    pinCode: 'Codice PIN Ufficio (6 cifre)',
    pinDescription: 'Questo codice protegge le sezioni Gestione, Strategia e Stoccaggio.',
    newPin: 'Nuovo Codice PIN',
    updatePin: 'Aggiorna Codice PIN',
    importantNote: 'Nota Importante',
    passwordWarning: 'Il cambio della password disconnetterà qualsiasi altro manager che ha accesso a questo pannello. Assicurati di comunicare la nuova password al tuo team di fiducia.',
    
    // Profile tab
    profileTitle: 'Profilo Esercizio',
    profileSubtitle: 'Identità visiva del ristorante',
    logoSource: 'Fonte del Logo',
    logoDescription: 'Puoi caricare un\'immagine locale cliccando sull\'anteprima sopra, oppure incollare un URL diretto qui sotto.',
    restaurantName: 'Nome dell\'esercizio',
    logoUrl: 'URL del Logo (Facoltativo)',
    
    // Subscription tab
    currentPlan: 'Piano Attuale',
    activeAccount: 'Account Attivo',
    suspendedAccount: 'Account Sospeso',
    expiresOn: 'Scade il:',
    undefined: 'Indefinito',
    daysLeft: 'Giorni Rimanenti',
    plansTitle: 'Piani & Prezzi SmartResto',
    essential: 'Essenziale',
    mostPopular: 'Più Popolare',
    multiSite: 'Multi-Siti',
    perMonth: '/ Mese',
    activatePlan: 'Attiva questo Piano',
    currentPlanBtn: 'Piano Attuale',
    activationProcess: 'Processo di Attivazione',
    activationDescription: 'Una volta inviata la richiesta, il nostro team ti contatterà per finalizzare il pagamento tramite FlexPaie (Orange, M-Pesa, Airtel o Visa/Mastercard). Il tuo account sarà attivato istantaneamente dopo la conferma.',
    
    // Appearance tab
    appearanceTitle: 'Aspetto dell\'Applicazione',
    appearanceSubtitle: 'Personalizza la tua interfaccia in base alle tue preferenze o all\'illuminazione del tuo esercizio.',
    lightMode: 'Chiaro',
    darkMode: 'Scuro',
    systemMode: 'Sistema',
    appearanceTip: 'Consiglio di Comfort',
    appearanceTipDescription: 'La modalità scura riduce l\'affaticamento visivo durante il servizio notturno, mentre la modalità chiara è consigliata per una lettura ottimale con forte illuminazione diurna.',
    
    // Currency tab
    currentRate: 'Tasso Attuale',
    updateRate: 'Aggiorna il tasso',
    newRate: 'Nuovo tasso (1 USD = ? FC)',
    preview: 'Anteprima',
    saveRate: 'Salva nuovo tasso',
    savingRate: 'Salvataggio...',
    dailyReminder: 'Promemoria Giornaliero',
    dailyReminderDescription: 'Il tasso USD/FC varia spesso. Per fatture accurate, aggiornalo ogni mattina prima di aprire il servizio. Il tasso mostrato sui nuovi ordini è quello salvato al momento dell\'ordine.',
    rateDescription: 'Questo tasso viene utilizzato automaticamente per convertire le fatture in Franchi Congolesi (FC) durante la stampa. Aggiornalo ogni mattina secondo il tasso del giorno.',
  },
  es: {
    // Navigation & Common
    settings: 'Configuración',
    dashboard: 'Panel',
    menu: 'Menú',
    orders: 'Pedidos',
    inventory: 'Inventario',
    loyalty: 'Fidelización',
    logout: 'Cerrar sesión',
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    success: 'Éxito',
    error: 'Error',
    
    // Settings page
    settingsTitle: 'Configuración del Restaurante',
    settingsSubtitle: 'Gestiona tu acceso y la seguridad de tu establecimiento.',
    
    // Tabs
    security: 'Seguridad & Acceso',
    profile: 'Perfil del Establecimiento',
    subscription: 'Suscripción & Plan',
    appearance: 'Apariencia',
    currency: 'Tipo de Cambio',
    language: 'Idioma',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Idioma de la Interfaz',
    languageSubtitle: 'Elige el idioma de visualización de tu panel.',
    languageSaved: '¡Idioma actualizado con éxito!',
    selectLanguage: 'Seleccionar un idioma',
    currentLanguage: 'Idioma Actual',
    languageTip: 'El cambio de idioma tiene efecto inmediato en todas las páginas del panel.',
    
    // Security tab
    changePassword: 'Cambiar Contraseña',
    currentPassword: 'Contraseña actual (proporcionada por el administrador)',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    updatePassword: 'Guardar cambios',
    updatingPassword: 'Actualizando...',
    pinCode: 'Código PIN de Oficina (6 dígitos)',
    pinDescription: 'Este código protege las secciones de Gestión, Estrategia y Stock.',
    newPin: 'Nuevo Código PIN',
    updatePin: 'Actualizar Código PIN',
    importantNote: 'Nota Importante',
    passwordWarning: 'Cambiar la contraseña desconectará a cualquier otro gerente que tenga acceso a este panel. Asegúrate de comunicar la nueva contraseña a tu equipo de confianza.',
    
    // Profile tab
    profileTitle: 'Perfil del Establecimiento',
    profileSubtitle: 'Identidad visual del restaurante',
    logoSource: 'Fuente del Logo',
    logoDescription: 'Puedes subir una imagen local haciendo clic en la vista previa de arriba o pegar una URL directa a continuación.',
    restaurantName: 'Nombre del establecimiento',
    logoUrl: 'URL del Logo (Opcional)',
    
    // Subscription tab
    currentPlan: 'Plan Actual',
    activeAccount: 'Cuenta Activa',
    suspendedAccount: 'Cuenta Suspendida',
    expiresOn: 'Expira el:',
    undefined: 'Indefinido',
    daysLeft: 'Días Restantes',
    plansTitle: 'Planes & Precios SmartResto',
    essential: 'Esencial',
    mostPopular: 'Más Popular',
    multiSite: 'Multi-Sitios',
    perMonth: '/ Mes',
    activatePlan: 'Activar este Plan',
    currentPlanBtn: 'Plan Actual',
    activationProcess: 'Proceso de Activación',
    activationDescription: 'Una vez enviada la solicitud, nuestro equipo te contactará para finalizar el pago a través de FlexPaie (Orange, M-Pesa, Airtel o Visa/Mastercard). Tu cuenta se activará instantáneamente después de la confirmación.',
    
    // Appearance tab
    appearanceTitle: 'Apariencia de la Aplicación',
    appearanceSubtitle: 'Personaliza tu interfaz según tus preferencias o la iluminación de tu establecimiento.',
    lightMode: 'Claro',
    darkMode: 'Oscuro',
    systemMode: 'Sistema',
    appearanceTip: 'Consejo de Comodidad',
    appearanceTipDescription: 'El modo oscuro reduce la fatiga visual durante el servicio nocturno, mientras que el modo claro es recomendado para una lectura óptima bajo fuerte iluminación diurna.',
    
    // Currency tab
    currentRate: 'Tasa Actual',
    updateRate: 'Actualizar la tasa',
    newRate: 'Nueva tasa (1 USD = ? FC)',
    preview: 'Vista previa',
    saveRate: 'Guardar nueva tasa',
    savingRate: 'Guardando...',
    dailyReminder: 'Recordatorio Diario',
    dailyReminderDescription: 'La tasa USD/FC varía frecuentemente. Para facturas exactas, actualízala cada mañana antes de abrir tu servicio. La tasa mostrada en los nuevos pedidos es la guardada en el momento del pedido.',
    rateDescription: 'Esta tasa se utiliza automáticamente para convertir las facturas a Francos Congoleños (FC) durante la impresión. Actualízala cada mañana según la tasa del día.',
  },
  la: {
    // Navigation & Common
    settings: 'Optiones',
    dashboard: 'Tabula',
    menu: 'Index Epularum',
    orders: 'Mandata',
    inventory: 'Copia',
    loyalty: 'Fidelitas',
    logout: 'Exire',
    save: 'Servare',
    cancel: 'Tollere',
    loading: 'Onerat...',
    success: 'Res Secunda',
    error: 'Error',
    
    // Settings page
    settingsTitle: 'Optiones Popinae',
    settingsSubtitle: 'Guberna accessum et securitatem domus tuae.',
    
    // Tabs
    security: 'Securitas & Accessus',
    profile: 'Imago Domus',
    subscription: 'Prenumeratio & Consilium',
    appearance: 'Species',
    currency: 'Permutatio Pucuniae',
    language: 'Lingua',
    whatsapp: 'WhatsApp API',
    
    // Language tab
    languageTitle: 'Lingua Interfaciei',
    languageSubtitle: 'Elige linguam ad ostendendam tabulam tuam.',
    languageSaved: 'Lingua feliciter renovata!',
    selectLanguage: 'Elige linguam',
    currentLanguage: 'Lingua Praesens',
    languageTip: 'Mutatio linguae statim valebit in omnibus paginis tabulae.',
    
    // Security tab
    changePassword: 'Mutare Tessera',
    currentPassword: 'Tessera praesens (datur a procuratore)',
    newPassword: 'Nova tessera',
    confirmPassword: 'Confirma tessera',
    updatePassword: 'Servare mutationes',
    updatingPassword: 'Renovat...',
    pinCode: 'Codex PIN (6 numeri)',
    pinDescription: 'Hic codex tutat sectiones Gestionis, Strategiae, et Copiae.',
    newPin: 'Novus Codex PIN',
    updatePin: 'Renovare Codex PIN',
    importantNote: 'Nota Magni Momenti',
    passwordWarning: 'Mutatio tesserae disiunget quemvis alium procuratorem habentem accessum ad hanc tabulam. Certum fac te novam tesseram tuo turmae fidelissimae communicare.',
    
    // Profile tab
    profileTitle: 'Imago Domus',
    profileSubtitle: 'Identitas visualis popinae',
    logoSource: 'Fons Signi',
    logoDescription: 'Potes aut onerare imaginem localem deprimendo praevisionem supra, aut apponere URL directum infra.',
    restaurantName: 'Nomen domus',
    logoUrl: 'URL Signi (Optione)',
    
    // Subscription tab
    currentPlan: 'Consilium Praesens',
    activeAccount: 'Ratio Viva',
    suspendedAccount: 'Ratio Suspensa',
    expiresOn: 'Desinit actus ad:',
    undefined: 'Ignotum',
    daysLeft: 'Dies Reliqui',
    plansTitle: 'Consilia & Pretia SmartResto',
    essential: 'Necessarium',
    mostPopular: 'Gratiora',
    multiSite: 'Plures Loci',
    perMonth: '/ Mensis',
    activatePlan: 'Activa hoc Consilium',
    currentPlanBtn: 'Consilium Praesens',
    activationProcess: 'Processus Activationis',
    activationDescription: 'Cum petitio tua missa erit, turma nostra tecum loquetur ut finalizet praestationem per FlexPaie (Orange, M-Pesa, Airtel aut Visa/Mastercard). Ratio tua statim post confirmationem erit viva.',
    
    // Appearance tab
    appearanceTitle: 'Species Applicationis',
    appearanceSubtitle: 'Modera interfaciem secum praelationes tuas aut lumen domus tuae.',
    lightMode: 'Clarus',
    darkMode: 'Obscurus',
    systemMode: 'Systema',
    appearanceTip: 'Consilium Solacii',
    appearanceTipDescription: 'Modus obscurus defatigationem oculorum minuit in opere nocturno, cum modus clarus suadetur ad bene legendum in luce clara.',
    
    // Currency tab
    currentRate: 'Taux Praesens',
    updateRate: 'Renovare taux',
    newRate: 'Novus taux (1 USD = ? FC)',
    preview: 'Praevisio',
    saveRate: 'Servare novum taux',
    savingRate: 'Servans...',
    dailyReminder: 'Mementote Quotidie',
    dailyReminderDescription: 'Taux USD/FC saepe mutatur. Ut rationes sint exactae, renova taux omne mane priusquam servitium incipias. Taux ostensus in novis mandatis est ille qui momento mandati servatus est.',
    rateDescription: 'Hoc taux automatice utitur ut vertat rationes in Francos Congolenses (FC) in impressione. Renova id omne mane ad taux diei.',
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;
