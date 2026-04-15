# Permanenta publika dokumentlänkar

## Målbild

Vi ska bygga en stabil publik väg in till ett dokument eller en dokumentsamling i
dokumenttjänsten. Länken ska kunna användas från kommunens webbplats, intranät,
Teams, e-post och andra system utan att behöva uppdateras när dokumentet får nya
revisioner.

Huvudprincipen är:

- Registreringsnumret är den permanenta identiteten.
- Huvudadressen visar en publik dokumentvy, inte en implicit nedladdning.
- Nedladdning, zip, förhandsvisning och historiska revisioner är explicita
  funktioner från den vyn.
- Endast dokument som uttryckligen publicerats får exponeras publikt.

Detta är inte i första hand en "slug"-implementation. En riktig slug eller ett
läsbart alias kan läggas till senare, men startpunkten bör vara
`registrationNumber` eftersom det redan är dokumenttjänstens stabila nyckel.

## Beslut: URL-namn

Kanonisk publik route blir:

```text
/d/{registrationNumber}
```

Skäl:

- `/d` är kort och språkneutral. Det fungerar för både "dokument" och
  "document" utan att vi behöver välja ett språk i själva länken.
- Registreringsnumret gör länken unik och spårbar.
- Den publika sidan kan bära den mänskliga betydelsen med rubriker,
  dokumenttyp, metadata och tydliga knappar.
- Vi undviker konflikt med den interna inloggade ytan `/sv/documents`.

Möjlig senare förbättring:

```text
/handlingar/{registrationNumber} -> 308 redirect till /d/{registrationNumber}
/documents/{registrationNumber} -> 308 redirect till /d/{registrationNumber}
```

Alias bör i så fall vara redirects till den kanoniska `/d`-adressen, inte egna
separata implementationer.

## Publika URL:er

```text
GET /d/{registrationNumber}
```

Publik dokumentsida. Visar den senaste publicerade revisionen, metadata,
fillista, förhandsvisning när möjligt och nedladdningsknappar.

```text
GET /d/{registrationNumber}/download
```

Ladda ned allt från senaste publika revisionen. Om dokumentet har exakt en fil
kan filen streamas direkt. Om det har flera filer skapas en zip on-the-fly.

```text
GET /d/{registrationNumber}/files/{fileToken}
```

Ladda ned en specifik fil från senaste publika revisionen.

```text
GET /d/{registrationNumber}/preview/{fileToken}
```

Visa eller streama en specifik fil för förhandsvisning när filtypen stöds.
Primärt PDF och bilder i första implementationen.

```text
GET /d/{registrationNumber}/v/{revision}
```

Publik vy för en specifik revision.

```text
GET /d/{registrationNumber}/v/{revision}/download
GET /d/{registrationNumber}/v/{revision}/files/{fileToken}
GET /d/{registrationNumber}/v/{revision}/preview/{fileToken}
```

Motsvarande nedladdning, filhämtning och preview för en specifik revision.

## Publiceringsmodell

Ett dokument är publikt endast om den senaste revisionen uppfyller alla
publiceringskrav:

- `published === true`
- `confidentiality.confidential === false`
- arkivstatus följer beslutad policy, se "Arkivstatus" nedan

Publicering ska vara en explicit handling. Första implementationen kan tekniskt
representera publicering med metadata:

```json
{ "key": "published", "value": "true" }
```

Men detta ska behandlas som en reserverad systemnyckel, inte som vanlig fri
metadata.

### Integritet över revisioner

Detta måste lösas innan Fas 1 kodas.

Dokumenttjänsten skapar nya revisioner vid ändringar. Den lokala
mikrotjänst-referensen beskriver att uppdateringar bygger på en deep-copy av
senaste revisionen, men vårt Express-/frontend-lager kan ändå skicka
`metadataList` explicit vid vanliga ändringar. Om `published` ligger i metadata
och en klient skickar en ny metadata-lista utan den reserverade nyckeln kan den
publika länken tyst börja ge 404.

Minimikrav:

- `published` ska vara en reserverad nyckel som inte redigeras som vanlig
  metadata.
- Alla backendflöden som skapar ny revision måste bevara reserverad
  publiceringsmetadata om ändringen inte uttryckligen är en publiceringsändring.
- Det gäller minst dokumentuppdatering, filuppladdning/ersättning och
  filborttagning.
- Publiceringsändringar ska ske via ett tydligt kontrollerat flöde, inte genom
  fri metadataredigering.
- Tester ska täcka att en vanlig beskrivningsändring och en filändring inte
  avpublicerar dokumentet.

Föreslaget pragmatiskt första steg:

- Lägg en backend-hjälpare som hämtar senaste revisionen, separerar reserverad
  publiceringsmetadata och mergar tillbaka den vid vanliga updates.
- Lägg ett separat Express-endpoint eller serviceflöde för att sätta/ta bort
  publicering.
- Dölj `published` från vanlig metadata-UI från dag ett.

Rekommenderad målbild:

- Lägg till ett tydligt "Publicerad"-val i administrationsgränssnittet.
- Dölj/reservera `published` från den vanliga metadataeditorn.
- Behörighetsstyr publicering separat från vanlig dokumentredigering om rollerna
  stödjer det.

### Arkivstatus

`archive` betyder inte automatiskt "opublicerad". Det är ett domänattribut för
arkivering och kan i kommunal kontext mycket väl sammanfalla med handlingar som
fortfarande ska vara offentligt åtkomliga.

Innan implementation behöver vi besluta policy:

- Alternativ A: arkiverade dokument får inte visas publikt.
- Alternativ B: arkiverade dokument får visas publikt om de uttryckligen är
  publicerade och inte sekretessmarkerade.
- Alternativ C: policy styrs per dokumenttyp.

Tills beslut finns är säkraste tekniska default att inte exponera arkiverade
dokument publikt, men planen ska inte beskriva `archive === false` som en
självklar juridisk sanning.

### Revisioner och avpublicering

Senaste revisionen styr om dokumentsamlingen är publik över huvud taget.

Det innebär:

- Om senaste revisionen avpubliceras ska även historiska publika
  revisionslänkar sluta fungera.
- Om senaste revisionen sekretessmarkeras ska alla publika URL:er ge samma
  neutrala svar.
- Om en specifik revision visas måste både senaste revisionen och målrevisionen
  valideras mot sekretess/arkivstatus innan något exponeras.

Detta ger en enkel mental modell: avpublicering eller sekretess på dokumentet
stänger den publika ingången.

## Juridik och dataskydd

Publika permalänkar i kommunal dokumenthantering kräver en separat juridisk och
dataskyddsmässig bedömning. `confidentiality.confidential === false` betyder
inte automatiskt att dokumentet är lämpligt att publicera öppet.

Planen ska hantera minst:

- Vem får besluta att ett dokument publiceras?
- Hur loggas beslutet, vem gjorde det och när?
- Ska publiceringsbeslut loggas separat från vanlig dokumentändring?
- Vilka dokumenttyper får publiceras publikt?
- Kan dokumentinnehållet innehålla personuppgifter trots att handlingen inte är
  sekretessmarkerad?
- Hur hanteras incidenter där ett dokument publicerats felaktigt?
- Behövs accessloggar för publika hämtningar, till exempel IP, tid,
  registreringsnummer och fil?
- Hur länge får sådana accessloggar sparas?
- Hur hanteras radering eller permanent spärr av ett tidigare publicerat
  registreringsnummer?

Radering/spärr kräver särskilt beslut:

- Om ett publicerat dokument måste tas bort ska URL:en kunna blockeras även om
  upstream senare skulle returnera ett dokument på samma registreringsnummer.
- En blockerad publik länk bör kunna svara 404 eller 410 beroende på beslutad
  informationspolicy.
- Om `registrationNumber` i praktiken aldrig återanvänds kan blocklistan vara
  enkel. Om återanvändning är möjlig måste blockeringen bära mer kontext.

## Felhantering och informationsläckage

Publika routes ska inte avslöja om ett dokument finns men är opublicerat,
arkiverat eller sekretessmarkerat.

Standard:

- saknas -> 404
- opublicerat -> 404
- arkiverat -> 404
- sekretessmarkerat -> 404
- upstream 401/403/404 -> normaliseras till 404
- upstream 5xx -> 502 eller generisk felsida

Den publika sidan kan visa en neutral 404/not-found-vy. Den ska inte säga
"dokumentet är sekretessmarkerat" eller "dokumentet är opublicerat".

Registreringsnummer är förutsägbara. Denna plan utgår från offentlig
publicering, inte hemliga länkar. Därför är enumeration av publicerade dokument
inte i sig ett sekretessbrott, men routes ska ändå undvika att bli ett tydligt
orakel för opublicerade dokument.

Krav:

- Alla otillåtna tillstånd ska ge samma statusfamilj och neutral respons.
- Timing-skillnader bör minimeras där det är rimligt.
- Rate limiting ska gälla publika routes.
- Om vi senare behöver verkligt ogissbara länkar ska det lösas med
  `/share/{publicToken}`, inte med `/d/{registrationNumber}`.

## Publik DTO

Returnera aldrig rå `Document` från publika endpoints.

Målform:

```typescript
interface PublicDocumentFile {
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
  downloadUrl: string;
  previewUrl?: string;
  previewSupported: boolean;
}

interface PublicDocumentRevision {
  revision: number;
  created: string;
  url: string;
}

interface PublicDocumentResponse {
  registrationNumber: string;
  revision: number;
  description: string;
  type: string;
  created: string;
  files: PublicDocumentFile[];
  downloadAllUrl?: string;
  revisions?: PublicDocumentRevision[];
  metadataList: Array<{ key: string; value: string }>;
}
```

Fält som inte ska exponeras publikt:

- interna dokument-ID:n
- `municipalityId`
- `createdBy`
- `confidentiality`
- råa `documentData.id` om vi kan undvika det
- reserverade systemnycklar som `published`
- interna organisationsnycklar som `departmentOrgId`

Metadata bör helst filtreras med allowlist eller explicit publik prefixmodell,
inte enbart med blocklist.

## Kodkommentarer och guardrails

Säkerhets- och publiceringsregler ska inte bara finnas i planeringsdokumentet.
De ska också synas på rätt ställen i koden.

Lägg korta, tydliga kommentarer vid kod som annars lätt kan missbrukas:

- reserverade metadatafält, till exempel `published`
- helpers som mergar tillbaka reserverad publiceringsmetadata
- publika DTO-mappers som filtrerar bort interna fält
- publiceringsvalidering som avsiktligt returnerar 404 i stället för 403
- filtoken-logik där token inte får tolkas som permanent om den bygger på
  revisionsbundet `documentDataId`
- preview-/download-headers där vi avsiktligt inte forwardar upstreams
  `Content-Disposition` rått
- proxy-undantaget för `/d`, så ingen senare råkar köra auth/i18n över den
  publika vägen

Kommentaren ska förklara varför regeln finns, inte upprepa vad raden gör.
Exempel:

```typescript
// `published` is reserved publication state. Preserve it across ordinary
// document updates so metadata edits cannot silently unpublish public links.
```

Utöver kommentarer bör kritiska regler kapslas i namngivna helpers med tester,
till exempel:

- `mergeReservedPublicationMetadata`
- `assertPublicDocumentAccess`
- `toPublicDocumentResponse`
- `sanitizePublicFileName`
- `buildPublicFileToken`

## Filidentifiering

Upstream kräver `documentDataId` för filnedladdning. Därför räcker inte en URL
som bara innehåller registreringsnummer och revision när ett dokument har flera
filer.

Vi bör inte låta frontend gissa fil via index.

Viktig semantik:

- `/d/{registrationNumber}` är den permanenta länken.
- Direkta fillänkar till "senaste revisionen" är inte automatiskt permanenta om
  de bygger på upstreams `documentDataId`, eftersom fil-ID:n är
  revisionsbundna.
- Revisionsspecifika fillänkar kan vara stabila för exakt den revisionen.
- Permanent direktlänk till "senaste versionen av just denna logiska fil" kräver
  ett logiskt fil-ID eller annan stabil publik identifierare.

Föreslagen modell:

- Backend bygger `downloadUrl` och `previewUrl` per fil.
- Publik frontend använder URL:erna från DTO:n.
- `fileToken` kan initialt vara en URL-safe representation av upstreams
  `documentDataId`, men målbilden är en signerad token eller annan publik
  identifierare som inte binder kontraktet direkt till intern datamodell.

Om vi börjar med rått `documentDataId` ska det vara ett medvetet tekniskt
mellansteg, inte slutlig kontraktsdesign.

Alternativ för stabilitet:

- Starta med `documentDataId` endast för revisionsspecifika URL:er.
- För senaste-revisions-URL:er, använd en logisk token baserad på normaliserat
  filnamn och redirecta till aktuell fil om matchning finns.
- Om filnamn ändras, visa 404 eller redirecta via ett explicit aliasregister.
- Inför på sikt ett `publicFileKey` eller signerad token som inte läcker intern
  datamodell.

Detta ska beslutas innan `/d/{reg}/files/{fileToken}` marknadsförs som en
permanent direktlänk.

## Förhandsvisning

Första stödet:

- PDF visas inbäddat i webbläsaren.
- Bilder visas direkt.
- Okända filtyper visas som filkort med nedladdningsknapp.

Senare stöd:

- Office-dokument via server-side konvertering till PDF eller annan kontrollerad
  preview-pipeline.
- Textfiler med säker rendering.
- Tillgänglighetsförbättringar för dokumentmetadata och filnavigering.

Vi ska inte skicka dokument till extern viewer utan ett separat beslut, eftersom
det kan innebära informations- och personuppgiftsrisker.

Preview ska ha hårdare säkerhetsheaders än vanlig sidrendering:

- `Content-Security-Policy` för den publika ytan.
- `X-Content-Type-Options: nosniff`.
- PDF/image-preview ska helst visas i sandboxad iframe eller annan isolerad
  vy när det är tekniskt rimligt.
- `Content-Disposition` ska sättas av oss, inte forwardas rått från upstream i
  publika routes.
- Filnamn ska saneras och kodas enligt RFC 6266, inklusive `filename*` för
  UTF-8.

## Zip-nedladdning

`/d/{registrationNumber}/download` ska kunna hantera flera filer.

Beteende:

- 0 filer: 404 eller en tydlig vy utan nedladdningsknapp på dokumentsidan.
- 1 fil: streama originalfilen direkt.
- flera filer: streama zip.

Krav:

- Zip ska streamas, inte byggas helt i minne.
- Filnamn ska normaliseras.
- Dubblettnamn ska få suffix, till exempel `fil.pdf`, `fil-2.pdf`.
- Zipfilens namn bör baseras på registreringsnummer, till exempel
  `2026-2281-0001.zip`.
- Överväg ett mer läsbart zipnamn, till exempel
  `{registrationNumber}-{kort-beskrivning}.zip`, med hård slugifiering och
  maxlängd.
- Samma publicerings-, sekretess- och arkivvalidering ska göras precis innan
  stream startar.

## Cache-policy

Eftersom dokument kan avpubliceras eller sekretessmarkeras retroaktivt ska
senaste publika vy och senaste nedladdning inte cacheas publikt.

Rekommenderad start:

- `/d/{reg}`: `Cache-Control: no-store`
- `/d/{reg}/download`: `Cache-Control: no-store`
- `/d/{reg}/files/{fileToken}`: `Cache-Control: no-store`
- `/d/{reg}/preview/{fileToken}`: `Cache-Control: no-store`
- revisionsvyer: `Cache-Control: no-store`
- revisionsfiler: `Cache-Control: private, max-age=300, must-revalidate`

Om vi senare inför starkare publiceringsobjekt och explicit immutable
publiceringsstatus kan vi öppna för mer aggressiv cache på historiska filer.

Next.js App Router har också egen fetch-/render-cache. Publika sidor och route
handlers ska därför uttryckligen använda:

- `cache: 'no-store'` på server-side `fetch()`, och/eller
- `export const dynamic = 'force-dynamic'` där det behövs.

En kort backend-cache kan ändå vara rimlig för att skydda upstream:

- publiceringsstatus/metadata kan cacheas 30-60 sekunder om avpubliceringens
  effektfördröjning accepteras.
- filstreamar ska inte byggas i cache i första implementationen.
- eventuell cache måste invalideras eller hållas mycket kort vid
  publiceringsändringar.

## Indexering och robots

Vi behöver besluta om publika dokumentvyer ska indexeras av sökmotorer.

Alternativ:

- Tillåt indexering för dokumenttyper som är avsedda för extern publicering.
- Sätt `noindex` som default och öppna per dokumenttyp senare.
- Blockera vissa routes i `robots.txt`, till exempel preview/download, men låt
  själva dokumentsidan indexeras.

Första implementationen bör vara konservativ:

- `noindex` på publika dokumentsidor tills publiceringspolicy är beslutad.
- Inga download-/preview-URL:er ska indexeras.
- Om slug/alias införs senare ska kanonisk URL anges med
  `<link rel="canonical" href="/d/{registrationNumber}">`.

## Tillgänglighet

Den publika dokumentvyn omfattas av kraven för digital offentlig service och ska
designas mot WCAG 2.1 AA som miniminivå.

Krav:

- Fillistan ska fungera med tangentbord.
- Knappar och länkar ska ha tydliga namn.
- Preview ska ha alternativ väg via nedladdning.
- PDF/image-preview får inte vara enda sättet att förstå sidan.
- Status som "historisk revision", "förhandsvisning saknas" och
  "ladda ned zip" ska vara begriplig för skärmläsare.
- Färg får inte vara enda informationsbärare.

## Säkerhetsmodell

Det finns två olika modeller:

1. Offentlig publicering.
   Dokumentet är avsett att kunna nås av alla som hittar länken. Säkerheten
   bygger på tydlig publiceringskontroll.

2. Länkdelning med hemlig länk.
   Endast den som har en ogissbar token ska kunna nå dokumentet.

Denna plan utgår från offentlig publicering. Registreringsnummer är inte en
hemlighet och kan vara gissbart. Om vi senare vill ha länkdelning krävs en ny
modell, till exempel:

```text
/share/{publicToken}
```

Det ska inte blandas ihop med `/d/{registrationNumber}`.

## Arkitektur

Next.js är fortsatt enda publika ytan. Express anropas internt av Next.js route
handlers. Mikrotjänsten (`api-service-document`) ändras inte i första fasen.

Flöde:

```text
Browser
  -> Next.js /d/*
  -> Express /api/public/d/*
  -> api-service-document
```

Publika Express-routes ska inte använda `authMiddleware`, men ska ha rate
limiting och strikt publiceringsvalidering.

Kommun-/tenant-hantering:

- `registrationNumber` innehåller kommun-ID i formatet, till exempel
  `2026-2281-0001`.
- Om registreringsnumret pekar på en annan kommun än konfigurerad
  `MUNICIPALITY_ID` ska publik route svara neutralt 404.
- Det ska inte redirectas mellan kommuner utan explicit multi-tenant-beslut.

## Teststrategi

Publika dokumentlänkar är en säkerhets- och kontraktsyta, så grundläggande
tester är motiverade även om resten av backend i dag saknar teststack.

Rekommenderad nivå:

- Backend: controller-/route-tester för Express med mockad `ApiService`.
- Frontend: Playwright för de viktigaste publika användarflödena.
- Full end-to-end mot riktig dokumenttjänst behövs inte som första steg.

Backendtesterna ska framför allt bevisa att fel dokument inte blir publika.
Frontendtesterna ska bevisa att användaren får rätt vy och att auth/i18n-proxy
inte stör `/d`.

Föreslagen backendstack:

- Vitest som test runner.
- Supertest för HTTP-anrop mot Express-appen.
- Mock/stub av `ApiService` så testerna inte kräver nätverk eller riktig
  dokumenttjänst.

Detta bör hållas smalt. Målet är inte att skapa en stor testsvit direkt, utan
att säkra de riskabla reglerna: publicering, sekretess, arkiv, DTO-filtrering,
nedladdningsheaders och proxybeteende.

Testdata ska inkludera:

- publicerat dokument med noll filer
- publicerat dokument med en fil
- publicerat dokument med flera filer
- `revision = 0`
- arkiverat dokument enligt beslutad arkivpolicy
- dokument med metadata som inte får exponeras publikt
- dokument vars registreringsnummer har fel kommun-ID

## Fas 0: Beslut innan kod

Mål: stäng de designbeslut som annars riskerar att ge fel säkerhetsmodell.

Beslut:

- Hur `published` bevaras över vanliga revisioner.
- Om `archive` ska blockera publik åtkomst alltid, aldrig eller per dokumenttyp.
- Vilka dokumenttyper får publiceras publikt.
- Om publik metadata ska vara allowlistad eller använda prefix som `public:*`.
- Om första implementationen får använda rått `documentDataId` och i så fall
  bara för revisionsspecifika länkar.
- Om `/d` ska vara `noindex` som default.
- Vilket språk den publika sidan ska använda utan `[locale]`-prefix.
- Om publicering kräver särskild behörighet.
- Vilken accessloggning/metrics som behövs.

Leverabler:

- Uppdaterad plan efter besluten.
- Kort beslutslogg i dokumentet eller separat ADR.
- Minsta publicerings-UI eller backend-endpoint definierad innan Fas 1.

## Fas 1: Publik läsvy, publiceringsintegritet och grundkontrakt

Mål: skapa den säkra publika ingången utan zip, avancerad preview eller slug.

Backend:

- Skapa `PublicDocumentController`.
- Skapa `PublicDocumentResponse` och relaterade interfaces.
- Lägg routes under `/public/d`.
- Implementera hämtning av senaste revision via
  `municipalityApiURL('documents', registrationNumber)`.
- Validera senaste revision:
  - `published === true`
  - `confidentiality.confidential === false`
  - arkivstatus enligt beslutad policy
- Avvisa registreringsnummer som inte matchar konfigurerad kommun/tenant.
- Returnera filtrerad DTO.
- Normalisera 401/403/404 från upstream till 404.
- Lägg `Cache-Control: no-store`.
- Lägg rate limiting på publika routes.
- Sanera alla publika `Content-Disposition`-headers som vi sätter själva.
- Implementera bevarande av reserverad publiceringsmetadata i vanliga
  update-/filflöden, eller inför ett separat publiceringsflöde som gör detta
  omöjligt att tappa.

Frontend:

- Skapa `/d/[registrationNumber]/page.tsx`.
- Skapa enkel publik layout utan intern app-chrome.
- Visa registreringsnummer, beskrivning, typ, datum och filer.
- Visa filkort med nedladdningsknappar.
- Hantera 404 med neutral not-found.
- Exkludera `/d` från auth/i18n-proxy med segmentbaserad matchning.
- Uppdatera `frontend/src/proxy.ts` konkret så `/d` varken auth-checkas eller
  passerar `i18nRouter`.
- Uppdatera matcher, till exempel med negativ match för `d`:
  `/((?!api|static|d(?:/|$)|.*\\..*|_next).*)`.
- Lägg dessutom early return i proxy för `pathname === '/d' ||
pathname.startsWith('/d/')` om matcher ändras senare.
- Lös språk utan `[locale]`-prefix. Första versionen kan använda
  `Accept-Language` med fallback till `sv`, eller hårdkodad svensk text om det
  dokumenteras som en medveten begränsning.
- Använd `cache: 'no-store'`/`dynamic = 'force-dynamic'` för publika
  server-side fetches.
- Sätt initial robots/noindex-policy enligt Fas 0-beslut.

Verifiering:

- Publicerat dokument visas utan inloggning.
- Opublicerat dokument ger 404.
- Sekretessmarkerat dokument ger 404.
- Arkiverat dokument ger 404.
- `/sv/documents` är fortfarande skyddad.
- Publik DTO innehåller inga interna fält.
- Vanlig dokumentuppdatering bevarar publiceringsstatus.
- Filändring bevarar publiceringsstatus.
- `/d/2026-2281-0001` redirectas inte till `/sv/login` eller `/sv/d/...`.
- `revision=0` hanteras korrekt i URL:er och validering där revisioner används.

## Fas 2: Individuell filnedladdning

Mål: göra filhämtning explicit och stabil.

Backend:

- Lägg till `/public/d/:registrationNumber/files/:fileToken`.
- Validera senaste publiceringsstatus före filstream.
- Mappa `fileToken` till rätt fil i senaste revisionen.
- Streama fil via `apiService.getRaw()`.
- Vid ogiltig token eller otillåten fil: 404.
- Besluta och dokumentera om latest-fillänkar är permanenta eller bara
  bekvämlighetslänkar.
- Om de ska vara permanenta: använd logiskt fil-ID eller filnamnsbaserad
  fallback/redirect, inte enbart rått revisionsbundet `documentDataId`.
- För revisionsspecifika fillänkar ska `revision=0` tillåtas.

Frontend:

- Använd `downloadUrl` från DTO:n.
- Inga fil-ID:n eller index ska konstrueras i komponenten.
- Visa tydliga filnamn, MIME-typ och storlek.

Verifiering:

- Varje fil går att ladda ned.
- Ogiltigt fileToken ger 404.
- Avpublicerat dokument stoppar även gamla fil-URL:er.
- En fillänk från äldre latest-revision har definierat beteende efter ny
  revision: fungerar via fallback/redirect, eller dokumenterat 404 om den inte
  är en permanent länk.

## Fas 3: Ladda ned allt och zip

Mål: stödja dokument med flera filer utan konstiga specialfall.

Backend:

- Lägg till `/public/d/:registrationNumber/download`.
- Vid en fil: streama filen direkt.
- Vid flera filer: streama zip on-the-fly.
- Normalisera filnamn och hantera dubbletter.
- Sätt korrekt `Content-Type` och `Content-Disposition`.
- Lägg rimliga skydd mot för stora zip-operationer.
- Mät och logga zipstorlek/antal filer för observability.

Frontend:

- Visa "Ladda ner allt" när dokumentet har minst en fil.
- Visa om nedladdningen blir zip när flera filer finns.

Verifiering:

- Enfil-dokument laddas ned som originalfil.
- Flerfils-dokument laddas ned som zip.
- Zip innehåller alla filer med säkra filnamn.
- Stora filer streamas utan att backend bygger allt i minne.
- Dokument med noll filer visar ingen trasig nedladdningslänk.

## Fas 4: Förhandsvisning

Mål: göra dokumentvyn användbar för läsning, inte bara nedladdning.

Backend:

- Lägg till `/public/d/:registrationNumber/preview/:fileToken`.
- Tillåt initialt PDF och bilder.
- Sätt headers så filen kan visas inline.
- Blockera eller nedladdningsdirigera okända filtyper.
- Lägg CSP/nosniff/sandbox-strategi för preview.
- Sanera och sätt egna response headers i stället för att forwarda upstream
  okontrollerat.

Frontend:

- Visa PDF/image-preview direkt i sidan.
- För flera filer: visa fillista och låt användaren välja fil att förhandsvisa.
- För ej stödda filtyper: visa filkort med nedladdning.

Verifiering:

- PDF visas inline.
- Bild visas inline.
- Word/Excel/okända typer försöker inte renderas osäkert.
- Preview lyder samma publiceringskontroller som download.

## Fas 5: Historiska revisioner

Mål: ge kontrollerad åtkomst till äldre revisioner utan att avpublicering tappar
effekt.

Backend:

- Lägg till `/public/d/:registrationNumber/v/:revision`.
- Lägg till revisionsspecifika `download`, `files` och `preview` routes.
- Validera alltid senaste revisionens publiceringsstatus först.
- Validera målrevisionens sekretess/arkivstatus innan exponering.
- Returnera revisionslista i DTO om vi vill visa historik publikt.

Frontend:

- Visa "Senaste revision" och eventuell revisionsväljare.
- Gör det tydligt när användaren tittar på en historisk revision.
- Länka nedladdningar via revisionsspecifika URL:er.

Verifiering:

- Giltig publicerad historisk revision visas.
- Avpublicering i senaste revision stänger historiska länkar.
- Sekretess på dokumentet stänger historiska länkar.

## Fas 6: Publicerings-UI och behörighet

Mål: göra publicering fullt begriplig och mindre felbenägen. Ett minimalt
publiceringsflöde ska dock finnas redan innan Fas 1 används i staging/prod.

Frontend:

- Lägg till tydligt val för "Publicerad" i dokumentdetaljen.
- Visa permanent publik länk när dokumentet är publicerat.
- Lägg "Kopiera länk"-funktion.
- Dölj reserverade metadatafält från vanlig metadataredigering.
- Visa varning om dokumentet har flera filer eller filtyper som inte kan
  förhandsvisas.

Backend:

- Säkerställ att reserverad metadata inte råkar exponeras publikt.
- Om behörighetsmodell stödjer det: kräv särskild permission för publicering.
- Validera att publiceringsändringar skapar ny revision enligt dokumenttjänstens
  revisionsmodell.
- Logga publiceringsbeslut med aktör, tid, registreringsnummer och ändring.

Verifiering:

- Publicering skapar fungerande publik länk.
- Avpublicering stänger länken.
- Vanlig metadataredigering kan inte råka visa eller korrupta systemnycklar.

## Fas 7: Alias, slug eller länkdelning

Mål: förbättra läsbarhet eller stödja hemliga delningslänkar om behovet finns.

Alternativ A: läsbara alias

```text
/handlingar/{registrationNumber}
/documents/{registrationNumber}
```

Dessa bör vara 308 redirects till `/d/{registrationNumber}`.

Alternativ B: riktig slug

```text
/d/{registrationNumber}-{slug}
```

Krav om vi inför slug:

- Registreringsnumret förblir primär nyckel.
- Slug är dekorativ.
- Fel slug redirectas till aktuell slug.
- Slugändringar får inte bryta gamla länkar.
- Slug-/alias-sidor ska ange canonical till `/d/{registrationNumber}`.

Alternativ C: hemlig delningslänk

```text
/share/{publicToken}
```

Detta är en annan säkerhetsmodell än offentlig publicering och ska designas
separat.

## Fas 8: Grundläggande testbas

Mål: lägga en liten men värdefull testbas runt den publika ytan.

Backend:

- Lägg till testscript i backend, till exempel `test`.
- Introducera Vitest och Supertest om vi inte väljer annan etablerad stack.
- Gör `App` testbar utan att lyssna på port genom `getServer()`.
- Mocka `ApiService` eller injicera en testdubbel där public controller hämtar
  dokument.
- Testa `/api/public/d/:registrationNumber`:
  - publicerat dokument returnerar filtrerad DTO
  - opublicerat dokument ger 404
  - sekretessmarkerat dokument ger 404
  - arkiverat dokument ger 404
  - upstream 401/403/404 normaliseras till 404
  - DTO läcker inte `createdBy`, `municipalityId`, `confidentiality` eller
    interna systemmetadata
- Testa filroutes när de finns:
  - giltig fil streamas med rätt headers
  - ogiltig `fileToken` ger 404
  - avpublicerat dokument stoppar filnedladdning
- Testa ziproute när den finns:
  - flera filer ger zip-header
  - en fil kan streamas som originalfil
  - filer med samma namn får säkra unika namn

Frontend:

- Lägg Playwright-test för `/d/{registrationNumber}`.
- Mocka backend-svar via Playwright route interception eller kör mot testserver
  med kontrollerad data.
- Testa att publik dokumentsida visas utan inloggning.
- Testa att opublicerat/saknat dokument visar neutral not-found.
- Testa att `/d` inte redirectas till `/sv/login`.
- Testa att `/sv/documents` fortfarande kräver inloggning.
- Testa att fil- och zip-länkar använder URL:er från DTO:n, inte konstruerade
  interna ID:n i komponenten.

Verifiering:

- `backend` kan köra sin nya testsvit isolerat.
- `frontend` kan köra Playwright-test för publik dokumentvy.
- Tester kräver inte riktig dokumenttjänst eller externa nätverksanrop.
- Testerna täcker minst ett positivt och flera negativa säkerhetsfall.

## Filer som sannolikt påverkas

Backend:

- `backend/src/controllers/public-document.controller.ts`
- `backend/src/interfaces/public-document.interface.ts`
- `backend/src/server.ts`
- eventuellt `backend/src/middlewares/rate-limit.middleware.ts`
- eventuellt tester för public controller
- eventuellt `backend/package.json`
- eventuellt `backend/yarn.lock`
- eventuellt `backend/vitest.config.ts`

Frontend:

- `frontend/src/app/d/[registrationNumber]/page.tsx`
- `frontend/src/app/d/[registrationNumber]/not-found.tsx`
- `frontend/src/app/d/[registrationNumber]/download/route.ts`
- `frontend/src/app/d/[registrationNumber]/files/[fileToken]/route.ts`
- `frontend/src/app/d/[registrationNumber]/preview/[fileToken]/route.ts`
- `frontend/src/app/d/[registrationNumber]/v/[revision]/page.tsx`
- `frontend/src/app/d/layout.tsx`
- `frontend/src/proxy.ts`
- `frontend/e2e/public-document.spec.ts`
- `frontend/locales/sv/common.json`
- `frontend/locales/en/common.json`

Senare UI-fas:

- `frontend/src/app/[locale]/(app)/documents/[registrationNumber]/page.tsx`
- dokumentstore/API-typer om publiceringsstatus ska visas och ändras tydligt

## Öppna designfrågor innan implementation

1. Ska `published` börja som reserverad metadata eller kräver vi direkt en
   tydligare publiceringsmodell i backend/UI?
2. Ska publik metadata vara allowlistad per nyckel, eller ska vi ha prefix som
   `public:*`?
3. Ska rått `documentDataId` accepteras temporärt som `fileToken`, eller ska vi
   börja med signerade tokens?
4. Ska historiska revisioner visas publikt i första versionen eller vänta till
   fas 5?
5. Ska `/handlingar/{registrationNumber}` skapas direkt som alias, eller vänta
   tills vi ser behovet?

## Kvalitetskriterier

- Permanent länk ska fortsätta fungera när ny revision skapas.
- Avpublicering ska stoppa all publik åtkomst.
- Sekretessmarkering ska stoppa all publik åtkomst.
- Publika svar får inte innehålla interna ID:n eller känsliga fält om det inte
  är ett medvetet kontraktsbeslut.
- Flerfilsdokument ska vara förstaklassfall, inte specialfall.
- Stora filer och zip ska streamas.
- Preview får bara rendera filtyper vi hanterar säkert.
- Auth/i18n-proxy får inte störa `/d`, och `/sv/documents` ska fortsätta vara
  skyddad.
- Backendtester ska täcka publicerings-, sekretess- och arkivreglerna.
- Frontendtester ska täcka den publika vyn och proxyundantaget för `/d`.
