# D01 — Komponenten und Zustände

Stand: 29. September 2026 · Entwurf für die deutsche Kundenoberfläche. Die zwei zusätzlichen SVGs sind Zustandsansichten, keine fertigen Komponenten.

## Typografie und Werte

| Einsatz | Zielgröße | Darstellung |
| --- | ---: | --- |
| Große Überschrift im Dialog | 28 px | kräftig, höchstens eine Zeile |
| Abschnittstitel | 20–23 px | kräftig |
| Fließtext und Maßeingabe | 16 px | dunkel, klarer Zeilenabstand |
| Helfertext, Feldbezeichnung, Schaltfläche | 14–15 px | normal bis halbfett |
| Dichte Statusmarke/Überzeile | mindestens 12 px | kontrastreich; nicht für notwendige Erklärungen |
| Zahlen | 16–17 px | tabellarische Ziffern, Einheit separat ausgerichtet |

Systemschrift wie im Designplan. Maßfelder, Fehler und Preisstatus stehen auf opaken Flächen. Glaseffekt bleibt hinter Text und Symbolen.

## Zustandsansichten

- [Profil im Detail](D01-PROFIL-DETAIL.svg): großes Fenster für ein einzelnes Bauteil. Aktives Produkt wird klar benannt. Prime und Premium bleiben getrennte Produkte. Ein generisches Profilbild ist als Platzhalter gekennzeichnet; Profilmaß und technische Daten erscheinen erst aus einem geprüften Modell. Der AR-Knopf ist bis zur Freigabe und HTTPS-Anbindung deaktiviert.
- [Planungsübersicht](D01-UEBERSICHT.svg): vollständige Maße/Optionen, schematische Vorschaudarstellung, fehlender Preis sowie getrennte PDF- und AR-Aktionen. Beispielzahlen sind gekennzeichnet. Ohne Tarif erscheint kein Eurobetrag. Ein PDF-Entwurf kann den fehlenden Preisstatus mitnehmen; er wird nicht als Angebot oder Bestellung bezeichnet.

## Komponenten

| Komponente | Inhalt | Bedienung |
| --- | --- | --- |
| `ConfiguratorHeader` | Markenplatzhalter, Prime/Premium, Öffnen, Speichern | Auswahl bleibt nach dem Laden erhalten |
| `SectionPicker` | Konstruktion, Dach, Ausstattung, Feld, Übersicht | direkt auswählbar; Fehlerstatus zusätzlich als Text/Symbol |
| `DimensionField` | Maß, cm, erlaubte Grenzen und Fehler | Tastatur und Zahleneingabe, kein Slider als Ersatz |
| `RoofMaterialCard` | Glas oder Polycarbonat; erlaubte Panelgrenze | ausgewählte Karte hat Kontur und Haken |
| `PostSelection` | ausgewählte Säule und Achsenposition | Messwert direkt änderbar; Modell-Drag getrennt von Kamerabewegung |
| `SceneToolbar` | Rückgängig, Wiederholen, Maße, Ansicht zurücksetzen | Symbol mit zugänglichem Namen und Fokusmarkierung |
| `QuoteSummary` | Preisstatus, Produkt, kurze Maße und PDF/AR | fehlender Preis bleibt Textstatus statt `0 €` |
| `ProfileInspector` | Bauteilname, Produkt, Einzelansicht, Modelldaten, AR-Status | Dialog hält Fokus und gibt ihn beim Schließen zurück |
| `PlanSummary` | alle freigegebenen Optionen, Maße, Preisstatus, PDF/AR | passt in Modal am Desktop, Vollbildblatt am Telefon |
| `StatusMessage` | Laden, bereit, fehlt, veraltet, Fehler | verständlicher Text plus Symbol, Farbe allein reicht nicht |

## Verhaltensmatrix

| Bereich | Laden | Bereit | Fehlt/ungültig | Fehler oder veraltet |
| --- | --- | --- | --- | --- |
| Prime/Premium-Modell | „Modell wird geladen“; Produktwahl bleibt sichtbar | „Prime geladen“ / „Premium geladen“ | „Modell für dieses Produkt fehlt“ | „Modell konnte nicht geladen werden“ mit erneutem Versuch |
| Maße | Eingabe bleibt lesbar | gültiger Wert mit cm | Feld bleibt markiert, Eingabe bleibt erhalten; konkrete Korrektur nennen | nichts stillschweigend runden |
| Preis | „Preis wird berechnet“ | Betrag, Währung, Gültigkeit und Umfang | „Preis noch nicht verfügbar“ plus Grund | „Preis konnte nicht geladen werden“; alten Preis als veraltet markieren |
| PDF | Schaltfläche lädt, Doppelklick verhindert | Datei enthält denselben Konfigurationsstand | Entwurfs-PDF darf fehlenden Preisstatus ausweisen | Fehlermeldung und Möglichkeit erneut zu exportieren |
| AR/Profil | Detailmodell/AR wird vorbereitet | „Auf meinem Tisch ansehen“ nur bei passender freigegebener Datei | „AR-Vorschau noch nicht verfügbar“ | Datei/Verbindung fehlgeschlagen; normale 3D-Ansicht bleibt verfügbar |
| Speichern/Öffnen | Speicher-/Ladezustand | „Gespeichert“ / geöffneter Entwurf | ungültige oder ältere Konfiguration wird erklärt | Eingaben nicht löschen; konkreter nächster Schritt |
| Dialoge | — | Profil/Übersicht vollständig | unbestätigte Produktdaten nicht als Fakten anzeigen | Schließen stellt vorherigen Fokus und Szenenauswahl wieder her |

## Anpassung nach Bildschirm

- 1440 px: Profil- und Übersichtsfenster zentriert, höchstens 1150 px breit. 3D-Bereich links, Produktdetails/Preisstatus rechts.
- 1024 px: Fenster innen mindestens 24 px Rand; Inhalt darf untereinander umbrechen, Texte bleiben mindestens 14 px.
- 390 px: kein breites modales Fenster. Profil und Übersicht als Vollbild-Blatt mit fixem Schließen-/Zurück-Ziel; Aktionen unter dem lesbaren Inhalt.
- 320 px und 200% Zoom: Karten einspaltig; keine festen Textbreiten, keine abgeschnittenen Einheiten; vertikal scrollen.
- Tastatur: Dialog wird modal, Escape schließt, Fokus kehrt zum Auslöser zurück. AR nicht verfügbar bleibt deaktiviert mit danebenliegendem Grundtext.

## Offene Design-Grenzen

- Die Profil-SVG-Geometrie ist nur ein Platzhalter. Im Produktdialog wird sie durch das passende Einzelmodell aus dem gewählten Prime- oder Premium-Produkt ersetzt.
- Beispielmaße und die 6 Felder / 7 Träger-Anzeige dienen der Komposition; die Anwendung berechnet und beschriftet reale Werte aus derselben Konfigurationsrevision.
- Es gibt keinen echten Preis, kein AR-Asset, kein QR-Ziel und keine Modellmaß-Aussage in diesen Entwürfen.
