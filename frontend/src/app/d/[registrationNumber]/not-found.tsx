const PublicDocumentNotFound = () => (
  <main className="min-h-screen bg-background px-4 py-10 text-foreground">
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold uppercase text-muted-foreground">Dokument</p>
      <h1 className="mt-3 text-3xl font-bold">Dokumentet kunde inte hittas</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Länken är inte tillgänglig. Kontrollera att adressen är korrekt eller kontakta den som
        delade länken.
      </p>
    </div>
  </main>
);

export default PublicDocumentNotFound;
