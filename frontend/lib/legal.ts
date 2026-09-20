import type { Language } from "./translations";

/**
 * Textos jurídicos. O francês é o texto-base (mercado alvo); as demais línguas são
 * traduções. Marcadores substituídos na tela: {empresa} {sinal} {contato} {mediateur}.
 * ATENÇÃO: são modelos sólidos, mas devem ser validados por um advogado antes do lançamento.
 */
export interface Secao {
  t: string;
  p?: string[];
  l?: string[];
  /** Só aparece se a configuração correspondente estiver preenchida no painel. */
  cond?: "mediateur";
}
export interface DocLegal {
  titulo: string;
  sub: string;
  secoes: Secao[];
}

export const ATUALIZADO_EM = "2026-09-19";

export const ROTULO_ATUALIZADO: Record<Language, string> = {
  fr: "Dernière mise à jour",
  pt: "Última atualização",
  en: "Last updated",
  es: "Última actualización",
  de: "Zuletzt aktualisiert",
  it: "Ultimo aggiornamento",
};

// ---------------------------------------------------------------------------
// Conditions générales de vente
// ---------------------------------------------------------------------------
export const CGV: Record<Language, DocLegal> = {
  fr: {
    titulo: "Conditions générales de vente",
    sub: "Transferts privés avec chauffeur — {empresa}",
    secoes: [
      { t: "1. Objet", p: [
        "Les présentes conditions régissent les réservations de transferts privés avec chauffeur effectuées sur ce site auprès de {empresa}, dans les régions Île-de-France (Paris, aéroports CDG et Orly, Disneyland, Versailles), Bouches-du-Rhône (Marseille, Aix-en-Provence) et Alpes-Maritimes (Nice, Cannes, Antibes).",
        "Toute réservation implique l'acceptation pleine et entière des présentes conditions." ] },
      { t: "2. Réservation", p: [
        "Vous choisissez le trajet, la date, l'heure, le nombre de passagers et la catégorie de véhicule. La disponibilité du véhicule est vérifiée en temps réel.",
        "Votre réservation n'est validée qu'après réception du paiement minimum décrit à l'article 3. Tant que ce paiement n'est pas effectué, la demande n'est pas confirmée et le véhicule n'est retenu que pendant un court délai." ] },
      { t: "3. Prix et paiement", p: [
        "Les prix sont fixes par trajet et par catégorie de véhicule, exprimés en euros et affichés avant la validation, sans frais cachés. Pour un aller-retour, le prix total correspond à deux fois le prix d'un trajet.",
        "Pour valider votre réservation, vous devez payer au moins {sinal} % du montant total (acompte) ou la totalité. Le solde éventuel est réglé avant ou le jour du trajet, en ligne (lien de paiement) ou selon les modalités convenues avec notre équipe.",
        "Le paiement s'effectue par carte bancaire (CB, Visa, Mastercard) via SumUp, prestataire de paiement sécurisé. Nous ne conservons aucune donnée de carte bancaire." ] },
      { t: "4. Confirmation et organisation du trajet", p: [
        "Après validation, votre réservation reçoit un code de réservation. Lorsque votre chauffeur est attribué, notre équipe vous communique les informations utiles à la prise en charge (par WhatsApp ou e-mail).",
        "Pour un transfert depuis un aéroport, indiquez votre numéro de vol afin que nous suivions votre heure d'arrivée." ] },
      { t: "5. Annulation et modification", p: [
        "L'annulation est gratuite jusqu'à 24 heures avant l'heure de prise en charge : les sommes versées sont intégralement remboursées sur le moyen de paiement utilisé (délai bancaire habituel).",
        "Au-delà de ce délai, ou en cas de non-présentation, la demande est examinée par notre service client. Pour annuler ou modifier une réservation (date, heure, lieu), contactez-nous par WhatsApp ; toute modification reste soumise à la disponibilité." ] },
      { t: "6. Droit de rétractation", p: [
        "Conformément à la réglementation applicable aux prestations de transport de personnes fournies à une date déterminée, le droit de rétractation de 14 jours ne s'applique pas à ces réservations. L'annulation gratuite prévue à l'article 5 reste toutefois applicable." ] },
      { t: "7. Retards de vol et attente", p: [
        "Pour les transferts depuis un aéroport, votre chauffeur suit l'heure d'arrivée de votre vol. Une attente de courtoisie pouvant aller jusqu'à 60 minutes est incluse en cas de retard suivi ; aucun supplément n'est facturé pour le temps de débarquement." ] },
      { t: "8. Obligations du client", p: [
        "Vous vous engagez à fournir des informations exactes (nom, coordonnées, nombre de passagers, bagages, numéro de vol) et à respecter la capacité du véhicule choisi. Des informations inexactes peuvent empêcher ou modifier la prestation.",
        "Un siège enfant peut être nécessaire selon l'âge des enfants transportés : indiquez-le lors de la réservation afin que nous vérifiions sa disponibilité." ] },
      { t: "9. Responsabilité", p: [
        "Nous mettons en œuvre les moyens nécessaires pour assurer la prestation à l'heure convenue. Notre responsabilité ne saurait être engagée en cas de force majeure ou d'événement indépendant de notre volonté (conditions de circulation exceptionnelles, intempéries, grèves, fermeture de voies), sous réserve des droits que vous tenez de la loi." ] },
      { t: "10. Médiation de la consommation", cond: "mediateur", p: [
        "En cas de litige non résolu avec notre service client, vous pouvez recourir gratuitement au médiateur de la consommation suivant : {mediateur}." ] },
      { t: "11. Droit applicable et litiges", p: [
        "Les présentes conditions sont soumises au droit français. En cas de litige, et à défaut de solution amiable, les tribunaux français sont compétents ; le consommateur peut saisir la juridiction de son lieu de résidence conformément à la loi." ] },
      { t: "12. Contact", p: ["Pour toute question, contactez-nous : {contato}."] },
    ],
  },
  pt: {
    titulo: "Condições Gerais de Venda",
    sub: "Transfers privados com motorista — {empresa}",
    secoes: [
      { t: "1. Objeto", p: [
        "Estas condições regem as reservas de transfers privados com motorista feitas neste site junto à {empresa}, nas regiões de Île-de-France (Paris, aeroportos CDG e Orly, Disneyland, Versailles), Bouches-du-Rhône (Marseille, Aix-en-Provence) e Alpes-Maritimes (Nice, Cannes, Antibes).",
        "Toda reserva implica a aceitação plena destas condições." ] },
      { t: "2. Reserva", p: [
        "Você escolhe o trajeto, a data, o horário, o número de passageiros e a categoria do veículo. A disponibilidade do veículo é verificada em tempo real.",
        "Sua reserva só é concluída após o recebimento do pagamento mínimo descrito no artigo 3. Enquanto esse pagamento não for feito, o pedido não está confirmado e o veículo fica retido apenas por um curto prazo." ] },
      { t: "3. Preços e pagamento", p: [
        "Os preços são fixos por trajeto e categoria de veículo, em euros, exibidos antes da confirmação e sem taxas ocultas. Em viagens de ida e volta, o preço total corresponde a duas vezes o preço do trecho.",
        "Para concluir a reserva, você deve pagar pelo menos {sinal}% do valor total (sinal) ou o valor integral. O saldo, se houver, é pago antes ou no dia da viagem, online (link de pagamento) ou conforme combinado com nossa equipe.",
        "O pagamento é feito por cartão (CB, Visa, Mastercard) pela SumUp, prestadora de pagamentos segura. Não guardamos dados de cartão." ] },
      { t: "4. Confirmação e organização da viagem", p: [
        "Após a conclusão, sua reserva recebe um código. Quando o motorista é definido, nossa equipe envia as informações úteis para o embarque (por WhatsApp ou e-mail).",
        "Em transfers de aeroporto, informe o número do voo para acompanharmos seu horário de chegada." ] },
      { t: "5. Cancelamento e alteração", p: [
        "O cancelamento é gratuito até 24 horas antes do horário de embarque: os valores pagos são integralmente reembolsados no meio de pagamento usado (prazo bancário habitual).",
        "Após esse prazo, ou em caso de não comparecimento, o pedido é analisado por nosso atendimento. Para cancelar ou alterar uma reserva (data, horário, local), fale conosco pelo WhatsApp; toda alteração depende de disponibilidade." ] },
      { t: "6. Direito de arrependimento", p: [
        "Conforme a regulamentação aplicável a serviços de transporte de pessoas prestados em data determinada, o direito de arrependimento de 14 dias não se aplica a estas reservas. O cancelamento gratuito do artigo 5 continua valendo." ] },
      { t: "7. Atrasos de voo e espera", p: [
        "Em transfers de aeroporto, o motorista acompanha o horário de chegada do seu voo. Está incluída uma espera de cortesia de até 60 minutos em caso de atraso monitorado; não há cobrança pelo tempo de desembarque." ] },
      { t: "8. Obrigações do cliente", p: [
        "Você se compromete a informar dados corretos (nome, contatos, número de passageiros, bagagens, número do voo) e a respeitar a capacidade do veículo escolhido. Informações incorretas podem impedir ou alterar o serviço.",
        "Cadeirinha infantil pode ser necessária conforme a idade das crianças: informe na reserva para verificarmos a disponibilidade." ] },
      { t: "9. Responsabilidade", p: [
        "Empregamos os meios necessários para prestar o serviço no horário combinado. Não nos responsabilizamos por casos de força maior ou eventos alheios à nossa vontade (trânsito excepcional, intempéries, greves, interdição de vias), sem prejuízo dos direitos que a lei lhe assegura." ] },
      { t: "10. Mediação de consumo", cond: "mediateur", p: [
        "Em caso de litígio não resolvido com nosso atendimento, você pode recorrer gratuitamente ao mediador de consumo: {mediateur}." ] },
      { t: "11. Lei aplicável e litígios", p: [
        "Estas condições são regidas pela lei francesa. Em caso de litígio, na falta de solução amigável, os tribunais franceses são competentes; o consumidor pode acionar a justiça do seu local de residência, nos termos da lei." ] },
      { t: "12. Contato", p: ["Para qualquer dúvida, fale conosco: {contato}."] },
    ],
  },
  en: {
    titulo: "General Terms of Sale",
    sub: "Private chauffeur transfers — {empresa}",
    secoes: [
      { t: "1. Purpose", p: [
        "These terms govern bookings of private chauffeur transfers made on this website with {empresa}, in the regions of Île-de-France (Paris, CDG and Orly airports, Disneyland, Versailles), Bouches-du-Rhône (Marseille, Aix-en-Provence) and Alpes-Maritimes (Nice, Cannes, Antibes).",
        "Every booking implies full acceptance of these terms." ] },
      { t: "2. Booking", p: [
        "You choose the route, date, time, number of passengers and vehicle category. Vehicle availability is checked in real time.",
        "Your booking is only completed once the minimum payment described in article 3 has been received. Until then the request is not confirmed and the vehicle is held only for a short time." ] },
      { t: "3. Prices and payment", p: [
        "Prices are fixed per route and vehicle category, in euros, shown before you confirm, with no hidden fees. For a return trip the total price is twice the price of one leg.",
        "To complete your booking you must pay at least {sinal}% of the total amount (deposit) or the full amount. Any balance is paid before or on the day of the trip, online (payment link) or as agreed with our team.",
        "Payment is made by card (CB, Visa, Mastercard) through SumUp, a secure payment provider. We do not store any card data." ] },
      { t: "4. Confirmation and trip organisation", p: [
        "Once completed, your booking receives a booking code. When your driver is assigned, our team sends you the useful pickup information (via WhatsApp or e-mail).",
        "For airport transfers, please give your flight number so that we can follow your arrival time." ] },
      { t: "5. Cancellation and changes", p: [
        "Cancellation is free up to 24 hours before the pickup time: amounts paid are refunded in full to the payment method used (usual banking delay).",
        "After this deadline, or in case of a no-show, the request is reviewed by our customer service. To cancel or change a booking (date, time, place), contact us on WhatsApp; any change is subject to availability." ] },
      { t: "6. Right of withdrawal", p: [
        "In accordance with the rules applicable to passenger transport services provided on a specific date, the 14-day right of withdrawal does not apply to these bookings. The free cancellation in article 5 still applies." ] },
      { t: "7. Flight delays and waiting time", p: [
        "For airport transfers, your driver follows your flight's arrival time. A courtesy wait of up to 60 minutes is included in case of a monitored delay; no extra charge is made for the time it takes you to disembark." ] },
      { t: "8. Customer obligations", p: [
        "You undertake to provide accurate information (name, contact details, number of passengers, luggage, flight number) and to respect the capacity of the chosen vehicle. Inaccurate information may prevent or alter the service.",
        "A child seat may be required depending on the age of the children travelling: please state this when booking so that we can check availability." ] },
      { t: "9. Liability", p: [
        "We use the means necessary to provide the service at the agreed time. We cannot be held liable in cases of force majeure or events beyond our control (exceptional traffic, bad weather, strikes, road closures), without prejudice to your statutory rights." ] },
      { t: "10. Consumer mediation", cond: "mediateur", p: [
        "If a dispute with our customer service is not resolved, you may use the following consumer mediator free of charge: {mediateur}." ] },
      { t: "11. Governing law and disputes", p: [
        "These terms are governed by French law. In case of dispute, and failing an amicable solution, French courts have jurisdiction; consumers may bring proceedings before the court of their place of residence as provided by law." ] },
      { t: "12. Contact", p: ["For any question, contact us: {contato}."] },
    ],
  },
  es: {
    titulo: "Condiciones generales de venta",
    sub: "Traslados privados con conductor — {empresa}",
    secoes: [
      { t: "1. Objeto", p: [
        "Estas condiciones regulan las reservas de traslados privados con conductor realizadas en este sitio con {empresa}, en las regiones de Isla de Francia (París, aeropuertos CDG y Orly, Disneyland, Versalles), Bocas del Ródano (Marsella, Aix-en-Provence) y Alpes Marítimos (Niza, Cannes, Antibes).",
        "Toda reserva implica la aceptación plena de estas condiciones." ] },
      { t: "2. Reserva", p: [
        "Usted elige el trayecto, la fecha, la hora, el número de pasajeros y la categoría del vehículo. La disponibilidad del vehículo se comprueba en tiempo real.",
        "Su reserva solo se completa una vez recibido el pago mínimo descrito en el artículo 3. Mientras no se realice ese pago, la solicitud no está confirmada y el vehículo solo se retiene durante un breve plazo." ] },
      { t: "3. Precios y pago", p: [
        "Los precios son fijos por trayecto y categoría de vehículo, en euros, se muestran antes de confirmar y no incluyen tasas ocultas. En viajes de ida y vuelta, el precio total es el doble del precio de un trayecto.",
        "Para completar la reserva debe pagar al menos el {sinal} % del importe total (depósito) o el importe íntegro. El saldo, si lo hay, se abona antes o el día del viaje, en línea (enlace de pago) o según lo acordado con nuestro equipo.",
        "El pago se realiza con tarjeta (CB, Visa, Mastercard) a través de SumUp, proveedor de pagos seguro. No conservamos datos de tarjeta." ] },
      { t: "4. Confirmación y organización del viaje", p: [
        "Una vez completada, su reserva recibe un código. Cuando se asigna el conductor, nuestro equipo le envía la información útil para la recogida (por WhatsApp o correo electrónico).",
        "En traslados desde aeropuerto, indique su número de vuelo para que sigamos su hora de llegada." ] },
      { t: "5. Cancelación y modificación", p: [
        "La cancelación es gratuita hasta 24 horas antes de la hora de recogida: las cantidades abonadas se reembolsan íntegramente por el medio de pago utilizado (plazo bancario habitual).",
        "Pasado ese plazo, o en caso de no presentación, la solicitud es examinada por nuestro servicio de atención al cliente. Para cancelar o modificar una reserva (fecha, hora, lugar), contáctenos por WhatsApp; toda modificación está sujeta a disponibilidad." ] },
      { t: "6. Derecho de desistimiento", p: [
        "De conformidad con la normativa aplicable a los servicios de transporte de personas prestados en una fecha determinada, el derecho de desistimiento de 14 días no se aplica a estas reservas. La cancelación gratuita del artículo 5 sigue siendo aplicable." ] },
      { t: "7. Retrasos de vuelo y espera", p: [
        "En traslados desde aeropuerto, su conductor sigue la hora de llegada de su vuelo. Se incluye una espera de cortesía de hasta 60 minutos en caso de retraso controlado; no se cobra suplemento por el tiempo de desembarque." ] },
      { t: "8. Obligaciones del cliente", p: [
        "Usted se compromete a facilitar información exacta (nombre, datos de contacto, número de pasajeros, equipaje, número de vuelo) y a respetar la capacidad del vehículo elegido. La información inexacta puede impedir o modificar el servicio.",
        "Puede ser necesaria una silla infantil según la edad de los niños: indíquelo al reservar para que comprobemos su disponibilidad." ] },
      { t: "9. Responsabilidad", p: [
        "Empleamos los medios necesarios para prestar el servicio a la hora acordada. No seremos responsables en casos de fuerza mayor o de hechos ajenos a nuestra voluntad (tráfico excepcional, inclemencias meteorológicas, huelgas, cierre de vías), sin perjuicio de los derechos que la ley le reconoce." ] },
      { t: "10. Mediación de consumo", cond: "mediateur", p: [
        "Si un conflicto con nuestro servicio de atención al cliente no se resuelve, puede acudir gratuitamente al siguiente mediador de consumo: {mediateur}." ] },
      { t: "11. Ley aplicable y litigios", p: [
        "Estas condiciones se rigen por el derecho francés. En caso de litigio y a falta de solución amistosa, son competentes los tribunales franceses; el consumidor puede acudir al tribunal de su lugar de residencia conforme a la ley." ] },
      { t: "12. Contacto", p: ["Para cualquier consulta, contáctenos: {contato}."] },
    ],
  },
  de: {
    titulo: "Allgemeine Verkaufsbedingungen",
    sub: "Private Chauffeur-Transfers — {empresa}",
    secoes: [
      { t: "1. Gegenstand", p: [
        "Diese Bedingungen regeln Buchungen privater Chauffeur-Transfers, die auf dieser Website bei {empresa} vorgenommen werden, in den Regionen Île-de-France (Paris, Flughäfen CDG und Orly, Disneyland, Versailles), Bouches-du-Rhône (Marseille, Aix-en-Provence) und Alpes-Maritimes (Nizza, Cannes, Antibes).",
        "Jede Buchung bedeutet die uneingeschränkte Annahme dieser Bedingungen." ] },
      { t: "2. Buchung", p: [
        "Sie wählen Strecke, Datum, Uhrzeit, Passagierzahl und Fahrzeugkategorie. Die Verfügbarkeit des Fahrzeugs wird in Echtzeit geprüft.",
        "Ihre Buchung ist erst abgeschlossen, wenn die in Artikel 3 beschriebene Mindestzahlung eingegangen ist. Bis dahin ist die Anfrage nicht bestätigt und das Fahrzeug wird nur für kurze Zeit reserviert gehalten." ] },
      { t: "3. Preise und Zahlung", p: [
        "Die Preise sind pro Strecke und Fahrzeugkategorie fest, in Euro angegeben, werden vor der Bestätigung angezeigt und enthalten keine versteckten Gebühren. Bei Hin- und Rückfahrten beträgt der Gesamtpreis das Doppelte einer Strecke.",
        "Zum Abschluss der Buchung müssen Sie mindestens {sinal} % des Gesamtbetrags (Anzahlung) oder den vollen Betrag bezahlen. Ein etwaiger Restbetrag wird vor oder am Tag der Fahrt beglichen, online (Zahlungslink) oder nach Absprache mit unserem Team.",
        "Die Zahlung erfolgt per Karte (CB, Visa, Mastercard) über SumUp, einen sicheren Zahlungsdienstleister. Wir speichern keine Kartendaten." ] },
      { t: "4. Bestätigung und Organisation der Fahrt", p: [
        "Nach Abschluss erhält Ihre Buchung einen Buchungscode. Sobald Ihr Fahrer zugewiesen ist, teilt Ihnen unser Team die wichtigen Informationen zur Abholung mit (per WhatsApp oder E-Mail).",
        "Bei Flughafentransfers geben Sie bitte Ihre Flugnummer an, damit wir Ihre Ankunftszeit verfolgen können." ] },
      { t: "5. Stornierung und Änderung", p: [
        "Die Stornierung ist bis 24 Stunden vor der Abholzeit kostenlos: Gezahlte Beträge werden vollständig auf das verwendete Zahlungsmittel erstattet (übliche Bankdauer).",
        "Danach oder bei Nichterscheinen wird die Anfrage von unserem Kundenservice geprüft. Zum Stornieren oder Ändern einer Buchung (Datum, Uhrzeit, Ort) kontaktieren Sie uns über WhatsApp; jede Änderung unterliegt der Verfügbarkeit." ] },
      { t: "6. Widerrufsrecht", p: [
        "Nach den für Personenbeförderungsleistungen zu einem bestimmten Termin geltenden Vorschriften besteht für diese Buchungen kein 14-tägiges Widerrufsrecht. Die kostenlose Stornierung nach Artikel 5 bleibt anwendbar." ] },
      { t: "7. Flugverspätungen und Wartezeit", p: [
        "Bei Flughafentransfers verfolgt Ihr Fahrer die Ankunftszeit Ihres Fluges. Bei überwachter Verspätung ist eine kulante Wartezeit von bis zu 60 Minuten inbegriffen; für die Zeit des Aussteigens wird kein Aufpreis berechnet." ] },
      { t: "8. Pflichten des Kunden", p: [
        "Sie verpflichten sich, korrekte Angaben zu machen (Name, Kontaktdaten, Passagierzahl, Gepäck, Flugnummer) und die Kapazität des gewählten Fahrzeugs einzuhalten. Falsche Angaben können die Leistung verhindern oder verändern.",
        "Je nach Alter der Kinder kann ein Kindersitz erforderlich sein: Bitte geben Sie dies bei der Buchung an, damit wir die Verfügbarkeit prüfen können." ] },
      { t: "9. Haftung", p: [
        "Wir setzen die erforderlichen Mittel ein, um die Leistung zur vereinbarten Zeit zu erbringen. Wir haften nicht bei höherer Gewalt oder Ereignissen außerhalb unseres Einflusses (außergewöhnliche Verkehrslage, Unwetter, Streiks, Straßensperrungen), unbeschadet Ihrer gesetzlichen Rechte." ] },
      { t: "10. Verbraucherschlichtung", cond: "mediateur", p: [
        "Bleibt eine Streitigkeit mit unserem Kundenservice ungelöst, können Sie kostenlos die folgende Verbraucherschlichtungsstelle anrufen: {mediateur}." ] },
      { t: "11. Anwendbares Recht und Streitigkeiten", p: [
        "Diese Bedingungen unterliegen französischem Recht. Bei Streitigkeiten sind mangels gütlicher Einigung die französischen Gerichte zuständig; Verbraucher können nach Maßgabe des Gesetzes das Gericht an ihrem Wohnort anrufen." ] },
      { t: "12. Kontakt", p: ["Bei Fragen kontaktieren Sie uns: {contato}."] },
    ],
  },
  it: {
    titulo: "Condizioni generali di vendita",
    sub: "Transfer privati con autista — {empresa}",
    secoes: [
      { t: "1. Oggetto", p: [
        "Le presenti condizioni disciplinano le prenotazioni di transfer privati con autista effettuate su questo sito presso {empresa}, nelle regioni Île-de-France (Parigi, aeroporti CDG e Orly, Disneyland, Versailles), Bouches-du-Rhône (Marsiglia, Aix-en-Provence) e Alpes-Maritimes (Nizza, Cannes, Antibes).",
        "Ogni prenotazione implica l'accettazione piena delle presenti condizioni." ] },
      { t: "2. Prenotazione", p: [
        "Scegli il percorso, la data, l'orario, il numero di passeggeri e la categoria del veicolo. La disponibilità del veicolo viene verificata in tempo reale.",
        "La prenotazione è completata solo dopo la ricezione del pagamento minimo descritto all'articolo 3. Finché il pagamento non è effettuato, la richiesta non è confermata e il veicolo viene trattenuto solo per un breve periodo." ] },
      { t: "3. Prezzi e pagamento", p: [
        "I prezzi sono fissi per tratta e categoria di veicolo, in euro, mostrati prima della conferma e senza costi nascosti. Per l'andata e ritorno il prezzo totale è il doppio del prezzo di una tratta.",
        "Per completare la prenotazione devi pagare almeno il {sinal}% dell'importo totale (acconto) o l'intero importo. L'eventuale saldo si paga prima o il giorno del viaggio, online (link di pagamento) o secondo quanto concordato con il nostro team.",
        "Il pagamento avviene con carta (CB, Visa, Mastercard) tramite SumUp, fornitore di pagamenti sicuro. Non conserviamo dati di carta." ] },
      { t: "4. Conferma e organizzazione del viaggio", p: [
        "Una volta completata, la prenotazione riceve un codice. Quando l'autista viene assegnato, il nostro team ti invia le informazioni utili per il ritiro (via WhatsApp o e-mail).",
        "Per i transfer da aeroporto, indica il numero del volo così potremo seguire il tuo orario di arrivo." ] },
      { t: "5. Annullamento e modifica", p: [
        "L'annullamento è gratuito fino a 24 ore prima dell'orario di ritiro: le somme versate vengono rimborsate integralmente sul mezzo di pagamento utilizzato (tempi bancari abituali).",
        "Oltre tale termine, o in caso di mancata presentazione, la richiesta viene esaminata dal nostro servizio clienti. Per annullare o modificare una prenotazione (data, orario, luogo) contattaci su WhatsApp; ogni modifica è soggetta a disponibilità." ] },
      { t: "6. Diritto di recesso", p: [
        "In conformità alla normativa applicabile ai servizi di trasporto di persone forniti a una data determinata, il diritto di recesso di 14 giorni non si applica a queste prenotazioni. L'annullamento gratuito di cui all'articolo 5 resta applicabile." ] },
      { t: "7. Ritardi del volo e attesa", p: [
        "Per i transfer da aeroporto, l'autista segue l'orario di arrivo del tuo volo. È inclusa un'attesa di cortesia fino a 60 minuti in caso di ritardo monitorato; nessun supplemento per il tempo di sbarco." ] },
      { t: "8. Obblighi del cliente", p: [
        "Ti impegni a fornire informazioni esatte (nome, recapiti, numero di passeggeri, bagagli, numero del volo) e a rispettare la capacità del veicolo scelto. Informazioni inesatte possono impedire o modificare il servizio.",
        "In base all'età dei bambini può essere necessario un seggiolino: indicalo in fase di prenotazione affinché possiamo verificarne la disponibilità." ] },
      { t: "9. Responsabilità", p: [
        "Adottiamo i mezzi necessari per fornire il servizio all'orario concordato. Non rispondiamo dei casi di forza maggiore o di eventi indipendenti dalla nostra volontà (traffico eccezionale, maltempo, scioperi, chiusura di strade), fatti salvi i diritti riconosciuti dalla legge." ] },
      { t: "10. Mediazione dei consumatori", cond: "mediateur", p: [
        "Se una controversia con il nostro servizio clienti non viene risolta, puoi rivolgerti gratuitamente al seguente mediatore dei consumatori: {mediateur}." ] },
      { t: "11. Legge applicabile e controversie", p: [
        "Le presenti condizioni sono regolate dal diritto francese. In caso di controversia, in mancanza di soluzione amichevole, sono competenti i tribunali francesi; il consumatore può adire il giudice del proprio luogo di residenza ai sensi di legge." ] },
      { t: "12. Contatti", p: ["Per qualsiasi domanda, contattaci: {contato}."] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Politique de confidentialité (RGPD)
// ---------------------------------------------------------------------------
export const CONFIDENTIALITE: Record<Language, DocLegal> = {
  fr: {
    titulo: "Politique de confidentialité",
    sub: "Protection de vos données personnelles — {empresa}",
    secoes: [
      { t: "1. Responsable du traitement", p: ["{empresa} est responsable du traitement des données personnelles collectées sur ce site. Pour toute question relative à vos données : {contato}."] },
      { t: "2. Données collectées lors d'une réservation", p: ["Lorsque vous réservez un transfert, nous collectons :"], l: [
        "votre identité et vos coordonnées : nom, e-mail, téléphone ;",
        "les informations du trajet : lieux, dates et heures, nombre de passagers, numéro de vol, remarques ;",
        "vos préférences : langue et devise ;",
        "le statut et le montant de votre paiement — les données de carte bancaire sont saisies directement chez SumUp et ne nous sont jamais transmises." ] },
      { t: "3. Partenaires et données techniques", p: [
        "Lors d'une candidature de partenaire : nom, société, adresse, coordonnées et, une fois le partenariat établi, coordonnées bancaires nécessaires aux règlements.",
        "Données techniques : adresse IP, conservée dans les journaux de sécurité et de limitation des abus." ] },
      { t: "4. Finalités et bases légales", l: [
        "Exécution du contrat : traiter votre réservation, organiser le trajet, encaisser le paiement et vous contacter à ce sujet ;",
        "Obligation légale : tenue de la comptabilité et conservation des pièces justificatives ;",
        "Intérêt légitime : sécurité du site, prévention de la fraude et des abus, amélioration du service ;",
        "Mesures précontractuelles : examen des candidatures de partenaires." ] },
      { t: "5. Destinataires", p: [
        "Vos données ne sont jamais vendues. Elles sont accessibles uniquement à notre équipe et, dans la mesure nécessaire à la prestation, au chauffeur partenaire chargé de votre trajet.",
        "Nous faisons appel à des prestataires (sous-traitants) : SumUp (paiement par carte), Netlify (hébergement du site) et Supabase (base de données, hébergée dans l'Union européenne)." ] },
      { t: "6. Transferts hors de l'Union européenne", p: ["Certains prestataires (notamment Netlify) peuvent traiter des données en dehors de l'Union européenne. Ces transferts sont encadrés par les garanties appropriées prévues par le RGPD (clauses contractuelles types ou décision d'adéquation)."] },
      { t: "7. Durées de conservation", l: [
        "Réservations et justificatifs de paiement : 10 ans, conformément aux obligations comptables ;",
        "Candidatures de partenaires : pendant la durée de la relation, puis suppression sur demande hors obligations légales ;",
        "Journaux de sécurité de l'espace d'administration : 12 mois ;",
        "Compteurs de limitation des abus : 24 heures." ] },
      { t: "8. Vos droits", p: [
        "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Pour l'exercer, écrivez-nous : {contato}. Nous répondons dans un délai d'un mois.",
        "Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07)." ] },
      { t: "9. Cookies et traceurs", p: [
        "Ce site n'utilise ni cookies publicitaires ni outil de mesure d'audience. Il enregistre uniquement, dans votre navigateur, vos préférences de langue et de devise (stockage local) ; l'espace d'administration utilise un cookie de session strictement nécessaire. Ces usages ne nécessitent pas votre consentement.",
        "Si nous ajoutons un jour un outil de mesure d'audience ou de publicité, nous recueillerons votre consentement au préalable." ] },
      { t: "10. Sécurité", p: ["Les échanges avec le site sont chiffrés (HTTPS), l'accès aux données est restreint et journalisé, et les paiements sont traités par un prestataire spécialisé : les données de votre carte ne transitent jamais par nos serveurs."] },
    ],
  },
  pt: {
    titulo: "Política de Privacidade",
    sub: "Proteção dos seus dados pessoais — {empresa}",
    secoes: [
      { t: "1. Responsável pelo tratamento", p: ["A {empresa} é responsável pelo tratamento dos dados pessoais coletados neste site. Para qualquer dúvida sobre seus dados: {contato}."] },
      { t: "2. Dados coletados na reserva", p: ["Ao reservar um transfer, coletamos:"], l: [
        "sua identidade e contatos: nome, e-mail, telefone;",
        "informações da viagem: locais, datas e horários, número de passageiros, número do voo, observações;",
        "suas preferências: idioma e moeda;",
        "o status e o valor do pagamento — os dados do cartão são digitados diretamente na SumUp e nunca nos são transmitidos." ] },
      { t: "3. Parceiros e dados técnicos", p: [
        "Na candidatura de parceiro: nome, empresa, endereço, contatos e, após o início da parceria, dados bancários necessários aos pagamentos.",
        "Dados técnicos: endereço IP, mantido nos registros de segurança e de limitação de abusos." ] },
      { t: "4. Finalidades e bases legais", l: [
        "Execução de contrato: processar sua reserva, organizar a viagem, receber o pagamento e contatá-lo a respeito;",
        "Obrigação legal: contabilidade e guarda de comprovantes;",
        "Interesse legítimo: segurança do site, prevenção de fraudes e abusos, melhoria do serviço;",
        "Diligências pré-contratuais: análise de candidaturas de parceiros." ] },
      { t: "5. Destinatários", p: [
        "Seus dados nunca são vendidos. Ficam acessíveis apenas à nossa equipe e, na medida necessária ao serviço, ao motorista parceiro responsável pela sua viagem.",
        "Utilizamos prestadores (operadores): SumUp (pagamento por cartão), Netlify (hospedagem do site) e Supabase (banco de dados, hospedado na União Europeia)." ] },
      { t: "6. Transferências fora da União Europeia", p: ["Alguns prestadores (em especial a Netlify) podem tratar dados fora da União Europeia. Essas transferências são cobertas pelas garantias adequadas previstas no RGPD (cláusulas contratuais-padrão ou decisão de adequação)."] },
      { t: "7. Prazos de conservação", l: [
        "Reservas e comprovantes de pagamento: 10 anos, conforme as obrigações contábeis;",
        "Candidaturas de parceiros: durante a relação, e depois excluídas a pedido, salvo obrigações legais;",
        "Registros de segurança do painel de administração: 12 meses;",
        "Contadores de limitação de abusos: 24 horas." ] },
      { t: "8. Seus direitos", p: [
        "Conforme o RGPD, você tem direito de acesso, retificação, apagamento, limitação, portabilidade e oposição. Para exercê-los, escreva para: {contato}. Respondemos em até um mês.",
        "Você também pode apresentar reclamação à CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07)." ] },
      { t: "9. Cookies e rastreadores", p: [
        "Este site não usa cookies de publicidade nem ferramentas de medição de audiência. Ele grava apenas, no seu navegador, suas preferências de idioma e moeda (armazenamento local); o painel de administração usa um cookie de sessão estritamente necessário. Esses usos não exigem seu consentimento.",
        "Se um dia adicionarmos medição de audiência ou publicidade, pediremos seu consentimento antes." ] },
      { t: "10. Segurança", p: ["As comunicações com o site são criptografadas (HTTPS), o acesso aos dados é restrito e registrado, e os pagamentos são processados por prestador especializado: os dados do seu cartão nunca passam pelos nossos servidores."] },
    ],
  },
  en: {
    titulo: "Privacy Policy",
    sub: "Protecting your personal data — {empresa}",
    secoes: [
      { t: "1. Data controller", p: ["{empresa} is the controller of the personal data collected on this website. For any question about your data: {contato}."] },
      { t: "2. Data collected when you book", p: ["When you book a transfer, we collect:"], l: [
        "your identity and contact details: name, e-mail, phone;",
        "trip information: places, dates and times, number of passengers, flight number, notes;",
        "your preferences: language and currency;",
        "the status and amount of your payment — card details are entered directly with SumUp and are never sent to us." ] },
      { t: "3. Partners and technical data", p: [
        "When a partner applies: name, company, address, contact details and, once the partnership is established, the bank details needed for payments.",
        "Technical data: IP address, kept in security and abuse-prevention logs." ] },
      { t: "4. Purposes and legal bases", l: [
        "Performance of a contract: processing your booking, organising the trip, collecting payment and contacting you about it;",
        "Legal obligation: bookkeeping and keeping supporting documents;",
        "Legitimate interest: website security, preventing fraud and abuse, improving the service;",
        "Pre-contractual steps: reviewing partner applications." ] },
      { t: "5. Recipients", p: [
        "Your data is never sold. It is accessible only to our team and, as far as needed for the service, to the partner driver in charge of your trip.",
        "We use service providers (processors): SumUp (card payments), Netlify (website hosting) and Supabase (database, hosted in the European Union)." ] },
      { t: "6. Transfers outside the European Union", p: ["Some providers (notably Netlify) may process data outside the European Union. These transfers are covered by the appropriate safeguards provided for by the GDPR (standard contractual clauses or an adequacy decision)."] },
      { t: "7. Retention periods", l: [
        "Bookings and payment records: 10 years, in line with accounting obligations;",
        "Partner applications: for the duration of the relationship, then deleted on request unless the law requires otherwise;",
        "Security logs of the administration area: 12 months;",
        "Abuse-prevention counters: 24 hours." ] },
      { t: "8. Your rights", p: [
        "Under the GDPR you have the right of access, rectification, erasure, restriction, portability and objection. To exercise them, write to us: {contato}. We reply within one month.",
        "You may also lodge a complaint with the CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07) or your local data protection authority." ] },
      { t: "9. Cookies and trackers", p: [
        "This website uses no advertising cookies and no audience-measurement tools. It only stores your language and currency preferences in your browser (local storage); the administration area uses a strictly necessary session cookie. These uses do not require your consent.",
        "If we ever add audience measurement or advertising, we will ask for your consent first." ] },
      { t: "10. Security", p: ["Communications with the website are encrypted (HTTPS), access to data is restricted and logged, and payments are handled by a specialised provider: your card details never pass through our servers."] },
    ],
  },
  es: {
    titulo: "Política de privacidad",
    sub: "Protección de sus datos personales — {empresa}",
    secoes: [
      { t: "1. Responsable del tratamiento", p: ["{empresa} es responsable del tratamiento de los datos personales recogidos en este sitio. Para cualquier consulta sobre sus datos: {contato}."] },
      { t: "2. Datos recogidos al reservar", p: ["Al reservar un traslado, recogemos:"], l: [
        "su identidad y datos de contacto: nombre, correo electrónico, teléfono;",
        "la información del viaje: lugares, fechas y horas, número de pasajeros, número de vuelo, observaciones;",
        "sus preferencias: idioma y moneda;",
        "el estado y el importe del pago — los datos de la tarjeta se introducen directamente en SumUp y nunca se nos transmiten." ] },
      { t: "3. Socios y datos técnicos", p: [
        "En la solicitud de socio: nombre, empresa, dirección, datos de contacto y, una vez establecida la colaboración, datos bancarios necesarios para los pagos.",
        "Datos técnicos: dirección IP, conservada en los registros de seguridad y de limitación de abusos." ] },
      { t: "4. Finalidades y bases jurídicas", l: [
        "Ejecución del contrato: tramitar su reserva, organizar el viaje, cobrar el pago y contactarle al respecto;",
        "Obligación legal: contabilidad y conservación de justificantes;",
        "Interés legítimo: seguridad del sitio, prevención del fraude y de abusos, mejora del servicio;",
        "Medidas precontractuales: examen de las solicitudes de socios." ] },
      { t: "5. Destinatarios", p: [
        "Sus datos nunca se venden. Solo acceden a ellos nuestro equipo y, en la medida necesaria para el servicio, el conductor colaborador encargado de su viaje.",
        "Recurrimos a proveedores (encargados del tratamiento): SumUp (pago con tarjeta), Netlify (alojamiento del sitio) y Supabase (base de datos, alojada en la Unión Europea)." ] },
      { t: "6. Transferencias fuera de la Unión Europea", p: ["Algunos proveedores (en particular Netlify) pueden tratar datos fuera de la Unión Europea. Estas transferencias se amparan en las garantías adecuadas previstas por el RGPD (cláusulas contractuales tipo o decisión de adecuación)."] },
      { t: "7. Plazos de conservación", l: [
        "Reservas y justificantes de pago: 10 años, conforme a las obligaciones contables;",
        "Solicitudes de socios: mientras dure la relación y, después, supresión a petición salvo obligación legal;",
        "Registros de seguridad del área de administración: 12 meses;",
        "Contadores de limitación de abusos: 24 horas." ] },
      { t: "8. Sus derechos", p: [
        "Conforme al RGPD, tiene derecho de acceso, rectificación, supresión, limitación, portabilidad y oposición. Para ejercerlos, escríbanos: {contato}. Respondemos en el plazo de un mes.",
        "También puede presentar una reclamación ante la CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07) o ante su autoridad de protección de datos." ] },
      { t: "9. Cookies y rastreadores", p: [
        "Este sitio no utiliza cookies publicitarias ni herramientas de medición de audiencia. Solo guarda en su navegador sus preferencias de idioma y moneda (almacenamiento local); el área de administración usa una cookie de sesión estrictamente necesaria. Estos usos no requieren su consentimiento.",
        "Si algún día añadimos medición de audiencia o publicidad, le pediremos antes su consentimiento." ] },
      { t: "10. Seguridad", p: ["Las comunicaciones con el sitio están cifradas (HTTPS), el acceso a los datos es restringido y queda registrado, y los pagos los procesa un proveedor especializado: los datos de su tarjeta nunca pasan por nuestros servidores."] },
    ],
  },
  de: {
    titulo: "Datenschutzerklärung",
    sub: "Schutz Ihrer personenbezogenen Daten — {empresa}",
    secoes: [
      { t: "1. Verantwortlicher", p: ["{empresa} ist Verantwortlicher für die auf dieser Website erhobenen personenbezogenen Daten. Bei Fragen zu Ihren Daten: {contato}."] },
      { t: "2. Bei der Buchung erhobene Daten", p: ["Wenn Sie einen Transfer buchen, erheben wir:"], l: [
        "Ihre Identität und Kontaktdaten: Name, E-Mail, Telefon;",
        "Fahrtinformationen: Orte, Datum und Uhrzeit, Passagierzahl, Flugnummer, Anmerkungen;",
        "Ihre Präferenzen: Sprache und Währung;",
        "Status und Betrag Ihrer Zahlung — Kartendaten werden direkt bei SumUp eingegeben und nie an uns übermittelt." ] },
      { t: "3. Partner und technische Daten", p: [
        "Bei einer Partnerbewerbung: Name, Unternehmen, Adresse, Kontaktdaten und, sobald die Partnerschaft besteht, die für Zahlungen nötigen Bankdaten.",
        "Technische Daten: IP-Adresse, gespeichert in Sicherheits- und Missbrauchsschutzprotokollen." ] },
      { t: "4. Zwecke und Rechtsgrundlagen", l: [
        "Vertragserfüllung: Bearbeitung Ihrer Buchung, Organisation der Fahrt, Zahlungseinzug und Kontaktaufnahme dazu;",
        "Rechtliche Verpflichtung: Buchhaltung und Aufbewahrung von Belegen;",
        "Berechtigtes Interesse: Sicherheit der Website, Betrugs- und Missbrauchsprävention, Verbesserung des Dienstes;",
        "Vorvertragliche Maßnahmen: Prüfung von Partnerbewerbungen." ] },
      { t: "5. Empfänger", p: [
        "Ihre Daten werden niemals verkauft. Zugriff haben nur unser Team und, soweit für die Leistung erforderlich, der Partnerfahrer, der Ihre Fahrt übernimmt.",
        "Wir setzen Dienstleister (Auftragsverarbeiter) ein: SumUp (Kartenzahlung), Netlify (Hosting der Website) und Supabase (Datenbank, in der Europäischen Union gehostet)." ] },
      { t: "6. Übermittlungen außerhalb der Europäischen Union", p: ["Einige Dienstleister (insbesondere Netlify) können Daten außerhalb der Europäischen Union verarbeiten. Diese Übermittlungen sind durch die von der DSGVO vorgesehenen geeigneten Garantien abgesichert (Standardvertragsklauseln oder Angemessenheitsbeschluss)."] },
      { t: "7. Speicherdauer", l: [
        "Buchungen und Zahlungsbelege: 10 Jahre gemäß den buchhalterischen Pflichten;",
        "Partnerbewerbungen: für die Dauer der Beziehung, danach auf Anfrage gelöscht, soweit keine gesetzliche Pflicht entgegensteht;",
        "Sicherheitsprotokolle des Administrationsbereichs: 12 Monate;",
        "Zähler zur Missbrauchsbegrenzung: 24 Stunden." ] },
      { t: "8. Ihre Rechte", p: [
        "Nach der DSGVO haben Sie das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Zur Ausübung schreiben Sie uns: {contato}. Wir antworten innerhalb eines Monats.",
        "Sie können sich außerdem bei der CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07) oder Ihrer Datenschutzaufsichtsbehörde beschweren." ] },
      { t: "9. Cookies und Tracker", p: [
        "Diese Website verwendet keine Werbe-Cookies und keine Reichweitenmessung. Sie speichert in Ihrem Browser nur Ihre Sprach- und Währungspräferenzen (lokaler Speicher); der Administrationsbereich nutzt ein unbedingt erforderliches Sitzungs-Cookie. Hierfür ist keine Einwilligung erforderlich.",
        "Sollten wir künftig Reichweitenmessung oder Werbung einsetzen, holen wir vorher Ihre Einwilligung ein." ] },
      { t: "10. Sicherheit", p: ["Die Kommunikation mit der Website ist verschlüsselt (HTTPS), der Datenzugriff ist beschränkt und wird protokolliert, und Zahlungen werden von einem spezialisierten Dienstleister abgewickelt: Ihre Kartendaten laufen nie über unsere Server."] },
    ],
  },
  it: {
    titulo: "Informativa sulla privacy",
    sub: "Protezione dei tuoi dati personali — {empresa}",
    secoes: [
      { t: "1. Titolare del trattamento", p: ["{empresa} è titolare del trattamento dei dati personali raccolti su questo sito. Per qualsiasi domanda sui tuoi dati: {contato}."] },
      { t: "2. Dati raccolti con la prenotazione", p: ["Quando prenoti un transfer, raccogliamo:"], l: [
        "la tua identità e i tuoi recapiti: nome, e-mail, telefono;",
        "le informazioni del viaggio: luoghi, date e orari, numero di passeggeri, numero del volo, note;",
        "le tue preferenze: lingua e valuta;",
        "lo stato e l'importo del pagamento — i dati della carta sono inseriti direttamente presso SumUp e non ci vengono mai trasmessi." ] },
      { t: "3. Partner e dati tecnici", p: [
        "Nella candidatura di un partner: nome, azienda, indirizzo, recapiti e, una volta avviata la collaborazione, i dati bancari necessari per i pagamenti.",
        "Dati tecnici: indirizzo IP, conservato nei registri di sicurezza e di limitazione degli abusi." ] },
      { t: "4. Finalità e basi giuridiche", l: [
        "Esecuzione del contratto: gestire la prenotazione, organizzare il viaggio, incassare il pagamento e contattarti in merito;",
        "Obbligo di legge: contabilità e conservazione dei giustificativi;",
        "Legittimo interesse: sicurezza del sito, prevenzione di frodi e abusi, miglioramento del servizio;",
        "Misure precontrattuali: esame delle candidature dei partner." ] },
      { t: "5. Destinatari", p: [
        "I tuoi dati non vengono mai venduti. Sono accessibili solo al nostro team e, nella misura necessaria al servizio, all'autista partner incaricato del tuo viaggio.",
        "Ci avvaliamo di fornitori (responsabili del trattamento): SumUp (pagamento con carta), Netlify (hosting del sito) e Supabase (database, ospitato nell'Unione europea)." ] },
      { t: "6. Trasferimenti fuori dall'Unione europea", p: ["Alcuni fornitori (in particolare Netlify) possono trattare dati fuori dall'Unione europea. Tali trasferimenti sono coperti dalle garanzie adeguate previste dal GDPR (clausole contrattuali tipo o decisione di adeguatezza)."] },
      { t: "7. Tempi di conservazione", l: [
        "Prenotazioni e giustificativi di pagamento: 10 anni, secondo gli obblighi contabili;",
        "Candidature dei partner: per la durata del rapporto, poi cancellate su richiesta salvo obblighi di legge;",
        "Registri di sicurezza dell'area di amministrazione: 12 mesi;",
        "Contatori di limitazione degli abusi: 24 ore." ] },
      { t: "8. I tuoi diritti", p: [
        "Ai sensi del GDPR hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione. Per esercitarli scrivici: {contato}. Rispondiamo entro un mese.",
        "Puoi inoltre presentare reclamo alla CNIL (www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07) o alla tua autorità di protezione dei dati." ] },
      { t: "9. Cookie e tracciatori", p: [
        "Questo sito non utilizza cookie pubblicitari né strumenti di misurazione dell'audience. Memorizza solo, nel tuo browser, le preferenze di lingua e valuta (archiviazione locale); l'area di amministrazione usa un cookie di sessione strettamente necessario. Questi usi non richiedono il tuo consenso.",
        "Se in futuro aggiungeremo misurazione dell'audience o pubblicità, chiederemo prima il tuo consenso." ] },
      { t: "10. Sicurezza", p: ["Le comunicazioni con il sito sono cifrate (HTTPS), l'accesso ai dati è limitato e registrato, e i pagamenti sono gestiti da un fornitore specializzato: i dati della tua carta non transitano mai dai nostri server."] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Mentions légales (montadas a partir dos dados da empresa cadastrados no painel)
// ---------------------------------------------------------------------------
export interface RotulosMentions {
  titulo: string;
  sub: string;
  editor: string;
  denominacao: string;
  forma: string;
  capital: string;
  sede: string;
  siret: string;
  tva: string;
  diretor: string;
  contato: string;
  hospedagem: string;
  hospedagemTexto: string;
  pagamento: string;
  pagamentoTexto: string;
  pi: string;
  piTexto: string;
  dados: string;
  dadosTexto: string;
  mediacao: string;
  mediacaoTexto: string;
  links: { cgv: string; conf: string };
}

export const MENTIONS: Record<Language, RotulosMentions> = {
  fr: {
    titulo: "Mentions légales", sub: "Informations légales relatives à ce site",
    editor: "Éditeur du site", denominacao: "Dénomination", forma: "Forme juridique", capital: "Capital social", sede: "Adresse / siège social",
    siret: "SIRET", tva: "N° de TVA intracommunautaire", diretor: "Directeur de la publication", contato: "Contact",
    hospedagem: "Hébergement", hospedagemTexto: "Site hébergé par Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis — netlify.com. Base de données et fichiers hébergés par Supabase (région de l'Union européenne) — supabase.com.",
    pagamento: "Paiement", pagamentoTexto: "Les paiements par carte sont traités par SumUp. Aucune donnée de carte bancaire n'est enregistrée sur ce site.",
    pi: "Propriété intellectuelle", piTexto: "L'ensemble des contenus de ce site (textes, images, logo, structure) est protégé par le droit de la propriété intellectuelle. Toute reproduction sans autorisation écrite est interdite.",
    dados: "Données personnelles", dadosTexto: "Le traitement de vos données personnelles est décrit dans notre politique de confidentialité.",
    mediacao: "Médiation de la consommation", mediacaoTexto: "Médiateur de la consommation :",
    links: { cgv: "Conditions générales de vente", conf: "Politique de confidentialité" },
  },
  pt: {
    titulo: "Menções legais", sub: "Informações legais sobre este site",
    editor: "Editor do site", denominacao: "Denominação", forma: "Forma jurídica", capital: "Capital social", sede: "Endereço / sede",
    siret: "SIRET", tva: "N.º de IVA intracomunitário", diretor: "Diretor de publicação", contato: "Contato",
    hospedagem: "Hospedagem", hospedagemTexto: "Site hospedado pela Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, Estados Unidos — netlify.com. Banco de dados e arquivos hospedados pela Supabase (região da União Europeia) — supabase.com.",
    pagamento: "Pagamento", pagamentoTexto: "Os pagamentos por cartão são processados pela SumUp. Nenhum dado de cartão é gravado neste site.",
    pi: "Propriedade intelectual", piTexto: "Todo o conteúdo deste site (textos, imagens, logotipo, estrutura) é protegido pela legislação de propriedade intelectual. É proibida a reprodução sem autorização por escrito.",
    dados: "Dados pessoais", dadosTexto: "O tratamento dos seus dados pessoais está descrito na nossa política de privacidade.",
    mediacao: "Mediação de consumo", mediacaoTexto: "Mediador de consumo:",
    links: { cgv: "Condições Gerais de Venda", conf: "Política de Privacidade" },
  },
  en: {
    titulo: "Legal Notice", sub: "Legal information about this website",
    editor: "Website publisher", denominacao: "Company name", forma: "Legal form", capital: "Share capital", sede: "Address / registered office",
    siret: "SIRET", tva: "Intra-community VAT no.", diretor: "Publication director", contato: "Contact",
    hospedagem: "Hosting", hospedagemTexto: "Website hosted by Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, United States — netlify.com. Database and files hosted by Supabase (European Union region) — supabase.com.",
    pagamento: "Payment", pagamentoTexto: "Card payments are processed by SumUp. No card data is stored on this website.",
    pi: "Intellectual property", piTexto: "All content on this website (texts, images, logo, structure) is protected by intellectual property law. Any reproduction without written permission is prohibited.",
    dados: "Personal data", dadosTexto: "The processing of your personal data is described in our privacy policy.",
    mediacao: "Consumer mediation", mediacaoTexto: "Consumer mediator:",
    links: { cgv: "General Terms of Sale", conf: "Privacy Policy" },
  },
  es: {
    titulo: "Aviso legal", sub: "Información legal sobre este sitio web",
    editor: "Editor del sitio", denominacao: "Denominación", forma: "Forma jurídica", capital: "Capital social", sede: "Dirección / domicilio social",
    siret: "SIRET", tva: "N.º de IVA intracomunitario", diretor: "Director de la publicación", contato: "Contacto",
    hospedagem: "Alojamiento", hospedagemTexto: "Sitio alojado por Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, Estados Unidos — netlify.com. Base de datos y archivos alojados por Supabase (región de la Unión Europea) — supabase.com.",
    pagamento: "Pago", pagamentoTexto: "Los pagos con tarjeta los procesa SumUp. En este sitio no se almacena ningún dato de tarjeta.",
    pi: "Propiedad intelectual", piTexto: "Todo el contenido de este sitio (textos, imágenes, logotipo, estructura) está protegido por la legislación de propiedad intelectual. Queda prohibida su reproducción sin autorización escrita.",
    dados: "Datos personales", dadosTexto: "El tratamiento de sus datos personales se describe en nuestra política de privacidad.",
    mediacao: "Mediación de consumo", mediacaoTexto: "Mediador de consumo:",
    links: { cgv: "Condiciones generales de venta", conf: "Política de privacidad" },
  },
  de: {
    titulo: "Impressum", sub: "Rechtliche Angaben zu dieser Website",
    editor: "Herausgeber der Website", denominacao: "Firmenname", forma: "Rechtsform", capital: "Stammkapital", sede: "Adresse / Sitz",
    siret: "SIRET", tva: "USt-IdNr.", diretor: "Verantwortlich für den Inhalt", contato: "Kontakt",
    hospedagem: "Hosting", hospedagemTexto: "Website gehostet von Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, USA — netlify.com. Datenbank und Dateien gehostet von Supabase (Region Europäische Union) — supabase.com.",
    pagamento: "Zahlung", pagamentoTexto: "Kartenzahlungen werden von SumUp abgewickelt. Auf dieser Website werden keine Kartendaten gespeichert.",
    pi: "Geistiges Eigentum", piTexto: "Alle Inhalte dieser Website (Texte, Bilder, Logo, Struktur) sind urheberrechtlich geschützt. Jede Vervielfältigung ohne schriftliche Genehmigung ist untersagt.",
    dados: "Personenbezogene Daten", dadosTexto: "Die Verarbeitung Ihrer personenbezogenen Daten ist in unserer Datenschutzerklärung beschrieben.",
    mediacao: "Verbraucherschlichtung", mediacaoTexto: "Verbraucherschlichtungsstelle:",
    links: { cgv: "Allgemeine Verkaufsbedingungen", conf: "Datenschutzerklärung" },
  },
  it: {
    titulo: "Note legali", sub: "Informazioni legali su questo sito",
    editor: "Editore del sito", denominacao: "Denominazione", forma: "Forma giuridica", capital: "Capitale sociale", sede: "Indirizzo / sede legale",
    siret: "SIRET", tva: "N. IVA intracomunitaria", diretor: "Direttore della pubblicazione", contato: "Contatti",
    hospedagem: "Hosting", hospedagemTexto: "Sito ospitato da Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, Stati Uniti — netlify.com. Database e file ospitati da Supabase (regione Unione europea) — supabase.com.",
    pagamento: "Pagamento", pagamentoTexto: "I pagamenti con carta sono elaborati da SumUp. Su questo sito non viene memorizzato alcun dato di carta.",
    pi: "Proprietà intellettuale", piTexto: "Tutti i contenuti di questo sito (testi, immagini, logo, struttura) sono protetti dalla normativa sulla proprietà intellettuale. È vietata la riproduzione senza autorizzazione scritta.",
    dados: "Dati personali", dadosTexto: "Il trattamento dei tuoi dati personali è descritto nella nostra informativa sulla privacy.",
    mediacao: "Mediazione dei consumatori", mediacaoTexto: "Mediatore dei consumatori:",
    links: { cgv: "Condizioni generali di vendita", conf: "Informativa sulla privacy" },
  },
};
