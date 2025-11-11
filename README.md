# Text → Sprachdatenbank-Codes (v8)

**Neu:** Option **„Nur ganze Wörter“** (Unicode-sicher).  
Wenn aktiviert, werden Phrasen nur ersetzt, wenn sie **als ganzes Wort** vorkommen (z. B. „TAG“ ersetzt **nicht** in „TAGES“).

Umsetzung:
- Regex mit **Unicode-Grenzen**: `(?<![\p{L}\p{N}_])` **PHRASE** `(?![\p{L}\p{N}_])`
- Funktioniert auch für **Mehrwort-Phrasen**.
- Kombinierbar mit **Groß-/Kleinschreibung beachten**.

Weiterhin enthalten:
- Autospeichern nach Upload, eingeklappte Vorschau, Kopier-Buttons, Mehrwort-Priorität, Schema A & B, ID als Code (bereinigt).

Viel Spaß!
