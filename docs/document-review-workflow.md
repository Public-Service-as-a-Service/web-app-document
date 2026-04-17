# Granskningsflöde för dokument

## Syfte

Det här dokumentet beskriver en föreslagen modell för inbyggd
granskningslogik i `api-service-document`.

Målet är att dokumenttjänsten ska kunna hantera granskning, kommentarer och
godkännande av dokumentrevisioner på ett generellt sätt, utan att varje
konsumerande applikation behöver bygga egen workflowlogik.

Dokumentet är tänkt som diskussionsunderlag innan implementation. Det beskriver
principer, datamodell, statuslogik och öppna beslut.

## Grundprincip

Granskning ska ligga som ett separat workflow ovanpå en specifik
dokumentrevision.

Det innebär:

- Dokument och revisioner fortsätter vara kärnan i dokumentdomänen.
- En granskning pekar alltid på ett `registrationNumber` och en exakt
  `revision`.
- Granskningsflödet ändrar inte innehållet i dokumentrevisionen.
- Svar, kommentarer, beslut och händelser sparas i egna tabeller.
- Konsumerande appar kan skapa, läsa och svara på review requests via API.

Föreslagen modulindelning:

```text
api-service-document
  document-core
    documents
    revisions
    metadata
    confidentiality

  document-review
    review requests
    participants
    responses
    policies
    events
    state evaluation
```

Det är viktigt att review-modulen bor nära dokumenttjänsten, eftersom den måste
förstå dokumentidentitet, revisioner, municipality-scope och auditkrav. Samtidigt
ska den hållas separat från själva dokumentmodellen, så att dokumentrevisioner
fortsätter vara stabila och begripliga.

## Varför inte metadata?

Granskningsstatus bör inte modelleras som vanlig dokumentmetadata.

Skäl:

- Review-state är dynamisk, medan dokumentrevisioner i grunden är immutabla.
- En granskning innehåller deltagare, svar, kommentarer, deadlines och auditlogg.
- Grupp- och rollbaserade deltagare kräver mer logik än key-value metadata.
- Samma dokumentrevision kan behöva ha flera granskningsflöden över tid.
- Status bör kunna räknas från policies och svar, inte bara lagras som en sträng.

Metadata kan däremot användas för enklare visningsinformation eller integration,
men inte som källa för själva granskningsflödet.

## Centrala begrepp

### ReviewRequest

Själva granskningsärendet.

Exempel på fält:

```text
id
municipalityId
documentRegistrationNumber
documentRevision
title
description
requestedBy
status
reviewPolicy
approvalPolicy
revisionPolicy
deadline
createdAt
updatedAt
completedAt
```

En `ReviewRequest` representerar frågan:

```text
"Den här dokumentrevisionen ska granskas och/eller godkännas enligt dessa regler."
```

### ReviewParticipant

En deltagare i granskningsflödet.

Deltagaren är inte nödvändigtvis en enskild användare. Den kan vara en användare,
grupp, roll eller extern part.

Exempel på fält:

```text
id
reviewRequestId
role
principal
required
blocking
responsePolicy
order
createdAt
```

Fältet `role` beskriver vilken funktion deltagaren har i flödet:

```text
REVIEWER
APPROVER
```

Fältet `principal` beskriver vem eller vilka deltagaren representerar.

### PrincipalRef

En abstrakt identitetsreferens.

Det här är en nyckelkomponent i modellen. Granskningen ska inte vara hårt knuten
till ett username.

Exempel:

```text
type
source
externalId
displayName
```

Möjliga `type`:

```text
USER
GROUP
ROLE
EXTERNAL
```

Möjliga `source`:

```text
ENTRA
AD
LOCAL
MANUAL
EMAIL
```

Exempel:

```json
{
  "type": "GROUP",
  "source": "ENTRA",
  "externalId": "legal-department",
  "displayName": "Juridik"
}
```

Poängen är att resten av modellen inte behöver veta om deltagaren kommer från
Entra ID, lokal användardatabas, en rollmodell eller en manuell extern inbjudan.

### ReviewResponse

Ett svar från en faktisk aktör.

Exempel på fält:

```text
id
reviewRequestId
participantId
respondedBy
decision
comment
createdAt
```

Exempel på `decision`:

```text
APPROVED
REJECTED
CHANGES_REQUESTED
COMMENTED
ACKNOWLEDGED
ABSTAINED
```

Viktig princip:

```text
ReviewParticipant.principal = vem eller vilka som är tilldelade
ReviewResponse.respondedBy = vem som faktiskt svarade
```

Om en participant är gruppen `Juridik`, kan `respondedBy` vara användaren Anna
Andersson som tillhör den gruppen.

Svar bör vara append-only. Om någon ändrar sig skapas ett nytt svar. Vid
statusberäkning används senaste relevanta svaret, men historiken finns kvar.

### ReviewEvent

Auditlogg för granskningsflödet.

Exempel på händelsetyper:

```text
CREATED
STARTED
PARTICIPANT_ADDED
PARTICIPANT_REMOVED
RESPONSE_SUBMITTED
STATUS_CHANGED
DEADLINE_CHANGED
REMINDER_SENT
CANCELLED
SUPERSEDED
COMPLETED
```

Exempel på fält:

```text
id
reviewRequestId
eventType
actor
payload
createdAt
```

`payload` kan vara JSON och innehålla händelsespecifika detaljer.

## Reviewer och Approver

Modellen bör skilja på granskare och godkännare.

En reviewer lämnar sakkunnig synpunkt:

```text
"Juridiskt okej."
"Informationssäkerhet behöver kompletteras."
"Jag har inga synpunkter."
```

En approver fattar beslut:

```text
"Dokumentet är godkänt."
"Dokumentet avslås."
```

Exempel:

```text
Reviewers:
  Juridik
  Informationssäkerhet
  Verksamhetsrepresentant

Approver:
  Avdelningschef
```

Flödet kan då vara:

```text
1. Juridik granskar.
2. Informationssäkerhet begär ändring.
3. Dokumentägaren tar fram ny revision eller kompletterar enligt process.
4. Avdelningschef godkänner slutversionen.
```

Alla flöden behöver inte ha båda rollerna. Modellen ska stödja:

- Endast granskning.
- Endast godkännande.
- Granskning följt av godkännande.
- Rådgivande granskare.
- Blockerande granskare.

Detta gör modellen mer flexibel utan att UI:t behöver bli mer komplicerat i
första versionen.

## Policies

Policy styr när ett flöde är klart och hur svar ska tolkas.

### Request-nivå

Föreslagna policies på `ReviewRequest`:

```text
reviewPolicy
approvalPolicy
revisionPolicy
```

Exempel på `reviewPolicy`:

```text
ALL_REQUIRED_REVIEWERS
ANY_REVIEWER
OPTIONAL
```

Exempel på `approvalPolicy`:

```text
ALL_APPROVERS
ANY_APPROVER
QUORUM
```

Exempel på `revisionPolicy`:

```text
KEEP_RUNNING
MARK_SUPERSEDED
CANCEL_AND_RESTART
```

`revisionPolicy` styr vad som händer om en ny dokumentrevision skapas medan
granskning pågår.

### Participant-nivå

Det räcker inte att veta att en participant är en grupp. Vi måste också veta hur
gruppen ska räknas.

Föreslagna policies på `ReviewParticipant`:

```text
ONE_RESPONSE
ONE_APPROVAL
ALL_MEMBERS
QUORUM
```

Exempel:

```text
Juridikgruppen, REVIEWER, ONE_RESPONSE
Ekonomigruppen, APPROVER, QUORUM 2
Styrgruppen, APPROVER, ALL_MEMBERS
```

Detta gör att `GROUP` inte automatiskt betyder en viss beslutslogik.

## Grupphantering och snapshot

Gruppdeltagare kräver ett viktigt designbeslut.

Om en grupp expanderas dynamiskt vid varje statusberäkning kan resultatet ändras
över tid. Någon kan börja eller sluta i gruppen efter att granskningen startat.

Rekommendation:

- För `ONE_RESPONSE` och `ONE_APPROVAL` kan gruppmedlemskap lösas runtime.
- För `ALL_MEMBERS` och `QUORUM` bör gruppmedlemskap snapshotas när reviewn
  startas.

En snapshot gör att man i efterhand kan förklara varför ett ärende blev godkänt:

```text
"När granskningen startade bestod gruppen av A, B och C.
Två av tre krävdes. A och B godkände."
```

Utan snapshot riskerar historiken att bli svår att lita på.

## Statusmodell

Föreslagna statusar:

```text
DRAFT
IN_REVIEW
CHANGES_REQUESTED
APPROVED
REJECTED
CANCELLED
EXPIRED
SUPERSEDED
```

Förklaring:

- `DRAFT`: Reviewn är skapad men inte startad.
- `IN_REVIEW`: Reviewn är aktiv.
- `CHANGES_REQUESTED`: Minst en blockerande granskare har begärt ändringar.
- `APPROVED`: Reviewn är godkänd enligt policy.
- `REJECTED`: Reviewn är avslutad med negativt beslut.
- `CANCELLED`: Reviewn har avbrutits manuellt.
- `EXPIRED`: Deadline har passerat enligt beslutad policy.
- `SUPERSEDED`: Reviewn gäller en revision som ersatts av en nyare revision.

Viktig skillnad:

```text
CHANGES_REQUESTED betyder "behöver ändras och kan fortsätta".
REJECTED betyder "avslutat negativt beslut".
```

## Statusberäkning

Source of truth bör vara:

```text
ReviewRequest
ReviewParticipant
ReviewResponse
ReviewEvent
Policies
```

`ReviewRequest.status` kan finnas som materialiserad läsmodell för enklare och
snabbare API-svar, men den ska uppdateras av en gemensam evaluator.

Rekommenderad princip:

```text
Responses + participants + policies = beräknad status
ReviewRequest.status = cache/läsmodell
```

Det gör att status kan räknas om vid behov, samtidigt som API:t inte behöver
räkna från grunden vid varje listvy.

## Dokumentrevisioner

En review ska alltid gälla exakt en dokumentrevision.

Exempel:

```text
registrationNumber: 2026-ABC-123
revision: 4
```

Om dokumentet får revision 5 medan reviewn för revision 4 pågår ska reviewn inte
tyst börja gälla revision 5.

Möjliga policies:

```text
KEEP_RUNNING
  Reviewn fortsätter på den gamla revisionen.

MARK_SUPERSEDED
  Reviewn markeras som ersatt av nyare revision.

CANCEL_AND_RESTART
  Reviewn avbryts och ny review krävs för nya revisionen.
```

Första implementationen bör välja en tydlig default. En rimlig start är
`MARK_SUPERSEDED`, eftersom den minskar risken att någon godkänner en version som
inte längre är aktuell.

## Förslag på livscykel

### 1. Skapa draft

En användare eller tjänst skapar en review request mot en specifik revision.

```text
status = DRAFT
```

Participants kan läggas till och ändras.

### 2. Starta granskning

Reviewn startas.

```text
status = IN_REVIEW
```

Vid start:

- Dokumentrevisionen fixeras.
- Participants låses enligt beslutad regel.
- Grupp-snapshots skapas där det behövs.
- Notifieringar kan skickas.
- `STARTED` event loggas.

### 3. Lämna svar

En behörig aktör lämnar svar.

Exempel:

```text
decision = CHANGES_REQUESTED
comment = "Komplettera avsnittet om personuppgifter."
```

Systemet:

- Validerar att aktören får svara för participant.
- Sparar nytt append-only response.
- Loggar event.
- Kör status-evaluator.
- Uppdaterar materialiserad status.

### 4. Begärda ändringar

Om en blockerande reviewer svarar `CHANGES_REQUESTED` bör status bli:

```text
CHANGES_REQUESTED
```

Här finns ett viktigt processbeslut:

- Ska samma review kunna fortsätta efter kommentar?
- Eller måste dokumentet få ny revision och ny review?

För dokumenttjänstens revisionsmodell är det ofta renast att större ändringar
leder till ny revision och ny review. Mindre kommentarer kan hanteras enligt
verksamhetens process.

### 5. Godkännande

När review- och approval-policy är uppfyllda blir status:

```text
APPROVED
```

Exempel:

```text
Alla obligatoriska reviewers har svarat.
Ingen blockerande reviewer har aktiv CHANGES_REQUESTED.
Approval policy är uppfylld.
```

### 6. Avslag

Om en approver avslår och policy säger att avslag stoppar flödet:

```text
REJECTED
```

Det bör vara tydligt att `REJECTED` avslutar ärendet.

## Behörighet

Behörighet bör skilja mellan:

- Vem får skapa review?
- Vem får ändra draft?
- Vem får starta review?
- Vem får svara för en participant?
- Vem får avbryta review?
- Vem får se alla kommentarer?
- Vem får administrera participants under pågående flöde?

För grupp- och rollbaserade participants behövs en resolver:

```text
PrincipalRef -> konkreta användare eller behöriga aktörer
```

Den resolver-funktionen bör kapslas bakom ett interface så att implementationen
kan vara Entra, lokal rollmodell eller annan källa.

## Kommentarer och bilagor

Första modellen bör stödja övergripande kommentarer på response-nivå.

Exempel:

```text
ReviewResponse.comment
```

PDF-annotationer eller kommentarer per sida bör ses som en senare utbyggnad.
Det kräver mer detaljerad modell, till exempel:

```text
ReviewAnnotation
  responseId
  fileId
  pageNumber
  anchor
  comment
```

Rekommendation:

- Börja med övergripande kommentarer.
- Förbered modellen så att annotations kan läggas till utan att ändra
  grundflödet.

## API-skiss

Det här är inte en slutlig API-spec, men visar ungefärlig riktning.

```text
POST   /{municipalityId}/reviews
GET    /{municipalityId}/reviews/{reviewId}
GET    /{municipalityId}/reviews?registrationNumber=&revision=
PATCH  /{municipalityId}/reviews/{reviewId}
POST   /{municipalityId}/reviews/{reviewId}/participants
DELETE /{municipalityId}/reviews/{reviewId}/participants/{participantId}
POST   /{municipalityId}/reviews/{reviewId}/start
POST   /{municipalityId}/reviews/{reviewId}/responses
POST   /{municipalityId}/reviews/{reviewId}/cancel
GET    /{municipalityId}/reviews/{reviewId}/events
```

Det kan också vara rimligt med dokumentnära routes:

```text
GET /{municipalityId}/documents/{registrationNumber}/reviews
```

Men reviewn bör fortfarande vara en egen resurs.

## Tabellskiss

Föreslagna tabeller:

```text
document_review_request
document_review_participant
document_review_participant_snapshot
document_review_response
document_review_event
```

### document_review_request

```text
id
municipality_id
registration_number
revision
title
description
requested_by_type
requested_by_source
requested_by_external_id
requested_by_display_name
status
review_policy
approval_policy
revision_policy
deadline
created_at
updated_at
completed_at
```

### document_review_participant

```text
id
review_request_id
role
principal_type
principal_source
principal_external_id
principal_display_name
required
blocking
response_policy
quorum
sort_order
created_at
```

### document_review_participant_snapshot

```text
id
participant_id
member_type
member_source
member_external_id
member_display_name
created_at
```

Används framför allt för `ALL_MEMBERS` och `QUORUM`.

### document_review_response

```text
id
review_request_id
participant_id
responded_by_type
responded_by_source
responded_by_external_id
responded_by_display_name
decision
comment
created_at
```

### document_review_event

```text
id
review_request_id
event_type
actor_type
actor_source
actor_external_id
actor_display_name
payload
created_at
```

## Notifieringar

Notifieringar bör inte vara kärnlogik i statusberäkningen, men events ska göra
dem möjliga.

Exempel:

```text
STARTED -> notifiera participants
RESPONSE_SUBMITTED -> notifiera beställare eller nästa steg
DEADLINE_APPROACHING -> påminn deltagare
APPROVED -> notifiera beställare
REJECTED -> notifiera beställare
```

Första versionen kan stödja in-app-notifiering eller bara exponera API/events.
E-post kan kopplas på senare via eventdrivet flöde.

## Öppna beslut

Följande behöver bestämmas innan implementation:

- Ska `CHANGES_REQUESTED` kräva ny dokumentrevision?
- Ska en blockerande reviewer kunna stoppa approval helt?
- Ska en approver kunna godkänna trots rådgivande negativa kommentarer?
- Vad är default för gruppdeltagare: `ONE_RESPONSE` eller något annat?
- Ska gruppmedlemskap snapshotas alltid, eller bara för `ALL_MEMBERS` och
  `QUORUM`?
- Vad händer om en participant tas bort efter att reviewn startat?
- Ska reviewn kunna ändras efter start, eller krävs cancel/restart?
- Ska deadline vara obligatorisk?
- Vad händer när deadline passeras: bara markering, eller `EXPIRED`?
- Ska externa granskare stödjas i första versionen?
- Ska kommentarer per PDF-sida stödjas direkt eller senare?
- Ska godkänd review automatiskt kunna trigga publicering, eller ska publicering
  vara separat beslut?

## Rekommenderad första version

För att hålla första implementationen tydlig:

- Stöd `ReviewRequest`, `ReviewParticipant`, `ReviewResponse` och `ReviewEvent`.
- Låt participants vara `USER`, `GROUP` eller `ROLE` via `PrincipalRef`.
- Stöd rollerna `REVIEWER` och `APPROVER`.
- Stöd övergripande kommentarer på response.
- Gör responses append-only.
- Låt review alltid peka på exakt `registrationNumber + revision`.
- Använd `MARK_SUPERSEDED` som default när ny revision skapas.
- Stöd `ONE_RESPONSE`, `ONE_APPROVAL`, `ALL_APPROVERS` och `ALL_REQUIRED_REVIEWERS`.
- Vänta med PDF-annotationer och externa engångslänkar.
- Ha en gemensam evaluator som uppdaterar materialiserad status.

Det ger en robust grund utan att låsa framtida flöden.

