import { roofFinishes } from '../catalog/catalog';
import { awningSpans } from './awning';
import type { ConfigurationV1 } from './configuration';
import { evaluateConfiguration } from './evaluateConfiguration';
import { ledRafterCount } from './led';
import { resolveRoofFieldFinishes, roofFieldName } from './roofFinish';

/** Short German lines for the overview and the PDF; they derive from the same configuration revision. */
export function roofSummaryDe(configuration: ConfigurationV1): { finish: string; awning: string; led: string } {
  const evaluation = evaluateConfiguration(configuration);
  const roof = evaluation.roof;
  const tones = resolveRoofFieldFinishes(configuration, roof);
  const label = (id: keyof typeof roofFinishes) => `${roofFinishes[id].nameDe} ${roofFinishes[id].toneDe}`;
  let finish = label(configuration.roofFinish);
  if (roof && tones.length) {
    const counts = new Map<string, number>();
    for (const tone of tones) counts.set(tone, (counts.get(tone) ?? 0) + 1);
    const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] as keyof typeof roofFinishes;
    const others = tones.map((tone, index) => tone === main ? null : `${roofFieldName(index, roof.bayCount)}: ${roofFinishes[tone].toneDe}`)
      .filter((entry): entry is string => entry !== null);
    finish = others.length ? `${label(main)}; ${others.join(', ')}` : label(main);
  }
  const spans = awningSpans(configuration);
  const awningText = configuration.awning
    ? `${configuration.awning.type === 'aufglas' ? 'Aufglas-Markise' : 'Unterglas-Markise'}, ${spans.length === 2 ? '2 Stück' : '1 Stück'}: ${spans.map((span) => `${format(span.widthMm)} × ${format(span.depthMm)} cm`).join(' und ')}`
    : 'Keine';
  const rafters = roof ? ledRafterCount(roof.supportCount) : 0;
  const led = configuration.ledPerRafter > 0 && roof
    ? `${configuration.ledPerRafter} je Träger auf ${rafters} Trägern = ${configuration.ledPerRafter * rafters} LED`
    : 'Keine';
  return { finish, awning: awningText, led };
}

function format(mm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(mm / 10);
}
