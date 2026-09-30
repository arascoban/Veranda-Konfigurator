import type { ProductId, RoofMaterialId } from '../catalog/catalog';

export const de = {
  brand: 'Terrassenplaner',
  sections: {
    construction: { label: 'Konstruktion', title: 'Aufbau und Maße', description: 'Grundmaße und Trägeranordnung ansehen.' },
    roof: { label: 'Dach', title: 'Dach und Material', description: 'Eindeckung und Dachfelder festlegen.' },
    equipment: { label: 'Ausstattung', title: 'Ausstattung', description: 'Ergänzungen für Ihre Planung.' },
    opening: { label: 'Feld', title: 'Felder und Seiten', description: 'Optionen für einzelne Öffnungen.' },
    overview: { label: 'Übersicht', title: 'Ihre Planung', description: 'Maße, Auswahl und Ausgabestatus im Überblick.' },
  },
  products: { prime: 'Prime', premium: 'Premium' } satisfies Record<ProductId, string>,
  roofMaterials: { glass: 'Glas', polycarbonate: 'Polycarbonat' } satisfies Record<RoofMaterialId, string>,
  dimensions: {
    width: { label: 'Breite', help: 'Breite der Regenrinne.' },
    depth: { label: 'Tiefe', help: 'Von der Wand bis zur Vorderkante.' },
    rearHeight: { label: 'Höhe hinten', help: 'Bis zur Unterkante des Wandprofils.' },
    frontHeight: { label: 'Höhe vorne', help: 'Bis zur Unterkante der Regenrinne.' },
  },
} as const;

export const issueTextDe: Record<string, string> = {
  width_above_1200_cm: 'Die maximale Breite beträgt 1.200 cm.',
  width_below_200_cm: 'Die minimale Breite beträgt 200 cm.',
  depth_below_100_cm: 'Die minimale Tiefe beträgt 100 cm.',
  depth_above_material_limit: 'Die Tiefe liegt über dem Grenzwert dieser Dacheindeckung.',
  roof_bays_not_possible: 'Mit diesen Maßen kann die Feldaufteilung nicht berechnet werden.',
  non_positive_cap: 'Für die gewählte Feldzahl bleibt keine gültige Trägerbreite.',
  panel_too_wide: 'Mindestens ein Dachfeld überschreitet die zulässige Plattenbreite.',
  too_few_posts: 'Mindestens zwei Trägerpositionen sind erforderlich.',
  duplicate_id: 'Die Trägeranordnung enthält eine doppelte Position.',
  not_strictly_increasing: 'Die Träger müssen von links nach rechts angeordnet sein.',
  post_outside_width: 'Ein Träger ragt über das Ende der Regenrinne hinaus.',
  end_post_inset_too_large: 'Die Außenseite eines äußeren Trägers liegt weiter als 50 cm vom Rinnenende entfernt.',
  center_gap_too_large: 'Der Abstand zwischen zwei Trägerachsen ist zu groß.',
  clear_opening_too_small: 'Die lichte Weite zwischen zwei Trägern muss mindestens 90 cm betragen.',
  roof_slope_outside_5_to_12_degrees: 'Die berechnete Dachneigung liegt außerhalb von 5° bis 12°.',
  roof_attachment_offsets_not_supplied: 'Montagebezüge fehlen; die Dachneigung kann noch nicht verlässlich bestätigt werden.',
  minimum_gap_and_outer_mount_not_supplied: 'Weitere Montageabstände werden noch geprüft.',
  minimum_cut_width_not_supplied: 'Prüfen Sie Zuschnittmaße vor einer Bestellung.',
  engineering_and_price_rules_incomplete: 'Technische Freigabe und Preisliste stehen noch aus.',
  measurement_required: 'Bitte geben Sie dieses Maß ein.',
};
