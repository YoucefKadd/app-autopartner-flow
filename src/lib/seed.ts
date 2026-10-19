import { prisma } from "./prisma";

export async function ensureSeeded() {
  // Check if database has already been initialized (users exist)
  const existingUser = await prisma.user.findFirst();
  if (existingUser) return;

  // Reset old demo data if table was empty
  await prisma.note.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // Create Primary KAM user + Secondary KAM + Super Admin
  const kam1 = await prisma.user.create({
    data: {
      name: "Youcef K.",
      email: "youcef.kam@autopartner.fr",
      role: "KAM",
      title: "Key Account Manager — Réseau & Distributeurs",
    },
  });

  const kam2 = await prisma.user.create({
    data: {
      name: "Claire Moreau",
      email: "claire.m@autopartner.fr",
      role: "KAM",
      title: "Key Account Manager — Grands Comptes",
    },
  });

  await prisma.user.create({
    data: {
      name: "Marc Laurent",
      email: "direction@autopartner.fr",
      password: "autopartner2026",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      title: "Directeur Général (Super Admin)",
    },
  });

  await prisma.user.create({
    data: {
      name: "Jean-Philippe V.",
      email: "directeur@autopartner.fr",
      password: "autopartner2026",
      role: "DIRECTEUR",
      status: "ACTIVE",
      title: "Directeur des KAM",
    },
  });

  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Realistic Automotive Spare Parts Shops & Distributors for KAM 1 (Youcef)
  const clientsData = [
    {
      company: "Rhône-Alpes Pièces Auto (RAPA)",
      contactName: "Laurent Mercier",
      position: "Directeur des Achats (Distributeur Régional - 4 dépôts)",
      email: "l.mercier@rapa-auto.fr",
      phone: "04 72 18 45 90",
      city: "Lyon",
      status: "VIP",
      healthScore: 96,
      lastContactAt: daysAgo(1),
    },
    {
      company: "Comptoir du Frein & Embrayage",
      contactName: "Karim Benali",
      position: "Gérant — Magasin Pièces Détachées",
      email: "k.benali@comptoirdufrein.fr",
      phone: "01 48 32 11 65",
      city: "Saint-Denis (93)",
      status: "ACTIVE",
      healthScore: 91,
      lastContactAt: daysAgo(2),
    },
    {
      company: "Nord Auto Distribution (NAD)",
      contactName: "Stéphane Lemoine",
      position: "Responsable Plateforme & Approvisionnement",
      email: "s.lemoine@nad-pieces.fr",
      phone: "03 20 89 44 12",
      city: "Lille",
      status: "VIP",
      healthScore: 94,
      lastContactAt: daysAgo(3),
    },
    {
      company: "Sud-Ouest Autoparts",
      contactName: "Jérôme Cazaux",
      position: "Directeur Général (Grossiste Pièces VL/VUL)",
      email: "j.cazaux@so-autoparts.fr",
      phone: "05 56 41 29 80",
      city: "Bordeaux",
      status: "FOLLOW_UP",
      healthScore: 58,
      lastContactAt: daysAgo(19),
    },
    {
      company: "Auto Pièces Express 31",
      contactName: "Nicolas Marty",
      position: "Responsable Comptoir & Boutique Pièces",
      email: "contact@autopieces31.fr",
      phone: "05 61 74 02 33",
      city: "Toulouse",
      status: "ACTIVE",
      healthScore: 87,
      lastContactAt: daysAgo(5),
    },
    {
      company: "Armorique Pièces Services",
      contactName: "Yannick Le Goff",
      position: "Gérant (Adhérent Réseau Indépendant)",
      email: "y.legoff@armorique-pieces.bzh",
      phone: "02 99 54 18 70",
      city: "Rennes",
      status: "NEW",
      healthScore: 89,
      lastContactAt: daysAgo(1),
    },
    {
      company: "Phocéenne de Distribution Auto",
      contactName: "Marc-Antoine Rossi",
      position: "Acheteur Familles Freinage, Filtration & Liaison au sol",
      email: "ma.rossi@pda-marseille.fr",
      phone: "04 91 62 30 15",
      city: "Marseille",
      status: "FOLLOW_UP",
      healthScore: 52,
      lastContactAt: daysAgo(26),
    },
    {
      company: "Alsace Pièces & Outillage Garage",
      contactName: "Frédéric Weber",
      position: "Responsable Magasin (2 points de vente)",
      email: "f.weber@apog-auto.fr",
      phone: "03 88 27 91 04",
      city: "Strasbourg",
      status: "ACTIVE",
      healthScore: 85,
      lastContactAt: daysAgo(6),
    },
    {
      company: "Centrale Pièces Auto 44",
      contactName: "Olivier Moreau",
      position: "Directeur Magasin & Atelier Rectification",
      email: "o.moreau@cpa44.fr",
      phone: "02 40 73 19 52",
      city: "Nantes",
      status: "INACTIVE",
      healthScore: 42,
      lastContactAt: daysAgo(40),
    },
    {
      company: "Occitanie Freinage Distribution",
      contactName: "Guillaume Faure",
      position: "Responsable Achats — En prospection",
      email: "g.faure@occitanie-freinage.fr",
      phone: "05 62 10 44 20",
      city: "Montauban",
      status: "PROSPECT",
      healthScore: 78,
      lastContactAt: daysAgo(14),
    },
  ];

  const createdClients = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        ...c,
        kamId: kam1.id,
      },
    });
    createdClients.push(client);
  }

  // Secondary KAM (Claire) portfolio
  const claireClient = await prisma.client.create({
    data: {
      company: "Groupe Francilienne de Pièces (GFP)",
      contactName: "Philippe Garnier",
      position: "Directeur Réseau (8 magasins IDF)",
      email: "p.garnier@gfp-auto.fr",
      phone: "01 39 81 22 40",
      city: "Cergy",
      status: "VIP",
      healthScore: 95,
      lastContactAt: daysAgo(2),
      kamId: kam2.id,
    },
  });

  await prisma.client.create({
    data: {
      company: "Normandie Pièces Détachées",
      contactName: "David Lefèvre",
      position: "Gérant Boutique & Distributeur",
      email: "d.lefevre@npd-auto.fr",
      phone: "02 35 60 11 89",
      city: "Rouen",
      status: "ACTIVE",
      healthScore: 83,
      lastContactAt: daysAgo(7),
      kamId: kam2.id,
    },
  });

  // Realistic KAM notes for Automotive Aftermarket (Youcef)
  await prisma.note.createMany({
    data: [
      {
        title: "Négociation stock initial & Implantation MaXgear / Quaro (RAPA)",
        content:
          "Laurent Mercier valide l'implantation d'un stock tampon freinage (disques + plaquettes) et filtration sur leurs 4 dépôts lyonnais. Préparer l'accord RFA 2026 palier 350k€ et vérifier le franco de port.",
        category: "COMPTE_RENDU",
        pinned: true,
        clientId: createdClients[0].id, // RAPA
        kamId: kam1.id,
        createdAt: daysAgo(1),
      },
      {
        title: "Relance baisse de commandes — Sud-Ouest Autoparts",
        content:
          "Baisse de 30% sur les commandes d'embrayage et kits distribution ce mois-ci. Jérôme signale un écart tarifaire face à un concurrent local sur les références luk/valeo. Lui envoyer la nouvelle grille remisée Niveau S avant jeudi.",
        category: "RELANCE",
        pinned: true,
        clientId: createdClients[3].id, // Sud-Ouest Autoparts
        kamId: kam1.id,
        createdAt: daysAgo(2),
      },
      {
        title: "Mémo libre : Campagne stockage Hiver (Batteries, Balais, Démarrage)",
        content:
          "Proposer l'offre pré-saison Hiver (conditions de paiement 60j sur commande stock batteries + alternateurs/démarreurs) aux 5 plus gros distributeurs du portefeuille cette semaine.",
        category: "STRATEGIE",
        pinned: true,
        clientId: null, // Note libre
        kamId: kam1.id,
        createdAt: daysAgo(2),
      },
      {
        title: "Ouverture de compte & Accès Webshop — Armorique Pièces Services",
        content:
          "Kbis et RIB validés par la comptabilité. Plafond d'encours initial fixé à 25 000 €. Yannick attend ses accès catalogue Webshop AP + passerelle TecDoc pour passer sa première commande de stock vendredi.",
        category: "SUIVI",
        pinned: false,
        clientId: createdClients[5].id, // Armorique Pièces
        kamId: kam1.id,
        createdAt: daysAgo(1),
      },
      {
        title: "Point logistique retours consignes — Comptoir du Frein (93)",
        content:
          "Karim est très satisfait de la livraison biquotidienne mais demande l'enlèvement systématique des consignes étriers et alternateurs le jeudi matin avec avoir sous 5 jours.",
        category: "ALERTE",
        pinned: false,
        clientId: createdClients[1].id, // Comptoir du Frein
        kamId: kam1.id,
        createdAt: daysAgo(4),
      },
      {
        title: "Note libre : Références fortes à pousser en comptoir",
        content:
          "Mettre en avant les gammes propres et MDD à forte marge pour les boutiques comptoir qui cherchent une alternative compétitive aux équipementiers OES.",
        category: "LIBRE",
        pinned: false,
        clientId: null, // Note libre
        kamId: kam1.id,
        createdAt: daysAgo(5),
      },
    ],
  });

  await prisma.note.create({
    data: {
      title: "Accord annuel Groupe GFP validé",
      content: "Contrat cadre signé pour les 8 magasins d'Île-de-France.",
      category: "COMPTE_RENDU",
      pinned: true,
      clientId: claireClient.id,
      kamId: kam2.id,
    },
  });
}
